import { expect } from 'chai';
import { describe } from 'mocha';
import { AlValidationSchemaProvider, AlJsonValidator } from '@al/core';

describe( 'AlJsonValidator', () => {

    let implicitProvider:AlValidationSchemaProvider = {
        hasSchema: ( schemaId:string ) => {
            if ( schemaId === 'https://alertlogic.com/fake/types/common.json' ) {
                return true;
            }
            return false;
        },
        getSchema: async ( schemaId:string ) => {
            if ( schemaId === 'https://alertlogic.com/fake/types/common.json' ) {
                return {
                    "$id": "https://alertlogic.com/fake/types/common.json",
                    "definitions": {
                        "widget": {
                            "type": "object",
                            "properties": {
                                "widget_type": { "type": "string" },
                                "name": { "type": "string" },
                                "enabled": { "type": "boolean" },
                                "subwidgets": {
                                    "type": "array",
                                    "items": { "$ref": "#definitions/widget" },
                                    "default": []
                                }
                            },
                            "required": [ "widget_type", "name" ],
                            "additionalProperties": false
                        }
                    },
                    "type": "object"
                };
            }
            throw new Error("Sorry, bad juju" );
        }
    };

    let fakeProvider:AlValidationSchemaProvider = {
        hasSchema: ( schemaId:string ) => {
            if ( schemaId === 'https://alertlogic.com/fake/types/thingy.json' ) {
                return true;
            }
            return false;
        },
        getSchema: async ( schemaId:string ) => {
            if ( schemaId === 'https://alertlogic.com/fake/types/thingy.json' ) {
                return {
                    "$id": "https://alertlogic.com/fake/types/thingy.json",
                    "definitions": {
                        "subthingy": {
                            "type": "object",
                            "properties": {
                                "subthingy_id": { "type": "string", "description": "Sub Thingy Identifier" },
                                "name":         { "type": "string", "description": "Name of the Sub Thingy" }
                            },
                            "required": [ "subthingy_id", "name" ]
                        }
                    },
                    "type": "object",
                    "properties": {
                        "type": { "type": "string" },
                        "widgets": {
                            "type": "array",
                            "items": { "$ref": "https://alertlogic.com/fake/types/common.json#definitions/widget" },
                            "default": []
                        },
                        "subthing": { "$ref": "#definitions/subthingy" }
                    },
                    "required": [ "type", "widgets" ]
                };
            }
        },
        getProviders: () => {
            return [ implicitProvider ];
        }
    };

    describe('basic functionality', () => {
        it('should "just work"', async () => {
            let validator:AlJsonValidator = new AlJsonValidator( fakeProvider );

            let widget1 = {
                "widget_type": "mcbobbert",
                "name": "Big McBobbert"
            };
            let widget2 = {
                "widget_type": "mini_bob",
                "name": "Mini McBobbert"
            };
            let widget3 = {
                "widget_type": "macro_bob",
                "name": "Macro Bobbert"
            };
            let widget4 = {
                "widget_type": "parent widget",
                "name": "A nested widget",
                "subwidget": widget3
            };
            let broken_widget1 = {
                "widget_type": "broken1"        //  missing name, a required property
            };
            let broken_widget2 = {
                "widget_type": 2,               //  invalid numeric ID
                "name": "Something",
                "enabled": true
            };
            let broken_widget3 = {
                "widget_type": "broken3",
                "name": "broken",
                "enabledd": true                //  misspelled property
            };
            let data1 = {
                "type": "mcthingy",
                "widgets": [ widget1, widget2, widget3, widget4 ]
            };

            let data2 = {
                "type": 1,
                "widgets": [ "one", "two", "three" ]
            };
            let result = await validator.test( data1, "https://alertlogic.com/fake/types/thingy.json" );
            expect( result.valid ).to.equal( true );

            result = await validator.test( data2, "https://alertlogic.com/fake/types/thingy.json" );
            expect( result.valid ).to.equal( false );

            result = await validator.test( widget1, "https://alertlogic.com/fake/types/common.json#definitions/widget" );
            expect( result.valid ).to.equal( true );

            result = await validator.test( widget2, "https://alertlogic.com/fake/types/common.json#definitions/widget" );
            expect( result.valid ).to.equal( true );

            result = await validator.test( widget3, "https://alertlogic.com/fake/types/common.json#definitions/widget" );
            expect( result.valid ).to.equal( true );

            result = await validator.test( broken_widget1, "https://alertlogic.com/fake/types/common.json#definitions/widget" );
            expect( result.valid ).to.equal( false );

            result = await validator.test( broken_widget2, "https://alertlogic.com/fake/types/common.json#definitions/widget" );
            expect( result.valid ).to.equal( false );

            result = await validator.test( broken_widget3, "https://alertlogic.com/fake/types/common.json#definitions/widget" );
            expect( result.valid ).to.equal( false );
        } );
    } );

    describe( "error cases", () => {
        describe("missing schemas", () => {
            it("should be handled gracefully", async () => {
                try {
                    let validator:AlJsonValidator = new AlJsonValidator( fakeProvider );
                    await validator.test( {}, "https://alertlogic.com/fake/types/missing.json" );
                    expect( true ).to.equal( false );
                } catch( e ) {
                    expect( e instanceof Error ).to.equal( true );
                }
            } );
        } );
        describe("missing schema definition", () => {
            it("should be handled gracefully", async () => {
                try {
                    let validator:AlJsonValidator = new AlJsonValidator( fakeProvider );
                    await validator.test( {}, "https://alertlogic.com/fake/types/common.json#definitions/missing" );
                    expect( true ).to.equal( false );
                } catch( e ) {
                    expect( e instanceof Error ).to.equal( true );
                }
            } );
        } );
    } );
} );
