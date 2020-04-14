import { expect } from 'chai';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import { AlQuerySubject, AlQueryEvaluator } from './utility';

class MockQueryable implements AlQuerySubject
{
    constructor( public data:any ) {
    }

    getPropertyValue( property:string, ns:string ):any {
        if ( this.data.hasOwnProperty( ns ) ) {
            return this.extract( this.data[ns], property.split(".") );
        } else {
            return this.extract( this.data, property.split(".") );
        }
    }

    extract( cursor:any, propertyPath:string[] ):any {
        if ( propertyPath.length === 0 ) {
            return null;
        }
        const property = propertyPath.shift() as string;
        if ( ! cursor.hasOwnProperty( property ) ) {
            return null;
        }
        if ( propertyPath.length === 0 ) {
            return cursor[property];
        } else {
            return this.extract( cursor[property], propertyPath );
        }
    }
}

describe( `AlQueryEvaluator`, () => {
    let queryable:MockQueryable;
    beforeEach( () => {
        queryable = new MockQueryable( {
            "default": {
                "a": true,
                "b": 1,
                "c": "textValue",
                "d": [ "red", "green", "blue" ],
                "e": null,
            }
        } );
    } );
    afterEach( () => {
        sinon.restore();
    } );
    describe( 'test', () => {
        it( 'should evaluate basic queries properly', () => {
            let query = new AlQueryEvaluator({
                "and": [
                    {
                        "and": [
                            {
                                "and": [
                                    {
                                        "and": [
                                            {
                                                "and": [
                                                    {
                                                        "and": [
                                                            {
                                                                "=": [
                                                                    { "source": "a" },
                                                                    true
                                                                ]
                                                            },
                                                            {
                                                                "=": [
                                                                    { "source": "b" },
                                                                    1
                                                                ]
                                                            }
                                                        ]
                                                    },
                                                    {
                                                        "=": [
                                                            { "source": "c" },
                                                            "textValue"
                                                        ]
                                                    }
                                                ]
                                            },
                                            {
                                                "contains_any": [
                                                    { "source": "d" },
                                                    [
                                                        "red",
                                                        "yellow",
                                                        "brown"
                                                    ]
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        "contains_all": [
                                            { "source": "d" },
                                            [
                                                "red",
                                                "green",
                                                "blue"
                                            ]
                                        ]
                                    }
                                ]
                            },
                            { "isnull": [{ "source": "e" }] }
                        ]
                    },
                    {
                        "=": [
                            { "source": "e" },
                            null
                        ]
                    }
                ]
            });
            expect( query.test( queryable ) ).to.equal( true );

            let query2 = new AlQueryEvaluator({
                "or": [
                    {
                        "=": [
                            { "source": "a" },
                            false
                        ]
                    },
                    {
                        "<": [
                            { "source": "b" },
                            1
                        ]
                    },
                    {
                        "=": [
                            { "source": "c" },
                            "snarfblatt"
                        ]
                    },
                    {
                        "contains_any": [
                            { "source": "d" },
                            [
                                "pink",
                                "orange",
                                "purple"
                            ]
                        ]
                    },
                    {
                        "contains_all": [
                            { "source": "d" },
                            [
                                "red",
                                "green",
                                "blurple"
                            ]
                        ]
                    },
                    { "isnull": [{ "source": "a" }] }
                ]
            });
            expect( query2.test( queryable ) ).to.equal( false );

        } );
        it( "should evaluate other equivalence operators", () => {
            let query = new AlQueryEvaluator({
                "and": [
                    {
                        ">": [
                            { "source": "a" },
                            0
                        ]
                    },
                    {
                        "<": [
                            { "source": "b" },
                           0
                        ]
                    },
                    {
                        ">=": [
                            { "source": "c" },
                            0
                        ]
                    },
                    {
                        "<=": [
                            { "source": "d" },
                            0
                        ]
                    },
                    {
                        "!=": [
                            { "source": "e" },
                            0
                        ]
                    }
                ]
            } );
            let subject1 = new MockQueryable( {
                "default": {
                    "a": 0,
                    "b": 0,
                    "c": -1,
                    "d": 1,
                    "e": 0,
                }
            } );
            let subject2 = new MockQueryable( {
                "default": {
                    "a": 1,
                    "b": -1,
                    "c": 1,
                    "d": -1,
                    "e": "NaN",
                }
            } );
            expect( query.test( subject1 ) ).to.equal( false );
            expect( query.test( subject2 ) ).to.equal( true );
        } );

        it( "should evaluate CONTAINS and IN operators", () => {
            let query = new AlQueryEvaluator( {
                "and": [
                    {
                        "in": [
                            { source: "value" },
                            [ "a", "b", "c" ]
                        ]
                    },
                    {
                        "contains": [
                            { source: "list" },
                            "a"
                        ]
                    },
                    {
                        not: {
                            contains: [
                                { source: "list2" },
                                "a"
                            ]
                        }
                    }
                ]
            } );
            let subject1 = new MockQueryable( {
                "default": {
                    "list": [ "a", "b", "c" ],
                    "value": "a"
                }
            } );
            let subject2 = new MockQueryable( {
                "default": {
                    "list": { "x": true, y: true, z: true },
                    value: "delta",
                    "list2": [ "e", "f", "g" ]
                }
            } );
            expect( query.test( subject1 ) ).to.equal( true );
            expect( query.test( subject2 ) ).to.equal( false );
        } );
    } );
} );
