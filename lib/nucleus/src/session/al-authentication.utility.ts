import { 
    AlLocation,
    AlError,
    ConfigOption, 
    AIMSSessionDescriptor,
    AIMSAuthenticationTokenInfo,
    AlClient,
    AlNetworkResponse,
    getJsonPath,
    isResponse,
} from '../common';
import {
    AlBaseAPIClient,
} from '../client';
import { AlExecutionContext } from '../context';

/**
 * Each of these is a possible outcome of an authentication attempt.
 */
export enum AlAuthenticationResult {
    Unauthenticated         = 'unauthenticated',
    Authenticated           = 'authenticated',
    AccountLocked           = 'account_locked',
    AccountUnavailable      = 'account_unavailable',
    PasswordResetRequired   = 'password_expired',
    MFAEnrollmentRequired   = 'mfa_enrollment_required',
    MFAVerificationRequired = 'mfa_verification_required',
    TOSAcceptanceRequired   = 'eula_acceptance_required',
    TOSReacceptanceRequired = 'eula_reacceptance_required',
    InvalidCredentials      = 'failed'
}

export interface AlAuthenticationState {
    /**
     * The result of an authentication attempt.  Please don't access this directly; use AlAuthenticationUtility's
     * `getResult()` method to be assured of the correct value.
     */
    result?:AlAuthenticationResult;

    /**
     * MFA and TOS authentication criteria will both provide the user with a temporary "session token" (passed to AIMS as an
     * X-AIMS-Session-Token header.
     */
    sessionToken?:string;

    /**
     * Password reset requires a username parameter
     */
    userName?:string;

    /**
     * TOS authentication criteria will provide a URL where the current terms of service can be retrieved.
     */
    termsOfServiceURL?:string;

    /**
     * TOS api will provide the deferral to accept the terms.
     */
    deferralTOSPeriodEnd?:string;
}

@AlClient( {
    name: "authentication",
    defaultConfiguration: "aims",
    version: 1,
    configurations: {
        aims: {
            stack: AlLocation.GlobalAPI,
            service: "aims",
            version: 1
        },
        gestalt: {
            stack: AlLocation.MagmaUI,
            service: "session",
            version: 1,
            noDevImplementation: true
        }
    }
} )
export class AlAuthenticationUtility extends AlBaseAPIClient {

    public state:AlAuthenticationState = {
        result: AlAuthenticationResult.Unauthenticated
    };

    constructor( state?:AlAuthenticationState,
                public context:AlExecutionContext = AlExecutionContext.default ) {
        super();
        if ( state ) {
            this.state = Object.assign( this.state, state );
        }
    }

    /**
     * Primary authentication method -- attempts to authenticate using a username and password.
     */
    public async authenticate( userName:string, passPhrase:string ):Promise<AlAuthenticationResult> {
        let useGestalt = this.context.getOption( ConfigOption.GestaltAuthenticate, false );
        if ( useGestalt ) {
            try {
                let session = await this.authenticateViaGestalt( userName, passPhrase );
                return await this.finalizeSession( session );
            } catch( e ) {
                if ( this.handleAuthenticationFailure( e ) ) {
                    return this.state.result;
                }
                throw e;
            }
        }

        try {
            let session = await this.authenticateViaAIMS( userName, passPhrase );
            return await this.finalizeSession( session );
        } catch( e ) {
            if ( this.handleAuthenticationFailure( e ) ) {
                return this.state.result;
            }
        }

        this.state.result = AlAuthenticationResult.InvalidCredentials;
        return this.state.result;
    }

    /**
     * Performs authentication using a session token (which must be separately populated into `this.state.sessionToken`) and
     * an MFA verification code.
     */
    public async validateMfaCode( verificationCode:string ):Promise<AlAuthenticationResult> {
        let useGestalt = this.context.getOption( ConfigOption.GestaltAuthenticate, false );
        if ( useGestalt ) {
            try {
                let session = await this.mfaViaGestalt( this.getSessionToken(), verificationCode );
                return await this.finalizeSession( session );
            } catch ( e ) {
                if ( this.handleAuthenticationFailure( e ) ) {
                    return this.state.result;
                }
            }
        }

        try {
            let session = await this.mfaViaAIMS( this.getSessionToken(), verificationCode );
            return await this.finalizeSession( session );
        } catch( e ) {
            if ( this.handleAuthenticationFailure( e ) ) {
                return this.state.result;
            }
        }
        this.state.result = AlAuthenticationResult.InvalidCredentials;
        return this.state.result;
    }

    /**
     * Performs authentication using a session token (which must be separately populated into `this.state.sessionToken`).
     */
    public async acceptTermsOfService(acceptTOS:boolean = true):Promise<AlAuthenticationResult> {
        let useGestalt = this.context.getOption( ConfigOption.GestaltAuthenticate, false );
        if ( useGestalt ) {
            try {
                let session = await this.acceptTOSViaGestalt( this.getSessionToken(), acceptTOS );
                return await this.finalizeSession( session );
            } catch ( e ) {
                if ( this.handleAuthenticationFailure( e ) ) {
                    return this.state.result;
                }
            }
        }

        try {
            let session = await this.acceptTOSViaAIMS( this.getSessionToken(), acceptTOS );
            return await this.finalizeSession( session );
        } catch( e ) {
            if ( this.handleAuthenticationFailure( e ) ) {
                return this.state.result;
            }
        }
        return this.state.result;
    }

