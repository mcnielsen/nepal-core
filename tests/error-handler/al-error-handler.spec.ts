import { AlError, AlNetworkResponse } from '@al/core';

describe('AlError', () => {
    describe(".log()", () => {
        let logStub;
        beforeEach( () => {
            logStub = jest.spyOn( console, 'log' ).mockImplementation( () => {} );
        } );
        it("Should handle any input without blowing up", () => {
            let httpResponse:AlNetworkResponse = {
                status: 404,
                statusText: "Not found",
                data: { message: "Get lost, hoser!" },
                headers: { 'X-Response-Reason': 'Pure silliness' },
                request: {
                    endpoint: {
                        service: 'aims'
                    }
                }
            };
            AlError.log( httpResponse, "Got a weird response" );
            AlError.log( new AlError( "Something is rotten in the state of Denmark." ) );
            AlError.log( new Error("Something stinks under the kitchen sink." ) );
            AlError.log( "Throwing strings as Errors is silly and should never be done, but what can you do?", "Some comment" );
            AlError.log( 42 );
            expect( logStub.mock.calls.length ).toEqual( 6 );  //  1 for each .log call, plus one complaining about `42`
        } );
    } );
});
