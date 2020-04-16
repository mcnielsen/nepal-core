import { expect } from 'chai';
import { describe } from 'mocha';
import {
    AlTrigger,
    AlTriggeredEvent,
    AlTriggerStream,
} from '../index';

@AlTrigger("EventType1")
class EventType1 extends AlTriggeredEvent<boolean|string|number>
{
    constructor( public eventProperty:string = "default" ) {
        super();
    }
}

let handlerCallCount = 0;
const emptyHandler = ( event:AlTriggeredEvent<boolean|string|number> ) => { handlerCallCount++; };

describe( 'AlTriggerStream', () => {

    beforeEach( () => {
        handlerCallCount = 0;
    } );

    it("should initialize with expected state", () => {

        const stream = new AlTriggerStream();

        expect( stream.flowing ).to.equal( true );
        expect( stream.items ).to.eql( {} );
        expect( stream.captured.length ).to.equal( 0 );
        expect( stream.downstream ).to.equal( null );
        expect( stream.subscriptionCount ).to.equal( 0 );
    } );

    it("should allow 'bottled' initialization", () => {
        const stream = new AlTriggerStream( false );

        let subscription = stream.attach( EventType1, emptyHandler );

        stream.trigger( new EventType1() );

        expect( handlerCallCount ).to.equal( 0 );
        expect( stream.captured.length ).to.equal( 1 );
        expect( stream.flowing ).to.equal( false );

        subscription.cancel();
    } );

    it("should allow one stream to siphon the events from another stream", () => {
        const stream = new AlTriggerStream( false );

        let subscription = stream.attach( EventType1, emptyHandler );

        stream.trigger( new EventType1() );

        const stream2 = new AlTriggerStream();

        let subscription2 = stream2.attach( EventType1, emptyHandler );

        stream2.siphon( stream );

        expect( stream.downstream ).to.equal( stream2 );        //  events from stream flow into stream2
        expect( stream.subscriptionCount ).to.equal( 1 );
        expect( stream2.subscriptionCount ).to.equal( 1 );
        expect( handlerCallCount ).to.equal( 2 );

        subscription.cancel();
        subscription2.cancel();
    } );

    it("should collate and return responses systematically", () => {
        const stream = new AlTriggerStream();

        const subscription = stream.attach( EventType1, ( event ) => {
            event.respond( true );
        } );

        const subscription2 = stream.attach( EventType1, ( event ) => {
            event.respond( "Kevin" );
        } );

        let event = new EventType1();
        stream.trigger( event );

        //  Test anyResponseEquals
        expect( event.responses.length ).to.equal( 2 );
        expect( event.anyResponseEquals( true ) ).to.equal( true );
        expect( event.anyResponseEquals( "Kevin" ) ).to.equal( true );
        expect( event.anyResponseEquals( null ) ).to.equal( false );
        expect( event.anyResponseEquals( "kevin" ) ).to.equal( false );

        //  Test anyResponseWith
        expect( event.anyResponseWith( value => typeof( value ) === 'string' ) ).to.equal( true );
        expect( event.anyResponseWith( value => typeof( value ) === 'object' ) ).to.equal( false );

        //  Test response()
        const response1 = event.response();
        const response2 = event.response();
        const response3 = event.response();

        expect( response1 ).to.equal( true );
        expect( response2 ).to.equal( "Kevin" );
        expect( response3 ).to.equal( undefined );

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

        expect( handlerCallCount ).to.equal( 2 );

        subscription.filter( ( event:any ) => event.eventProperty === 'good' );

        stream.trigger( new EventType1( "good" ) );   //  This should be received because it matches the filter

        expect( handlerCallCount ).to.equal( 3 );

        stream.trigger( new EventType1( "bad" ) );   //  This should NOT be received because it does not match the filter

        expect( handlerCallCount ).to.equal( 3 );

        subscription.cancel();

        stream.trigger( new EventType1( "good" ) );   //  This should NOT be received because we are no longer subscribed

        expect( handlerCallCount ).to.equal( 3 );

    } );

} );
