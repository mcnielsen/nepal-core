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
    AIMSUser,
    AIMSAccount,
    AIMSAuthentication,
    AIMSSessionDescriptor,
    AlSubscriptionGroup,
    AlInsightLocations,
    AlLocation,
    AlEntitlementCollection,
    AlTriggerStream,
    deepMerge,
    AlBehaviorPromise,
    AlCabinet,
    ConfigOption,
    AlBaseError
} from "../common";
import { AlExecutionContext } from '../context';
import { AlBeforeNetworkRequest } from '../client';
import { AlErrorHandler } from '../errors';
import { AIMS } from '../aims';
import { Subscriptions } from "../subscriptions";
import {
    AlActingAccountChangedEvent,
    AlActingAccountResolvedEvent,
    AlActiveDatacenterChangedEvent,
    AlSessionEndedEvent,
    AlSessionStartedEvent,
} from './events';

interface AuthenticationOptions {
  actingAccount?:AIMSAccount|string;
  locationId?:string;
}

/**
 * AlSessionInstance maintains session data for a specific session.
 */
export class AlSessionInstance
{
    public get notifyStream():AlTriggerStream {
        return this.context.events;
    }

    /**
     * Protected state properties
     */
    protected sessionIsActive                      =   false;
    protected _session: AIMSSessionDescriptor      =   null;
    protected get session():AIMSSessionDescriptor {
        if ( ! this._session ) {
            throw new AlBaseError("Usage error: this method of AlSessionInstance cannot be invoked in an unauthenticated state." );
        }
        return this._session;
    }
    protected subscriptions                       =     new AlSubscriptionGroup();

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
    protected activeDetectionCycles               =   0;
    protected storage                             =   AlCabinet.persistent( "al_session" );

    /**
     * List of base locations ("stacks") that should automatically have X-AIMS-Auth-Token headers added.
     */
    protected authenticatedStacks = [
        AlLocation.InsightAPI,
        AlLocation.GlobalAPI,
        AlLocation.IntegrationsAPI,
        AlLocation.GestaltAPI,
        AlLocation.EndpointsAPI,
        AlLocation.AETunerAPI,
        AlLocation.ResponderAPI,
        AlLocation.DistributorAPI,
        AlLocation.MDRAPI,
        AlLocation.YARDAPI,
      /**
       * STOP!  Please read this note in its entirety before you add items to this list of authenticated stacks.
       *
       * If you are authoring an API client for an API based on a subdomain of .mdr.global.alertlogic.com (or its integration equivalent),
       * please don't create a new AlLocation entry for it.  Instead, use the generic AlLocation.MDRAPI -- this will inject
       * service_name into the domain (e.g., aetuner.mdr.global.alertlogic.com or kevinwashere.mdr.global.alertlogic.com).
       * It will also keep our AlLocatorService from becoming really, really slow like an old person with bad knees.
       * So go back, refactor your client, and do it the right way.
       *
       * Failure to comply may result in surprise tickling or water balloon accidents.
       */
    ];

    constructor( public context:AlExecutionContext ) {
        this.subscriptions.manage( this.context.on( AlBeforeNetworkRequest, this.onBeforeRequest ) );
        /**
         * Attempt to recreate a persisted session.  Note that the timeout below (really just an execution deferral, given the 0ms) prevents any
         * API requests from being fired before whatever application has imported us has had a chance to bootstrap.
         */
        const persistedSession = this.storage.get("session") as AIMSSessionDescriptor;
        if ( persistedSession && persistedSession.hasOwnProperty( "authentication" ) && persistedSession.authentication.token_expiration >= this.getCurrentTimestamp() ) {
            this.restoreSession( persistedSession );
        } else {
            this.storage.destroy();
        }
    }

