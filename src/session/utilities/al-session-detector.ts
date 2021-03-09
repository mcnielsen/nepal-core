/**
 *  @author Kevin Nielsen <knielsen@alertlogic.com>
 *  @author Robert Parker <robert.parker@alertlogic.com>
 *
 *  @copyright Alert Logic, Inc 2019
 */

import { WebAuth } from 'auth0-js';
import { AIMSClient, AIMSSessionDescriptor } from "../../aims-client";
import { AlDefaultClient } from "../../client";
import { AlErrorHandler } from '../../error-handler';
import {
    AlLocation,
    AlLocatorService,
} from "../../common/navigation";
import { AlStopwatch } from "../../common/utility";

import { AlSession } from '../al-session';
import { AlConduitClient } from './al-conduit-client';
import { AlRuntimeConfiguration, ConfigOption } from '../../configuration';

export class AlSessionDetector
{
    /*----- Private Static Properties ------------------------
    /**
     *  A cached copy of the auth0 client interface
     */
    protected static auth0Client:WebAuth = undefined;

    /**
     * If session detection is currently executing, this is the observable in progress.
     */
    protected static detectionPromise:Promise<boolean> = null;

    /**
     * Cached userInfo (this holds data from auth0's userInfo endpoint, keyed by access token)
     */
    protected static cachedA0UserInfo:{[accessKey:string]:any} = {};

    /*----- Public Instance Properties -----------------------
    /**
     *  Indicates whether or not this authentication provider is currently authenticated.
     */
    public authenticated:boolean = false;

    /**
     *
     */
    constructor( public conduit:AlConduitClient,
                 public useAuth0:boolean = true ) {
    }

    /**
     *  Checks to see if a session already exists.
     *  If a session exists or is discovered, the observable emits `true` and internal state is guaranteed to be authenticated and properly populated.
     *  If no session is found, the observable emits `false` and internal state is guaranteed to be clean and unauthenticated.
     *
     *  @param {string} preferredActingAccountId - If provided and there is no current session, this accountId will be used instead of the default/primary.
     */

    public async detectSession( preferredActingAccountId:string = null ): Promise<boolean> {

        if ( AlSessionDetector.detectionPromise === null ) {
            AlSessionDetector.detectionPromise = new Promise( ( resolve, reject ) => {
                this.innerDetectSession( resolve, reject );
            } );
        }

        return AlSessionDetector.detectionPromise;
    }

    /**
     *  Imperatively forces the user to authenticate.
     */

    public forceAuthentication() {
        const loginUri = AlDefaultClient.resolveLocation(AlLocation.AccountsUI, '/#/login');
        const returnUri = window.location.origin + ((window.location.pathname && window.location.pathname.length > 1) ? window.location.pathname : "");
        this.redirect( `${loginUri}?return=${encodeURIComponent(returnUri)}&token=null`, "User is not authenticated; redirecting to login." );
    }

    async innerDetectSession( resolve:any, reject:any ) {

        await AlSession.ready();        //  always wait for stable session state before detection starts

        AlSession.startDetection();

        /**
         * Does AlSession say we're active?  If so, then yey!
         */
        if ( AlSession.isActive() ) {
            return this.onDetectionSuccess( resolve );
        }

        /**
         * Can Gestalt's session status endpoint confirm we have a session?
         */
        if ( AlRuntimeConfiguration.getOption( ConfigOption.GestaltAuthenticate, false ) ) {
            try {
                let session = await this.getGestaltSession();
                await this.ingestExistingSession( session );
                return this.onDetectionSuccess( resolve );
            } catch( e ) {
                console.error( 'Unexpected error encountered while attempting to get session status from Gestalt; falling through.', e );
            }
        }

        /**
         * Check conduit to see if it has a session available
         */
        let session = await this.conduit.getSession();
        if ( session && typeof( session ) === 'object' && this.sessionIsValid( session ) ) {
            try {
                await this.ingestExistingSession( session );
                return this.onDetectionSuccess( resolve );
            } catch ( e ) {
                await this.conduit.deleteSession();
                return this.onDetectionFail( resolve, "Conduit session could not be ingested; destroying it and triggering unauthenticated access handling.");
            }
        }
        if ( this.useAuth0 ) {
            try {
                let authenticator   =   this.getAuth0Authenticator();
                let config          =   this.getAuth0Config( { usePostMessage: true, prompt: 'none' } );
                let accessToken     =   await this.getAuth0SessionToken( authenticator, config, 5000 );
                let tokenInfo       =   await AIMSClient.getTokenInfo( accessToken );

                this.ingestExistingSession( session ).then( () => this.onDetectionSuccess( resolve ),
                                                            error => this.onDetectionFail( resolve, `Failed to detect auth0 session` ) );
            } catch( e ) {
                let error = AlErrorHandler.normalize( e );
                return this.onDetectionFail( resolve, `Failed to detect auth0 session: ${e.message}` );
            }
        }
    }

