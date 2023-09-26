import { expect } from 'chai';
import { describe } from 'mocha';
import {
    AlLocation,
    AlLocationDescriptor,
    AlLocationDictionary,
    AlLocatorMatrix,
} from '@al/core';

describe( 'AlLocatorMatrix', () => {

    let locator:AlLocatorMatrix;
    const locationDictionary = JSON.parse( JSON.stringify( AlLocationDictionary ) );       //  cheap and easy clone

    beforeEach( () => {
        locator = new AlLocatorMatrix(  locationDictionary,
                                        "https://console.incidents.product.dev.alertlogic.com/#/summary/2?aaid=2&locid=defender-us-denver",
                                        { insightLocationId: "defender-us-defender", accessible: [ "defender-us-denver", "insight-us-virginia" ] } );
    } );

    describe( 'utility methods', () => {

        it( "should propertly calculate the base from a complex URL", () => {
            expect( locator["getBaseUrl"]( "https://lmgtfy.com/?q=cache+miss" ) ).to.equal( "https://lmgtfy.com" );
            expect( locator["getBaseUrl"]( "https://console.overview.alertlogic.com/#/remediations-scan-status/2" ) ).to.equal("https://console.overview.alertlogic.com" );
        } );
        it( "should escape uri patterns in the expected way", () => {
            expect( locator['escapeLocationPattern']( "https://console.overview.alertlogic.com" ) ).to.equal( "^https:\\/\\/console\\.overview\\.alertlogic\\.com.*$" );
            expect( locator['escapeLocationPattern']( "https://dashboards.pr-*.ui-dev.alertlogic.com" ) ).to.equal( "^https:\\/\\/dashboards\\.pr\\-([a-zA-Z0-9_-]+)\\.ui\\-dev\\.alertlogic\\.com.*$" );
        } );

        it( "should properly resolve URI patterns to location nodes", () => {
            let node = locator.getNodeByURI( "https://console.overview.alertlogic.com/#/remediations-scan-status/2" );
            expect( node ).to.be.an( "object" );
            expect( node.environment ).to.equal( "production" );
            expect( node.residency ).to.equal( "US" );
            expect( node.locTypeId ).to.equal( AlLocation.OverviewUI );

            //  Make sure that aliased nodes work, and return a node with the URI pointing to themselves
            let aliasNodeURL = "https://incidents-pr-12.ui-dev.product.dev.alertlogic.com/#/summary/12345678?aaid=12345678&locid=defender-uk-newport";
            let aliasNodeBase = "https://incidents-pr-12.ui-dev.product.dev.alertlogic.com";
            node = locator.getNodeByURI( aliasNodeURL );
            expect( node ).to.be.an( "object" );
            expect( node.environment ).to.equal( "integration" );
            expect( node.residency ).to.equal( undefined );
            expect( node.locTypeId ).to.equal( AlLocation.IncidentsUI );
            expect( node.uri ).to.equal( aliasNodeBase );

            //  This should match the same node as above, but change the URL back to the canonical console.incidents.product.dev.alertlogic.com
            aliasNodeURL = "https://console.incidents.product.dev.alertlogic.com/#/summary/12345678?aaid=12345678&locid=defender-uk-newport";
            aliasNodeBase = "https://console.incidents.product.dev.alertlogic.com";
            let node2 = locator.getNodeByURI( aliasNodeURL );
            expect( node2 ).to.be.an( "object" );
            expect( node ).to.equal( node2 );
            expect( node.environment ).to.equal( "integration" );
            expect( node.residency ).to.equal( undefined );
            expect( node.locTypeId ).to.equal( AlLocation.IncidentsUI );
            expect( node.uri ).to.equal( aliasNodeBase );

            //  iris
            aliasNodeURL = "https://iris-ui-pr-8.ui-dev.product.dev.alertlogic.com/";
            aliasNodeBase = "https://iris-ui-pr-8.ui-dev.product.dev.alertlogic.com";
            node = locator.getNodeByURI( aliasNodeURL );
            expect( node ).to.be.an( "object" );
            expect( node.environment ).to.equal( "integration" );
            expect( node.locTypeId ).to.equal( AlLocation.IrisUI );
            expect( node.uri ).to.equal( aliasNodeBase );
        } );

        it( "should propertly identify the acting node from the acting URL passed to the constructor", () => {
            locator = new AlLocatorMatrix(  locationDictionary,
                                            "https://console.incidents.product.dev.alertlogic.com/#/summary/2?aaid=2&locid=defender-us-denver",
                                            { insightLocationId: "defender-us-defender", accessible: [ "defender-us-denver", "insight-us-virginia" ] } );
            let actor = locator.getActingNode();
            expect( actor ).to.be.an( 'object' );
            expect( actor.locTypeId ).to.equal( AlLocation.IncidentsUI );
            expect( actor.environment ).to.equal( 'integration' );
        } );

        it( "should allow retrieval of nodes with contextual overrides", () => {
            let node = locator.getNode( AlLocation.LegacyUI, { insightLocationId: 'defender-us-denver', environment: "production", residency: 'US' } );
            expect( node ).to.be.an( 'object' );
            expect( node.residency ).to.equal( 'US' );
            expect( node.environment ).to.equal( 'production' );
            expect( node.insightLocationId ).to.equal( 'defender-us-denver' );

            node = locator.getNode( AlLocation.LegacyUI, { insightLocationId: 'insight-us-virginia', environment: "production", residency: 'US' } );
            expect( node ).to.be.an( 'object' );
            expect( node.residency ).to.equal( 'US' );
            expect( node.environment ).to.equal( 'production' );
            expect( node.insightLocationId ).to.equal( 'defender-us-denver' );

            //  This really just covers a few miscellaneous paths that should never occur in nature...
            locator.setContext( { environment: "some-other-environment", accessible: [ "defender-us-denver"] } );
            node = locator.getNode( AlLocation.OverviewUI, { accessible: [ "defender-us-denver" ] } );
        } );

        it( "should normalize insight locations to defender ones", () => {
            locator.setContext( { insightLocationId: "insight-us-virginia", accessible: [ "insight-us-virginia", "defender-us-ashburn" ], residency: 'US' } );
            expect( locator.getContext().insightLocationId ).to.equal( "defender-us-ashburn" );
            expect( locator.getContext().residency ).to.equal( 'US' );      //  this should be unchanged

            locator.setContext( { insightLocationId: "insight-us-virginia", accessible: [ "insight-us-virginia", "defender-us-denver" ], residency: 'EMEA' } );
            expect( locator.getContext().insightLocationId ).to.equal( "defender-us-denver" );
            expect( locator.getContext().residency ).to.equal( 'US' );      //  this should be overridden from 'EMEA'

            locator.setContext( { insightLocationId: "insight-eu-ireland", accessible: [ "insight-eu-ireland", "defender-uk-newport" ], residency: 'US' } );
            expect( locator.getContext().insightLocationId ).to.equal( "defender-uk-newport" );
            expect( locator.getContext().residency ).to.equal( 'EMEA' );

            locator.setContext( { insightLocationId: "insight-us-virginia", accessible: [ "insight-us-virginia" ], residency: 'EMEA' } );
            expect( locator.getContext().insightLocationId ).to.equal( "defender-us-denver" );          //  yes, just trust me on this
            expect( locator.getContext().residency ).to.equal( 'US' );      //  this should be overridden because the contextual residency doesn't make any sense
        } );
    } );

    describe( 'given production-like location descriptors for the overview application', () => {
        it("should infer correct context/sibling nodes for default/unrecognized URLs", () => {
            //  Null (clears actor).  Because, evidently, Kevin likes `null` A LOT.
            locator.setActingUri( undefined );
            expect( locator['actingUri'] ).to.equal( undefined );
            expect( locator['actor'] ).to.equal( undefined );

            locator.setActingUri( "https://console.overview.alertlogic.com" );
            let actor = locator.getActingNode();
            let context = locator.getContext();
            expect( context.environment ).to.equal( "production" );
            expect( context.residency ).to.equal( "US" );

            let matching = locator.getNode( AlLocation.IncidentsUI );
            expect( matching ).to.be.an( 'object' );
            expect( matching.environment ).to.equal( 'production' );
            expect( matching.residency ).to.equal( 'US' );
            expect( locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).to.equal( "https://api.cloudinsight.alertlogic.com/aims/v1/2/accounts" );

        } );

        it("should infer correct context/sibling nodes for production US URLs", () => {
            locator.setActingUri( 'https://console.overview.alertlogic.com/#/remediations-scan-status/2' );
            let context = locator.getContext();
            expect( context.environment ).to.equal( "production" );
            expect( context.residency ).to.equal( "US" );

            let matching = locator.getNode( AlLocation.IncidentsUI );
            expect( matching ).to.be.an( 'object' );
            expect( matching.environment ).to.equal( 'production' );
            expect( matching.residency ).to.equal( 'US' );
            expect( matching.uri ).to.equal( "https://console.incidents.alertlogic.com" );

            expect( locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).to.equal( "https://api.cloudinsight.alertlogic.com/aims/v1/2/accounts" );
        } );

        it("should infer correct context/sibling nodes for production UK URLs", () => {

            locator.setActingUri( 'https://console.overview.alertlogic.com/#/remediations-scan-status/2' );
            let context = locator.getContext();
            expect( context.environment ).to.equal( "production" );
            expect( context.residency ).to.equal( "US" );

            let matching = locator.getNode( AlLocation.IncidentsUI );
            expect( matching ).to.be.an( 'object' );
            expect( matching.environment ).to.equal( 'production' );
            expect( matching.residency ).to.equal( 'US' );              //  This is correct behavior because we no longer resolve to EMEA UI instances
            expect( matching.uri ).to.equal( "https://console.incidents.alertlogic.com" );

            locator.setContext( { residency: 'EMEA' } );                //  but verify we still resolve URLs correctly
            expect( locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).to.equal( "https://api.cloudinsight.alertlogic.co.uk/aims/v1/2/accounts" );
        } );

        it("should infer correct context/sibling nodes for integration URLs", () => {

            //  Context inferred from integration URL
            locator.setActingUri( 'https://console.overview.product.dev.alertlogic.com/#/remediations-scan-status/2' );
            let context = locator.getContext();
            expect( context.environment ).to.equal( "integration" );
            expect( context.residency ).to.equal( "US" );

            let matching = locator.getNode( AlLocation.IncidentsUI );
            expect( matching ).to.be.an( 'object' );
            expect( matching.environment ).to.equal( 'integration' );
            expect( matching.residency ).to.equal( undefined );
            expect( matching.uri ).to.equal( "https://console.incidents.product.dev.alertlogic.com" );
            expect( locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).to.equal( "https://api.product.dev.alertlogic.com/aims/v1/2/accounts" );

        } );

        it("should infer correct acting node for a magma production URL", () => {

            locator.setActingUri( 'https://console.alertlogic.com/#/exposures/open/2' );
            let actor = locator.getActingNode();
            expect( actor.locTypeId ).to.equal( "cd21:magma" );
            expect( actor.environment ).to.equal( "production" );
            expect( actor.residency ).to.equal( "US" );
        } );

        it("should infer correct context/sibling nodes for integration aliases", () => {
            //  Context inferred from PR demo bucket alias
            locator.setActingUri( 'https://overview-pr-199.ui-dev.product.dev.alertlogic.com/#/remediations-scan-status/2' );
            let context = locator.getContext();
            expect( context.environment ).to.equal( "integration" );
            expect( context.residency ).to.equal( "US" );

            let matching = locator.getNode( AlLocation.IncidentsUI );
            expect( matching ).to.be.an( 'object' );
            expect( matching.environment ).to.equal( 'integration' );
            expect( matching.residency ).to.equal( undefined );
            expect( matching.uri ).to.equal( "https://console.incidents.product.dev.alertlogic.com" );
            expect( locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).to.equal( "https://api.product.dev.alertlogic.com/aims/v1/2/accounts" );

            //  This is a super duper important test.  Once an alias domain has been recognized as the acting URL, it should
            //  *take over the base URI for that context*.
            expect( locator.resolveURL( AlLocation.OverviewUI, '/#/remediations-scan-status/2' ) ).to.equal( 'https://overview-pr-199.ui-dev.product.dev.alertlogic.com/#/remediations-scan-status/2' );
        } );

        it("should infer correct context/sibling nodes for local development URLs", () => {
            //  Context inferred from local/development URL
            locator.setActingUri( 'http://localhost:4213/#/remediations-scan-status/2' );
            let context = locator.getContext();
            expect( context.environment ).to.equal( "development" );
            expect( context.residency ).to.equal( "US" );

            let matching = locator.getNode( AlLocation.IncidentsUI );
            expect( matching ).to.be.an( 'object' );
            expect( matching.environment ).to.equal( 'development' );
            expect( matching.residency ).to.equal( undefined );
            expect( matching.uri ).to.equal( "http://localhost:8001" );
            expect( locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).to.equal( "https://api.product.dev.alertlogic.com/aims/v1/2/accounts" );
        } );

        it("should allow nodes to be searched", () => {
            const matches = locator.search( loc => loc.locTypeId === AlLocation.OverviewUI ? true : false );
            expect( matches.length ).to.be.above( 0 );
        } );

        it("should allow nodes to be retrieved by URI", () => {
            let match:AlLocationDescriptor = null;

            match = locator.getNodeByURI( "http://localhost:8001/#/some/arbitrary/path" );
            expect( match ).to.be.an( 'object' );
            expect( match.locTypeId ).to.equal( AlLocation.IncidentsUI );
            expect( match.environment ).to.equal( "development" );

            match = locator.getNodeByURI( "https://console.overview.alertlogic.com/#/something/else" );
            expect( match ).to.be.an( 'object' );
            expect( match.locTypeId ).to.equal( AlLocation.OverviewUI );
            expect( match.environment ).to.equal( "production" );
            expect( match.residency ).to.equal( "US" );

            match = locator.getNodeByURI( "https://console.overview.alertlogic.co.uk/#/blah-blah-blah" );
            expect( match ).to.be.an( 'object' );
            expect( match.locTypeId ).to.equal( AlLocation.OverviewUI );
            expect( match.environment ).to.equal( "production" );
            expect( match.residency ).to.equal( "US" );

            match = locator.getNodeByURI( "https://api.cloudinsight.alertlogic.co.uk/aims/v1/2/accounts" );
            expect( match ).to.be.an( 'object' );
            expect( match.locTypeId ).to.equal( AlLocation.InsightAPI );
            expect( match.environment ).to.equal( "production" );
            expect( match.residency ).to.equal( "EMEA" );

            match = locator.getNodeByURI( "https://somewhere.over-the.rainbow.org/#/my-page" );
            expect( match ).to.equal( undefined );
        } );

    } );

    describe( "resolveURI method", () => {
        it("should generate accurate URLs for a given context", () => {
            let uri;

            uri = locator.resolveURL( AlLocation.OverviewUI, '/#/some/path', { residency: 'US', environment: 'production' } );
            expect( uri ).to.equal( "https://console.overview.alertlogic.com/#/some/path" );

            uri = locator.resolveURL( AlLocation.IncidentsUI, '/#/some/path', { residency: 'EMEA', environment: 'production' } );
            expect( uri ).to.equal( "https://console.incidents.alertlogic.com/#/some/path" );

            uri = locator.resolveURL( AlLocation.SearchUI, undefined, { residency: 'US', environment: 'integration' } );
            expect( uri ).to.equal( "https://console.search.product.dev.alertlogic.com" );

            uri = locator.resolveURL( AlLocation.DashboardsUI, '/#/some/path', { residency: 'US', environment: 'development' } );
            expect( uri ).to.equal( "http://localhost:7001/#/some/path" );

            //  Now, we test alias binding in conjunction with URL resolution.  This should update the official integration incidents node to point to the alias.
            locator.setActingUri( "https://incidents-pr-9.ui-dev.product.dev.alertlogic.com" );

            uri = locator.resolveURL( AlLocation.IncidentsUI, '/#/summary/1', { environment: 'production', residency: 'US' } );
            expect( uri ).to.equal( "https://console.incidents.alertlogic.com/#/summary/1" );
            uri = locator.resolveURL( AlLocation.IncidentsUI, '/#/summary/1', { environment: 'integration' } );
            expect( uri ).to.equal( "https://incidents-pr-9.ui-dev.product.dev.alertlogic.com/#/summary/1" );
        } );

        it( "should use window.location if the node isn't recognized", () => {
            let uri = locator.resolveURL( "SomethingUnrecognizable", '/#/arbitrary', { residency: "US", environment: "production" } );
            expect( uri ).to.equal( window.location.origin + ( ( window.location.pathname && window.location.pathname.length > 1 ) ? window.location.pathname : '' ) + "/#/arbitrary" );
        } );

        it( "should prefix auth0 node with https", () => {
            locator.setActingUri( "https://console.incidents.alertlogic.com" );
            let uri = locator.resolveURL( AlLocation.Auth0 );
            expect( uri ).to.equal( "https://alertlogic.auth0.com" );
        } );
    } );

    describe( "resolution by URI", () => {
        it("should be blazingly fast", () => {
            const iterations = 1000;
            const getRandomURI = () => {
                if ( Math.random() <= 0.7 ) {
                    //  70% of random URLs with an arbitrary path
                    let node = locationDictionary[ Math.floor( Math.random() * locationDictionary.length ) ];
                    let url = node.uri;
                    if ( url.indexOf("http" ) !== 0 ) {
                        url = `https://${url}`;
                    }
                    url += '/#/something/12345678/else/ABCD1234';
                    return url;
                } else {
                    //  30% aliases and cache misses.  These will test the outside edges of pattern matching, and should be the worst-performing lookups.
                    let urls = [
                        "https://exposures.ui-dev.product.dev.alertlogic.com",                      //  canonical alias
                        "https://remediations-pr-15.ui-dev.product.dev.alertlogic.com",             //  PR demo bucket alias
                        "https://12.o3-search.product.dev.alertlogic.com",                          //  old-fashioned demo bucket alias (soon to be deprecated)
                        "https://lmgtfy.com/?q=cache+miss",                                         //  cache failure test
                        "http://web.archive.org/web/20090814040542/http://blog.voidblossom.com/2008/12/15/winter-festivities-the-milk-of-human-crankiness/"     //  another cache failure test, with sass
                    ];
                    return urls[ Math.floor( Math.random() * urls.length ) ];
                }
            };
            for ( let i = 0; i < iterations; i++ ) {
                let node = locator.getNodeByURI( getRandomURI() );
            }
            let averageLookup = AlLocatorMatrix.totalTime / AlLocatorMatrix.totalSeeks;
            console.log(`Average lookup time: ${averageLookup}ms (${AlLocatorMatrix.totalSeeks} lookups)` );

            //  Average lookup time SHOULD be less than 0.1 ms (actually, a great deal faster than that).  If it's slower, something is wrong!
            expect( averageLookup ).to.be.below( 0.2 );
        } );
    } );

} );
