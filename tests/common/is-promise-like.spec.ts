import { isPromiseLike } from '@al/core';

describe( `isPromiseLike`, () => {
    it( `should differentiate between promise-y and non-promise-y things`, () => {
        let testObjects = [
            "kevin",
            { then: true },
            { then: () => {} },
            { then: { not_a_function: true } }
        ];
        let testResults = testObjects.map( thing => isPromiseLike( thing ) );
        expect( testResults ).toEqual( [ false, false, true, false ] );
    } );
} );

