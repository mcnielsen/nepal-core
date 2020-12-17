/**
 * An interface for establishing and persistenting an authenticated AIMS session.
 *
 * @author Kevin Nielsen <knielsen@alertlogic.com>
 * @author Barry Skidmore <bskidmore@alertlogic.com>
 * @author Robert Parker <robert.parker@alertlogic.com>
 *
 * @copyright 2019 Alert Logic, Inc.
 */

import {
    AIMSClient,
    AIMSUser,
    AIMSAccount,
    AIMSAuthentication,
    AIMSSessionDescriptor,
} from "../aims-client";
import {
    AlApiClient,
    AlClientBeforeRequestEvent,
    AlDefaultClient,
} from "../client";
import { AlDataValidationError } from "../common/errors";
import {
    AlInsightLocations,
    AlLocation,
    AlLocatorService,
} from "../common/locator";
import { AlBehaviorPromise } from "../common/promises";
import { AlRuntimeConfiguration, ConfigOption } from '../configuration';
import {
    AlCabinet,
    AlGlobalizer,
    AlJsonValidator,
    AlTriggerStream,
    deepMerge
} from "../common/utility";
import { SubscriptionsClient } from "../subscriptions-client";
import { AlEntitlementCollection } from "../subscriptions-client/types";
import {
    AlActingAccountChangedEvent,
    AlActingAccountResolvedEvent,
    AlActiveDatacenterChangedEvent,
    AlSessionEndedEvent,
    AlSessionStartedEvent,
} from './events';
import { AlNullSessionDescriptor } from './null-session';
import {
    AlConsolidatedAccountMetadata,
    AlFoxSnapshot,
} from './types';

/**
 * AlSessionInstance maintains session data for a specific session.
 */
export class AlSessionInstance
{
    /**
     * A stream of events that occur over the lifespan of a user session
     */
    public    notifyStream:AlTriggerStream        =   new AlTriggerStream();

    /**
     * Protected state properties
     */
    protected sessionIsActive                     =   false;
    protected client:AlApiClient                  =   null;
    protected sessionData: AIMSSessionDescriptor  =   JSON.parse(JSON.stringify(AlNullSessionDescriptor));

    /**
     * Tracks when the acting account is changing (measured as interval between AlActingAccountChangedEvent and AlActingAccountResolvedEvent)
     * and allows systematic access to the last set of resolved data.
     */
    protected resolvedAccount                     =   new AlActingAccountResolvedEvent( null,
                                                                                        new AlEntitlementCollection(),
                                                                                        new AlEntitlementCollection() );
    protected managedAccounts:AIMSAccount[]       =   [];
    protected resolutionGuard                     =   new AlBehaviorPromise<boolean>();         //  This functions as a mutex so that access to resolvedAccount is only available at appropriate times.
    protected detectionGuard                      =   new AlBehaviorPromise<boolean>();         //  resolved after first session detection cycle with no outstanding session detection or account resolution processes in flight.
    protected detectionProcesses                  =   0;
    protected storage                             =   AlCabinet.persistent( "al_session" );

    /**
     * List of base locations ("service_stack") that should automatically have X-AIMS-Auth-Token headers added.
     */
    protected authenticatedStacks = [
      AlLocation.InsightAPI,
      AlLocation.GlobalAPI,
      AlLocation.IntegrationsAPI,
      AlLocation.GestaltAPI,
      AlLocation.EndpointsAPI,
      AlLocation.AETunerAPI,
      AlLocation.ResponderAPI,
      AlLocation.DistributorAPI
    ];


