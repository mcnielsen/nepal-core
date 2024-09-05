/**
 *  @author Kevin Nielsen <knielsen@alertlogic.com>
 *  @author Robert Parker <robert.parker@alertlogic.com>
 *
 *  @copyright Alert Logic, Inc 2019
 */

import { WebAuth } from 'auth0-js';
import Keycloak, { KeycloakLoginOptions, KeycloakOnLoad } from 'keycloak-js';
import {
    AlBehaviorPromise,
    AlCabinet,
    AlLocation,
    AlLocatorService,
    AlStopwatch,
} from '../../common';
import { AlRuntimeConfiguration, ConfigOption } from '../../configuration';
import { AlDefaultClient } from '../../client';
import { AlConduitClient } from './al-conduit-client';

export class AlIdentityProviders
{
    /**
     *  Keycloak and Auth0 client instances
     */
    protected static keycloak:Keycloak = undefined;
    protected storage = AlCabinet.persistent("alnav");
    protected allIsLost = false;

    constructor() {
    }

    public async warmup() {
        try {
            await this.getKeycloak();
        } catch( e ) {
            console.error( e );
        }
    }

    /**
     * Retrieve a keycloak authentication interface.
     */
    public async getKeycloak():Promise<Keycloak> {
        if ( ! AlIdentityProviders.keycloak ) {
            const fortraPlatformUri = AlLocatorService.resolveURL( AlLocation.FortraPlatform, '/idp' );
            AlIdentityProviders.keycloak = new Keycloak( {
                url: fortraPlatformUri,
                realm: 'products',
                clientId: 'alertlogic-aims-public',
            } );
            if ( AlRuntimeConfiguration.getOption( ConfigOption.FortraChildApplication, false ) ) {
                await AlIdentityProviders.keycloak.init( { enableLogging: true } );     //  prevent redirections when running as an embedded application
            } else {
                await this.innerGetKeyCloak( AlIdentityProviders.keycloak );            //  allows redirection to check for session existence
            }
        }
        return AlIdentityProviders.keycloak;
    }

    /**
     * Uses a race to make sure that keycloak initialization doesn't time out -- since a misconfigured client can cause the
     * promise to hang indefinitely.
     */
    protected async innerGetKeyCloak( cloak:Keycloak, timeout:number = 5000 ):Promise<void> {
        return Promise.race( [ AlStopwatch.promise( timeout ),
                               new Promise<void>( async ( resolve, reject ) => {
                                    let cloakPhase = this.storage.get("cloakInitPhase", 0 );
                                    let onLoad:KeycloakOnLoad|undefined = cloakPhase === 0 ? "check-sso" : undefined;
                                    const baseLocation = window.location.origin + ( window.location.pathname === '/' ? '' : window.location.pathname );     //  fix double slash but support apps in subdirectories
                                    let silentCheckSsoRedirectUri = cloakPhase === 0 ? `${baseLocation}/sso-check.html` : undefined;
                                    this.storage.set("cloakInitPhase", cloakPhase + 1, 10 ).synchronize();
                                    if ( cloakPhase > 5 ) {
                                        this.allIsLost = true;
                                        console.log("Refusing to initialize keycloak after too many redirect cycles" );
                                        resolve();
                                    } else {
                                        console.log("Initializing cloak in phase [%s]: %s", cloakPhase, onLoad );
                                        let initResult = await cloak.init( {
                                                                        onLoad,
                                                                        silentCheckSsoRedirectUri,
                                                                        enableLogging: true,
                                                                        checkLoginIframe: true,
                                                                        checkLoginIframeInterval: 30,
                                                                        pkceMethod: 'S256',
                                                                        responseMode: "query",
                                                                        messageReceiveTimeout: 5000
                                                                    } );
                                        if ( ! initResult && cloakPhase < 2 ) {
                                            cloak.login( { prompt: 'none', redirectUri: window.location.href } );
                                        } else {
                                            resolve();
                                        }
                                    }
                               } ) ] );
    }
}
