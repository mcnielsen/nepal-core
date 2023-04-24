import {
    AlAPIServerError,
    AlBadGatewayError,
    AlBadRequestError,
    AlNotFoundError,
    AlDataValidationError,
    AlNetworkRequestDescriptor,
    AlUnauthenticatedRequestError,
    AlUnauthorizedRequestError,
    AlUnimplementedMethodError,
} from '@al/core';

describe( `Errors`, () => {

    describe("AlAPIServerERror", () => {
        it( 'should instantiate as expected', () => {
            const error = new AlAPIServerError( "Some error happened somewhere, somehow", "aims", 401 );

            expect( typeof( error.message ) ).toBe("string");
            expect( error.serviceName ).toEqual("aims" );
            expect( error.statusCode ).toEqual( 401 );
        } );

    } );

    describe( 'AlDataValidationError', () => {
        it( 'should instantiate as expected', () => {
            let requestConfig = {} as AlNetworkRequestDescriptor;
            let data = {} as unknown;
            const error = new AlDataValidationError( "Some error happened somewhere, somehow", data, 'https://something#definitions/something-else', [ { thing: true } ], requestConfig );

            expect( typeof( error.message ) ).toBe("string" );
            expect( Array.isArray( error.validationErrors ) ).toBe(true);
            expect( error.validationErrors.length ).toEqual( 1 );
        } );
    } );

    describe( 'AlBadRequestError', () => {
        it( 'should instantiate as expected', () => {
            const error = new AlBadRequestError( "You made a bad request", "data", "aggregation.configuration.id", "This value cannot be specified for a creation request" );

            expect( error.httpResponseCode ).toEqual( 400 );
            expect( typeof( error.message ) ).toBe("string" );
            expect( typeof( error.inputType ) ).toBe("string" );
            expect( typeof( error.inputProperty ) ).toBe("string" );
            expect( typeof( error.description ) ).toBe("string" );
        } );
    } );
    describe( 'AlUnauthenticatedRequestError', () => {
        it( 'should instantiate as expected', () => {
            const error = new AlUnauthenticatedRequestError( "You cannot login in", "aims" );

            expect( error.httpResponseCode ).toEqual( 401 );
            expect( typeof( error.message ) ).toBe("string" );
            expect( typeof( error.authority ) ).toBe("string" );
        } );
    } );
    describe( 'AlUnauthorizedRequestError', () => {
        it( 'should instantiate as expected', () => {
            const error = new AlUnauthorizedRequestError( "You cannot access that stuff", "stuff" );

            expect( error.httpResponseCode ).toEqual( 403 );
            expect( typeof( error.message ) ).toBe("string" );
            expect( typeof(error.resource) ).toBe("string" );
        } );
    } );
    describe( 'AlUnimplementedMethodError', () => {
        it( 'should instantiate as expected', () => {
            const error = new AlUnimplementedMethodError( "No way, Jose" );

            expect( error.httpResponseCode ).toEqual( 501 );
            expect( typeof(error.message) ).toBe("string" );
        } );
    } );
    describe( 'AlNotFoundError', () => {
        it( 'should instantiate as expected', () => {
            const error = new AlNotFoundError( "I don't think so, Bob" );

            expect( error.httpResponseCode ).toEqual( 404 );
            expect( typeof(error.message) ).toBe("string" );
        } );
    } );

    describe( `AlBadGatewayError`, () => {
        it( 'should instantiate as expected', () => {
            const error = new AlBadGatewayError( "Sorry, Bob, someone else messed up.", "AIMS", { anything: true } );
            expect( error.httpResponseCode ).toEqual( 502 );
            expect( typeof(error.message) ).toBe("string");
        } );
    } );

} );