    constructor( client:AlApiClient = null ) {
      this.client = client || AlDefaultClient;
      this.notifyStream.siphon( this.client.events );
      this.notifyStream.attach( AlClientBeforeRequestEvent, this.onBeforeRequest );
      /**
       * Attempt to recreate a persisted session.  Note that the timeout below (really just an execution deferral, given the 0ms) prevents any
       * API requests from being fired before whatever application has imported us has had a chance to bootstrap.
       */
      const persistedSession = this.storage.get("session") as AIMSSessionDescriptor;
      if ( persistedSession && persistedSession.hasOwnProperty( "authentication" ) && persistedSession.authentication.token_expiration >= this.getCurrentTimestamp() ) {
        setTimeout( async () => {
                        try {
                            await this.setAuthentication(persistedSession);
                        } catch( e ) {
                            this.deactivateSession();
                            console.warn(`Failed to reinstate session from localStorage: ${e.message}`, e );
                        }
                    },
                    0 );
      } else {
        this.storage.destroy();
      }

      /* istanbul ignore next */
      AlGlobalizer.expose( 'al.session', {
          state: () => {
              return this.sessionData;
          },
          setActingAccount: ( accountId:string ) => {
              if ( ! this.isActive() ) {
                  console.warn("The acting account cannot be changed while in an unauthenticated state." );
                  return;
              }
              this.setActingAccount( accountId )
                    .then(  result => {
                                console.log("OK");
                            },
                            error => {
                                console.warn("Failed to set the acting account", error );
                            } );
          },
          expireIn: ( offset:number ) => {
              let expirationTTL = Math.floor( Date.now() / 1000 ) + offset;
              this.setTokenInfo( this.getToken(), expirationTTL );
              console.log("Updated AIMS Token to expire in %s seconds from now", offset );
          }
      } );
    }

    public reset( flushClientCache:boolean = false ) {
      if ( this.isActive() ) {
        this.deactivateSession();
      }
      AlLocatorService.reset();
      if ( flushClientCache ) {
        AlDefaultClient.reset();
      }
    }

    public async authenticate( username:string, passphrase:string, options:{actingAccount?:string|AIMSAccount,locationId?:string} = {} ):Promise<boolean> {
      let session = await this.client.authenticate( username, passphrase, undefined, true );
      await this.setAuthentication( session, options );
      return true;
    }

    public async authenticateWithSessionToken( sessionToken:string, mfaCode:string, options:{actingAccount?:string|AIMSAccount,locationId?:string} = {} ):Promise<boolean> {
      let session = await this.client.authenticateWithMFASessionToken( sessionToken, mfaCode, true );
      await this.setAuthentication( session, options );
      return true;
    }

    public async authenticateWithAccessToken( accessToken:string, options:{actingAccount?:string|AIMSAccount,locationId?:string} = {} ):Promise<boolean> {
      let tokenInfo = await AIMSClient.getTokenInfo( accessToken );
      await this.setAuthentication( { authentication: tokenInfo }, options );
      return true;
    }

    /**
     * Sets and persists session data and begins account metadata resolution.
     *
     * Successful completion of this action triggers an AlSessionStartedEvent so that non-causal elements of an application can respond to
     * the change of state.
     */
    public async setAuthentication( proposal: AIMSSessionDescriptor, options:{actingAccount?:string|AIMSAccount,locationId?:string} = {} ):Promise<AlActingAccountResolvedEvent> {
      let authenticationSchemaId = "https://alertlogic.com/schematics/aims#definitions/authentication";
      let validator = new AlJsonValidator( AIMSClient );
      let test = await validator.test( proposal.authentication, authenticationSchemaId );
      if ( ! test.valid ) {
        throw new AlDataValidationError( `The provided data is not a valid session descriptor.`, proposal, authenticationSchemaId, [ test.error ] );
      }

      if ( proposal.authentication.token_expiration <= this.getCurrentTimestamp()) {
        throw new Error( "AIMS authentication response contains unexpected expiration timestamp in the past" );
      }

      // Now that the content of the authentication session descriptor has been validated, let's make it effective
      deepMerge( this.sessionData.authentication.user, proposal.authentication.user );
      deepMerge( this.sessionData.authentication.account, proposal.authentication.account );
      this.sessionData.authentication.token = proposal.authentication.token;
      this.sessionData.authentication.token_expiration = proposal.authentication.token_expiration;
      if ( options.locationId ) {
          this.sessionData.boundLocationId = options.locationId;
      }
      this.activateSession();
      let result:AlActingAccountResolvedEvent;
      if ( options.actingAccount ) {
          result = await this.setActingAccount( options.actingAccount );
      } else if ( proposal.acting ) {
          result = await this.setActingAccount( proposal.acting );
      } else {
          result = await this.setActingAccount( proposal.authentication.account );
      }
      this.storage.set("session", this.sessionData );
      return result;
    }

