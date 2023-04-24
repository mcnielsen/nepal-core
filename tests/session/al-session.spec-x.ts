import {
    AIMSClient,
    AIMSAccount,
    AIMSSessionDescriptor,
    AlClientBeforeRequestEvent,
    AlDefaultClient,
    AlDataValidationError,
    AlSession,
    AlSessionInstance,
    AlCabinet,
    SubscriptionsClient,
    AlEntitlementCollection,
    AlRuntimeConfiguration, ConfigOption,
} from "@al/core";
import {
    exampleActing,
    exampleSession,
} from '../mocks/session-data.mocks';


const sessionDescriptor = {
  authentication: {
      user: {
        id: '12345-ABCDE',
        name: 'Alert Logic',
        email: 'alertlogic@unknown.com',
        active: true,
        locked: false,
        version: 1,
        linked_users: [],
        created: {
          at: 0,
          by: 'ui-team',
        },
        modified: {
          at: 0,
          by: 'ui-team',
        },
      },
      account: {
        id: '2',
        name: 'Alert Logic',
        active: false,
        accessible_locations: ['location-a', 'location-b'],
        default_location: 'location-a',
        mfa_required: false,
        created: {
          at: 0,
          by: 'ui-team',
        },
        modified: {
          at: 0,
          by: 'ui-team',
        },
      },
      token: 'abig-fake.JUICY-token',
      token_expiration: + new Date() + 86400,
  }
};

const actingAccount: AIMSAccount = {
  id: '5',
  name: 'ACME Corp',
  active: false,
  version: 1,
  accessible_locations: ['location-a', 'location-b'],
  default_location: 'location-a',
  created: {
    at: 0,
    by: 'al-ui-team',
  },
  modified: {
    at: 0,
    by: 'al-ui-team',
  },
};