    public async authenticateWithAccessToken( accessToken:string ):Promise<AlAuthenticationResult> {
        try {
            let tokenInfo = await this.getTokenInfo( accessToken );
            console.log("Got token information; setting authentication" );
            tokenInfo.token = accessToken; // Annoyingly, AIMS does not include the `token` property in its response to this call, making the descriptor somewhat irregular
            let session:AIMSSessionDescriptor = { authentication: tokenInfo };
            await this.context.session.setAuthentication( session );
            console.log("Successfully authenticated with access token" );
            return this.state.result;
        } catch( e ) {
            console.log("Ack!", e );
            AlError.log( e, "Failed to authenticate via token" );
            return this.state.result;
        }
    }

    /**
     * Retrieves the last authentication result, if any; defaults to `AlAuthenticationResult.Unauthenticated`.
     */
    public getResult():AlAuthenticationResult {
        return this.state.result || AlAuthenticationResult.Unauthenticated;
    }

    /**
     * Retrieves the session token provided in response to the last authentication attempt, if any.
     */
    public getSessionToken():string {
        if ( ! this.state.sessionToken ) {
            throw new Error("Invalid usage: no session token is available." );
        }
        return this.state.sessionToken;
    }

    /**
     * Retrieves the TOS URL provided in response to the last authentication attempt, if any.
     */
    public getTermsOfServiceURL():string {
        if ( ! this.state.termsOfServiceURL ) {
            throw new Error("Invalid usage: no terms of service URL is available." );
        }
        return this.state.termsOfServiceURL;
    }

    /**
     * Retrieves the TOS Deadline provided in response to the last authentication attempt, if any.
     */
    public getDeferralTOSPeriodEnd():string {
        if ( ! this.state.deferralTOSPeriodEnd ) {
            throw new Error("Invalid usage: no deferral TOS period end is available." );
        }
        return this.state.deferralTOSPeriodEnd;
    }

    /**
     * "Normalizes" a return URL -- internally, this merely checks the URL against a whitelist of target domains.
     */
    public filterReturnURL( returnURL:string, defaultReturnURL?:string ):string {
        let validPatterns = [
            /https?:\/\/[\w\-.]*alertlogic\.(net|com|co\.uk).*/,
            /https?:\/\/localhost:.*/
        ];
        if ( validPatterns.find( pattern => pattern.test( returnURL ) ) ) {
            return returnURL;
        }
        return defaultReturnURL || this.context.resolveURL( AlLocation.AccountsUI, `/#/` );
    }

    /**
     * Obtain Authentication Token Information for a specific access token
     */
    protected async getTokenInfo( accessToken:string ):Promise<AIMSAuthenticationTokenInfo> {
        return this.get( {
            endpoint: { 
                configuration: "aims",
                path: '/token_info',
                aimsAuthHeader: false
            },
            headers: { 'X-AIMS-Auth-Token': accessToken },
        } );
    }

    /**
     * Given a session descriptor, persists that session to AlSession and conduit and then sets the authentication
     * result to `Authenticated`.
     */
    protected async finalizeSession( session:AIMSSessionDescriptor ) {
        await this.context.session.setAuthentication( session );
        this.state.result = AlAuthenticationResult.Authenticated;
        return this.getResult();
    }

    protected handleAuthenticationFailure( error:Error|any ):boolean {

        if ( isResponse( error ) ) {
            if ( this.requiresMfaCode( error ) ) {
                this.state.result = AlAuthenticationResult.MFAVerificationRequired;
                this.state.sessionToken = error.headers['x-aims-session-token'];
                return true;
            } else if ( this.requiresMfaEnrollment( error ) ) {
                this.state.result = AlAuthenticationResult.MFAEnrollmentRequired;
                this.state.sessionToken = error.headers['x-aims-session-token'];
                return true;
            } else if ( this.requiresPasswordReset( error ) ) {
                this.state.result = AlAuthenticationResult.PasswordResetRequired;
                return true;
            } else if ( this.requiresTOSAcceptance( error ) ) {
                this.state.result = AlAuthenticationResult.TOSAcceptanceRequired;
                this.state.termsOfServiceURL = getJsonPath<string>( error, 'data.tos_url', null );
                this.state.sessionToken = error.headers['x-aims-session-token'];
                return true;
            } else if ( this.requiresTOSReacceptance( error ) ) {
                this.state.result = AlAuthenticationResult.TOSReacceptanceRequired;
                this.state.termsOfServiceURL = getJsonPath<string>( error, 'data.tos_url', null );
                this.state.sessionToken = error.headers['x-aims-session-token'];
                this.state.deferralTOSPeriodEnd = getJsonPath<string>( error, 'data.tos_deferral_period_end', null );
                return true;
            } else if( error.status === 400) {
                this.state.result = AlAuthenticationResult.AccountLocked;
                return true;
            } else if ( error.status === 401 ) {
                this.state.result = AlAuthenticationResult.InvalidCredentials;
                return true;
            } else if ( error.status === 403 ) {
                this.state.result = AlAuthenticationResult.AccountUnavailable;
                return true;
            }
            /**
             * All non-400/401 errors, include 5xx, fall through and return false
             */
        }
        return false;
    }

