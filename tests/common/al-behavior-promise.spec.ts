import { AlBehaviorPromise } from '@al/core';

describe( 'AlBehaviorPromise', () => {

    let behavior = new AlBehaviorPromise<number>();
    let results:any = {};
    let resolver1 = ( value:number ) => { results.resolver1 = value; };
    let resolver2 = ( value:number ) => { results.resolver2 = value; };
    let resolver3 = ( value:number ) => { results.resolver3 = value; };
    let rejector = ( reason:string ) => { results.rejected = true; results.rejectionReason = reason; };

    beforeEach( () => {
        results = {
            resolver1: null,
            resolver2: null,
            resolver3: null,
            rejected: false,
            rejectionReason: null
        };
    } );

    it( 'should be in an unfulfilled state after construction', async () => {
        expect( behavior['promise'] ).toBeInstanceOf( Promise );
        expect( behavior.isFulfilled() ).toEqual( false );
        expect( behavior.getValue() ).toEqual( null );
    } );

    it( 'should automatically fulfill if provided an initial value', async () => {
        behavior = new AlBehaviorPromise(42);
        expect( behavior['promise'] ).toBeInstanceOf( Promise );
        expect( behavior.isFulfilled() ).toEqual( true );
        expect( behavior.getValue() ).toEqual( 42 );
    } );

    it( 'should handle resolution and change to a fulfilled state', async () => {
        behavior.then( resolver1 );
        await behavior.resolve( 42 );
        expect( behavior.isFulfilled() ).toEqual( true );
        expect( behavior.getValue() ).toEqual( 42 );
        expect( results.resolver1 ).toEqual( 42 );
    } );

    it( 'should handle successive resolutions and stay in a fulfilled state with the last value', async () => {
        behavior.then( resolver1 );     //  subscribe
        await behavior.resolve( 42 );   //  received by resolver1
        await behavior.resolve( 64 );   //  change value
        behavior.then( resolver2 );     //  received by resolver2 with 64
        behavior.then( resolver3 );     //  received by resolver3 with 64
        await behavior.resolve( 91 );   //  nobody will receive this value, but wth
        expect( behavior.isFulfilled() ).toEqual( true );
        expect( behavior.getValue() ).toEqual( 91 );
        expect( results.resolver1 ).toEqual( 42 );
        expect( results.resolver2 ).toEqual( 64 );
        expect( results.resolver3 ).toEqual( 64 );
    } );

    it( "should correctly handle being 'rescinded'", async () => {
        /* test else */
        behavior = new AlBehaviorPromise();
        behavior.rescind();

        behavior = new AlBehaviorPromise( 10000 );
        behavior.rescind();             //  this should put the promise back into "unfulfilled" state

        expect( behavior.isFulfilled() ).toEqual( false );
        expect( behavior.getValue() ).toEqual( null );

        behavior.then( resolver2 );

        expect( results.resolver2 ).toEqual( null );       //  no resolution yet

        behavior.then( resolver3 );
        await behavior.resolve( 16 );   //  Now, everything should be back to fulfilled again, and resolver2 and resolver3 should have received value "16"

        expect( results.resolver2 ).toEqual( 16 );
        expect( results.resolver3 ).toEqual( 16 );
        expect( behavior.isFulfilled() ).toEqual( true );
        expect( behavior.getValue() ).toEqual( 16 );

    } );

    /**
     * In some reason, this causes an unhandled promise rejection error in jest (unlike karma)
     */
    xit( "should correctly handle being 'rejected'", async () => {
        jest.spyOn( console, "error" ).mockImplementation( () => {} );
        behavior = new AlBehaviorPromise();
        behavior.then( resolver1 );
        await behavior.reject("Something gun wrong.");
        expect( behavior.isFulfilled() ).toEqual( true );

        behavior = new AlBehaviorPromise();

        behavior.then( resolver1, rejector );
        await behavior.reject( "Something broked." );
        expect( results.rejected ).toEqual( true );
        expect( results.rejectionReason ).toEqual( "Something broked." );
    } );

} );
