import { AlEntitlementCollection } from '@al/core';

describe( 'AlEntitlementCollection', () => {

    const rawData = {
        account_id: '2',
        entitlements: [
            {
                product_family: 'apollo',
                status: 'pending_activation'
            },
            {
                product_family: 'calliope',
                status: 'active'
            },
            {
                product_family: 'demeter',
                status: 'unknown'
            },
            {
                product_family: 'zeus',
                status: 'expired'
            },
        ]
    };

    describe( 'WHEN empty', () => {
        let entitlements = new AlEntitlementCollection( [] );

        beforeEach( () => {
            jest.spyOn( console, "warn" ).mockImplementation( () => {} );
        } );

        afterEach( () => {
            jest.clearAllMocks();
        } );
        it( "SHOULD handle lookups to products that don't exist", () => {
            let emptyProduct = entitlements.getProduct("doesntExist");
            expect( typeof( emptyProduct ) ).toBe( 'object' );
            expect( emptyProduct.active ).toEqual( false );
        } );
    } );

    describe( 'WHEN populated', () => {
        let entitlements = AlEntitlementCollection.import( rawData );

        it( 'SHOULD correctly identity CID2 users with the al_internal_user pseudoproperty', () => {
            expect( entitlements.getProduct("al_internal_user").active ).toEqual( true );
        } );

        it( "SHOULD correctly identity items with status 'pending_activation' and 'active' as active", () => {
            expect( entitlements.getProduct("apollo").active ).toEqual( true );
            expect( entitlements.getProduct("calliope").active ).toEqual( true );
        } );

        it( "SHOULD correctly identity items with other statuses as inactive", () => {
            expect( entitlements.getProduct( "zeus" ).active ).toEqual( false );
        } );
    } );

    describe( 'evaluateExpression', () => {
        let entitlements = AlEntitlementCollection.import( rawData );

        it( 'SHOULD correctly evaluate entitlement expressions', () => {

            expect( entitlements.evaluateExpression( "apollo|zeus" ) ).toEqual( true );                        //  because apollo is pending activation
            expect( entitlements.evaluateExpression( "calliope|zeus" ) ).toEqual( true );                      //  because calliope is active
            expect( entitlements.evaluateExpression( "demeter|zeus" ) ).toEqual( false );                      //  because neither demeter and zeus are not active
            expect( entitlements.evaluateExpression( "demeter|zeus|al_internal_user" ) ).toEqual( true );      //  because al_internal_user is true for account_id 2 responses

            expect( entitlements.evaluateExpression( "apollo&calliope" ) ).toEqual( true );                    //  because both apollo and calliope are active
            expect( entitlements.evaluateExpression( "apollo&demeter" ) ).toEqual( false );                    //  because both apollo and demeter are NOT active

            expect( entitlements.evaluateExpression( "demeter|apollo&!zeus" ) ).toEqual( true );               //  because even though demeter isn't active, apollo but NOT zeus evaluates to true
        } );

        it( 'SHOULD always treat the wildcard entitlement "*" as enabled', () => {
            expect( entitlements.evaluateExpression( "*" ) ).toEqual( true );                                  //  essentially, "anything"
            expect( entitlements.evaluateExpression( "!*" ) ).toEqual( false );                                //  essentially, "nothing"
            expect( entitlements.evaluateExpression( "*&!*" ) ).toEqual( false );                              //  essentially, "anything" and "nothing", which is logically ridiculous
                                                                                                                //      ...like myself...  and thus evaluates to false.
        } );
    } );
} );
