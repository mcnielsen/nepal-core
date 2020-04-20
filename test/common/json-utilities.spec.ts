import { expect } from 'chai';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import {
    deepMerge,
    getJsonPath,
    setJsonPath,
} from '@al/core';

describe( `getJsonPath`, () => {
    it( `Should retrieve the expected data from deeply nested objects`, () => {
        const testSubject = {
            child: {
                granddaughter: {
                    age: 12,
                    name: "Analee"
                },
                grandson: {
                    age: 9,
                    name: "Conlee"
                }
            },
            sibling: {
                age: 39,
                name: "Emma",
                insane: true
            }
        };

        expect( getJsonPath( testSubject, "child.granddaughter.name" ) ).to.equal("Analee");
        expect( getJsonPath( testSubject, "child.granddaughter.namf" ) ).to.equal(undefined);
        expect( getJsonPath( testSubject, "child.granddaughter.namg", "Unknown" ) ).to.equal("Unknown");
        expect( getJsonPath( testSubject.sibling, "age" ) ).to.equal( 39 );
        expect( getJsonPath( testSubject.child, "grandson" ) ).to.equal( getJsonPath( testSubject, "child.grandson" ) );
    } );
} );

describe( `setJsonPath`, () => {
    afterEach( () => sinon.restore() );
    it( `Should create/set data as expected inside an existing object`, () => {
        let target = {
            existing: {
                type: "cat",
                color: "gray"
            }
        };

        setJsonPath( target, "new.type", "dog" );
        setJsonPath( target, "new.color", "brown" );
        setJsonPath( target, "new.possible_names", [ "Murphy", "Gus", "Broccoli" ] ); //  <-- at least one of these is a terrible name for a dog
        setJsonPath( target, "existing.color", "red" );

        expect( target ).to.deep.equal( {
            existing: {
                type: "cat",
                color: "red"
            },
            new: {
                type: "dog",
                color: "brown",
                possible_names: [ "Murphy", "Gus", "Broccoli" ]
            }
        } );
    } );
} );

describe( `deepMerge`, () => {
    afterEach( () => {
        sinon.restore();
    } );
    it( `Should smoosh objects together into an expected pattern`, () => {
        let object1 = {
            dog: {
                name: "Gus",
                color: "yellow",
                age: 13,
                dead: true
            }
        };
        let object2 = {
            cat: {
                name: "Ralph",
                color: "orange",
                age: 17,
                dead: false
            }
        };
        let object3 = {
            cat: {
                father: {
                    name: "unknown"
                },
                mother: {
                    name: "unknown"
                }
            }
        };
        let object4 = {
            cat: {
                mother: {
                    name: "Martha",
                    dead: true
                }
            }
        }

        const output = deepMerge( {}, object1, object2, object3, object4 );
        expect( output ).to.deep.equal( {
            dog: {
                name: "Gus",
                color: "yellow",
                age: 13,
                dead: true
            },
            cat: {
                name: "Ralph",
                color: "orange",
                age: 17,
                dead: false,
                father: {
                    name: "unknown"
                },
                mother: {
                    name: "Martha",
                    dead: true
                }
            }
        } );
    } );

    it( `Should emit warning when setting/merging objects to scalars.`, () => {
        let stub = sinon.stub( console, "warn" ).returns(null);
        let object1 = {
            thing: true
        };
        setJsonPath( object1, "thing.color", "red" );
        deepMerge( object1, {
            thing: {
                color: {
                    rgb: "#FF00FF"
                }
            }
        } );
        expect( stub.callCount ).to.equal( 2 );
        stub.restore();
    } );
} );
