import { expect } from 'chai';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import { exampleSession } from '../mocks';
import {
    AlDefaultClient,
    AlAuthenticationUtility, AlAuthenticationResult,
    AlSession,
    ConfigOption,
    AlRuntimeConfiguration
} from '@al/core';
import { AxiosResponse } from 'axios';

describe('AlAuthenticationUtility', () => {

    let authenticator:AlAuthenticationUtility;

    beforeEach( () => {
        AlRuntimeConfiguration.setOption( ConfigOption.GestaltAuthenticate, true );
        AlRuntimeConfiguration.setOption( ConfigOption.ResolveAccountMetadata, false );
        AlRuntimeConfiguration.setContext( "production" );
        sinon.stub( AlSession, "ready" ).returns( Promise.resolve() );
    } );

    afterEach( () => {
        sinon.restore();
        AlRuntimeConfiguration.reset();
    } );

    describe( ".authenticate() without state", () => {
        beforeEach( () => {
            AlSession.deactivateSession();
            authenticator = new AlAuthenticationUtility();
        } );

        it( "should understand successful authentication", async () => {
            sinon.stub( AlDefaultClient, "authenticateViaGestalt" ).returns( Promise.resolve( exampleSession ) );
            let result = await authenticator.authenticate( "something", "password" );
            expect( result ).to.equal( AlAuthenticationResult.Authenticated );
        } );

        it( "should interpret MFA verification required responses", async () => {
            sinon.stub( AlDefaultClient, "authenticateViaGestalt" ).returns( Promise.reject( {
                data: {
                    error: "mfa_code_required"
                },
                status: 401,
                statusText: "NYET",
                headers: {
                    'x-aims-session-token': "MySessionToken"
                },
                config: null
            } ) );
            let result = await authenticator.authenticate( "something", "password" );
            expect( result ).to.equal( AlAuthenticationResult.MFAVerificationRequired );
            expect( authenticator.getSessionToken() ).to.equal( "MySessionToken" );
        } );

        it( "should interpret MFA enrollment required responses", async () => {
            sinon.stub( AlDefaultClient, "authenticateViaGestalt" ).returns( Promise.reject( {
                data: {
                    error: "mfa_enrollment_required"
                },
                status: 401,
                statusText: "NYET",
                headers: {
                    'x-aims-session-token': "MySessionToken"
                },
                config: null
            } ) );
            let result = await authenticator.authenticate( "something", "password" );
            expect( result ).to.equal( AlAuthenticationResult.MFAEnrollmentRequired );
            expect( authenticator.getSessionToken() ).to.equal( "MySessionToken" );
        } );

        it( "should interpret password reset required responses", async () => {
            sinon.stub( AlDefaultClient, "authenticateViaGestalt" ).returns( Promise.reject( {
                data: {
                    error: "password_expired"
                },
                status: 400,
                statusText: "NYET",
                headers: {},
                config: null
            } ) );
            let result = await authenticator.authenticate( "something", "password" );
            expect( result ).to.equal( AlAuthenticationResult.PasswordResetRequired );
        } );

        it( "should interpret TOS acceptance required responses", async () => {
            sinon.stub( AlDefaultClient, "authenticateViaGestalt" ).returns( Promise.reject( {
                data: {
                    error: "accept_tos_required",
                    tos_url: "https://lmgtfy.app/?q=Not+Implemented"
                },
                status: 401,
                statusText: "NYET",
                headers: {
                    'x-aims-session-token': "UglyToken"
                },
                config: null
            } ) );
            let result = await authenticator.authenticate( "something", "password" );
            console.log("Configuration...", AlRuntimeConfiguration.getOptions() );
            expect( result ).to.equal( AlAuthenticationResult.TOSAcceptanceRequired );
            expect( authenticator.getSessionToken() ).to.equal( "UglyToken" );
            expect( authenticator.getTermsOfServiceURL() ).to.equal( "https://lmgtfy.app/?q=Not+Implemented" );
        } );

    } );

    describe( ".validateMfaCode()", () => {
        beforeEach( () => {
            AlSession.deactivateSession();
            authenticator = new AlAuthenticationUtility( { sessionToken: "MySessionToken" } );
        } );

        it( "should handle successful validation", async () => {
            sinon.stub( AlDefaultClient, "authenticateWithMFAViaGestalt" ).returns( Promise.resolve( exampleSession ) );
            let result = await authenticator.validateMfaCode( "123456" );
            expect( result ).to.equal( AlAuthenticationResult.Authenticated );
        } );

        it( "should handle unsuccessful validation", async () => {
            sinon.stub( AlDefaultClient, "authenticateWithMFAViaGestalt" ).returns( Promise.reject( {
                data: {},
                status: 401,
                statusText: "NYET",
                headers: {},
                config: null
            } ) );
            let result = await authenticator.validateMfaCode( "123456" );
            expect( result ).to.equal( AlAuthenticationResult.InvalidCredentials );
        } );
    } );

} );