    /**
     * Sets the session's acting account.
     *
     * Successful completion of this action triggers an AlActingAccountChangedEvent so that non-causal elements of an application can respond to
     * the change of effective account and entitlements.
     *
     * @param account {string|AIMSAccount} The AIMSAccount object representating the account to
     * focus on.
     *
     * @returns A promise that resolves
     */
    public async setActingAccount( account: string|AIMSAccount ):Promise<AlActingAccountResolvedEvent> {

      if ( ! account ) {
        throw new Error("Usage error: setActingAccount requires an account ID or account descriptor." );
      }
      if ( typeof( account ) === 'string' ) {
        const accountDetails = await AIMSClient.getAccountDetails( account );
        return await this.setActingAccount( accountDetails );
      }

      const previousAccount               = this.sessionData.acting;
      const actingAccountChanged          = ! this.sessionData.acting || this.sessionData.acting.id !== account.id;

      this.sessionData.acting             = account;

      const targetLocationId              = account.accessible_locations.indexOf( this.sessionData.boundLocationId ) !== -1
                                              ? this.sessionData.boundLocationId
                                              : account.default_location;
      this.setActiveDatacenter( targetLocationId );

      AlDefaultClient.defaultAccountId           = account.id;

      let resolveMetadata = AlRuntimeConfiguration.getOption<boolean>( ConfigOption.ResolveAccountMetadata, true );
      let useConsolidatedResolver = AlRuntimeConfiguration.getOption<boolean>( ConfigOption.ConsolidatedAccountResolver, false );

      if ( ! resolveMetadata ) {
        //  If metadata resolution is disabled, still trigger changed/resolved events with basic data
        this.resolvedAccount = new AlActingAccountResolvedEvent( account, new AlEntitlementCollection(), new AlEntitlementCollection() );
        this.notifyStream.trigger( new AlActingAccountChangedEvent( previousAccount, account ) );
        this.resolutionGuard.resolve(true);
        this.notifyStream.trigger( this.resolvedAccount );
        return Promise.resolve( this.resolvedAccount );
      }

      if ( actingAccountChanged || ! this.resolutionGuard.isFulfilled() ) {
        this.resolutionGuard.rescind();
        AlLocatorService.setContext( {
            insightLocationId: this.sessionData.boundLocationId,
            accessible: account.accessible_locations
        } );
        this.notifyStream.trigger( new AlActingAccountChangedEvent( previousAccount, this.sessionData.acting ) );
        this.storage.set("session", this.sessionData );
        return useConsolidatedResolver
          ? await this.resolveActingAccountConsolidated( account )
          : await this.resolveActingAccount( account );
      } else {
        return Promise.resolve( this.resolvedAccount );
      }
    }

    /**
     * Sets the 'active' datacenter.  This provides a default residency and API stack to interact with.
     */
    public setActiveDatacenter( insightLocationId:string ) {
      if ( ! this.sessionData.boundLocationId || insightLocationId !== this.sessionData.boundLocationId ) {
        this.sessionData.boundLocationId = insightLocationId;
        AlLocatorService.setContext( { insightLocationId } );
        this.storage.set( "session", this.sessionData );
        if ( AlInsightLocations.hasOwnProperty( insightLocationId ) ) {
            const metadata = AlInsightLocations[insightLocationId];
            this.notifyStream.trigger( new AlActiveDatacenterChangedEvent( insightLocationId, metadata.residency, metadata ) );
        }
      }
    }