    /**
     * Sets and persists session data and begins account metadata resolution.
     *
     * Successful completion of this action triggers an AlSessionStartedEvent so that non-causal elements of an application can respond to
     * the change of state.
     */
    public async setAuthentication( proposal: AIMSSessionDescriptor ):Promise<AlActingAccountResolvedEvent> {
      try {
        this.startDetection();
        let authenticationSchemaId = "https://alertlogic.com/schematics/aims#definitions/authentication";

        if ( proposal.authentication.token_expiration <= this.getCurrentTimestamp()) {
          throw new AlBaseError( "AIMS authentication response contains unexpected expiration timestamp in the past", proposal.authentication );
        }

        // Now that the content of the authentication session descriptor has been validated, let's make it effective
        if ( this._session ) {
            deepMerge( this._session.authentication.user, proposal.authentication.user );
            deepMerge( this._session.authentication.account, proposal.authentication.account );
        } else {
            this._session = proposal;
        }
        this.session.authentication.token = proposal.authentication.token;
        this.session.authentication.token_expiration = proposal.authentication.token_expiration;
        if ( proposal.boundLocationId ) {
            this.session.boundLocationId = proposal.boundLocationId;
        }
        this.activateSession();

        let result:AlActingAccountResolvedEvent = proposal.acting
                                                  ? await this.setActingAccount( proposal.acting )
                                                  : await this.setActingAccount( proposal.authentication.account );

        this.storage.set("session", this.session );
        return result;
      } catch( e ) {
        AlErrorHandler.log( e, `AlSession.setAuthentication() failed` );
        this.deactivateSession();
        throw e;
      } finally {
        this.endDetection();
      }
    }

    /**
     * Sets the session's acting account.
     *
     * Successful completion of this action triggers an AlActingAccountChangedEvent so that non-causal elements of an application can respond to
     * the change of effective account and entitlements.
     *
     * @param account {string|AIMSAccount} The AIMSAccount object representating the account to focus on.
     *
     * @returns A promise that resolves
     */
    public async setActingAccount( account: string|AIMSAccount ):Promise<AlActingAccountResolvedEvent> {
      if ( ! account ) {
        throw new Error("Usage error: setActingAccount requires an account ID or account descriptor." );
      }
      if ( typeof( account ) === 'string' ) {
          const aims = this.context.client(AIMS);
          const accountDetails = await aims.getAccountDetails( account );
          return await this.setActingAccount( accountDetails );
      }
      const previousAccount               = this.session.acting;
      const mustResolveAccount            = ! this.session.acting
                                              || this.session.acting.id !== account.id;

      this.session.acting             = account;

      const targetLocationId              = account.accessible_locations.indexOf( this.session.boundLocationId ) !== -1
                                              ? this.session.boundLocationId
                                              : account.default_location;
      this.setActiveDatacenter( targetLocationId );

      this.context.defaultAccountId    = account.id;

      let resolveMetadata                 = this.context.getOption<boolean>( ConfigOption.ResolveAccountMetadata, true );

      if ( ! resolveMetadata ) {
        //  If metadata resolution is disabled, still trigger changed/resolved events with basic data
        this.resolvedAccount = new AlActingAccountResolvedEvent( account, new AlEntitlementCollection(), new AlEntitlementCollection() );
        this.context.dispatch( new AlActingAccountChangedEvent( previousAccount, account ) );
        this.resolutionGuard.resolve(true);
        this.context.dispatch( this.resolvedAccount );
        return Promise.resolve( this.resolvedAccount );
      }

      if ( mustResolveAccount || ! this.resolutionGuard.isFulfilled() ) {
        this.resolutionGuard.rescind();
        this.context.target( null, null, this.session.boundLocationId, account.accessible_locations );
        this.context.dispatch( new AlActingAccountChangedEvent( previousAccount, this.session.acting ) );
        this.storage.set("session", this.session );
        return await this.resolveActingAccount( account );
      } else {
        return Promise.resolve( this.resolvedAccount );
      }

    }

    /**
     * Sets the 'active' datacenter.  This provides a default residency and API stack to interact with.
     */
    public setActiveDatacenter( insightLocationId:string ) {
      if ( ! this.session.boundLocationId || insightLocationId !== this.session.boundLocationId ) {
        this.session.boundLocationId = insightLocationId;
        this.context.target( null, null, insightLocationId );
        this.storage.set( "session", this.session );
        if ( AlInsightLocations.hasOwnProperty( insightLocationId ) ) {
            const metadata = AlInsightLocations[insightLocationId];
            this.context.dispatch( new AlActiveDatacenterChangedEvent( insightLocationId, metadata.residency, metadata ) );
        }
      }
    }

