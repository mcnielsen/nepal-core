import { AIMSSessionDescriptor } from "../../aims-client/types";
import {
    AlLocation,
    AlLocatorService,
} from "../../common/locator";
import { AlBehaviorPromise } from "../../common/promises";
import {
    AlStopwatch,
    AlTriggerStream,
} from "../../common/utility";
import {
    AlDatacenterSessionErrorEvent,
    AlDatacenterSessionEstablishedEvent,
    AlExternalTrackableEvent,
} from '../events';

export class AlConduitClient
{
    public static events:AlTriggerStream = new AlTriggerStream();

    protected static document:Document;
    protected static conduitUri:string;
    protected static conduitWindow:Window;
    protected static conduitOrigin:string;
    protected static refCount:number = 0;
    protected static ready = new AlBehaviorPromise<boolean>();
    protected static requests: { [requestId: string]: { resolve: any, reject: any, canceled: boolean } } = {};
    protected static externalSessions: { [locationId:string]:{promise?:Promise<void>,resolver:any,resolved:boolean} } = {};

    protected static requestIndex = 0;

    public start( targetDocument:Document = document ) {
        if ( AlConduitClient.refCount < 1 ) {
            AlConduitClient.document = targetDocument;
            if ( targetDocument && targetDocument.body && typeof( targetDocument.body.appendChild ) === 'function' ) {
                AlConduitClient.document.body.appendChild( this.render() );
            }
            AlStopwatch.once(this.validateReadiness, 5000);
        }
        AlConduitClient.refCount++;
    }

    public render():DocumentFragment {
        const residency = "US";
        let environment = AlLocatorService.getCurrentEnvironment();
        if ( environment === 'development' ) {
            environment = 'integration';
        }
        AlConduitClient.conduitUri = AlLocatorService.resolveURL( AlLocation.AccountsUI, '/conduit.html', { residency, environment } );
        const fragment = document.createDocumentFragment();
        const container = document.createElement( "div" );
        container.setAttribute("id", "conduitClient" );
        container.setAttribute("class", "conduit-container" );
        window.addEventListener( "message", this.onReceiveMessage, false );
        fragment.appendChild( container );
        container.innerHTML = `<iframe frameborder="0" src="${AlConduitClient.conduitUri}" style="width:1px;height:1px;position:absolute;left:-1px;top:-1px;"></iframe>`;
        return fragment;
    }

    public stop() {
        if ( AlConduitClient.refCount > 0 ) {
            AlConduitClient.refCount--;
        }
        if ( AlConduitClient.refCount === 0 && AlConduitClient.document ) {
            let container = AlConduitClient.document.getElementById( "conduitClient" );
            if ( container ) {
                AlConduitClient.document.body.removeChild( container );
            }
        }
    }

    /**
     * Checks to see if a session with an external resource has been established.
     *
     * @param insightLocationId The external location ID.  If unspecified, AlLocatorService's context will be used by default.
     * @returns Boolean true or false.
     */
    public checkExternalSession( insightLocationId?:string ):boolean {
        let targetLocationId = insightLocationId || AlLocatorService.getContext().insightLocationId;
        if ( AlConduitClient.externalSessions.hasOwnProperty( targetLocationId ) ) {
            return AlConduitClient.externalSessions[targetLocationId].resolved;
        }
        return false;
    }

    /**
     * Waits for a session with an external resource to be established.
     *
     * @param insightLocationId The external location ID.  If unspecified, AlLocatorService's context will be used by default.
     * @returns A promise that resolves once the external resource's session has been established.
     *
     * Please note that attempting to await an unknown or gibberishy location will return a promise that never resolves.
     */
    public awaitExternalSession( insightLocationId?:string ):Promise<void> {
        let targetLocationId = insightLocationId || AlLocatorService.getContext().insightLocationId;
        if ( this.checkExternalSession( targetLocationId ) ) {
            return Promise.resolve();
        }
        if ( ! AlConduitClient.externalSessions[targetLocationId] ) {
            let listener = {
                promise: null,
                resolver: null,
                resolved: false
            };
            listener.promise = new Promise<void>( ( resolve ) => {
                listener.resolver = resolve;
            } );
            AlConduitClient.externalSessions[targetLocationId] = listener;
        }
        return AlConduitClient.externalSessions[targetLocationId].promise;
    }

