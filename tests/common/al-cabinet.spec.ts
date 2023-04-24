import { AlCabinet } from '@al/core';

describe( 'AlCabinet', () => {

    afterEach( () => {
        jest.resetAllMocks();
    } );

    describe('static methods', () => {
        it('should instantiate an AlCabinet of the correct type', () => {
            const p = AlCabinet.persistent( "cabinet" );
            expect( p.type ).toEqual( AlCabinet.PERSISTENT );
            expect( p.data ).toEqual( {} );
            expect( p.name ).toEqual( "cabinet_persistent" );

            const e = AlCabinet.ephemeral( "cabinet" );
            expect( e.type ).toEqual( AlCabinet.EPHEMERAL );
            expect( e.data ).toEqual( {} );
            expect( e.name ).toEqual( "cabinet_ephemeral" );

            const l = AlCabinet.local( "cabinet" );
            expect( l.type ).toEqual( AlCabinet.LOCAL );
            expect( l.data ).toEqual( {} );
            expect( l.name ).toEqual( "cabinet" );
        } );

        it( 'should always return a reference to the same cabinet for a given name', () => {
            const p = AlCabinet.persistent("test1" );
            const ref2 = AlCabinet.persistent("test1" );

            expect( p ).toEqual( ref2 );
        } );
    } );

    describe('accessor methods', () => {
        it('should allow get, set, and delete of named keys', () => {
            const cabinet = AlCabinet.local( "test" );

            expect( cabinet.get("value") ).toEqual( null );

            cabinet.set("value", true );
            cabinet.set("value2", { name: "Kevin", identity: "dumb" } );

            expect( cabinet.get("value" ) ).toEqual( true );
            expect( cabinet.exists("value" ) ).toEqual( true );

            cabinet.delete( "value" );
            expect( cabinet.get("value" ) ).toEqual( null );
            expect( cabinet.exists("value" ) ).toEqual( false );

            //  Verify default value override works
            expect( cabinet.get("doesnt_exist", "exists" ) ).toEqual( "exists" );

            //  Verify that set/undefined is the same as deletion
            cabinet.set("value2", undefined );
            expect( cabinet.exists("value2" ) ).toEqual( false );
            expect( cabinet.get("value2", null ) ).toEqual( null );
        } );

        it('should delete expired content', ( done ) => {
            const cabinet = AlCabinet.local("test2" );
            cabinet.set("value1", true, 0.01 );     //  1 centisecond lifespan
            cabinet.set("value2", true, 1 );        //  1 second lifespan
            setTimeout( () => {
                expect( cabinet.expired( "value0" ) ).toEqual( true );

                expect( cabinet.expired( "value1" ) ).toEqual( true );
                expect( cabinet.get("value1", false ) ).toEqual( false );
                expect( cabinet.exists("value1" ) ).toEqual( false );

                expect( cabinet.expired( "value2" ) ).toEqual( false );
                expect( cabinet.get("value2", false ) ).toEqual( true );
                expect( cabinet.exists("value2" ) ).toEqual( true );
                done();
            }, 50 );
        } );
    } );

    describe('synchronize and destroy methods', () => {
        it("should synchronize and destroy (ALLTHETHINGS)", () => {
            const scabinet = AlCabinet.ephemeral("testDestroySS" );
            const lcabinet = AlCabinet.persistent("testDestroyLS" );

            scabinet.set("item", { value: true, something: "else" } );
            lcabinet.set("item", { value: true, something: "else" } );

            scabinet.synchronize();
            lcabinet.synchronize();

            /*
            expect( typeof( localStorage.getItem("testDestroyLS_persistent") ) ).toEqual('string' );
            expect( typeof( sessionStorage.getItem("testDestroySS_ephemeral") ) ).toEqual('string' );
            */

            scabinet.destroy();
            lcabinet.destroy();

            /*
            expect( sessionStorage.getItem("testDestroySS") ).toEqual( null );
            expect( localStorage.getItem("testDestroyLS") ).toEqual( null );
            */
        } );
    } );

} );
