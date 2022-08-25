/**
 *  Author: Kevin Nielsen <knielsen@alertlogic.com>
 *  Copyright 2019 Alert Logic, Inc.
 */

import { AlErrorHandler } from '../../errors';

/**
 *  @public
 *
 *  Annotation for trigger type classes.  Prevents unique event type names from being lost during minification/uglification.
 */
/* tslint:disable:function-name */
export function AlTrigger( eventTypeName:string ) {
    return function( ctor:Function ) {
        ctor.prototype.eventTypeName = eventTypeName;
    };
}

/**
 * @public
 *
 * Represents a typed event.
 */
export class AlTriggeredEvent<ResponseType=any>
{
    public eventTypeName:string;
    public responses:ResponseType[] = [];

    constructor( syntheticName?:string ) {
        this.eventTypeName = syntheticName || this.constructor.prototype.eventTypeName;
    }

    /**
     * Retrieves type name
     */
    public getEventType() {
        return this.eventTypeName;
    }

    /**
     *  Allows hooks to provide feedback/responses to the triggering agent
     */
    public respond( response:ResponseType ) {
        this.responses.push( response );
    }

    /**
     *  Retrieves the first response (or returns undefined), removing it from the list of responses.
     */
    public response():ResponseType|undefined {
        return this.responses.shift();
    }

    /**
     *  Returns true if any response matches the given value, or false otherwise.
     */
    public anyResponseEquals( targetValue:ResponseType ):boolean {
        return this.responses.reduce<boolean>(   ( accumulated, response ) => {
                                            return (accumulated || response === targetValue);
                                        },
                                        false );
    }

    /**
     *  Returns true if the given callback returns true for any of the responses, or false otherwise.
     */
    public anyResponseWith( checkCallback:{(responseValue:ResponseType):boolean} ):boolean {
        return this.responses.reduce<boolean>(   ( accumulated, response ) => {
                                            return (accumulated || checkCallback(response));
                                        },
                                        false );
    }
}

/**
 * @public
 *
 * Callback type for triggered events.
 */
export declare type AlTriggeredEventCallback<EventType> = {(event:EventType):void|boolean|Promise<void>};

/**
 * @public
 *
 * Represents a subscription to a stream of triggered events.
 */
export class AlTriggerSubscription<EventType>
{
    protected active = true;
    protected filterCb:AlTriggeredEventCallback<EventType>|null = null;

    constructor( public stream:AlTriggerStream,
                 public eventType:string,
                 public listenerId:string,
                 public triggerCallback?:AlTriggeredEventCallback<EventType> ) {
    }

    then( cb:AlTriggeredEventCallback<any> ):AlTriggerSubscription<EventType> {
        this.triggerCallback = cb;
        return this;
    }

    filter( cb:AlTriggeredEventCallback<any> ):AlTriggerSubscription<EventType> {
        this.filterCb = cb;
        return this;
    }

    trigger( event:EventType ) {
        if ( this.active && this.triggerCallback ) {
            if ( this.filterCb === null || this.filterCb( event ) ) {
                this.triggerCallback( event );
            }
        }
    }

    pause() {
        this.active = false;
    }

    resume() {
        this.active = true;
    }

    cancel() {
        this.stream.detach( this );
    }
}

/**
 * @public
 *
 * Represents a series of triggered events.
 */
export class AlTriggerStream
{
    items:{[triggeResponseType:string]:{[subscriptionId:string]:AlTriggerSubscription<any>}} = {};
    subscriptionCount:number            =   0;
    downstream:AlTriggerStream|null     =   null;
    flowing:boolean                     =   false;
    captured:AlTriggeredEvent<any>[]    =   [];

    constructor( flow:boolean = true ) {
        this.flowing = flow;
    }

    public getBucket( eventTypeName:string ) {
        if ( ! this.items.hasOwnProperty( eventTypeName ) ) {
            this.items[eventTypeName] = {};
        }
        return this.items[eventTypeName];
    }

    public attach<EventType extends AlTriggeredEvent>( eventType:string|Function, callback:AlTriggeredEventCallback<EventType>, subscriptionGroup?:AlSubscriptionGroup ):AlTriggerSubscription<EventType> {
        const eventTypeName = typeof( eventType ) === 'string' ? eventType : eventType.prototype.eventTypeName;
        const listenerId:string = `sub_${++this.subscriptionCount}`;
        const bucket = this.getBucket( eventTypeName );
        const subscription = new AlTriggerSubscription<EventType>( this, eventTypeName, listenerId, callback );
        bucket[listenerId] = subscription;
        if ( subscriptionGroup ) {
            subscriptionGroup.manage( subscription );
        }
        return subscription;
    }

    public detach( subscription:AlTriggerSubscription<any> ) {
        if ( this.items.hasOwnProperty( subscription.eventType ) && this.items[subscription.eventType].hasOwnProperty( subscription.listenerId ) ) {
            delete this.items[subscription.eventType][subscription.listenerId];
        }
    }

    public siphon( child:AlTriggerStream ) {
        child.downstream = this;
        child.tap();
    }

    public trigger<EventType extends AlTriggeredEvent>( event:EventType ):EventType {
        let eventType = event.getEventType();
        if ( ! this.flowing ) {
            this.captured.push( event );
            return event;
        }
        Object.values( this.getBucket( eventType ) )
                .forEach(   subscription => {
                                try {
                                    subscription.trigger( event );
                                } catch( e ) {
                                    AlErrorHandler.log( e, `Trigger callback for event ${event.eventTypeName} threw exception, ignoring` );
                                }
                            } );

        return this.downstream ? this.downstream.trigger( event ) : event;
    }

    public tap() {
        this.flowing = true;
        while( this.captured.length > 0 ) {
            const event = this.captured.shift();
            if(event) {
                this.trigger( event );
            }
        }
    }
}

/**
 * @public
 *
 * This is a simple utility to manage a list of subscriptions, which may be AlTriggerSubscriptions or RxJS subscriptions.
 * It exposes a method `manage` to add new subscriptions, and a method `cancelAll` to unsubscribe from all subscriptions.
 * That is all it does.
 */
export class AlSubscriptionGroup
{
    subscriptions:any[] = [];

    constructor( ...items:any[] ) {
        this.manage( ...items );
    }

    /**
     * Adds one or more subscriptions (as themselves, in arrays, via callback function, or some mixture of these inputs)
     * to the internal list of managed items.
     */
    public manage( ...items:any[] ) {
        items.forEach( item => {
            if ( typeof( item ) === 'object' && item !== null && item.hasOwnProperty( "length" ) ) {
                item.map( (subitem: any) => this.manage( subitem ) );
            } else if ( typeof( item ) === 'function' ) {
                this.manage( item() );
            } else if ( item ) {
                this.subscriptions.push( item );
            }
        } );
    }

    /**
     * Cancels/unsubscribes from all subscriptions.
     */
    public cancelAll() {
        this.subscriptions.map( subscription => {
            if ( typeof( subscription.cancel ) === 'function' ) {
                subscription.cancel();
            } else if ( typeof( subscription.unsubscribe ) === 'function' ) {
                subscription.unsubscribe();
            }
        } );
        this.subscriptions = [];
    }
}