describe('AlSession Test Suite:', () => {
  let storage = AlCabinet.persistent("al_session" );
  let accountDetailsStub;
  let managedAccountsStub;
  let entitlementsStub;
  beforeEach( async () => {
    accountDetailsStub = jest.spyOn( AIMSClient, 'getAccountDetails' ).mockResolvedValue( actingAccount );
    managedAccountsStub = jest.spyOn( AIMSClient, 'getManagedAccounts' ).mockResolvedValue( [] );
    entitlementsStub = jest.spyOn( SubscriptionsClient, 'getEntitlements' );
    entitlementsStub.withArgs("2").mockImplementation( ( accountId:string ) => {
        if ( accountId === "2" ) {
            return Promise.resolve( AlEntitlementCollection.fromArray( [ 'cloud_defender', 'cloud_insight' ] ) );
        } else {
            return Promise.resolve( AlEntitlementCollection.fromArray( [ 'assess', 'detect', 'respond' ] ) );
        }
    } );
    await AlSession.setAuthentication(sessionDescriptor);
  });
  describe('After installing a session with `setAuthentication`', () => {
    it('should persist this to local storage"', () => {
      let session = storage.get( "session" );
      expect( typeof( session ) ).toBe( 'object' );
      expect( typeof( session.authentication ) ).toBe( 'object' );
      expect( session.authentication ).toEqual( sessionDescriptor.authentication );
    });
    it('should provide the correct token from `.getToken()`', () => {
      expect(AlSession.getToken()).toEqual(sessionDescriptor.authentication.token);
    });
    it('should retrieve the correct expiration timestamp from `.getTokenExpiry()`', () => {
      expect(AlSession.getTokenExpiry()).toEqual(sessionDescriptor.authentication.token_expiration);
    });
    it('should retrieve the correct user ID from `.getUserID()`', () => {
      expect(AlSession.getUserID()).toEqual(sessionDescriptor.authentication.user.id);
    });
    it('should retrieve the correct user name from `.getUserName()`', () => {
      expect(AlSession.getUserName()).toEqual(sessionDescriptor.authentication.user.name);
    });
    it('should retrieve the correct email from `.getUserEmail()`', () => {
      expect(AlSession.getUserEmail()).toEqual(sessionDescriptor.authentication.user.email);
    });
    it('should retrieve the correct account id from `.getUserAccountID()`', () => {
      expect(AlSession.getUserAccountID()).toEqual(sessionDescriptor.authentication.account.id);
    });
    it('should retrieve the authentication record from `.getAuthentication()`', () => {
      expect(AlSession.getAuthentication()).toEqual(sessionDescriptor.authentication);
    });
    it('should retrieve the correct values from `.getUserAccessibleLocations()`', () => {
      expect(AlSession.getUserAccessibleLocations()).toEqual(sessionDescriptor.authentication.account.accessible_locations);
    });
    describe('On setting the session token details', () => {
      it('should persisted these correctly', () => {
        const token = 'my-token.is-great';
        const tokenExpiry = + new Date() + 1000;
        AlSession.setTokenInfo(token, tokenExpiry);
        expect(AlSession.getToken()).toEqual(token);
        expect(AlSession.getTokenExpiry()).toEqual(tokenExpiry);
      });
    } );
  });
  describe('After changing the acting account', () => {
    beforeEach( async () => {
      await AlSession.setActingAccount(actingAccount);
    } );
    it('should persist the acting account to local storage', () => {
      const auth = storage.get("session" );
      expect(auth.acting).toEqual(actingAccount);
    });
    it('should return the correct account ID from `.getActingAccountID()`', () => {
      expect(AlSession.getActingAccountID()).toEqual(actingAccount.id);
    });
    it('should return the correct acting account name from `getActingAccountName()`', () => {
      expect(AlSession.getActingAccountName()).toEqual(actingAccount.name);
    });
    it('should return the correct acting account record from `.getActingAccount()`', () => {
      expect(AlSession.getActingAccount()).toEqual(actingAccount);
    });
    it('should return the correct locations from `.getActingAccountAccessibleLocation()`', () => {
      expect(AlSession.getActingAccountAccessibleLocations()).toEqual(actingAccount.accessible_locations);
    });
    it('should retrieve the correct location from `.getActingAccountDefaultLocation()`', () => {
      expect(AlSession.getActingAccountDefaultLocation()).toEqual(actingAccount.default_location);
    });
    it('should expose the correct entitlements via `.getEffectiveEntitlements().`', async () => {
        let entitlements = await AlSession.getEffectiveEntitlements();
        expect( entitlements.isEntitlementActive( 'assess' ) ).toEqual( true );
        expect( entitlements.isEntitlementActive( 'cloud_insight' ) ).toEqual( false );

        entitlements = AlSession.getEffectiveEntitlementsSync();
        expect( entitlements.isEntitlementActive( 'assess' ) ).toEqual( true );
        expect( entitlements.isEntitlementActive( 'cloud_insight' ) ).toEqual( false );


        let primary = await AlSession.getPrimaryEntitlements();
        expect( primary.isEntitlementActive( 'assess' ) ).toEqual( false );
        expect( primary.isEntitlementActive( 'cloud_insight' ) ).toEqual( true );

        primary = AlSession.getPrimaryEntitlementsSync();
        expect( primary.isEntitlementActive( 'assess' ) ).toEqual( false );
        expect( primary.isEntitlementActive( 'cloud_insight' ) ).toEqual( true );


    } );
    it( `should throw when setting the acting account to nothing`, async () => {
        return AlSession.setActingAccount( null )
            .then(  () => Promise.reject( new Error('Expected method to reject') ),
                    err => {
                        expect( err ).toBeInstanceOf( Error );
                    } );
    } );
  } );
});

describe('After deactivating the session', () => {
  let storage = AlCabinet.persistent("al_session" );
  beforeEach(() => {
    AlSession.deactivateSession();
  });
  /** Disabled this because the session state may reflect annotations or artifacts of change that aren't included in the default session */
  it('should reflect that it has been deactivated', () => {
    expect(AlSession.isActive() ).toEqual( false );
  });
  it('should set remove the local storage item', () => {
    expect( storage.get("session") ).toEqual( null );
  });
});