    /**
     * Retrieves session information from the conduit.  Resolves with valid session information if a session exists, or null if no session is established;
     * an error indicates a problem with conduit operation rather than the absence of a session.
     */
    public getSession(): Promise<AIMSSessionDescriptor> {
        return this.request('conduit.getSession')
                    .then( rawResponse => rawResponse.session as AIMSSessionDescriptor );
    }

    /**
     * Sets session information TO the conduit.  Should always resolve with a copy of the session information.
     */
    public setSession(sessionData: AIMSSessionDescriptor): Promise<AIMSSessionDescriptor> {
        return this.request('conduit.setSession', { session: sessionData })
                    .then( rawResponse => rawResponse.session as AIMSSessionDescriptor );
    }

    /**
     * Deletes existing session information.
     */
    public deleteSession(): Promise<boolean> {
        return this.request('conduit.deleteSession')
                    .then( () => true );
    }

    /**
     * Retrieves a global setting from conduit's local storage
     */
    public getGlobalSetting(settingKey: string): Promise<any> {
        return this.request("conduit.getGlobalSetting", { setting_key: settingKey })
            .then( rawResponse => rawResponse.setting );
    }

    /**
     * Sets a global setting to conduit's local storage
     */
    public setGlobalSetting(key: string, data: any): Promise<any> {
        return this.request("conduit.setGlobalSetting", { setting_key: key, setting_data: data })
            .then( rawResponse => rawResponse.setting );
    }

    /**
     * Deletes a global setting from conduit's local storage
     */
    public deleteGlobalSetting(settingKey: string): Promise<boolean> {
        return this.request('conduit.deleteGlobalSetting', { setting_key: settingKey })
                    .then( rawResponse => rawResponse.result );
    }

    /**
     * Retrieves a global resource.
     */
    public getGlobalResource( resourceName:string, ttl:number ): Promise<any> {
        return this.request('conduit.getGlobalResource', { resourceName, ttl }, 10 )
                            .then( response => {
                                if ( ! response.resource ) {
                                    return Promise.reject( response.error || `AlConduitClient failed to retrieve global resource '${resourceName}'` );
                                }
                                return response.resource;
                            } );
    }

    /**
     * Receives a message from conduit, and dispatches it to the correct handler.
     */
    public onReceiveMessage = (event: any):void => {
        if ( ! event.data
                || typeof (event.data.type) !== 'string'
                || typeof (event.data.requestId) !== 'string'
                || ! event.origin
                || ! event.source) {
            //  Disqualify events that aren't of the correct type/structure
            return;
        }

        const originNode = AlLocatorService.getNodeByURI(event.origin);
        const originWhitelist:string[] = [ AlLocation.AccountsUI, AlLocation.LegacyUI ];
        if ( ! originNode || ! originWhitelist.includes( originNode.locTypeId ) ) {
            //  Ignore any events that don't originate from a whitelisted domain (currently, console.account.* or any defender stack)
            return;
        }

        switch (event.data.type) {
            case 'conduit.ready':
                return this.onConduitReady(event);
            case 'conduit.getSession':
            case 'conduit.setSession':
            case 'conduit.deleteSession':
            case 'conduit.getGlobalSetting':
            case 'conduit.setGlobalSetting':
            case 'conduit.deleteGlobalSetting':
            case 'conduit.getGlobalResource':
                return this.onDispatchReply(event);
            case "conduit.externalSessionReady":
                return this.onExternalSessionEstablished(event);
            case "conduit.externalSessionError":
                return this.onExternalSessionError(event);
            case "conduit.externalEvent":
                return this.onExternalTrackableEvent(event);
            default:
                console.warn('AlConduitClient: Ignoring unrecognized message type: %s', event.data.type, event);
                break;
        }
    }

    public onConduitReady(event: any ): void {
        AlConduitClient.conduitWindow = event.source;
        AlConduitClient.conduitOrigin = event.origin;
        AlConduitClient.ready.resolve( true );
        if ( typeof( event.data.cookiesDisabled ) === 'boolean' && event.data.cookiesDisabled ) {
            console.warn("WARNING: conduit has indicated that 3rd party cookies are disabled, triggering session error event." );
            AlConduitClient.events.trigger( new AlDatacenterSessionErrorEvent( "inapplicable", "cookie-configuration", event.data ) );
        }
    }

