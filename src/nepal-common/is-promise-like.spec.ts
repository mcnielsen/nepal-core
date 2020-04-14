import { expect } from 'chai';
import { describe, before } from 'mocha';
import { isPromiseLike } from './utility/is-promise-like';
import * as sinon from 'sinon';

describe( `isPromiseLike`, () => {
    afterEach( () => {
        sinon.restore();
    } );
    it( `should differentiate between promise-y and non-promise-y things`, () => {
        let testObjects = [
            "kevin",
            { then: true },
            { then: () => {} },
            { then: { not_a_function: true } }
        ];
        let testResults = testObjects.map( thing => isPromiseLike( thing ) );
        expect( testResults ).to.deep.equal( [ false, false, true, false ] );
    } );
} );