describe('AlSession', () => {
  let storage = AlCabinet.persistent("al_session" );
  describe("constructor", () => {
    let accountDetailsStub, managedAccountsStub, entitlementsStub;
    beforeEach( () => {
      accountDetailsStub = jest.spyOn( AIMSClient, 'getAccountDetails' ).mockResolvedValue( exampleSession.authentication.account );
      managedAccountsStub = jest.spyOn( AIMSClient, 'getManagedAccounts' ).mockResolvedValue( [] );
      entitlementsStub = jest.spyOn( SubscriptionsClient, 'getEntitlements' ).mockResolvedValue( AlEntitlementCollection.fromArray( [ 'cloud_defender', 'cloud_insight' ] ) );
    } );
    afterEach( () => {
      storage.destroy();
    } );
    it( "should ignore expired session data on initialization", () => {
      let sessionDescriptor = {
        authentication: {
            user: {
              id: '12345-ABCDE',
              name: 'Alert Logic',
              email: 'alertlogic@unknown.com',
              active: true,
              locked: false,
              version: 1,
              linked_users: [],
              created: {
                at: 0,
                by: 'ui-team',
              },
              modified: {
                at: 0,
                by: 'ui-team',
              },
            },
            account: {
              id: '2',
              name: 'Alert Logic',
              active: false,
              accessible_locations: ['location-a', 'location-b'],
              default_location: 'location-a',
              mfa_required: false,
              created: {
                at: 0,
                by: 'ui-team',
              },
              modified: {
                at: 0,
                by: 'ui-team',
              },
            },
            token: 'abig-fake.JUICY-token',
            token_expiration: ( Date.now() / 1000 ) - ( 60 * 60 ),
        }
      };
      storage.set("session", sessionDescriptor );
      let session = new AlSessionInstance();      //  sometimes it is easier to just not use singletons
      expect( session.isActive() ).toEqual( false );
      expect( storage.get("session" ) ).toEqual( null );
    } );

    it( "should deactivate/clean storage if it is invalid", () => {
      //    The "prevent local storage tampering" test
      let badSession = {
        authentication: {
          token: exampleSession.authentication.token,
          token_expiration: exampleSession.authentication.token_expiration,
          user: Object.assign( {}, exampleSession.authentication.user ),
          account: "ABCD1234"      /*  this is incorrect structure */
        }
      };
      let warnStub = jest.spyOn( console, 'warn' );
      let errorStub = jest.spyOn( console, 'error' );
      storage.set("session", badSession );
      let session = new AlSessionInstance();
      expect( session.isActive() ).toEqual( false );
      //    Secondary test: make sure the AlClientBeforeRequest hook doesn't do anything funky
      let event = new AlClientBeforeRequestEvent( { url: 'https://api.cloudinsight.alertlogic.com', headers: {} } );
      session.notifyStream.trigger( event );
      expect( event.request.headers.hasOwnProperty( 'X-AIMS-Auth-Token' ) ).toEqual( false );
    } );

    it( "should authenticate localStorage if it is valid", async () => {
      storage.set("session", exampleSession );
      let session = new AlSessionInstance();
      await session.resolved();
      expect( session.isActive() ).toEqual( true );

      //    Secondary test: make sure the AlClientBeforeRequest hook works
      let event = new AlClientBeforeRequestEvent( { service_stack: 'insight:api', url: 'https://api.cloudinsight.alertlogic.com', headers: {} } );
      session.notifyStream.trigger( event );
      expect( event.request.headers.hasOwnProperty( 'X-AIMS-Auth-Token' ) ).toEqual( true );
      expect( event.request.headers['X-AIMS-Auth-Token'] ).toEqual( exampleSession.authentication.token );
    } );


  } );

  describe('when unauthenticated', () => {
    describe('account ID accessors', () => {
      it("should return NULL, rather than a string '0'", () => {
        let session:AlSessionInstance = new AlSessionInstance();
        //  Because returning '0' is stupid
        expect( session.getPrimaryAccountId() ).toEqual( null );
        expect( session.getActingAccountId() ).toEqual( null );
      } );
    } );
  } );

  describe('when authenticated', () => {
    describe('primary and acting accounts', () => {
      beforeAll( () => AlRuntimeConfiguration.setOption( ConfigOption.ResolveAccountMetadata, false ) );
      afterAll( () => AlRuntimeConfiguration.reset() );
      it( 'should return expected values', async () => {
        let session:AlSessionInstance = new AlSessionInstance();
        await session.setAuthentication(exampleSession);
        let auth = session.getSession();
        expect( typeof( auth ) ).toBe( 'object' );
        expect( typeof( auth.authentication ) ).toBe( 'object' );
        expect( auth.authentication.token ).toEqual( exampleSession.authentication.token );

        expect( session.getPrimaryAccount() ).toEqual( exampleSession.authentication.account );
        expect( session.getActingAccount() ).toEqual( exampleSession.authentication.account );

        expect( session.getPrimaryAccountId() ).toEqual( exampleSession.authentication.account.id );
        expect( session.getActingAccountId() ).toEqual( exampleSession.authentication.account.id );

        session.deactivateSession();
      } );
    } );

  } );

  describe(".setAuthentication", () => {
    it( "should throw an error when given malformed data", async () => {
      try {
        let badSession:unknown = {
          authentication: {
            account: null,
            token: "SOME FAKE TOKEN",
            token_expiration: "2021-10-01"
          }
        };
        let session = new AlSessionInstance();
        await session.setAuthentication( badSession as AIMSSessionDescriptor );
        expect( true ).toEqual( false );
      } catch( e ) {
        expect( e instanceof AlDataValidationError ).toEqual( true );
      }
    } );
  } );

  describe( 'authentication methods', () => {

    beforeEach( () => {
        storage.destroy();
        AlRuntimeConfiguration.setOption( ConfigOption.ResolveAccountMetadata, false );
    } );
    afterEach( () => {
        AlRuntimeConfiguration.reset();
    } );

    describe( 'by username and password', () => {

      it( "should authenticate properly given a valid client response", async () => {
        let session = new AlSessionInstance();
        let clientAuthStub = jest.spyOn( AlDefaultClient, 'authenticate' ).mockResolvedValue( exampleSession );

        expect( session.isActive() ).toEqual( false );
        let result = await session.authenticate( "mcnielsen@alertlogic.com", "b1gB1rdL!ves!" );
        expect( session.isActive() ).toEqual( true );
      } );

    } );

    describe( 'by MFA code and session token', () => {

      it( "should authenticate properly given a valid client response", async () => {
        let session = new AlSessionInstance();
        let clientAuthStub = jest.spyOn( AlDefaultClient, 'authenticateWithMFASessionToken' ).mockResolvedValue( exampleSession );

        expect( session.isActive() ).toEqual( false );
        let result = await session.authenticateWithSessionToken( "SOME_ARBITRARY_SESSION_TOKEN", "123456" );
        expect( session.isActive() ).toEqual( true );
        session.deactivateSession();
      } );

    } );

    describe( 'by access token', () => {

      it( "should authenticate properly given a valid client response", async () => {
        let session = new AlSessionInstance();
        let clientAuthStub = jest.spyOn( AIMSClient, 'getTokenInfo' ).mockResolvedValue( exampleSession.authentication );

        expect( session.isActive() ).toEqual( false );
        let result = await session.authenticateWithAccessToken( "SOME_ARBITRARY_ACCESS_TOKEN" );
        expect( session.isActive() ).toEqual( true );
        session.deactivateSession();
      } );

    } );

    describe( 'with acting account/location override', () => {
      it("should work", async () => {
        let session = new AlSessionInstance();
        let clientAuthStub = jest.spyOn( AlDefaultClient, 'authenticate' ).mockResolvedValue( exampleSession );

        let fakeAccount = {
          id: '6710880',
          name: 'Big Bird & Friends, Inc.',
          accessible_locations: [ "defender-uk-newport", "insight-eu-ireland" ],
          default_location: "defender-uk-newport"
        } as AIMSAccount;

        expect( session.isActive() ).toEqual( false );
        let result = await session.authenticate( "mcnielsen@alertlogic.com", "b1gB1rdL!ves!", { actingAccount: fakeAccount, locationId: "defender-uk-newport" } );
        expect( session.isActive() ).toEqual( true );
        expect( session.getActingAccountId() ).toEqual( "6710880" );
        expect( session.getActiveDatacenter() ).toEqual( "defender-uk-newport" );
      } );
    } );

  } );

  describe( 'helper methods', () => {
    let session:AlSessionInstance;
    let accountDetailsStub;
    let managedAccountsStub;
    let entitlementsStub;
    let accountDetails = exampleActing;
    let managedAccounts = [];
    let entitlements = new AlEntitlementCollection();

    beforeEach( () => {
      session = new AlSessionInstance();
      accountDetailsStub = jest.spyOn( AIMSClient, 'getAccountDetails' ).mockResolvedValue( accountDetails );
      managedAccountsStub = jest.spyOn( AIMSClient, 'getManagedAccounts' ).mockResolvedValue( managedAccounts );
      entitlementsStub = jest.spyOn( SubscriptionsClient, 'getEntitlements' ).mockResolvedValue( entitlements );
    } );

    afterEach( () => {
      session.deactivateSession();
    } );

    describe( ".resolved()", () => {

      it("should not be resolved in an unauthenticated context", () => {
        expect( session['resolutionGuard']['fulfilled'] ).toEqual( false );
      } );

      it("should be resolved after authentication", async () => {
        session.setAuthentication( exampleSession );
        await session.resolved();
        expect( session.isActive() ).toEqual( true );
        expect( session['resolutionGuard']['fulfilled'] ).toEqual( true );
      } );
    } );

    describe( ".ready()", () => {
      it("detection guard should block in its initial state", () => {
        expect( session['detectionGuard']['fulfilled'] ).toEqual( false );
      } );
      it("detection guard should be resolved after a session detection cycle in an unauthenticated state", () => {
        session.startDetection();
        session.endDetection();
        expect( session['detectionGuard']['fulfilled'] ).toEqual( true );
      } );
      it("it should resolve after session detection/authentication resolved", ( done ) => {
        //  Dear World: this is an absolutely gruesome test...  my apologies.  Sincerely, Kevin.
        session.startDetection();
        setTimeout( () => {
          session.setAuthentication( exampleSession ).then( () => {
            session['resolutionGuard'].rescind();       //  pretend we're resolving an acting account
            session.endDetection();
            let resolved = false;
            session.ready().then( () => {
              resolved = true;
            }, ( error ) => {
              expect( true ).toEqual( false );
            } );

            setTimeout( () => {
              expect( resolved ).toEqual( false );
              session['resolutionGuard'].resolve( true );
              setTimeout( () => {
                expect( resolved ).toEqual( true );
                done();
              }, 1 );
            }, 1 );
          }, error => {
              expect( true ).toEqual( false );
          } );
        }, 1 );
      } );
    } );

    describe( ".getPrimaryEntitlementsSync()", () => {
        it("should return null in an unauthenticated state", () => {
            expect( session.getPrimaryEntitlementsSync() ).toEqual( null );
        } );
        it("should return viable entitlements if the session is authenticated", async () => {
            session.setAuthentication( exampleSession );
            await session.resolved();
            expect( session.getPrimaryEntitlementsSync() ).toEqual( session['resolvedAccount']['primaryEntitlements'] );
        } );
    } );

    describe( ".getPrimaryEntitlements()", () => {
      it("should return the entitlements of the primary account after account resolution is finished", ( done ) => {
        session.getPrimaryEntitlements().then( primaryEntitlements => {
          expect( primaryEntitlements ).toEqual( entitlements );
          done();
        } );
        session.setAuthentication( exampleSession );
      } );
    } );

    describe( ".getEffectiveEntitlementsSync()", () => {
        it("should return null in an unauthenticated state", () => {
            expect( session.getEffectiveEntitlementsSync() ).toEqual( null );
        } );
        it("should return viable entitlements if the session is authenticated", async () => {
            session.setAuthentication( exampleSession );
            await session.resolved();
            expect( session.getEffectiveEntitlementsSync() ).toEqual( session['resolvedAccount'].entitlements );
        } );
    } );

    describe( ".getEffectiveEntitlements()", () => {
      it("should return the entitlements of the acting account after account resolution is finished", ( done ) => {
        session.getEffectiveEntitlements().then( actingEntitlements => {
          expect( actingEntitlements ).toEqual( entitlements );
          done();
        }, error => {
            done( error );
        } );
        session.setAuthentication( exampleSession );
      } );
    } );

    describe( ".getManagedAccounts()", () => {
      it("should return the list of accounts managed by the primary account after account resolution is finished", async () => {
        session.setAuthentication( exampleSession );
        let accountList = await session.getManagedAccounts();
        expect( accountList ).toEqual( managedAccounts );
      } );
    } );

  } );

} );
