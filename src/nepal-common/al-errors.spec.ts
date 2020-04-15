import { expect } from 'chai';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import {
    AlAPIServerError,
    AlBadGatewayError,
    AlBadRequestError,
    AlNotFoundError,
    AlResponseValidationError,
    AlUnauthenticatedRequestError,
    AlUnauthorizedRequestError,
    AlUnimplementedMethodError,
} from './errors';

describe( `Errors`, () => {
    afterEach( () => {
        sinon.restore();
    } );
    describe( 'AlAPIServerError', () => {

        it( 'should instantiate as expected', () => {
            const error = new AlAPIServerError( "Some error happened somewhere, somehow", "aims", 401 );

            expect( error.message ).to.be.a("string");
            expect( error.serviceName ).to.equal("aims" );
            expect( error.statusCode ).to.equal( 401 );
        } );

    } );

    describe( 'AlResponseValidationError', () => {
        it( 'should instantiate as expected', () => {
            const error = new AlResponseValidationError( "Some error happened somewhere, somehow", [ { error: true, file: '/file1', line: 120 } ] );

            expect( error.message ).to.be.a("string" );
            expect( error.errors ).to.be.an("array");
            expect( error.errors.length ).to.equal( 1 );

            const error2 = new AlResponseValidationError( "Blahblahblah" );

            expect( error2.message ).to.be.a("string" );
            expect( error2.errors ).to.be.an("array");
            expect( error2.errors.length ).to.equal( 0 );
        } );
    } );

    describe( 'AlBadRequestError', () => {
        it( 'should instantiate as expected', () => {
            const error = new AlBadRequestError( "You made a bad request", "data", "aggregation.configuration.id", "This value cannot be specified for a creation request" );

            expect( error.httpResponseCode ).to.equal( 400 );
            expect( error.message ).to.be.a("string" );
            expect( error.inputType ).to.be.a("string" );
            expect( error.inputProperty ).to.be.a("string" );
            expect( error.description ).to.be.a("string" );
        } );
    } );
    describe( 'AlUnauthenticatedRequestError', () => {
        it( 'should instantiate as expected', () => {
            const error = new AlUnauthenticatedRequestError( "You cannot login in", "aims" );

            expect( error.httpResponseCode ).to.equal( 401 );
            expect( error.message ).to.be.a("string" );
            expect( error.authority ).to.be.a("string" );
        } );
    } );
    describe( 'AlUnauthorizedRequestError', () => {
        it( 'should instantiate as expected', () => {
            const error = new AlUnauthorizedRequestError( "You cannot access that stuff", "stuff" );

            expect( error.httpResponseCode ).to.equal( 403 );
            expect( error.message ).to.be.a("string" );
            expect( error.resource ).to.be.a("string" );
        } );
    } );
    describe( 'AlUnimplementedMethodError', () => {
        it( 'should instantiate as expected', () => {
            const error = new AlUnimplementedMethodError( "No way, Jose" );

            expect( error.httpResponseCode ).to.equal( 501 );
            expect( error.message ).to.be.a("string" );
        } );
    } );
    describe( 'AlNotFoundError', () => {
        it( 'should instantiate as expected', () => {
            const error = new AlNotFoundError( "I don't think so, Bob" );

            expect( error.httpResponseCode ).to.equal( 404 );
            expect( error.message ).to.be.a("string" );
        } );
    } );

    describe( `AlBadGatewayError`, () => {
        it( 'should instantiate as expected', () => {
            const error = new AlBadGatewayError( "Sorry, Bob, someone else messed up.", "AIMS", { anything: true } );
            expect( error.httpResponseCode ).to.equal( 502 );
            expect( error.message ).to.be.a("string");
        } );
    } );

} );
