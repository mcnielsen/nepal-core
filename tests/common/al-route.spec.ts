import {
    AlExecutionContext,
    AlLocation,
} from '@al/core';
import {
    AlRoute,
    AlRouteCondition,
    AlRouteDefinition,
    AlRoutingHost,
} from '@al/core/navigation';
import { AlTestExecutionContext } from '@al/core/testing';

export class MockRoutingHost implements AlRoutingHost {
    context:AlExecutionContext;
    currentUrl = "https://console.overview.alertlogic.com/#/remediations-scan-status/2";
    routeParameters = {};

    constructor( public entitlements:{[entitlement:string]:boolean} = {} ) {
        this.context = AlExecutionContext.default;
    }

    dispatch = ( route:AlRoute ) => true;
    evaluate( condition:AlRouteCondition ):boolean|boolean[] {
        let results:boolean[] = [];
        if ( condition.entitlements ) {
            let entitlements = typeof( condition.entitlements ) === 'string' ? [ condition.entitlements ] : condition.entitlements;
            entitlements.forEach( entitlement => {
                results.push( this.entitlements.hasOwnProperty( entitlement ) && this.entitlements[entitlement] );
            } );
        }
        if ( condition.environments ) {
            const environment = AlExecutionContext.environment;
            results.push( condition.environments.includes( environment ) );
        }
        return results;
    }

    setRouteParameter(parameter:string, value:string) {}
    getConditionById = (conditionId:string) => null;
    deleteRouteParameter(parameter:string) {}
    setBookmark(id:string, route:AlRoute ) {}
    getBookmark = (id:string):AlRoute => null;
}

