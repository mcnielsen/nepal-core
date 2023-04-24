import { AlGlobalizer } from '@al/core';

describe( `AlGlobalizer`, () => {
    describe( `.expose()`, () => {
        it("should put a known object into a known place", () => {
            let myThing = {
                version: 1,
                thingy: true
            };
            AlGlobalizer.expose( "some.named.path", myThing );
        } );
    } );

    describe( `.instantiate()`, () => {
        /**
         * Good test, but window is not available in jest
         */
        xit( "should use a factory method to create an instance of a service", () => {
            AlGlobalizer.instantiate<any>( "kevin", () => { return { something: true }; } );
            expect( typeof( (window as any).al.registry.kevin ) ).toBe( "object" );
        } );
        it( "should warn about collisions when collisionHandling is set to true", () => {
            let stub = jest.spyOn( console, 'warn' ).mockImplementation( () => {} );
            AlGlobalizer.instantiate<any>( "kevin2", () => true, true );
            AlGlobalizer.instantiate<any>( "kevin2", () => true, true );
            expect( stub.mock.calls.length ).toEqual( 1 );
        } );
        it( "should throw an error when collisionHandling is a string", () => {
            AlGlobalizer.instantiate<any>( "kevin3", () => true, "Something is horribly wrong" );
            try {
                AlGlobalizer.instantiate<any>( "kevin3", () => true, "Something is horribly wrong" )
                expect( true ).toEqual( false );
            } catch( e ) {
                expect( e ).toBeInstanceOf( Error );
            }
        } );
        it( "should return the original object when collisionHandling is false", () => {
            AlGlobalizer.instantiate<any>( "kevin4", () => true, false );
            let instance = AlGlobalizer.instantiate<any>( "kevin4", () => false, false );
            expect( instance ).toEqual( true );        //  should retain first value
        } );
    } );
} );

