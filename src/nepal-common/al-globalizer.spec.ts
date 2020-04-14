import { expect } from 'chai';
import { describe, before } from 'mocha';
import { AlGlobalizer } from './utility/al-globalizer';
import * as sinon from 'sinon';

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
        afterEach( () => {
            sinon.restore();
        } );
        it( "should use a factory method to create an instance of a service", () => {
            AlGlobalizer.instantiate<any>( "kevin", () => { return { something: true }; } );
            expect( (window as any).al.registry.kevin ).to.be.an( "object" );
        } );
        it( "should warn about collisions when collisionHandling is set to true", () => {
            let stub = sinon.stub( console, 'warn' ).returns( null );
            AlGlobalizer.instantiate<any>( "kevin2", () => true, true );
            AlGlobalizer.instantiate<any>( "kevin2", () => true, true );
            expect( stub.callCount ).to.equal( 1 );
        } );
        it( "should throw an error when collisionHandling is a string", () => {
            AlGlobalizer.instantiate<any>( "kevin3", () => true, "Something is horribly wrong" );
            try {
                AlGlobalizer.instantiate<any>( "kevin3", () => true, "Something is horribly wrong" )
                expect( true ).to.equal( false );
            } catch( e ) {
                expect( e ).to.be.an( "Error" );
            }
        } );
        it( "should return the original object when collisionHandling is false", () => {
            AlGlobalizer.instantiate<any>( "kevin4", () => true, false );
            let instance = AlGlobalizer.instantiate<any>( "kevin4", () => false, false );
            expect( instance ).to.equal( true );        //  should retain first value
        } );
    } );
} );