    public onDispatchReply(event: any): void {
        const requestId: string = event.data.requestId;
        if (!AlConduitClient.requests.hasOwnProperty(requestId)) {
            console.warn(`Warning: received a conduit response to an unknown request with ID '${requestId}'; multiple clients running?` );
            return;
        } else if ( AlConduitClient.requests[requestId].canceled ) {
            console.warn(`Warning: received a conduit response after its timeout expired; discarding.` );
            return;
        }

        AlConduitClient.requests[requestId].resolve( event.data );
        delete AlConduitClient.requests[requestId];
    }

    /**
     * Responds to external session ready messages.  If no one is awaiting readiness, it will simply create a resolved promise for that location.
     */
    protected onExternalSessionEstablished( event:any ) {
        if ( typeof( event.data.locationId ) !== 'string' ) {
            return;
        }
        console.log(`Notice: received external session confirmation for location [${event.data.locationId}]` );
        const session = AlConduitClient.externalSessions.hasOwnProperty( event.data.locationId ) ? AlConduitClient.externalSessions[event.data.locationId] : null;

        if ( session ) {
            session.resolved = true;
            session.promise = Promise.resolve();
            if ( session.resolver ) {
                session.resolver( true );
            }
        } else {
            AlConduitClient.externalSessions[event.data.locationId] = {
                promise: Promise.resolve(),
                resolver: null,
                resolved: true
            };
        }
        AlConduitClient.events.trigger( new AlDatacenterSessionEstablishedEvent( event.data.locationId ) );
    }

    /**
     * Raises an AlDatacenterSessionEventEvent
     */
    protected onExternalSessionError( event:any ) {
        AlConduitClient.events.trigger( new AlDatacenterSessionErrorEvent( event.data.locationId, event.data.errorType || "unknown", event.data ) );
    }

    /**
     * Pass the event upstream on the internal event bus
     */
    protected onExternalTrackableEvent( event:any ) {
        AlConduitClient.events.trigger( new AlExternalTrackableEvent( event.data ) );
    }

    /**
     * This validation step is included *mostly* for the sanity of developers.  It is remarkably easy to forget to start o3-portero :)  It
     * may help detect problems in production as a fringe benefit.
     */
    protected validateReadiness = () => {
        if (!AlConduitClient.conduitWindow && !AlConduitClient.conduitOrigin) {
            console.warn('Conduit Warning: no conduit.ready message was received from the console.account conduit application.  This may result in degradation or unavailability of authentication features in this application.');
        }
    }

    protected request( methodName: string, data: any = {}, timeout:number = 0 ): Promise<any> {
        const requestId = `conduit-request-${++AlConduitClient.requestIndex}-${Math.floor(Math.random() * 1000)}`;
        return new Promise<any>( ( resolve, reject ) => {
            AlConduitClient.requests[requestId] = { resolve, reject, canceled: false };
            AlConduitClient.ready.then( () => {
                /**
                 * Requests can be queued at any time in the application's lifespan, even before the conduit iframe has been created or communications
                 * have been established.  However, no actually message will be broadcast until the initial handshake has occurred.
                 */
                const payload = Object.assign({ type: methodName, requestId: requestId }, data);
                AlConduitClient.conduitWindow.postMessage(payload, AlConduitClient.conduitOrigin );
            } );
            if ( timeout > 0 ) {
                AlStopwatch.once(   () => {
                                        if ( AlConduitClient.requests.hasOwnProperty( requestId ) ) {
                                            //  The promise has not been resolved within the given timeout window
                                            console.warn(`Conduit Warning: request '${methodName}' (ID ${requestId}) failed to resolve within ${timeout} seconds; aborting.` );
                                            AlConduitClient.requests[requestId].reject( new Error( `Failed to receive response to '${methodName}' request within ${timeout}s` ) );
                                            AlConduitClient.requests[requestId].canceled = true;
                                        }
                                    },
                                    Math.floor( timeout * 1000 ) );
            }
        } );
    }
}
