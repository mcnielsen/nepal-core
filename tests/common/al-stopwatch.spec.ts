import { AlStopwatch } from '@al/core';

describe( 'AlStopwatch', () => {

    let stopwatch:AlStopwatch;
    let callCount:number = 0;
    const callback = () => {
        callCount++;
    };

    beforeEach( () => {
        callCount = 0;
    } );

    afterEach( () => {
        if ( stopwatch ) {
            stopwatch.cancel();
        }
    } );

    it("should instantiate via `later`", () => {
        stopwatch = AlStopwatch.later( callback );
        expect( stopwatch.callback ).toEqual( callback );
        expect( stopwatch.timer ).toEqual( null );
        expect( stopwatch.interval ).toEqual( 0 );
    } );

    it("should instantiate via `once`", async () => {
        stopwatch = AlStopwatch.once( callback, 100 );
        expect( stopwatch.callback ).toEqual( callback );
        expect( stopwatch.timer ).not.toEqual( null );
        expect( stopwatch.interval ).toEqual( 0 );
    } );

    it("should instantiate via `repeatedly` WITHOUT immediate executation", async () => {
        return new Promise<void>( ( resolve, reject ) => {
            stopwatch = AlStopwatch.repeatedly( callback, 100, false );
            expect( stopwatch.callback ).toEqual( callback );
            expect( stopwatch.timer ).not.toEqual( null );
            expect( stopwatch.interval ).toEqual( 100 );

            setTimeout( () => {
                //                expect( callCount ).toEqual( 2 );      //  100ms and 200ms

                //  Validate cancelation works as expected
                stopwatch.cancel();
                expect( stopwatch.timer ).toEqual( null );

                resolve();
            }, 250 );

        } );
    } );

    it("should instantiate via `repeatedly` WITH immediate executation", async () => {
        stopwatch = AlStopwatch.repeatedly( callback, 100, true );
        expect( stopwatch.callback ).toEqual( callback );
        expect( stopwatch.timer ).not.toEqual( null );
        expect( stopwatch.interval ).toEqual( 100 );
        await AlStopwatch.promise( 250 );
        expect( callCount ).toEqual( 3 );      //  0ms, 100ms, and 200ms
    } );

    it("should instantiate and resolve via `promise()`", async () => {
        let promise = AlStopwatch.promise( 100 );
        let executed:boolean = false;
        promise.then( () => executed = true );
        await promise;
        expect( executed ).toEqual( true );
    } );

    describe( "`.again()`", () => {
        it( "should not create a new timer if one already exists", () => {
            stopwatch = AlStopwatch.repeatedly( callback, 10000 );
            const originalTimer = stopwatch.timer;
            expect( stopwatch.interval ).toEqual( 10000 );
            stopwatch.again( 0 );
            expect( stopwatch.timer ).toEqual( originalTimer );
            expect( stopwatch.interval ).toEqual( 10000 );
        } );
    } );

    describe( "`.reschedule()`", () => {
        it( "should call `cancel` and `again`", async () => {
            stopwatch = AlStopwatch.later( callback );
            let cancel = jest.spyOn( stopwatch, "cancel" );
            let again = jest.spyOn( stopwatch, "again" );
            stopwatch.reschedule( 10000 );
            expect( cancel.mock.calls.length ).toEqual( 1 );
            expect( again.mock.calls.length ).toEqual( 1 );
            expect( again.mock.calls[0][0] ).toEqual( 10000 );
        } );

        it( "should default to immediate reexecution", async () => {
            stopwatch = AlStopwatch.later( callback );
            let again = jest.spyOn( stopwatch, "again" );
            stopwatch.reschedule();
            expect( again.mock.calls.length ).toEqual( 1 );
            expect( again.mock.calls[0][0] ).toEqual( 0 );
        } );
    } );

    describe( "`.reschedule()`", () => {
        it( "should call `cancel` and `again`", async () => {
            stopwatch = AlStopwatch.later( callback );
            let tick = jest.spyOn( stopwatch, "tick" );
            stopwatch.now();
            expect( tick.mock.calls.length ).toEqual( 1 );
            expect( callCount ).toEqual( 1 );
        } );
    } );

} );