    protected requiresMfaCode( response:AlNetworkResponse<any> ):boolean {
        return response.status === 401
            && typeof( response.data ) === 'object'
            && response.data !== null
            && 'error' in response.data
            && response.data.error === 'mfa_code_required';
    }

    protected requiresMfaEnrollment( response:AlNetworkResponse<any> ):boolean {
        return response.status === 401
            && typeof( response.data ) === 'object'
            && response.data !== null
            && 'error' in response.data
            && response.data.error === 'mfa_enrollment_required';
    }

    protected requiresPasswordReset( response:AlNetworkResponse<any> ):boolean {
        return response.status === 400
            && typeof( response.data ) === 'object'
            && response.data !== null
            && 'error' in response.data
            && response.data.error === 'password_expired';
    }

    protected requiresTOSAcceptance( response:AlNetworkResponse<any> ):boolean {
        return response.status === 401
            && typeof( response.data ) === 'object'
            && response.data !== null
            && 'error' in response.data
            && response.data.error === 'accept_tos_required';
    }

    protected requiresTOSReacceptance( response:AlNetworkResponse<any> ):boolean {
        return response.status === 401
            && typeof( response.data ) === 'object'
            && response.data !== null
            && 'error' in response.data
            && response.data.error === 'reaccept_tos_required';
    }

    /**
     * Use HTTP Basic Auth
     * Optionally supply an mfa code if the user account is enrolled for Multi-Factor Authentication
     *
     * There are two variants of this method: one which executes directly against AIMS, and the other which
     * is levied against a gestalt lambda proxied through console.account.
     *
     * Under ordinary circumstances, you should *not* be calling this directly -- instead, you should use the top-level
     * `authenticate` method on @al/session's ALSession instance.
     */
    protected async authenticateViaAIMS( user: string, pass: string ):Promise<AIMSSessionDescriptor> {
        return this.post( {
            endpoint: {
                configuration: "aims",
                path: 'authenticate'
            },
            headers: { Authorization: `Basic ${this.context.base64Encode(`${user}:${pass}`)}` },

        } );
    }

    protected async authenticateViaGestalt( user:string, pass:string ):Promise<AIMSSessionDescriptor> {
        return this.post( {
            endpoint: {
                configuration: "gestalt",
                path: "authenticate",
            },
            data: { authorization: `Basic ${this.context.base64Encode(`${user}:${pass}`)}` },
        } );
    }

    /**
     * Authenticate with an mfa code and a temporary session token.
     * Used when a user inputs correct username:password but does not include mfa code when they are enrolled for Multi-Factor Authentication
     * The session token can be used to complete authentication without re-entering the username and password, but must be used within 3 minutes (token expires)
     *
     * There are two variants of this method: one which executes directly against AIMS, and the other which
     * is levied against a gestalt lambda proxied through console.account.
     *
     * Under ordinary circumstances, you should *not* be calling this directly -- instead, you should use the top-level
     * `authenticateWithMFASessionToken` method on @al/session's ALSession instance.
     */
    protected async mfaViaAIMS( sessionToken: string, mfaCode: string ):Promise<AIMSSessionDescriptor> {
        return this.post( {
            endpoint: {
                configuration: "aims",
                path: 'authenticate',
            },
            headers: { 'X-AIMS-Session-Token': sessionToken },
            data: { mfa_code: mfaCode },
        } );
    }

    protected async mfaViaGestalt( sessionToken:string, mfaCode:string ):Promise<AIMSSessionDescriptor> {
        return this.post( {
            endpoint: {
                configuration: "gestalt",
                path: "authenticate"
            },
            data: {
                sessionToken: sessionToken,
                mfaCode: mfaCode
            },
        } );
    }

    protected async acceptTOSViaAIMS( sessionToken:string, acceptTOS:boolean = true ):Promise<AIMSSessionDescriptor> {
        return this.post( {
            endpoint: {
                configuration: "aims",
                path: 'authenticate'
            },
            headers: { 'X-AIMS-Session-Token': sessionToken },
            data: { accept_tos: acceptTOS },
        } );
    }

    protected async acceptTOSViaGestalt( sessionToken:string, acceptTOS:boolean = true ):Promise<AIMSSessionDescriptor> {
        return this.post( {
            endpoint: {
                configuration: "gestalt",
                path: 'authenticate'
            },
            data: {
                sessionToken: sessionToken,
                acceptTOS: acceptTOS
            },
        } );
    }
}
