import {
    AlExecutionContext,
    AlLocation,
    AlLocationDescriptor,
    AlLocationDictionary,
    AlLocatorMatrix,
} from '@al/core';

describe( 'AlLocatorMatrix', () => {

//    const context = new AlTestExecutionContext();
    let locator:AlLocatorMatrix;
    const locationDictionary = JSON.parse( JSON.stringify( AlLocationDictionary ) );       //  cheap and easy clone

    beforeEach( () => {
        locator = new AlLocatorMatrix(  locationDictionary,
                                        "https://console.incidents.product.dev.alertlogic.com/#/summary/2?aaid=2&locid=defender-us-denver",
                                        { locationId: "defender-us-denver", accessibleLocationIds: [ "defender-us-denver", "insight-us-virginia" ] } );
    } );

    afterEach( () => {
        AlExecutionContext.reset();
    } );

    describe( 'utility methods', () => {

        it( "should propertly calculate the base from a complex URL", () => {
            expect( locator["getBaseUrl"]( "https://lmgtfy.com/?q=cache+miss" ) ).toEqual( "https://lmgtfy.com" );
            expect( locator["getBaseUrl"]( "https://console.overview.alertlogic.com/#/remediations-scan-status/2" ) ).toEqual("https://console.overview.alertlogic.com" );
        } );
        it( "should escape uri patterns in the expected way", () => {
            expect( locator['escapeLocationPattern']( "https://console.overview.alertlogic.com" ) ).toEqual( "^https:\\/\\/console\\.overview\\.alertlogic\\.com.*$" );
            expect( locator['escapeLocationPattern']( "https://dashboards.pr-*.ui-dev.alertlogic.com" ) ).toEqual( "^https:\\/\\/dashboards\\.pr\\-([a-zA-Z0-9_-]+)\\.ui\\-dev\\.alertlogic\\.com.*$" );
        } );

        it( "should properly resolve URI patterns to location nodes", () => {
            let node = locator.getNodeByURI( "https://console.overview.alertlogic.co.uk/#/remediations-scan-status/2" );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.environment ).toEqual( "production" );
            expect( node.residency ).toEqual( "EMEA" );
            expect( node.locTypeId ).toEqual( AlLocation.OverviewUI );

            //  Make sure that aliased nodes work, and return a node with the URI pointing to themselves
            let aliasNodeURL = "https://incidents-pr-12.ui-dev.product.dev.alertlogic.com/#/summary/12345678?aaid=12345678&locid=defender-uk-newport";
            let aliasNodeBase = "https://incidents-pr-12.ui-dev.product.dev.alertlogic.com";
            node = locator.getNodeByURI( aliasNodeURL );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.environment ).toEqual( "integration" );
            expect( node.residency ).toEqual( undefined );
            expect( node.locTypeId ).toEqual( AlLocation.IncidentsUI );
            expect( node.uri ).toEqual( aliasNodeBase );

            //  This should match the same node as above, but change the URL back to the canonical console.incidents.product.dev.alertlogic.com
            aliasNodeURL = "https://console.incidents.product.dev.alertlogic.com/#/summary/12345678?aaid=12345678&locid=defender-uk-newport";
            aliasNodeBase = "https://console.incidents.product.dev.alertlogic.com";
            let node2 = locator.getNodeByURI( aliasNodeURL );
            expect( typeof( node2 ) ).toBe( "object" );
            expect( node ).toEqual( node2 );
            expect( node.environment ).toEqual( "integration" );
            expect( node.residency ).toEqual( undefined );
            expect( node.locTypeId ).toEqual( AlLocation.IncidentsUI );
            expect( node.uri ).toEqual( aliasNodeBase );

            //  iris
            aliasNodeURL = "https://iris-ui-pr-8.ui-dev.product.dev.alertlogic.com/";
            aliasNodeBase = "https://iris-ui-pr-8.ui-dev.product.dev.alertlogic.com";
            node = locator.getNodeByURI( aliasNodeURL );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.environment ).toEqual( "integration" );
            expect( node.locTypeId ).toEqual( AlLocation.IrisUI );
            expect( node.uri ).toEqual( aliasNodeBase );
        } );

        it( "should propertly identify the acting node from the acting URL passed to the constructor", () => {
            locator = new AlLocatorMatrix(  locationDictionary,
                                            "https://console.incidents.product.dev.alertlogic.com/#/summary/2?aaid=2&locid=defender-us-denver",
                                            { locationId: "defender-us-denver", accessibleLocationIds: [ "defender-us-denver", "insight-us-virginia" ] } );
            let actor = locator.getActingNode();
            expect( typeof( actor ) ).toBe( "object" );
            expect( actor.locTypeId ).toEqual( AlLocation.IncidentsUI );
            expect( actor.environment ).toEqual( 'integration' );
        } );

        it( "should allow retrieval of nodes with contextual overrides", () => {
            locator = new AlLocatorMatrix(  locationDictionary,
                                            "https://console.incidents.product.dev.alertlogic.com/#/summary/2?aaid=2&locid=defender-us-denver",
                                            { locationId: "defender-us-denver", accessibleLocationIds: [ "defender-us-denver", "insight-us-virginia" ] } );
            let node = locator.getNode( AlLocation.LegacyUI, { locationId: 'defender-us-denver', environment: "production", residency: 'US' } );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.residency ).toEqual( 'US' );
            expect( node.environment ).toEqual( 'production' );
            expect( node.locationId ).toEqual( 'defender-us-denver' );

            node = locator.getNode( AlLocation.LegacyUI, { locationId: 'insight-us-virginia', environment: "production", residency: 'US' } );
            expect( typeof( node ) ).toBe( "object" );
            expect( node.residency ).toEqual( 'US' );
            expect( node.environment ).toEqual( 'production' );
            expect( node.locationId ).toEqual( 'defender-us-denver' );

            //  This really just covers a few miscellaneous paths that should never occur in nature...
            locator.target( { environment: "some-other-environment", accessibleLocationIds: [ "defender-us-denver"] } );
            node = locator.getNode( AlLocation.OverviewUI, { accessibleLocationIds: [ "defender-us-denver" ] } );
        } );

        it( "should normalize insight locations to defender ones", () => {
            locator.target( { residency: "US", locationId: "insight-us-virginia", accessibleLocationIds: [ "insight-us-virginia", "defender-us-ashburn" ] } );
            expect( locator.locationId ).toEqual( "defender-us-ashburn" );
            expect( locator.residency ).toEqual( 'US' );      //  this should be unchanged

            locator.target( { residency: "EMEA", locationId: "insight-us-virginia", accessibleLocationIds: [ "insight-us-virginia", "defender-us-denver" ] } );
            expect( locator.locationId ).toEqual( "defender-us-denver" );
            expect( locator.residency ).toEqual( 'US' );      //  this should be overridden from 'EMEA'

            locator.target( { residency: "US", locationId: "insight-eu-ireland", accessibleLocationIds: [ "insight-eu-ireland", "defender-uk-newport" ] } );
            expect( locator.locationId ).toEqual( "defender-uk-newport" );
            expect( locator.residency ).toEqual( 'EMEA' );      //  this should be overridden from 'US'

            locator.target( { residency: "EMEA", locationId: "insight-us-virginia", accessibleLocationIds: [ "insight-us-virginia" ] }, true );
            expect( locator.locationId ).toEqual( "defender-us-denver" );          //  yes, just trust me on this
            expect( locator.residency ).toEqual( 'US' );      //  this should be overridden because the contextual residency doesn't make any sense
        } );
    } );

    describe( 'given production-like location descriptors for the overview application', () => {
        it("should infer correct context/sibling nodes for default/unrecognized URLs", () => {
            //  Null (clears actor).  Because, evidently, Kevin likes `null` A LOT.
            locator.setActingUrl( undefined );
            expect( locator['actingUri'] ).toEqual( undefined );
            expect( locator['actor'] ).toEqual( undefined );

            locator.setActingUrl( "https://console.overview.alertlogic.com" );
            let actor = locator.getActingNode();
            let context = locator;
            expect( context.environment ).toEqual( "production" );
            expect( context.residency ).toEqual( "US" );

            let matching = locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe( "object" );
            expect( matching.environment ).toEqual( 'production' );
            expect( matching.residency ).toEqual( 'US' );
            expect( locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.cloudinsight.alertlogic.com/aims/v1/2/accounts" );

        } );

        it("should infer correct context/sibling nodes for production US URLs", () => {
            locator.setActingUrl( 'https://console.overview.alertlogic.com/#/remediations-scan-status/2' );
            let context = locator;
            expect( context.environment ).toEqual( "production" );
            expect( context.residency ).toEqual( "US" );

            let matching = locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe( "object" );
            expect( matching.environment ).toEqual( 'production' );
            expect( matching.residency ).toEqual( 'US' );
            expect( matching.uri ).toEqual( "https://console.incidents.alertlogic.com" );

            expect( locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.cloudinsight.alertlogic.com/aims/v1/2/accounts" );
        } );

        it("should infer correct context/sibling nodes for production UK URLs", () => {

            locator.setActingUrl( 'https://console.overview.alertlogic.co.uk/#/remediations-scan-status/2' );
            let context = locator;
            expect( context.environment ).toEqual( "production" );
            expect( context.residency ).toEqual( "EMEA" );

            let matching = locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe( "object" );
            expect( matching.environment ).toEqual( 'production' );
            expect( matching.residency ).toEqual( 'EMEA' );
            expect( matching.uri ).toEqual( "https://console.incidents.alertlogic.co.uk" );
            expect( locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.cloudinsight.alertlogic.co.uk/aims/v1/2/accounts" );
        } );

        it("should infer correct context/sibling nodes for integration URLs", () => {

            //  Context inferred from integration URL
            locator.setActingUrl( 'https://console.overview.product.dev.alertlogic.com/#/remediations-scan-status/2' );
            let context = locator;
            expect( context.environment ).toEqual( "integration" );
            expect( context.residency ).toEqual( "US" );

            let matching = locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe( "object" );
            expect( matching.environment ).toEqual( 'integration' );
            expect( matching.residency ).toEqual( undefined );
            expect( matching.uri ).toEqual( "https://console.incidents.product.dev.alertlogic.com" );
            expect( locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.product.dev.alertlogic.com/aims/v1/2/accounts" );

        } );

        it("should infer correct acting node for a magma production URL", () => {

            locator.setActingUrl( 'https://console.alertlogic.com/#/exposures/open/2' );
            let actor = locator.getActingNode();
            expect( actor.locTypeId ).toEqual( "cd21:magma" );
            expect( actor.environment ).toEqual( "production" );
            expect( actor.residency ).toEqual( "US" );
        } );

        it("should infer correct context/sibling nodes for integration aliases", () => {
            //  Context inferred from PR demo bucket alias
            locator.setActingUrl( 'https://overview-pr-199.ui-dev.product.dev.alertlogic.com/#/remediations-scan-status/2' );
            let context = locator;
            expect( context.environment ).toEqual( "integration" );
            expect( context.residency ).toEqual( "US" );

            let matching = locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe( "object" );
            expect( matching.environment ).toEqual( 'integration' );
            expect( matching.residency ).toEqual( undefined );
            expect( matching.uri ).toEqual( "https://console.incidents.product.dev.alertlogic.com" );
            expect( locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.product.dev.alertlogic.com/aims/v1/2/accounts" );

            //  This is a super duper important test.  Once an alias domain has been recognized as the acting URL, it should
            //  *take over the base URI for that context*.
            expect( locator.resolveURL( AlLocation.OverviewUI, '/#/remediations-scan-status/2' ) ).toEqual( 'https://overview-pr-199.ui-dev.product.dev.alertlogic.com/#/remediations-scan-status/2' );
        } );

        it("should infer correct context/sibling nodes for local development URLs", () => {
            //  Context inferred from local/development URL
            locator.setActingUrl( 'http://localhost:4213/#/remediations-scan-status/2' );
            let context = locator;
            expect( context.environment ).toEqual( "development" );
            expect( context.residency ).toEqual( "US" );

            let matching = locator.getNode( AlLocation.IncidentsUI );
            expect( typeof( matching ) ).toBe( "object" );
            expect( matching.environment ).toEqual( 'development' );
            expect( matching.residency ).toEqual( undefined );
            expect( matching.uri ).toEqual( "http://localhost:8001" );
            expect( locator.resolveURL( AlLocation.InsightAPI, "/aims/v1/2/accounts" ) ).toEqual( "https://api.product.dev.alertlogic.com/aims/v1/2/accounts" );
        } );

        it("should allow nodes to be searched", () => {
            const matches = locator.search( loc => loc.locTypeId === AlLocation.OverviewUI ? true : false );
            expect( matches.length ).toBeGreaterThan( 0 );

            const match = locator.findOne( loc => loc.locTypeId === AlLocation.OverviewUI && loc.residency === 'EMEA' ? true : false );
            expect( typeof( match ) ).toBe( "object" );
            expect( match.locTypeId ).toEqual( AlLocation.OverviewUI );
            expect( match.residency ).toEqual( 'EMEA' );
            expect( match.environment ).toEqual( 'production' );
        } );

        it("should allow nodes to be retrieved by URI", () => {
            let match:AlLocationDescriptor = null;

            match = locator.getNodeByURI( "http://localhost:8001/#/some/arbitrary/path" );
            expect( typeof( match ) ).toBe( "object" );
            expect( match.locTypeId ).toEqual( AlLocation.IncidentsUI );
            expect( match.environment ).toEqual( "development" );

            match = locator.getNodeByURI( "https://console.overview.alertlogic.co.uk/#/something/else" );
            expect( typeof( match ) ).toBe( "object" );
            expect( match.locTypeId ).toEqual( AlLocation.OverviewUI );
            expect( match.environment ).toEqual( "production" );
            expect( match.residency ).toEqual( "EMEA" );

            match = locator.getNodeByURI( "https://somewhere.over-the.rainbow.org/#/my-page" );
            expect( match ).toEqual( undefined );
        } );

    } );

    describe( "resolveURI method", () => {
        it("should generate accurate URLs for a given context", () => {
            let uri;

            uri = locator.resolveURL( AlLocation.OverviewUI, '/#/some/path', { residency: 'US', environment: 'production' } );
            expect( uri ).toEqual( "https://console.overview.alertlogic.com/#/some/path" );

            uri = locator.resolveURL( AlLocation.IncidentsUI, '/#/some/path', { residency: 'EMEA', environment: 'production' } );
            expect( uri ).toEqual( "https://console.incidents.alertlogic.co.uk/#/some/path" );

            uri = locator.resolveURL( AlLocation.SearchUI, undefined, { residency: 'US', environment: 'integration' } );
            expect( uri ).toEqual( "https://console.search.product.dev.alertlogic.com" );

            uri = locator.resolveURL( AlLocation.DashboardsUI, '/#/some/path', { residency: 'US', environment: 'development' } );
            expect( uri ).toEqual( "http://localhost:7001/#/some/path" );

            //  Now, we test alias binding in conjunction with URL resolution.  This should update the official integration incidents node to point to the alias.
            locator.setActingUrl( "https://incidents-pr-9.ui-dev.product.dev.alertlogic.com" );

            uri = locator.resolveURL( AlLocation.IncidentsUI, '/#/summary/1', { environment: 'production', residency: 'US' } );
            expect( uri ).toEqual( "https://console.incidents.alertlogic.com/#/summary/1" );
            uri = locator.resolveURL( AlLocation.IncidentsUI, '/#/summary/1', { environment: 'integration' } );
            expect( uri ).toEqual( "https://incidents-pr-9.ui-dev.product.dev.alertlogic.com/#/summary/1" );
        } );

        /**
         * Good test, but relies on window
         */
        xit( "should use window.location if the node isn't recognized", () => {
            let uri = locator.resolveURL( "SomethingUnrecognizable", '/#/arbitrary', { residency: "US", environment: "production" } );
            expect( uri ).toEqual( window.location.origin + ( ( window.location.pathname && window.location.pathname.length > 1 ) ? window.location.pathname : '' ) + "/#/arbitrary" );
        } );

        it( "should prefix auth0 node with https", () => {
            locator.setActingUrl( "https://console.incidents.alertlogic.com" );
            let uri = locator.resolveURL( AlLocation.Auth0 );
            expect( uri ).toEqual( "https://alertlogic.auth0.com" );
        } );
    } );

    /**
     * Jest rounds microseconds up to milliseconds :'( 
     */
    xdescribe( "resolution by URI", () => {
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
            expect( averageLookup ).toBeLessThan( 0.2 );
        } );
    } );

} );
