/**
 * This is a utility class for interacting with a framed document using `postMessage`.
 */

import { AlBehaviorPromise } from "../promises";
import { AlStopwatch } from './al-stopwatch';

export class AlFrameMessageStream
{
    protected   isReady = new AlBehaviorPromise( false );
    protected   container:HTMLElement;
    protected   handlers:{[messageType:string]:{(data:any,rawEvent?:any,stream?:AlFrameMessageStream):void}} = {};

    /**
     * Constructor
     *
     * @param frameURI: where the iframe should be pointed to
     * @param waitForMessage: if truthy, the `start()` method will not resolve until the first message is received from the frame.
     * @param messagePrefix: if provided, only messages whose bodies include a `type` property starting with this value will be handled.
     */
    constructor( public frameURI:string,
                 public waitForMessage?:boolean,
                 public messagePrefix?:string ) {
    }

    public async start() {
        if ( document && document.body && typeof( document.body.appendChild ) === 'function' ) {
            document.body.appendChild( this.render() );
        } else {
            throw new Error(`Cannot start frame message stream to [${this.frameURI}] without access to DOM` );
        }
        window.addEventListener( "message", this.onReceiveMessage, false );
        if ( this.waitForMessage ) {
            await this.ready();
        }
    }

    public async ready() {
        await this.isReady;
    }

    public stop() {
        document.body.removeChild( this.container );
        window.removeEventListener( "message", this.onReceiveMessage);
    }

    public on( messageType:string, handler:{(data:any,rawEvent?:any,stream?:AlFrameMessageStream):void} ):AlFrameMessageStream {
        if ( this.messagePrefix ) {
            messageType = `${this.messagePrefix}.${messageType}`;
        }
        this.handlers[messageType] = handler;
        return this;
    }

    private onReceiveMessage = ( event:any ):void => {
        if ( ! this.frameURI.startsWith( event.origin ) ) {
            return;
        }

        if ( ! event.data || typeof( event.data.type ) !== 'string' ) {
            return;
        }

        if ( this.messagePrefix && ! event.data.type.startsWith( this.messagePrefix ) ) {
            return;
        }

        this.isReady.resolve( true );

        if ( event.data.type in this.handlers ) {
            this.handlers[event.data.type]( event.data, event, this );
        } else {
            console.log(`Notice: received unhandled message of type '${event.data.type}' from ${event.origin}` );
        }
    }

    private render():DocumentFragment {
        const fragment = document.createDocumentFragment();
        this.container = document.createElement( "div" );
        this.container.setAttribute("class", "message-frame" );
        fragment.appendChild( this.container );
        this.container.innerHTML = `<iframe frameborder="0" src="${this.frameURI}" style="width:1px;height:1px;position:absolute;left:-1px;top:-1px;"></iframe>`;
        return fragment;
    }


}