    /**
     * Retrieves the 'active' datacenter, falling back on the acting account's or primary account's default_location
     * as necessary.
     */
    public getActiveDatacenter() {
      if ( this.isActive() ) {
        if ( this.sessionData.boundLocationId ) {
          return this.sessionData.boundLocationId;
        }
        if ( this.sessionData.acting ) {
          return this.sessionData.acting.default_location;
        }
        if ( this.sessionData.authentication && this.sessionData.authentication.account ) {
          return this.sessionData.authentication.account.default_location;
        }
      }
      return null;
    }

    /**
     * Convenience function to set token and expiry values
     * Modelled on /aims/v1/:account_id/account
     * To be called by AIMS Service
     */
    setTokenInfo(token: string, tokenExpiration: number) {
      this.sessionData.authentication.token = token;
      this.sessionData.authentication.token_expiration = tokenExpiration;
      this.storage.set("session", this.sessionData );
    }

    /**
     * Activate Session
     */
    activateSession(): boolean {
      const wasActive = this.sessionIsActive;
      if ( this.sessionData.authentication.token_expiration > this.getCurrentTimestamp()) {
        this.sessionIsActive = true;
      }
      if ( this.sessionIsActive ) {
        SubscriptionsClient.setInternalUser( this.getPrimaryAccountId() === "2" );
        if ( ! wasActive ) {
          this.notifyStream.tap();        //  *always* get notifyStream flowing at this point, so that we can intercept AlBeforeRequestEvents
          this.notifyStream.trigger( new AlSessionStartedEvent( this.sessionData.authentication.user, this.sessionData.authentication.account ) );
        }
      }
      return this.isActive();
    }

    /**
     * Deactivate Session
     */
    deactivateSession(): boolean {
      this.sessionData = JSON.parse(JSON.stringify(AlNullSessionDescriptor));
      this.sessionIsActive = false;
      this.storage.destroy();
      this.notifyStream.trigger( new AlSessionEndedEvent( ) );
      AlDefaultClient.defaultAccountId = null;
      return this.isActive();
    }

    /**
     * Is the Session Active?
     */
    isActive(): boolean {
      return this.sessionIsActive;
    }

    /**
     * Get Session
     */
    getSession(): AIMSSessionDescriptor {
      return this.sessionData;
    }

    /**
     * Get Authentication
     */
    getAuthentication(): AIMSAuthentication {
      return this.sessionData.authentication;
    }

    /*
     * Gets the ID of the primary account, the one the acting user belongs to.
     */
    getPrimaryAccountId(): string {
        return this.isActive() ? this.sessionData.authentication.account.id : null;
    }

    /*
     * Gets the primary account
     */
    getPrimaryAccount(): AIMSAccount {
        return this.sessionData.authentication.account;
    }

    /**
     * Get the ID of the acting account (account the user is currently working in)
     */
    getActingAccountId(): string {
        return this.isActive() ? this.sessionData.acting.id : null;
    }

    /**
     * Get acting Account Name - (account the user is currently working in)
     */
    getActingAccountName(): string {
      return this.sessionData.acting.name;
    }

    /**
     * Get Default Location for the acting account
     */
    getActingAccountDefaultLocation() {
      return this.sessionData.acting.default_location;
    }

    /**
     * Get Accessible Locations for the acting account
     */
    getActingAccountAccessibleLocations(): string[] {
      return this.sessionData.acting.accessible_locations;
    }

    /**
     * Get the acting account entity in its entirety
     */
    getActingAccount(): AIMSAccount {
      return this.sessionData.acting;
    }

    /**
     * Get Token
     */
    getToken(): string {
      return this.sessionData.authentication.token;
    }

