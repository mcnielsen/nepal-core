import { exampleSession } from '../mocks';
import {
    AlExecutionContext,
    AlAuthenticationUtility, AlAuthenticationResult,
    AlNetworkResponse,
    ConfigOption,
} from '@al/core';
import { AxiosResponse } from 'axios';

describe('AlAuthenticationUtility', () => {

    let authenticator:AlAuthenticationUtility;

    beforeEach( () => {
        AlExecutionContext.setOption( ConfigOption.GestaltAuthenticate, true );
        AlExecutionContext.setOption( ConfigOption.ResolveAccountMetadata, false );
        AlExecutionContext.target( "production" );
        jest.spyOn( AlExecutionContext.session, "ready" ).mockResolvedValue();
        jest.spyOn( AlExecutionContext.session, "setAuthentication" ).mockResolvedValue( {} as any );
    } );

    afterEach( () => {
        jest.clearAllMocks();
        AlExecutionContext.reset();
    } );

    describe( ".authenticate() without state", () => {
        beforeEach( () => {
            AlExecutionContext.session.deactivateSession();
            authenticator = new AlAuthenticationUtility();
        } );

        it( "should understand successful authentication", async () => {
            jest.spyOn( AlExecutionContext.default, "handleRequest" ).mockResolvedValue( { status: 200, data: exampleSession } as AlNetworkResponse );
            let result = await authenticator.authenticate( "something", "password" );
            expect( result ).toEqual( AlAuthenticationResult.Authenticated );
        } );

        it( "should interpret MFA verification required responses", async () => {
            jest.spyOn( AlExecutionContext.default, "handleRequest" ).mockRejectedValue( {
                data: {
                    error: "mfa_code_required"
                },
                status: 401,
                statusText: "NYET",
                headers: {
                    'x-aims-session-token': "MySessionToken"
                },
                request: null
            } as AlNetworkResponse );
            let result = await authenticator.authenticate( "something", "password" );
            expect( result ).toEqual( AlAuthenticationResult.MFAVerificationRequired );
            expect( authenticator.getSessionToken() ).toEqual( "MySessionToken" );
        } );

        it( "should interpret MFA enrollment required responses", async () => {
            jest.spyOn( AlExecutionContext.default, "handleRequest" ).mockRejectedValue( {
                data: {
                    error: "mfa_enrollment_required"
                },
                status: 401,
                statusText: "NYET",
                headers: {
                    'x-aims-session-token': "MySessionToken"
                },
                request: null
            } as AlNetworkResponse  );
            let result = await authenticator.authenticate( "something", "password" );
            expect( result ).toEqual( AlAuthenticationResult.MFAEnrollmentRequired );
            expect( authenticator.getSessionToken() ).toEqual( "MySessionToken" );
        } );

        it( "should interpret password reset required responses", async () => {
            jest.spyOn( AlExecutionContext.default, "handleRequest" ).mockRejectedValue( {
                data: {
                    error: "password_expired"
                },
                status: 400,
                statusText: "NYET",
                headers: {},
                request: null
            }  as AlNetworkResponse );
            let result = await authenticator.authenticate( "something", "password" );
            expect( result ).toEqual( AlAuthenticationResult.PasswordResetRequired );
        } );

        it( "should interpret TOS acceptance required responses", async () => {
            jest.spyOn( AlExecutionContext.default, "handleRequest" ).mockRejectedValue( {
                data: {
                    error: "accept_tos_required",
                    tos_url: "https://lmgtfy.app/?q=Not+Implemented"
                },
                status: 401,
                statusText: "NYET",
                headers: {
                    'x-aims-session-token': "UglyToken"
                },
                request: null
            } as AlNetworkResponse  );
            let result = await authenticator.authenticate( "something", "password" );
            expect( result ).toEqual( AlAuthenticationResult.TOSAcceptanceRequired );
            expect( authenticator.getSessionToken() ).toEqual( "UglyToken" );
            expect( authenticator.getTermsOfServiceURL() ).toEqual( "https://lmgtfy.app/?q=Not+Implemented" );
        } );

    } );

    describe( ".validateMfaCode()", () => {
        beforeEach( () => {
            AlExecutionContext.session.deactivateSession();
            authenticator = new AlAuthenticationUtility( { sessionToken: "MySessionToken" } );
        } );

        it( "should handle successful validation", async () => {
            jest.spyOn( AlExecutionContext.default, "handleRequest" ).mockResolvedValue( { status: 200, data: exampleSession } as AlNetworkResponse  );
            let result = await authenticator.validateMfaCode( "123456" );
            expect( result ).toEqual( AlAuthenticationResult.Authenticated );
        } );

        it( "should handle unsuccessful validation", async () => {
            jest.spyOn( AlExecutionContext.default, "handleRequest" ).mockResolvedValue( {
                data: {},
                status: 401,
                statusText: "NYET",
                headers: {},
                request: null
            } as AlNetworkResponse  );
            let result = await authenticator.validateMfaCode( "123456" );
            expect( result ).toEqual( AlAuthenticationResult.InvalidCredentials );
        } );
    } );

    describe( ".filterReturnURL()", () => {
        beforeEach( () => {
            AlExecutionContext.session.deactivateSession();
            authenticator = new AlAuthenticationUtility( { sessionToken: "MySessionToken" } );
        } );

        it( "should allow legit internal URLs", () => {
            let internalURLs = [
                `https://console.dashboards.alertlogic.com/#/some/silly/path`,
                `http://console.overview.alertlogic.com`,
                `https://ng-common-components.ui-dev.product.dev.alertlogic.com`,
                `https://console.exposures.alertlogic.co.uk/#/blah/2?aaid=2&locid=thppppt`,
                `https://console.alertlogic.net/events.php`
            ];

            internalURLs.forEach( url => {
                let value = authenticator.filterReturnURL( url );
                expect( value ).toEqual( url );
            } );
        } );

        it( "should allow localhost URLs", () => {
            let localURLs = [
                `https://localhost:99999/#/dashboards`,
                `http://localhost:4220/#/search/expert/2?aaid=2&locid=defender-us-denver`
            ];
            localURLs.forEach( url => {
                let value = authenticator.filterReturnURL( url );
                expect( value ).toEqual( url );
            } );
        } );

        it( "should reject external URLs", () => {
            let externalURLs = [
                `https://google.com`,
                `https://console.dashboards.alertlogic.hackery.com/#/some/silly/path`,
                `https://console.alertlogic-not.com`
            ];

            externalURLs.forEach( url => {
                let value = authenticator.filterReturnURL( url );
                expect( value ).toEqual( `https://console.account.alertlogic.com/#/` );
            } );
        } );

        it( "should allow the caller to override the default URL", () => {
            let result = authenticator.filterReturnURL( `https://google.com`, `https://console.alertlogic.com/#/path` );
            expect( result ).toEqual( `https://console.alertlogic.com/#/path` );
        } );
    } );

} );