    /**
     * Retrieves the 'active' datacenter, falling back on the acting account's or primary account's default_location
     * as necessary.
     */
    public getActiveDatacenter() {
      if ( this.isActive() ) {
        if ( this.session.boundLocationId ) {
          return this.session.boundLocationId;
        }
        if ( this.session.acting ) {
          return this.session.acting.default_location;
        }
        if ( this.session.authentication && this.session.authentication.account ) {
          return this.session.authentication.account.default_location;
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
      this.session.authentication.token = token;
      this.session.authentication.token_expiration = tokenExpiration;
      this.storage.set("session", this.session );
    }

    /**
     * Activate Session
     */
    activateSession(): boolean {
      const wasActive = this.sessionIsActive;
      if ( this.session.authentication.token_expiration > this.getCurrentTimestamp()) {
        this.sessionIsActive = true;
      }
      if ( this.sessionIsActive ) {
        this.context.client(Subscriptions).setInternalUser( this.getPrimaryAccountId() === "2" );
        if ( ! wasActive ) {
          this.context.dispatch( new AlSessionStartedEvent( this.session.authentication.user, this.session.authentication.account ) );
        }
      }
      return this.isActive();
    }

    /**
     * Deactivate Session
     */
    deactivateSession(): boolean {
      this._session = null;
      this.sessionIsActive = false;
      this.storage.destroy();
      this.context.dispatch( new AlSessionEndedEvent( ) );
      this.context.defaultAccountId = undefined;
      return this.isActive();
    }

    /**
     * Is the Session Active?
     */
    isActive(): boolean {
      if ( this.sessionIsActive && this.getTokenExpiry() < this.getCurrentTimestamp() ) {
          this.deactivateSession();
      }
      return this.sessionIsActive;
    }

    /**
     * Get Session
     */
    getSession(): AIMSSessionDescriptor {
      return this.session;
    }

    /**
     * Get Authentication
     */
    getAuthentication(): AIMSAuthentication {
      return this.session.authentication;
    }

    /*
     * Gets the ID of the primary account, the one the acting user belongs to.
     */
    getPrimaryAccountId(): string {
        return this.isActive() ? this.session.authentication.account.id : null;
    }

    /*
     * Gets the primary account
     */
    getPrimaryAccount(): AIMSAccount {
        return this.session.authentication.account;
    }

    /**
     * Returns the last resolved account information snapshot
     */
    getResolvedAccount():AlActingAccountResolvedEvent {
        return this.resolvedAccount;
    }

    /**
     * Get the ID of the acting account (account the user is currently working in)
     */
    getActingAccountId(): string {
        return this.session?.acting?.id;
    }

    /**
     * Get acting Account Name - (account the user is currently working in)
     */
    getActingAccountName(): string {
      return this.session?.acting.name;
    }

    /**
     * Get Default Location for the acting account
     */
    getActingAccountDefaultLocation() {
      return this.session?.acting?.default_location;
    }

    /**
     * Get Accessible Locations for the acting account
     */
    getActingAccountAccessibleLocations(): string[] {
      return this.session?.acting?.accessible_locations;
    }

    /**
     * Get the acting account entity in its entirety
     */
    getActingAccount(): AIMSAccount {
      return this.session?.acting;
    }

    /**
     * Get Token
     */
    getToken(): string {
      return this.session.authentication.token;
    }

    /**
     * Get Token Expiry
     */
    getTokenExpiry(): number {
      return this.session.authentication.token_expiration;
    }

    /*
     * Returns the entire acting user record
     */
    getUser(): AIMSUser {
      return this.session.authentication.user;
    }

    /**
     * Get User ID
     */
    getUserId(): string {
      return this.session.authentication.user.id;
    }

    /**
     * Get User Name
     */
    getUserName(): string {
      return this.session.authentication.user.name;
    }

    /**
     * Get User Email
     */
    getUserEmail(): string {
      return this.session.authentication.user.email;
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
      return this.session.authentication.user.id;
    }

    /**
     * @deprecated
     * Please use `getPrimaryAccountId()` instead
     */
    getUserAccountID(): string {
      return this.session.authentication.account.id;
    }

    /**
     * @deprecated
     * Get Accessible Locations for the users account
     */
    getUserAccessibleLocations(): string[] {
      return this.session.authentication.account.accessible_locations;
    }

    /**
     * Convenience method to defer logic until ALSession has reached a stable state.
     * For the purposes of this service, "ready" is defined as having completed one or more session detection
     * cycles AND ( user is unauthenticated OR acting account is resolved ).
     */
    public async ready(): Promise<void> {
        if ( this.activeDetectionCycles > 0 ) {
            await this.detectionGuard;      //  resolves when first detection process is complete and no other detection cycles are in progress
        }
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
     * Sets primary entitlements.
     */
    public setPrimaryEntitlements( collection:AlEntitlementCollection ) {
        if ( ! this.sessionIsActive || ! this.resolvedAccount ) {
            throw new Error("Entitlements cannot be set without an established session." );
        }
        this.resolvedAccount.primaryEntitlements = collection;
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
     * Sets effective entitlements.
     */
    public setEffectiveEntitlements( collection:AlEntitlementCollection ) {
        if ( ! this.sessionIsActive || ! this.resolvedAccount ) {
            throw new Error("Entitlements cannot be set without an established session." );
        }
        this.resolvedAccount.entitlements = collection;
    }

    /**
     * Convenience method to retrieve the array of accounts managed by the current acting account (or a specific
     * other account, if specified)..
     * See caveats for `AlSession.authenticated` method, which also apply to this method.
     */
    public async getManagedAccounts( accountId?:string ):Promise<AIMSAccount[]> {
      if ( ! accountId ) {
        accountId = this.getActingAccountId();
      }
      return this.resolutionGuard.then( () => this.context.client(AIMS).getAccountsByRelationship( accountId, "managed", { active: true } ) );
    }

    /**
     * Allows an external mechanism to indicate that it is detecting a session.
     */
    public startDetection() {
        this.activeDetectionCycles += 1;
        this.detectionGuard.rescind();
    }

    /**
     * Allows an external mechanism to indicate that it is done detecting a session.
     */
    public endDetection() {
        this.activeDetectionCycles -= 1;
        if ( this.activeDetectionCycles === 0 ) {
            this.detectionGuard.resolve( true );
        }
    }

    /**
     * Private Internal/Utility Methods
     */

    protected async restoreSession( session:AIMSSessionDescriptor ) {
      try {
          this.startDetection();
          await this.setAuthentication(session);
      } catch( e ) {
          this.deactivateSession();
      } finally {
          this.endDetection();
      }
    }


    protected async mergeSessionOptions( session:AIMSSessionDescriptor,
                                         options:AuthenticationOptions ) {
      if ( options.actingAccount ) {
        if ( typeof( options.actingAccount ) === 'string' ) {
          session.acting = await ( this.context.client(AIMS) ).getAccountDetails( options.actingAccount );
        } else {
          session.acting = options.actingAccount;
        }
      }
      if ( options.locationId ) {
        session.boundLocationId = options.locationId;
      }
    }


    protected onBeforeRequest = ( event:AlBeforeNetworkRequest ) => {
        if ( this.sessionIsActive && event.request.credentialed !== false ) {
            let stack = event.request.endpoint?.stack ?? "none";
            if ( this.authenticatedStacks.includes( stack ) ) {
                if ( event.request.endpoint?.aimsAuthHeader !== false ) { 
                    event.request.headers = event.request.headers || {};
                    event.request.headers['X-AIMS-Auth-Token'] = this.getToken();
                    event.request.credentialed = true;
                }
            } else {
                if ( event.request.endpoint?.aimsAuthHeader ) {
                    event.request.headers = event.request.headers || {};
                    event.request.headers['X-AIMS-Auth-Token'] = this.getToken();
                    event.request.credentialed = true;
                }
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
     * and then emit an AlActingAccountResolvedEvent.
     */
    protected async resolveActingAccount( account:AIMSAccount ) {
      const resolved:AlActingAccountResolvedEvent = new AlActingAccountResolvedEvent( account, null, null );
      const aims            = this.context.client( AIMS );
      const subscriptions   = this.context.client( Subscriptions );
      let dataSources:Promise<any>[] = [
          this.context.client( AIMS ).getAccountDetails( account.id ),
          this.context.client( Subscriptions ).getEntitlements( this.getPrimaryAccountId() )
      ];

      if ( account.id !== this.getPrimaryAccountId() ) {
        dataSources.push( this.context.client( Subscriptions ).getEntitlements( account.id ) );
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

                        resolved.actingAccount          =   account;
                        resolved.primaryEntitlements    =   primaryEntitlements;
                        resolved.entitlements           =   actingEntitlements;
                        this.resolvedAccount            =   resolved;
                        this.resolutionGuard.resolve(true);
                        this.context.dispatch( resolved );

                        return resolved;
                      },
                      error => {
                        console.error(`Error: could not resolve the acting account to "${account.id}"`, error );
                        return Promise.reject( error );
                      } );
    }
}
