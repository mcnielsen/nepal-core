import {
    AlExecutionContext,
    AlLocation,
    AlLocationDescriptor,
    AlLocatorMatrix,
} from '@al/core';
import { AlTestExecutionContext } from '@al/core/testing';

describe( 'AlLocatorMatrix', () => {

    let context:AlTestExecutionContext;

    beforeEach( () => {
        context = new AlTestExecutionContext();
    } );

    describe( 'utility methods', () => {

        it( "should propertly calculate the base from a complex URL", () => {
            expect( context.locator["getBaseUrl"]( "https://lmgtfy.com/?q=cache+miss" ) ).toEqual( "https://lmgtfy.com" );
            expect( context.locator["getBaseUrl"]( "https://console.overview.alertlogic.com/#/remediations-scan-status/2" ) ).toEqual("https://console.overview.alertlogic.com" );
        } );
        it( "should escape uri patterns in the expected way", () => {
            expect( context.locator['escapeLocationPattern']( "https://console.overview.alertlogic.com" ) ).toEqual( "^https:\\/\\/console\\.overview\\.alertlogic\\.com.*$" );
            expect( context.locator['escapeLocationPattern']( "https://dashboards.pr-*.ui-dev.alertlogic.com" ) ).toEqual( "^https:\\/\\/dashboards\\.pr\\-([a-zA-Z0-9_-]+)\\.ui\\-dev\\.alertlogic\\.com.*$" );
        } );

        it( "should properly resolve URI patterns to location nodes", () => {
            let node = context.locator.getNodeByURI( "https://console.overview.alertlogic.co.uk/#/remediations-scan-status/2" );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.environment ).toEqual( "production" );
            expect( node.residency ).toEqual( "EMEA" );
            expect( node.locTypeId ).toEqual( AlLocation.OverviewUI );

            //  Make sure that aliased nodes work, and return a node with the URI pointing to themselves
            let aliasNodeURL = "https://incidents-pr-12.ui-dev.product.dev.alertlogic.com/#/summary/12345678?aaid=12345678&locid=defender-uk-newport";
            let aliasNodeBase = "https://incidents-pr-12.ui-dev.product.dev.alertlogic.com";
            node = context.locator.getNodeByURI( aliasNodeURL );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.environment ).toEqual( "integration" );
            expect( node.residency ).toEqual( undefined );
            expect( node.locTypeId ).toEqual( AlLocation.IncidentsUI );
            expect( node.uri ).toEqual( aliasNodeBase );

            //  This should match the same node as above, but change the URL back to the canonical console.incidents.product.dev.alertlogic.com
            aliasNodeURL = "https://console.incidents.product.dev.alertlogic.com/#/summary/12345678?aaid=12345678&locid=defender-uk-newport";
            aliasNodeBase = "https://console.incidents.product.dev.alertlogic.com";
            let node2 = context.locator.getNodeByURI( aliasNodeURL );
            expect( typeof( node2 ) ).toBe( "object" );
            expect( node ).toEqual( node2 );
            expect( node.environment ).toEqual( "integration" );
            expect( node.residency ).toEqual( undefined );
            expect( node.locTypeId ).toEqual( AlLocation.IncidentsUI );
            expect( node.uri ).toEqual( aliasNodeBase );

            //  iris
            aliasNodeURL = "https://iris-ui-pr-8.ui-dev.product.dev.alertlogic.com/";
            aliasNodeBase = "https://iris-ui-pr-8.ui-dev.product.dev.alertlogic.com";
            node = context.locator.getNodeByURI( aliasNodeURL );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.environment ).toEqual( "integration" );
            expect( node.locTypeId ).toEqual( AlLocation.IrisUI );
            expect( node.uri ).toEqual( aliasNodeBase );
        } );

        it( "should propertly identify the acting node from the acting URL passed to the constructor", () => {
            context.target( "https://console.incidents.product.dev.alertlogic.com/#/summary/2?aaid=2&locid=defender-us-denver",
                            null, "defender-us-denver", [ "defender-us-denver", "insight-us-virginia" ] );
            let actor = context.locator.getActingNode();
            expect( typeof( actor ) ).toBe( "object" );
            expect( actor.locTypeId ).toEqual( AlLocation.IncidentsUI );
            expect( actor.environment ).toEqual( 'integration' );
        } );

        it( "should allow retrieval of nodes with appropriate contextual overrides", () => {
            
            let node:AlLocationDescriptor;
            context.target( "https://console.incidents.product.dev.alertlogic.com/#/summary/2?aaid=2&locid=defender-us-denver",
                            null, "defender-us-denver", [ "defender-us-denver", "insight-us-virginia", "defender-uk-newport", "insight-eu-ireland" ] );

            node = context.locator.getNode( AlLocation.LegacyUI, { locationId: 'defender-us-ashburn', environment: 'production' } );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.residency ).toEqual( 'US' );
            expect( node.environment ).toEqual( 'production' );
            expect( node.locationId ).toEqual( 'defender-us-ashburn' );      //  ashburn is not accessible but we're asking for it specifically

            node = context.locator.getNode( AlLocation.LegacyUI, { locationId: 'defender-us-denver', environment: 'production' } );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.residency ).toEqual( 'US' );
            expect( node.environment ).toEqual( 'production' );
            expect( node.locationId ).toEqual( 'defender-us-denver' );      //  denver 

            node = context.locator.getNode( AlLocation.LegacyUI, { locationId: 'insight-us-virginia', environment: 'production' } );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.residency ).toEqual( 'US' );
            expect( node.environment ).toEqual( 'production' );
            expect( node.locationId ).toEqual( 'defender-us-denver' );      //  insight-us-virginia with current location set to defender-us-denver should map to defender-us-denver

            node = context.locator.getNode( AlLocation.LegacyUI, { residency: 'EMEA', environment: 'production' } );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.residency ).toEqual( 'EMEA' );
            expect( node.environment ).toEqual( 'production' );
            expect( node.locationId ).toEqual( 'defender-uk-newport' );      //  insight-us-virginia with current location set to defender-us-denver should map to defender-us-denver

            node = context.locator.getNode( AlLocation.LegacyUI, { residency: 'US', environment: 'production' } );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.residency ).toEqual( 'US' );
            expect( node.environment ).toEqual( 'production' );
            expect( node.locationId ).toEqual( 'defender-us-denver' );

            //  This really just covers a few miscellaneous paths that should never occur in nature...
            context.locator.target( { environment: "some-other-environment", accessibleLocationIds: [ "defender-us-denver"] } );
            node = context.locator.getNode( AlLocation.OverviewUI, { accessibleLocationIds: [ "defender-us-denver" ] } );
        } );

        it( "should normalize insight locations to defender ones", () => {
            context.locator.target( { residency: "US", locationId: "insight-us-virginia", accessibleLocationIds: [ "insight-us-virginia", "defender-us-ashburn" ] } );
            expect( context.locator.locationId ).toEqual( "defender-us-ashburn" );
            expect( context.locator.residency ).toEqual( 'US' );      //  this should be unchanged

            context.locator.target( { residency: "EMEA", locationId: "insight-us-virginia", accessibleLocationIds: [ "insight-us-virginia", "defender-us-denver" ] } );
            expect( context.locator.locationId ).toEqual( "defender-us-denver" );
            expect( context.locator.residency ).toEqual( 'US' );      //  this should be overridden from 'EMEA'

            context.locator.target( { residency: "US", locationId: "insight-eu-ireland", accessibleLocationIds: [ "insight-eu-ireland", "defender-uk-newport" ] } );
            expect( context.locator.locationId ).toEqual( "defender-uk-newport" );
            expect( context.locator.residency ).toEqual( 'EMEA' );      //  this should be overridden from 'US'

            context.locator.target( { residency: "EMEA", locationId: "insight-us-virginia", accessibleLocationIds: [ "insight-us-virginia" ] } );
            expect( context.locator.locationId ).toEqual( "defender-us-denver" );          //  yes, just trust me on this
            expect( context.locator.residency ).toEqual( 'US' );      //  this should be overridden because the contextual residency doesn't make any sense
        } );
    } );

    describe( 'given production-like location descriptors for the overview application', () => {
        it("should infer correct context/sibling nodes for default/unrecognized URLs", () => {
            //  Null (clears actor).  Because, evidently, Kevin likes `null` A LOT.
            context.locator.setActingUrl( undefined );
            expect( context.locator['actingUri'] ).toEqual( undefined );
            expect( context.locator['actor'] ).toEqual( undefined );

            context.locator.setActingUrl( "https://console.overview.alertlogic.com" );
            let actor = context.locator.getActingNode();
            expect( context.locator.environment ).toEqual( "production" );
            expect( context.locator.residency ).toEqual( "US" );

            let matching = context.locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe( "object" );
            expect( matching.environment ).toEqual( 'production' );
            expect( matching.residency ).toEqual( 'US' );
            expect( context.locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.cloudinsight.alertlogic.com/aims/v1/2/accounts" );

        } );

        it("should infer correct context/sibling nodes for production US URLs", () => {
            context.locator.setActingUrl( 'https://console.overview.alertlogic.com/#/remediations-scan-status/2' );
            expect( context.locator.environment ).toEqual( "production" );
            expect( context.locator.residency ).toEqual( "US" );

            let matching = context.locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe( "object" );
            expect( matching.environment ).toEqual( 'production' );
            expect( matching.residency ).toEqual( 'US' );
            expect( matching.uri ).toEqual( "https://console.incidents.alertlogic.com" );

            expect( context.locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.cloudinsight.alertlogic.com/aims/v1/2/accounts" );
        } );

        it("should infer correct context/sibling nodes for production UK URLs", () => {
            context.target( 'https://console.overview.alertlogic.co.uk/#/remediations-scan-status/2', null, 'defender-uk-newport', [ 'defender-uk-newport', 'insight-eu-ireland' ] );
            expect( context.locator.environment ).toEqual( "production" );
            expect( context.locator.residency ).toEqual( "EMEA" );

            let matching = context.locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe( "object" );
            expect( matching.environment ).toEqual( 'production' );
            expect( matching.residency ).toEqual( 'EMEA' );
            expect( matching.uri ).toEqual( "https://console.incidents.alertlogic.co.uk" );
            expect( context.locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.cloudinsight.alertlogic.co.uk/aims/v1/2/accounts" );
        } );

        it("should infer correct context/sibling nodes for production URLs given a residency-agnostic URL and bound location", () => {
            context.target( `https://console.alertlogic.com/#/deployments-adr/2`, null, `defender-uk-newport`, [ 'defender-uk-newport', 'insight-eu-ireland' ] );
            let matching = context.locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe("object");
            expect( matching.environment ).toEqual( 'production' );
            expect( matching.residency ).toEqual( 'EMEA' );
            expect( matching.uri ).toEqual( "https://console.incidents.alertlogic.co.uk" );
            expect( context.locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.cloudinsight.alertlogic.co.uk/aims/v1/2/accounts" );
        } );

        it("should infer correct context/sibling nodes for integration URLs", () => {

            //  Context inferred from integration URL
            context.target( 'https://console.overview.product.dev.alertlogic.com/#/remediations-scan-status/2', null, 'defender-us-denver', [ 'defender-us-denver', 'insight-us-virginia' ] );
            expect( context.locator.environment ).toEqual( "integration" );
            expect( context.locator.residency ).toEqual( "US" );

            let matching = context.locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe( "object" );
            expect( matching.environment ).toEqual( 'integration' );
            expect( matching.residency ).toEqual( undefined );
            expect( matching.uri ).toEqual( "https://console.incidents.product.dev.alertlogic.com" );
            expect( context.locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.product.dev.alertlogic.com/aims/v1/2/accounts" );

        } );

        it("should infer correct acting node for a magma production URL", () => {
            context.target( 'https://console.alertlogic.com/#/exposures/open/2', null, 'defender-us-denver', [ 'defender-us-denver', 'insight-us-virginia' ] );
            let actor = context.locator.getActingNode();
            expect( actor.locTypeId ).toEqual( "cd21:magma" );
            expect( actor.environment ).toEqual( "production" );
            expect( actor.residency ).toEqual( "US" );
        } );

        it("should infer correct context/sibling nodes for integration aliases", () => {
            //  Context inferred from PR demo bucket alias
            context.target( 'https://overview-pr-199.ui-dev.product.dev.alertlogic.com/#/remediations-scan-status/2', null, 'defender-us-denver', [ 'defender-us-denver', 'insight-us-virginia' ] );
            expect( context.locator.environment ).toEqual( "integration" );
            expect( context.locator.residency ).toEqual( "US" );

            let matching = context.locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe( "object" );
            expect( matching.environment ).toEqual( 'integration' );
            expect( matching.residency ).toEqual( undefined );
            expect( matching.uri ).toEqual( "https://console.incidents.product.dev.alertlogic.com" );
            expect( context.locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.product.dev.alertlogic.com/aims/v1/2/accounts" );

            //  This is a super duper important test.  Once an alias domain has been recognized as the acting URL, it should
            //  *take over the base URI for that context*.
            expect( context.locator.resolveURL( AlLocation.OverviewUI, '/#/remediations-scan-status/2' ) ).toEqual( 'https://overview-pr-199.ui-dev.product.dev.alertlogic.com/#/remediations-scan-status/2' );
        } );

        it("should infer correct context/sibling nodes for local development URLs", () => {
            //  Context inferred from local/development URL
            context.target( 'http://localhost:4213/#/remediations-scan-status/2', null, 'defender-us-denver', [ 'defender-us-denver', 'insight-us-virginia' ] );
            expect( context.locator.environment ).toEqual( "development" );
            expect( context.locator.residency ).toEqual( "US" );

            let matching = context.locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe( "object" );
            expect( matching.environment ).toEqual( 'development' );
            expect( matching.residency ).toEqual( undefined );
            expect( matching.uri ).toEqual( "http://localhost:8001" );
            expect( context.locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.product.dev.alertlogic.com/aims/v1/2/accounts" );
        } );

        it("should allow nodes to be searched", () => {
            const matches = context.locator.search( loc => loc.locTypeId === AlLocation.OverviewUI ? true : false );
            expect( matches.length ).toBeGreaterThan( 0 );

            const match = context.locator.findOne( loc => loc.locTypeId === AlLocation.OverviewUI && loc.residency === 'EMEA' ? true : false );
            expect( typeof( match ) ).toBe( "object" );
            expect( match.locTypeId ).toEqual( AlLocation.OverviewUI );
            expect( match.residency ).toEqual( 'EMEA' );
            expect( match.environment ).toEqual( 'production' );
        } );

        it("should allow nodes to be retrieved by URI", () => {
            let match:AlLocationDescriptor = null;

            match = context.locator.getNodeByURI( "http://localhost:8001/#/some/arbitrary/path" );
            expect( typeof( match ) ).toBe( "object" );
            expect( match.locTypeId ).toEqual( AlLocation.IncidentsUI );
            expect( match.environment ).toEqual( "development" );

            match = context.locator.getNodeByURI( "https://console.overview.alertlogic.co.uk/#/something/else" );
            expect( typeof( match ) ).toBe( "object" );
            expect( match.locTypeId ).toEqual( AlLocation.OverviewUI );
            expect( match.environment ).toEqual( "production" );
            expect( match.residency ).toEqual( "EMEA" );

            match = context.locator.getNodeByURI( "https://somewhere.over-the.rainbow.org/#/my-page" );
            expect( match ).toEqual( undefined );
        } );

    } );

    describe( "resolveURI method", () => {
        it("should generate accurate URLs for a given context", () => {
            let uri;

            uri = context.locator.resolveURL( AlLocation.OverviewUI, '/#/some/path', { residency: 'US', environment: 'production' } );
            expect( uri ).toEqual( "https://console.overview.alertlogic.com/#/some/path" );

            uri = context.locator.resolveURL( AlLocation.IncidentsUI, '/#/some/path', { residency: 'EMEA', environment: 'production' } );
            expect( uri ).toEqual( "https://console.incidents.alertlogic.co.uk/#/some/path" );

            uri = context.locator.resolveURL( AlLocation.SearchUI, undefined, { residency: 'US', environment: 'integration' } );
            expect( uri ).toEqual( "https://console.search.product.dev.alertlogic.com" );

            uri = context.locator.resolveURL( AlLocation.DashboardsUI, '/#/some/path', { residency: 'US', environment: 'development' } );
            expect( uri ).toEqual( "http://localhost:7001/#/some/path" );

            //  Now, we test alias binding in conjunction with URL resolution.  This should update the official integration incidents node to point to the alias.
            context.locator.setActingUrl( "https://incidents-pr-9.ui-dev.product.dev.alertlogic.com" );

            uri = context.locator.resolveURL( AlLocation.IncidentsUI, '/#/summary/1', { environment: 'production', residency: 'US' } );
            expect( uri ).toEqual( "https://console.incidents.alertlogic.com/#/summary/1" );
            uri = context.locator.resolveURL( AlLocation.IncidentsUI, '/#/summary/1', { environment: 'integration' } );
            expect( uri ).toEqual( "https://incidents-pr-9.ui-dev.product.dev.alertlogic.com/#/summary/1" );
        } );

        xit( "should use window.location if the node isn't recognized", () => {
            let uri = context.locator.resolveURL( "SomethingUnrecognizable", '/#/arbitrary', { residency: "US", environment: "production" } );
            expect( uri ).toEqual( window.location.origin + ( ( window.location.pathname && window.location.pathname.length > 1 ) ? window.location.pathname : '' ) + "/#/arbitrary" );
        } );

        it( "should prefix auth0 node with https", () => {
            context.locator.setActingUrl( "https://console.incidents.alertlogic.com" );
            let uri = context.locator.resolveURL( AlLocation.Auth0 );
            expect( uri ).toEqual( "https://alertlogic.auth0.com" );
        } );
    } );

    describe( "contextual residency awareness", () => {
        it("should be maintained as expected", async () => {

            /* Starting state: default values */
            expect( context.environment ).toEqual( "development" );
            expect( context.residency ).toEqual( "US" );
            expect( context.locationId ).toEqual("unspecified");
            expect( context.accessibleLocationIds ).toEqual( [] );

            context.target( "https://console.alertlogic.com/#/search/expert/2");

            /* After context is derived from URL: production/US */
            expect( context.environment ).toEqual( "production" );
            expect( context.residency ).toEqual( "US" );
            expect( context.locationId ).toEqual("unspecified");
            expect( context.accessibleLocationIds ).toEqual( [] );

            await AlTestExecutionContext.setAuthState("2");
            context.target( {
                locationId: "defender-uk-newport",
                accessibleLocationIds: [ "defender-uk-newport", "insight-eu-ireland", "defender-us-denver", "insight-us-virginia" ]
            } );

            expect( context.environment ).toEqual("production");
            expect( context.residency ).toEqual( "EMEA" );
            expect( context.locationId ).toEqual( "defender-uk-newport" );
        } );
    } );
} );
