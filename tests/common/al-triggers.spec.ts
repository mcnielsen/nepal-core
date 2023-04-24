import {
    AlTrigger,
    AlTriggeredEvent,
    AlTriggerStream,
    AlStopwatch,
} from '@al/core';

@AlTrigger("EventType1")
class EventType1 extends AlTriggeredEvent<boolean|string|number>
{
    constructor( public eventProperty:string = "default" ) {
        super();
    }
}

let handlerCallCount = 0;
const emptyHandler = ( event:AlTriggeredEvent<boolean|string|number> ) => { 
    handlerCallCount++; 
};

describe( 'AlTriggerStream', () => {

    beforeEach( () => {
        handlerCallCount = 0;
    } );

    it("should initialize with expected state", () => {

        const stream = new AlTriggerStream();

        expect( stream.flowing ).toEqual( true );
        expect( stream.items ).toEqual( {} );
        expect( stream.captured.length ).toEqual( 0 );
        expect( stream.downstream ).toEqual( null );
        expect( stream.subscriptionCount ).toEqual( 0 );
    } );

    it("should allow 'bottled' initialization", () => {
        const stream = new AlTriggerStream( false );

        let subscription = stream.attach( EventType1, emptyHandler );

        stream.trigger( new EventType1() );

        expect( handlerCallCount ).toEqual( 0 );
        expect( stream.captured.length ).toEqual( 1 );
        expect( stream.flowing ).toEqual( false );

        subscription.cancel();
    } );

    it("should allow one stream to siphon the events from another stream", async () => {
        const stream = new AlTriggerStream( false );

        let subscription = stream.attach( EventType1, emptyHandler );

        stream.trigger( new EventType1() );

        const stream2 = new AlTriggerStream();

        let subscription2 = stream2.attach( EventType1, () => {
            handlerCallCount++;
        } );

        stream2.siphon( stream );

        await AlStopwatch.promise( 10 );

        expect( stream.downstream ).toEqual( stream2 );        //  events from stream flow into stream2
        expect( stream.subscriptionCount ).toEqual( 1 );
        expect( stream2.subscriptionCount ).toEqual( 1 );
        expect( handlerCallCount ).toEqual( 2 );

        subscription.cancel();
        subscription2.cancel();
    } );

    it("should collate and return responses (including async ones) systematically", async () => {
        const stream = new AlTriggerStream();

        const subscription = stream.attach( EventType1, async ( event ) => {
            await AlStopwatch.promise(10);      //  force this response to be emitted after the others
            event.respond( "Kevin" );
        } );

        const subscription2 = stream.attach( EventType1, ( event ) => {
            event.respond( true );
        } );

        let event = new EventType1();
        await stream.trigger( event );

        //  Test anyResponseEquals
        expect( event.responses.length ).toEqual( 2 );

        expect( event.anyResponseEquals( true ) ).toEqual( true );
        expect( event.anyResponseEquals( "Kevin" ) ).toEqual( true );
        expect( event.anyResponseEquals( null ) ).toEqual( false );
        expect( event.anyResponseEquals( "kevin" ) ).toEqual( false );

        //  Test anyResponseWith
        expect( event.anyResponseWith( value => typeof( value ) === 'string' ) ).toEqual( true );
        expect( event.anyResponseWith( value => typeof( value ) === 'object' ) ).toEqual( false );

        //  Test getResponse()
        const response1 = event.getResponse();
        const response2 = event.getResponse();
        const response3 = event.getResponse();

        expect( response1 ).toEqual( true );
        expect( response2 ).toEqual( "Kevin" );
        expect( response3 ).toEqual( undefined );

        subscription.cancel();
        subscription2.cancel();
    } );

    it("should respect pause, resume, and filter on subscriptions", () => {
        const stream = new AlTriggerStream();

        const subscription = stream.attach( EventType1, ( event ) => {
            event.respond( true );
            handlerCallCount++;
        } );

        stream.trigger( new EventType1() );   //  This should be received

        subscription.pause();

        stream.trigger( new EventType1() );   //  This should NOT be received

        subscription.resume();

        stream.trigger( new EventType1() );   //  This should be received again

        expect( handlerCallCount ).toEqual( 2 );

        subscription.filter( ( event:any ) => event.eventProperty === 'good' );

        stream.trigger( new EventType1( "good" ) );   //  This should be received because it matches the filter

        expect( handlerCallCount ).toEqual( 3 );

        stream.trigger( new EventType1( "bad" ) );   //  This should NOT be received because it does not match the filter

        expect( handlerCallCount ).toEqual( 3 );

        subscription.cancel();

        stream.trigger( new EventType1( "good" ) );   //  This should NOT be received because we are no longer subscribed

        expect( handlerCallCount ).toEqual( 3 );

    } );

} );