    /**
     * Get Token Expiry
     */
    getTokenExpiry(): number {
      return this.sessionData.authentication.token_expiration;
    }

    /*
     * Returns the entire acting user record
     */
    getUser(): AIMSUser {
      return this.sessionData.authentication.user;
    }

    /**
     * Get User ID
     */
    getUserId(): string {
      return this.sessionData.authentication.user.id;
    }

    /**
     * Get User Name
     */
    getUserName(): string {
      return this.sessionData.authentication.user.name;
    }

    /**
     * Get User Email
     */
    getUserEmail(): string {
      return this.sessionData.authentication.user.email;
    }

    /**
     * @deprecated
     * Alias for getActingAccountId
     */
    getActingAccountID(): string {
        return this.getActingAccountId();
    }

    /*
     * @deprecated
     * Alias for `getUserId`
     */
    getUserID(): string {
      return this.sessionData.authentication.user.id;
    }

    /**
     * @deprecated
     * Please use `getPrimaryAccountId()` instead
     */
    getUserAccountID(): string {
      return this.sessionData.authentication.account.id;
    }

    /**
     * @deprecated
     * Get Accessible Locations for the users account
     */
    getUserAccessibleLocations(): string[] {
      return this.sessionData.authentication.account.accessible_locations;
    }

    /**
     * Convenience method to defer logic until ALSession has reached a stable state.
     * For the purposes of this service, "ready" is defined as having completed one or more session detection
     * cycles AND ( user is unauthenticated OR acting account is resolved ).
     */
    public async ready(): Promise<void> {
        await this.detectionGuard;          //  resolves when first detection process is complete and no other detection cycles are in progress
        if ( this.isActive() ) {
            await this.resolved();          //  resolves when acting account information has been loaded and processed
        }
    }

    /**
     * Convenience method to wait until authentication status and metadata have been resolved.
     *
     * PLEASE NOTE: that this async function will not resolve until authentication is complete and subscriptions metadata
     * has been retrieved and collated; in an unauthenticated context, it will never resolve!
     */
    public async resolved(): Promise<void> {
      return this.resolutionGuard.then( () => {} );
    }

    /**
     * Retrieves the primary account's entitlements, or null if there is no session.
     */
    public getPrimaryEntitlementsSync():AlEntitlementCollection|null {
      if ( ! this.sessionIsActive ) {
        return null;
      }
      return this.resolvedAccount.primaryEntitlements;
    }

    /**
     * Convenience method to retrieve the entitlements for the primary account.
     * See caveats for `AlSession.authenticated` method, which also apply to this method.
     */
    public async getPrimaryEntitlements():Promise<AlEntitlementCollection> {
      return this.resolutionGuard.then( () => this.getPrimaryEntitlementsSync() );
    }

    /**
     * Retrieves the acting account's entitlements, or null if there is no session.
     */
    public getEffectiveEntitlementsSync():AlEntitlementCollection|null {
      if ( ! this.sessionIsActive || ! this.resolvedAccount ) {
        return null;
      }
      return this.resolvedAccount.entitlements;
    }

    /**
     * Convenience method to retrieve the entitlements for the current acting account.
     * See caveats for `AlSession.authenticated` method, which also apply to this method.
     */
    public async getEffectiveEntitlements():Promise<AlEntitlementCollection> {
      return this.resolutionGuard.then( () => this.resolvedAccount.entitlements );
    }

    /**
     * Convenience method to retrieve the array of accounts managed by the current acting account.
     * See caveats for `AlSession.authenticated` method, which also apply to this method.
     */
    public async getManagedAccounts():Promise<AIMSAccount[]> {
      return this.resolutionGuard.then( () => AIMSClient.getManagedAccounts( this.getActingAccountId(), { active: true } ) );
    }

    /**
     * Allows an external mechanism to indicate that it is detecting a session.
     */
    public startDetection() {
        this.detectionProcesses += 1;
        this.detectionGuard.rescind();
    }