    async getGestaltSession():Promise<AIMSSessionDescriptor> {
        let residency = 'US';
        let environment = AlLocatorService.getCurrentEnvironment();
        if ( environment === 'development' ) {
            environment = 'integration';
        }
        let sessionStatusURL = AlLocatorService.resolveURL( AlLocation.AccountsUI, `/session/v1/status`, { residency, environment } );
        let sessionStatus = await AlDefaultClient.get( {
            url: sessionStatusURL,
            withCredentials: true
        } );
        let sessionDescriptor = {
            authentication: sessionStatus.session || {}
        };
        if ( this.sessionIsValid( sessionDescriptor ) ) {
            return sessionDescriptor;
        }
        throw new Error("No session found." );
    }

    /**
     *  Given an AIMSAuthentication object -- which defines the token, user, and account whose session is being
     *  referenced -- this method will collect any missing data elements
     */

    ingestExistingSession = async ( proposedSession: AIMSSessionDescriptor ):Promise<boolean> => {
        let session = await this.normalizeSessionDescriptor( proposedSession );
        try {
            await AlSession.setAuthentication( session );
            this.authenticated = AlSession.isActive();
            return true;
        } catch( e ) {
            this.authenticated = false;
            console.error("Failed to ingest session: ", e );
            throw new Error( e.toString() );
        }
    }

    /**
     * Checks to see if a session is currently active
     */
    sessionIsValid( proposed: AIMSSessionDescriptor ):boolean {
        if ( 'authentication' in proposed
                && 'token' in proposed.authentication
                && 'token_expiration' in proposed.authentication ) {
            if ( proposed.authentication.token_expiration > Date.now() / 1000 ) {
                return true;
            }
        }
        return false;
    }

    /* istanbul ignore next */
    redirect = ( targetUri:string, message:string = null ) => {
        if ( message ) {
            console.warn( message, targetUri );
        }
        window.location.replace(targetUri);
    }

    /**
     * Handles promise-based session-detection success (resolve true)
     */

    onDetectionFail = ( resolve:{(error:any):any}, warning:string = null ) => {
        if ( warning ) {
            console.warn( warning );
        }
        this.authenticated = false;
        AlSessionDetector.detectionPromise = null;
        AlSession.endDetection();
        resolve( false );
    }


    /**
     * Handles promise-based session-detection failure (resolve false)
     */

    onDetectionSuccess = ( resolve:{(result:any):any} ) => {
        this.authenticated = true;
        AlSessionDetector.detectionPromise = null;
        AlSession.endDetection();
        resolve( true );
    }

    /**
     * Normalizes session data.
     */
    normalizeSessionDescriptor( session:AIMSSessionDescriptor ):Promise<AIMSSessionDescriptor> {
        return new Promise<AIMSSessionDescriptor>( ( resolve, reject ) => {
            if ( ! session.authentication.hasOwnProperty('token_expiration') || session.authentication.token_expiration === null ) {
                session.authentication.token_expiration = this.getTokenExpiration( session.authentication.token );
            }
            if ( session.authentication.user && session.authentication.account ) {
                return resolve( session );
            }
            AIMSClient.getTokenInfo( session.authentication.token )
                .then(  tokenInfo => {
                            if ( typeof( tokenInfo.user ) === 'object' ) {
                                session.authentication.user = tokenInfo.user;
                            }
                            if ( typeof( tokenInfo.account ) === 'object' ) {
                                session.authentication.account = tokenInfo.account;
                            }
                            if ( tokenInfo.token_expiration ) {
                                session.authentication.token_expiration = tokenInfo.token_expiration;
                            }
                            return resolve( session );
                        },
                        error => {
                            reject( error );
                        } );
        } );
    }

    /**
     * Calculates the correct auth0 configuration to use.
     */
    getAuth0Config( merge:any = {} ):any {
        let w = <any>window;
        let auth0Node = AlLocatorService.getNode( AlLocation.Auth0 );
        if ( ! auth0Node || ! auth0Node.data || ! auth0Node.data.hasOwnProperty( 'clientID' ) ) {
            throw new Error("Service matrix does not reflect an auth0 node; check your app configuration." );
        }
        return Object.assign(   {
                                    domain:         auth0Node.uri,
                                    clientID:       auth0Node.data.clientID,
                                    responseType:   'token id_token',
                                    audience:       'https://alertlogic.com/',
                                    scope:          'openid user_metadata',
                                    prompt:         true,
                                    redirectUri:    w.location.origin
                                },
                                merge );
    }