describe( 'AlRoute', () => {

    const fakeEntitlements = {
        'a': true,
        'b': false,
        'c': true,
        'd': false
    };

    const context = new AlTestExecutionContext();
    let routingHost = new MockRoutingHost( fakeEntitlements );

    beforeEach( () => {
        AlExecutionContext.target( "production", 'US', 'defender-us-denver' );
        AlExecutionContext.target( "https://console.overview.alertlogic.com" );
        routingHost.routeParameters["accountId"] = "2";
        routingHost.routeParameters["deploymentId"] = "1234ABCD-1234-ABCD1234";
    } );

    describe( 'basic functionality', () => {
        it("should allow getting and setting of properties", () => {
            const menu = new AlRoute( routingHost, {
                caption: "Test Route",
                action: {
                    type: 'link',
                    location: AlLocation.OverviewUI,
                    path: '/#/remediations-scan-status/:accountId'
                },
                properties: {}
            } );
            menu.setProperty( 'kevin', 'was-here' );
            menu.setProperty( 'terriblySmart', false );
            menu.setProperty( 'hair', null );

            expect( menu.getProperty( "kevin" ) ).toEqual( "was-here" );
            expect( menu.getProperty( "terriblySmart" ) ).toEqual( false );
            expect( menu.getProperty( "hair" ) ).toEqual( null );
            expect( menu.getProperty( "doesntExist" ) ).toEqual( null );

            menu.setProperty( 'kevin', undefined );
            expect( menu.getProperty( 'kevin' ) ).toEqual( null );

            //  Test the default value for missing properties case too
            expect( menu.getProperty( 'kevin', false ) ).toEqual( false );
        } );
        it("deleting route properties should fall back on properties in the definition", () => {
            const route = new AlRoute( routingHost, {
                caption: "Test Route",
                properties: {
                    property1: "original"
                }
            } );
            expect(route.getProperty( "property1" ) ).toEqual("original" );
            route.setProperty( 'property1', 'newAndImproved' );
            expect(route.getProperty( "property1" ) ).toEqual("newAndImproved" );
            route.deleteProperty( 'property1' );
            expect(route.getProperty( "property1" ) ).toEqual("original" );
        } );
        it("should create routes using static `link` method", () => {
            let route = AlRoute.link( routingHost, "cd17:overview", '/#/some/random/path' );
            expect( typeof( route.caption ) ).toBe("string");
            expect( typeof( route.properties ) ).toBe("object");
            expect( Array.isArray( route.children ) ).toBe(true);
            expect( route.children.length ).toEqual( 0 );
            expect( route.href ).toEqual( "https://console.overview.alertlogic.com/#/some/random/path" );
        } );
        it("should delegate `dispatch` calls to the routing host", () => {
            let route = AlRoute.link( routingHost, "cd17:overview", '/#/some/random/path' );
            let dispatchStub = jest.spyOn( routingHost, "dispatch" );

            route.dispatch();
            expect( dispatchStub.mock.calls.length ).toEqual( 1 );
            expect( dispatchStub.mock.calls[0][0] ).toEqual( route );
        } );
        it("should convert to HREF when `toHref` is called", () => {
            const route = AlRoute.link( routingHost, "cd17:overview", '/#/some/random/path' );
            const routeHref = route.toHref();
            expect( routeHref ).toEqual( "https://console.overview.alertlogic.com/#/some/random/path" );
        } );
        it("should call the host's href decorator if one is provided", () => {
            ( routingHost as any ).decorateHref = jest.fn();
            const route = AlRoute.link( routingHost, "cd17:overview", '/#/some/random/path' );
            expect( ( routingHost as any ).decorateHref.mock.calls.length ).toEqual( 1 );
        } );
    } );

    describe( 'route construction', () => {
        afterEach( () => jest.clearAllMocks() );
        it( 'should evaluate route HREFs properly', () => {
            const menu = new AlRoute( routingHost, {
                caption: "Test Route",
                action: {
                    type: 'link',
                    location: AlLocation.OverviewUI,
                    path: '/#/remediations-scan-status/:accountId'
                },
                properties: {}
            } );
            expect( menu.baseHREF ).toEqual( "https://console.overview.alertlogic.com" );
            expect( menu.href ).toEqual( "https://console.overview.alertlogic.com/#/remediations-scan-status/2" );
            expect( menu.visible ).toEqual( true );
        } );
        it( 'should evaluate optional route parameters in HREFs properly', () => {

            routingHost.routeParameters["accountId"] = "12345678";
            routingHost.routeParameters["userId"] = "ABCDEFGH";
            routingHost.routeParameters["deploymentId"] = "XXXX-YYYY-ZZZZZZZZ-1234";

            const menu = new AlRoute( routingHost, {
                caption: "Test Route",
                action: {
                    type: 'link',
                    location: AlLocation.OverviewUI,
                    path: '/#/path/to/:accountId/:userId%/:deploymentId%'
                },
                properties: {}
            } );

            menu.refresh();

            expect( menu.baseHREF ).toEqual( "https://console.overview.alertlogic.com" );
            expect( menu.href ).toEqual( "https://console.overview.alertlogic.com/#/path/to/12345678/ABCDEFGH/XXXX-YYYY-ZZZZZZZZ-1234" );
            expect( menu.visible ).toEqual( true );

            //  Delete the optional deploymentId parameter
            delete routingHost.routeParameters["deploymentId"];
            menu.refresh( true );

            expect( menu.baseHREF ).toEqual( "https://console.overview.alertlogic.com" );
            expect( menu.href ).toEqual( "https://console.overview.alertlogic.com/#/path/to/12345678/ABCDEFGH" );
            expect( menu.visible ).toEqual( true );

            //  Delete the optional userId parameter
            delete routingHost.routeParameters["userId"];
            menu.refresh( true );

            expect( menu.baseHREF ).toEqual( "https://console.overview.alertlogic.com" );
            expect( menu.href ).toEqual( "https://console.overview.alertlogic.com/#/path/to/12345678" );
            expect( menu.visible ).toEqual( true );

            //  Delete the required accountId parameter
            delete routingHost.routeParameters["accountId"];
            menu.refresh( true );

            expect( menu.baseHREF ).toEqual( "https://console.overview.alertlogic.com" );
            expect( menu.href ).toEqual( "https://console.overview.alertlogic.com/#/path/to/:accountId" );
            expect( menu.visible ).toEqual( false );
        } );
        it( 'should handle invalid locationIds properly with a warning', () => {
            let warnStub = jest.spyOn( console, "warn" ).mockImplementation( () => {} );
            const route = AlRoute.link( routingHost, null, "/#/some/silly/path" );
            expect( warnStub.mock.calls.length ).toEqual( 1 );
        } );
        it( 'should handle invalid route HREFs properly', () => {
            const menu = new AlRoute( routingHost, {
                caption: "Test Route",
                action: {
                    type: 'link',
                    location: AlLocation.OverviewUI,
                    path: '/#/path/:notExistingVariable/something'
                },
                properties: {}
            } );
            expect( menu.baseHREF ).toEqual( "https://console.overview.alertlogic.com" );
            expect( menu.href ).toEqual( "https://console.overview.alertlogic.com/#/path/:notExistingVariable/something" );
            expect( menu.visible ).toEqual( false );
        } );
        it( 'should handle invalid locations properly', () => {
            const menu = new AlRoute( routingHost, {
                caption: "Test Route",
                action: {
                    type: 'link',
                    location: "invalid:location",
                    path: '/#/path/:notExistingVariable/something'
                },
                properties: {}
            } );
            expect( menu.baseHREF ).toEqual( "http://localhost:9999" );
            expect( menu.href ).toEqual( "http://localhost:9999/#/path/:notExistingVariable/something" );
            expect( menu.visible ).toEqual( false );
        } );
    } );

    describe( 'activation detection', () => {
        it( "should detect exact matches!", () => {
            routingHost.currentUrl = "https://console.overview.alertlogic.com/#/path/2";
            const menu = new AlRoute( routingHost, {
                caption: "Test Route",
                action: {
                    type: 'link',
                    location: "cd17:overview",
                    path: '/#/path/:accountId'
                },
                properties: {}
            } );
            menu.refresh();

            expect( menu.href ).toEqual( "https://console.overview.alertlogic.com/#/path/2" );
            expect( menu.activated ).toEqual( true );
        } );
        it( "should ignore query parameters", () => {
            routingHost.currentUrl = "https://console.overview.alertlogic.com/#/queryparams/2?aaid=2&locid=defender-us-denver&filter1=value1&filter2=value2";
            const menu = new AlRoute( routingHost, {
                caption: "Test Route",
                action: {
                    type: 'link',
                    location: "cd17:overview",
                    path: '/#/queryparams/:accountId?locid=defender-us-denver&filter1=value1&aaid=2&filter2=value2'
                },
                properties: {}
            } );
            menu.refresh();

            expect( menu.activated ).toEqual( true );
        } );
    } );

    describe( 'given a simple menu definition', () => {

        const child1:AlRouteDefinition = {
            caption: "Child 1",
            visible: {
                entitlements: [ 'a' ]
            },
            action: {
                type: "link",
                location: AlLocation.OverviewUI,
                path: '/#/child-route-1'
            },
            properties: {}
        };
        const child2:AlRouteDefinition = {
            caption: "Child 2",
            visible: {
                rule: 'none',
                conditions: [
                    { entitlements: [ 'b' ] },
                    { entitlements: [ 'd' ] }
                ]
            },
            action: {
                type: "link",
                location: AlLocation.IncidentsUI,
                path: '/#/child-route-2'
            },
            properties: {}
        };
        const child3:AlRouteDefinition = {
            id: 'child3',
            caption: "Child 3",
            visible: {
                rule: 'all',
                conditions: [
                    { entitlements: [ 'a' ] },
                    { entitlements: [ 'c' ] },
                    { entitlements: [ 'd' ] }           /* this is false */
                ]
            },
            action: {
                type: "link",
                location: AlLocation.IncidentsUI,
                path: '/#/child-route-3'
            },
            properties: {},
            children: [
                {
                    id: "grandchild",
                    caption: "Third Level Item",
                    action: {
                        type: "link",
                        location: AlLocation.IncidentsUI,
                        path: '/#/child-route-3/grandchild'
                    }
                }
            ]
        };

        const menuDefinition:AlRouteDefinition = {
            caption: "Test Menu",
            children: [
                {
                    id: 'overview',
                    caption: "Overview",
                    action: {
                        type: "link",
                        location: AlLocation.OverviewUI,
                        path: '/#/'
                    },
                    matches: [ '/#/.*' ],
                    children: [
                        child1,
                        child2,
                        child3
                    ],
                    properties: {}
                },
                {
                    caption: "Details",
                    action: {
                        type: "link",
                        location: AlLocation.IncidentsUI,
                        path: '/#/'
                    },
                    properties: {}
                }
            ],
            properties: {}
        };

        it( "should be interpreted with a correct initial state", () => {
            const menu:AlRoute = new AlRoute( routingHost, menuDefinition );

            expect( menu.children.length ).toEqual( 2 );
            expect( menu.children[0].children.length ).toEqual( 3 );

            let route1 = menu.children[0].children[0];
            let route2 = menu.children[0].children[1];
            let route3 = menu.children[0].children[2];

            expect( route1.href ).toEqual( 'https://console.overview.alertlogic.com/#/child-route-1' );
            expect( route1.visible ).toEqual( true );
            expect( route1.activated ).toEqual( false );

            expect( route2.href ).toEqual( 'https://console.incidents.alertlogic.com/#/child-route-2' );
            expect( route2.visible ).toEqual( true );
            expect( route2.activated ).toEqual( false );

            expect( route3.href ).toEqual( undefined );         // not visible?  no URL
            expect( route3.visible ).toEqual( false );
            expect( route3.activated ).toEqual( false );

        } );

        it( "should activate a route with a matching URL properly", () => {

            routingHost.currentUrl = "https://console.overview.alertlogic.com/#/child-route-1";
            const menu:AlRoute = new AlRoute( routingHost, menuDefinition );

            let route1 = menu.children[0].children[0];

            expect( route1.activated ).toEqual( true );
            expect( menu.children[0].activated ).toEqual( true );
            expect( menu.activated ).toEqual( true );

        } );

        it( "should allow retrieval of items by ID and name", () => {
            const menu:AlRoute = new AlRoute( routingHost, menuDefinition );

            let grandchild1 = menu.findChild( "overview/child3/grandchild" );        //  Look up matching IDs
            let grandchild2 = menu.findChild( "overview/Child 3/Third Level Item" );       //  Look up matching captions

            expect( typeof( grandchild1 ) ).toEqual( 'object' );
            expect( grandchild1 ).toEqual( grandchild2 );                  //  Should be the same

            let nonexistant = menu.findChild( "overview/Child 2/Does Not Exist" );
            expect( nonexistant ).toEqual( null );
        } );

        it( "should bookmark routes with a bookmarkId property in their definition", () => {
            let saveStub = jest.spyOn( routingHost, "setBookmark" ).mockImplementation( () => {} );
            let route = new AlRoute( routingHost, {
                caption: "Test Route",
                bookmarkId: "my-bookmark-id"
            } );
            expect( saveStub.mock.calls.length ).toEqual( 1 );
            expect( saveStub.mock.calls[0][0] ).toEqual( "my-bookmark-id" );
            expect( saveStub.mock.calls[0][1] ).toEqual( route );
        } );
    } );

    describe( "conditional evaluation", () => {
        it("should ignore unknown condition types and treat them as truthy", () => {
            let route = new AlRoute( routingHost, <AlRouteDefinition><unknown>{
                caption: "Test Route",
                action: {
                    type: "link",
                    url: "https://www.google.com"
                },
                visible: {
                    not_recognized: true
                }
            } );

            expect( route.visible ).toEqual( true );
        } );

        it("should evaluate path_matches as expected", () => {
            routingHost.currentUrl = "https://console.remediations.alertlogic.com/#/remediations-scan-status/2";
            let route = new AlRoute( routingHost, {
                caption: "Test Route",
                visible: {
                    path_matches: '/remediations-scan-status.*'
                }
            } );

            expect( route.visible ).toEqual( true );

            ( route.definition.visible as AlRouteCondition ).path_matches = "/something-else.*";
            route.refresh( true );
            expect( route.visible ).toEqual( false );
        } );

        it("should evaluate route parameter expressions as expected", () => {
            routingHost.routeParameters["param1"] = "alpha";
            routingHost.routeParameters["param2"] = "omega";

            let route = new AlRoute( routingHost, {
                caption: "Test Route",
                visible: {
                    parameters: [ "param1=alpha", "param2!=alpha" ]
                }
            } );

            expect( route.visible ).toEqual( true );   //  because param1 equals alpha and param2 doesn't

            let route2 = new AlRoute( routingHost, {
                caption: "Test Route",
                visible: {
                    parameters: [ "param3" ]
                }
            } );

            expect( route2.visible ).toEqual( false ); //  because param3 doesn't exist

            let route3 = new AlRoute( routingHost, {
                caption: "Test Route",
                visible: {
                    parameters: [ "param3!=anything_at_all", "param2=omega", "param1" ]
                }
            } );

            expect( route3.visible ).toEqual( true ); //  because param3 doesn't exist
        } );

        it("should evaluate environment conditionals as expected", () => {
            AlExecutionContext.target( "https://console.account.alertlogic.com" );
            let route = new AlRoute( routingHost, {
                caption: "Something",
                visible: {
                    environments: [ 'development', 'integration' ]
                }
            } );
            expect( route.visible ).toEqual( false );

            AlExecutionContext.target( "https://console.account.product.dev.alertlogic.com" );
            route.refresh();
            expect( route.visible ).toEqual( true );
        } );

        it("should evaluate compound conditionals using 'all' as expected", () => {
            routingHost.routeParameters["accountId"] = "2";
            routingHost.routeParameters["deploymentId"] = "funicular";
            fakeEntitlements["super_secret_feature"] = true;
            routingHost.currentUrl = "https://console.overview.alertlogic.com/#/special/feature/path?filter=healthy";

            let route = new AlRoute( routingHost, {
                caption: "Something",
                visible: {
                    rule: 'all',
                    parameters: [ "accountId", "deploymentId" ],
                    path_matches: '/#/special/feature/path.*',
                    entitlements: [ 'super_secret_feature' ]
                }
            } );

            expect( route.visible ).toEqual( true );

            fakeEntitlements["super_secret_feature"] = false;   //  any condition resulting in false should cause the whole thing to evaluate to false

            route.refresh();

            expect( route.visible ).toEqual( false );
        } );

        it("should evaluate compound conditions using 'none' as expected", () => {
            routingHost.routeParameters["accountId"] = "2";
            let route = new AlRoute( routingHost, {
                caption: "Something",
                visible: {
                    rule: 'none',
                    parameters: [ "accountId", "jabberwocky" ],     //  <-- accountId is defined, so the routes visibility should initially be `false`
                    path_matches: '/#/some/path/i/am/not/on',
                    entitlements: [ 'some_undefined_entitlement' ]
                }
            } );

            expect( route.visible ).toEqual( false );

            delete routingHost.routeParameters["accountId"];

            route.refresh();

            expect( route.visible ).toEqual( true );

        } );

    } );
} );
