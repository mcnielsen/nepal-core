import { expect } from 'chai';
import { before, describe, it } from 'mocha';
import { AlFoxSnapshot } from './types/al-fox.types';

/**
 * Validate that the account metadata resolver lambda performs as expected
 */

describe( 'AlFoxShapshot', () => {
    describe("supporting types", () => {
        it("should interpret raw data as expected", () => {
            let raw:unknown = {
                child: {
                    grandchild1: {
                        xp: {
                            available: [ "experience1", "experience2", "experience3" ],
                            active: "experience4",  /* should be forced to be first available option */
                            prompt: "something",    /* should be removed if not in available list */
                            extraneous: ""      /* should be trimmed */
                        },
                        options: {
                            feline: true
                        }
                    },
                    grandchild2: {
                        xp: {
                        },
                        options: {}
                    },
                    grandchild3: {
                        xp: {
                            available: ["experience4", "experience5" ],
                            prompt: "experience5"
                        },
                        options: true
                    }
                }
            };
            let snapshot = new AlFoxSnapshot( raw );
            expect( snapshot.getFeatureExperience( "child.grandchild1" ).available ).to.eql( [ "experience1", "experience2", "experience3" ] );
            expect( snapshot.getFeatureExperience( "child.grandchild1" ).active ).to.equal( "experience1" );
            expect( snapshot.getFeatureExperience( "child.grandchild1" ).prompt ).to.equal( undefined );
            expect( snapshot.getFeatureOptions( "child.grandchild1" ).feline ).to.equal( true );
            expect( snapshot.getFeatureExperience( "child.grandchild2" ).available ).to.eql( [] );
            expect( snapshot.getFeatureExperience( "child.grandchild2" ).active ).to.equal( null );
            expect( snapshot.getFeatureExperience( "child.grandchild2" ).prompt ).to.equal( undefined );
            expect( snapshot.getFeatureExperience( "child.grandchild3" ).available ).to.eql( [ "experience4", "experience5" ] );
            expect( snapshot.getFeatureExperience( "child.grandchild3" ).active ).to.equal( "experience4" );
            expect( snapshot.getFeatureExperience( "child.grandchild3" ).prompt ).to.equal( "experience5" );
            expect( snapshot.getFeatureOptions( "child.grandchild3" ) ).to.eql( {} );
            expect( snapshot.getFeatureExperience( "notdefined.notdefinedgrandkid" ).available ).to.eql( [ "default" ] );
            expect( snapshot.getFeatureExperience( "notdefined.notdefinedgrandkid" ).active ).to.equal( "default" );
            expect( snapshot.getFeatureExperience( "notdefined.notdefinedgrandkid" ).prompt ).to.equal( undefined );
            expect( snapshot.getFeatureOptions( "notdefined.notdefinedgrandkid" ).feline ).to.equal( undefined );

            expect( snapshot.getFeatureExperience( "a.b.c.d.e.f.g.zed" ).active ).to.equal("default");
        } );
        it("should interpret shorthand forms as expected", () => {
            let raw:unknown = {
                feature1: true,
                feature2: "override",
                feature3: {
                    "options": {
                        something: true,
                        untruthful: false
                    },
                    "xp": "my-experience"
                }
            };
            let snapshot = new AlFoxSnapshot( raw );
            expect( snapshot.getFeature( "feature1" ) ).to.eql( { options: {}, xp: { available: [ 'default' ], active: 'default' } } );
            expect( snapshot.getFeature( "feature2" ) ).to.eql( { options: {}, xp: { available: [ 'override' ], active: 'override' } } );
            expect( snapshot.getFeature( "feature3" ) ).to.eql( { options: { something: true, untruthful: false }, xp: { available: [ 'my-experience' ], active: 'my-experience' } } );
        } );

        it("should reject non-objects", () => {
            expect( () => {
                const snapshot = new AlFoxSnapshot( { child: [ "not an object" ] } );
            } ).to.throw();

            expect( () => {
                const snapshot = new AlFoxSnapshot( { child: { xp: [ "not an object or a string or a boolean" ] } } );
            } ).to.throw();
        } );

        it("should interpret realistic data", () => {
            let raw:unknown = {
                "global": {
                    "options": {
                        "phoenix_migrated": true
                    },
                    "xp": {
                        "available": [ "archipeligo17", "archipeligo19" ],
                        "active": "archipeligo19"
                    }
                },
                "monitoring": {
                    "options": {
                        "active_watch": true,
                        "active_watch_premier": false
                    }
                }
            };
            let snapshot = new AlFoxSnapshot( raw );

            expect( snapshot.getFeatureOptions("monitoring").active_watch ).to.equal( true );
        } );
    } );

} );