    /**
     * Allows an external mechanism to indicate that it is done detecting a session.
     */
    public endDetection() {
        this.detectionProcesses -= 1;
        if ( this.detectionProcesses === 0 ) {
            this.detectionGuard.resolve( true );
        }
    }

    /**
     * Private Internal/Utility Methods
     */

    protected onBeforeRequest = ( event:AlClientBeforeRequestEvent ) => {
      /*  tslint:disable:no-boolean-literal-compare */
      if ( this.sessionIsActive ) {
        if ( event.request.aimsAuthHeader === true
                ||
             ( this.authenticatedStacks.includes( event.request.service_stack ) && event.request.aimsAuthHeader !== false ) ) {
          event.request.headers = event.request.headers || {};
          event.request.headers['X-AIMS-Auth-Token'] = this.getToken();
        }
      }
    }

    /**
     * Get the current timestamp (seconds since the epoch)
     */
    protected getCurrentTimestamp(): number {
      return new Date().getTime() / 1000;
    }

    /**
     * A utility method to resolve a partially populated AlActingAccountResolvedEvent instance.
     *
     * This method will retrieve the full account details, managed accounts, and entitlements for this account
     * and then emit an AlActingAccountResolvedEvent through the session's notifyStream.
     */
    protected async resolveActingAccount( account:AIMSAccount ) {
      const resolved:AlActingAccountResolvedEvent = new AlActingAccountResolvedEvent( account, null, null );
      let dataSources:Promise<any>[] = [
          AIMSClient.getAccountDetails( account.id ),
          SubscriptionsClient.getEntitlements( this.getPrimaryAccountId() ) ];

      if ( account.id !== this.getPrimaryAccountId() ) {
        dataSources.push( SubscriptionsClient.getEntitlements( account.id ) );
      }

      return Promise.all( dataSources )
              .then(  dataObjects => {
                        const account:AIMSAccount                           =   dataObjects[0];
                        const primaryEntitlements:AlEntitlementCollection   =   dataObjects[1];
                        let actingEntitlements:AlEntitlementCollection;
                        if ( dataObjects.length > 2 ) {
                          actingEntitlements                                =   dataObjects[2];
                        } else {
                          actingEntitlements                                =   primaryEntitlements;
                        }

                        resolved.actingAccount      =   account;
                        resolved.primaryEntitlements=   primaryEntitlements;
                        resolved.entitlements       =   actingEntitlements;
                        this.resolvedAccount        =   resolved;
                        this.resolutionGuard.resolve(true);
                        this.notifyStream.trigger( resolved );

                        return resolved;
                      },
                      error => {
                        console.error(`Error: could not resolve the acting account to "${account.id}"`, error );
                        return Promise.reject( error );
                      } );
    }

    protected async resolveActingAccountConsolidated( account:AIMSAccount ) {
      let request = {
        service_stack: AlLocation.GestaltAPI,
        service_name: undefined,
        version: undefined,
        path: `/account/v1/${account.id}/metadata`,
        retry_count: 3,
        retry_interval: 1000
      };
      try {
        let metadata = await AlDefaultClient.get( request );
        this.resolvedAccount = new AlActingAccountResolvedEvent(
          metadata.actingAccount,
          AlEntitlementCollection.import(metadata.effectiveEntitlements),
          AlEntitlementCollection.import(metadata.primaryEntitlements)
        );
        this.resolutionGuard.resolve( true );
        this.notifyStream.trigger( this.resolvedAccount );
        return this.resolvedAccount;
      } catch( e ) {
        console.warn("Failed to retrieve consolidated account metadata: falling back to default resolution method.", e );
        return this.resolveActingAccount( account );
      }
    }
}

/*  tslint:disable:variable-name */
export const AlSession = AlGlobalizer.instantiate( "AlSession", () => new AlSessionInstance(), "FATAL ERROR: multiple instances of @al/session are running.  Please sanitizer your dependency graph!" );