    /**
     * Retrieve a reference to the Auth0 web auth instance.  This code is excluded from unit testing.
     */
    /* istanbul ignore next */
    getAuth0Authenticator():WebAuth {
        if ( AlSessionDetector.auth0Client === undefined ) {
            /* Because Auth0 persists itself as a global, we will need to cast it from <any>window.auth.  Fun stuff :/ */
            let w = <any>window;
            if ( ! w.auth0 ) {
                console.warn( "Could not find the auth0 global object; is Auth0 installed?" );
                AlSessionDetector.auth0Client = null;
                return null;
            }
            let authenticator = <WebAuth>new w.auth0.WebAuth( this.getAuth0Config() );
            if ( ! authenticator.hasOwnProperty("client" ) ) {
                //  Stop for this error, bad build?
                throw new Error("auth0.WebAuth instance does not have a client property; wrong version perhaps?" );
            }
            AlSessionDetector.auth0Client = authenticator;
        }
        return AlSessionDetector.auth0Client;
    }

    getAuth0UserInfo = ( authenticator:WebAuth, userAccessToken:string, callback:(error:any, userInfo:any)=>void ) => {
        if ( AlSessionDetector.cachedA0UserInfo.hasOwnProperty( userAccessToken ) ) {
            callback( null, AlSessionDetector.cachedA0UserInfo[userAccessToken] );
            return;
        }

        authenticator.client.userInfo( userAccessToken, ( userInfoError, userIdentityInfo ) => {
            if ( ! userInfoError && userIdentityInfo ) {
                AlSessionDetector.cachedA0UserInfo[userAccessToken] = userIdentityInfo;        //  cache
            }
            callback( userInfoError, userIdentityInfo );
        } );
    }

    /**
     *  Extracts necessary data from the response to auth0's getUserInfo endpoint
     */
    extractUserInfo = ( identityData:any ) => {
        let config = this.getAuth0Config();
        let auth0Node = AlLocatorService.getNode( AlLocation.Auth0 );
        if ( ! auth0Node || ! auth0Node.data || ! auth0Node.data.hasOwnProperty( "clientID" ) ) {
            throw new Error("Configuration's service list does not include an entry for auth0 with a 'clientID' property!; check your configuration." );
        }
        let domainIdInfo    =   "";

        if ( identityData.hasOwnProperty( config.audience ) ) {
            domainIdInfo = identityData[config.audience].sub;
        } else {
            throw new Error(`Unexpected identity data received from auth0; no audience '${config.audience}' found.` );
        }

        let userInfo = domainIdInfo.split(":");
        if ( userInfo.length !== 2 ) {
            throw new Error(`Unexpected identity data received from auth0; audience '${config.audience}' contains unexpected content '${domainIdInfo}'.` );
        }

        let accountId       =   userInfo[0];
        let userId          =   userInfo[1];
        if ( ! accountId || ! userId ) {
            throw new Error(`Unexpected identity data received from auth0; audience '${config.audience}' contains empty account or user in '${domainIdInfo}'.` );
        }
        console.log("Auth0: extracted user identity information %s/%s", accountId, userId );
        return {
            "accountId": accountId,
            "userId": userId
        };
    }

    /**
     * Given a token, determine its expiration timestamp in seconds.
     */
    getTokenExpiration( token:string ) {
        const split = token.split('.');
        if (!split || split.length < 2 ) {
            console.warn("Warning: unexpected JWT format causing existing session not to be recognized.", token );
            return 0;
        }
        const base64Url = split[1];
        const base64 = base64Url.replace('-', '+').replace('_', '/');
        let userData;
        try {
            userData = JSON.parse(window.atob(base64));
        } catch (e) {
            console.warn("Warning: invalid JWT encoding causing existing session not to be recognized." );
            return 0;
        }

        if (!('exp' in userData)) {
            console.warn("Warning: invalid JWT user data causing existing session not to be recognized." );
            return 0;
        }

        return userData.exp;
    }

    protected async getAuth0SessionToken( authenticator:WebAuth, config:any, timeout:number ):Promise<string> {
      return Promise.race( [ AlStopwatch.promise( timeout ),
                             new Promise<string>( ( resolve, reject ) => {
                               authenticator.checkSession( config, ( error, authResult ) => {
                                   if ( error || ! authResult || ! authResult.accessToken ) {
                                       reject("auth0's checkSession method failed with an error" );
                                   } else {
                                       resolve( authResult.accessToken );
                                   }
                               } );
                           } ) ] )
                      .then( ( accessToken:string|any ) => {
                          if ( accessToken && typeof( accessToken ) === 'string' ) {
                              return accessToken;
                          }
                          return Promise.reject("checkSession returned false or could not complete execution before timeout." );
                      } );
    }
}
