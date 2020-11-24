import { expect } from 'chai';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import { AlBaseError } from "../../src/common";
import { AlErrorHandler } from '../../src/error-handler';
import { AxiosResponse, AxiosRequestConfig } from 'axios';

describe('AlErrorHandler', () => {
    describe(".log()", () => {
        let logStub;
        before( () => {
            logStub = sinon.stub( console, 'log' );
        } );
        after( () => {
            sinon.restore();
        } );
        it("Should handle any input without blowing up", () => {
            let httpResponse:AxiosResponse = {
                status: 404,
                statusText: "Not found",
                data: { message: "Get lost, hoser!" },
                headers: { 'X-Response-Reason': 'Pure silliness' },
                config: {
                    service_name: 'aims'
                } as AxiosRequestConfig
            };
            AlErrorHandler.log( httpResponse, "Got a weird response" );
            AlErrorHandler.log( new AlBaseError( "Something is rotten in the state of Denmark." ) );
            AlErrorHandler.log( new Error("Something stinks under the kitchen sink." ) );
            AlErrorHandler.log( "Throwing strings as Errors is silly and should never be done, but what can you do?", "Some comment" );
            AlErrorHandler.log( 42 );
            expect( logStub.callCount ).to.equal( 6 );  //  1 for each .log call, plus one complaining about `42`
        } );
    } );
});
