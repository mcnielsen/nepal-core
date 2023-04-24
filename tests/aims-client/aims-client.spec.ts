import { 
    AlBaseAPIClient,
    AlDefaultClient,
    AlExecutionContext,
    ConfigOption,
    AlLocation,
    AlNetworkResponse,
    client,
    AIMS,
    AIMSEnrollURI
} from "@al/core";

const accountId = '12345';
const userId = '4567';
const queryParams = { foo: 'bar' };

describe('AIMS Client Test Suite:', () => {
  let stub;
  let apiBaseURL, globalBaseURL;
  const aimsClient = client(AIMS);
  beforeEach(() => {
    AlExecutionContext.reset();
    AlExecutionContext.target( "integration" );
    AlExecutionContext.setOption( ConfigOption.DisableEndpointsResolution, true );
    stub = jest.spyOn( AlExecutionContext.default, "handleRequest").mockResolvedValue( { status: 200, data: 'Some result', request: {} } as AlNetworkResponse );
    apiBaseURL = AlExecutionContext.locator.resolveURL( AlLocation.InsightAPI );
    globalBaseURL = AlExecutionContext.locator.resolveURL( AlLocation.GlobalAPI );
  });
  afterEach( () => {
      stub.mockClear();
  } );
  describe('when performing a create user operation', () => {
    it('should call post() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      const name = 'someone.somewhere';
      const email = 'someone@somwehere.com';
      const mobilePhone = '123-456-789-000';
      await aimsClient.createUser(accountId, name, email, mobilePhone);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "POST" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/users` );
      expect( payload.data ).toEqual( { name, email, mobile_phone: mobilePhone } );
    });
  });
  describe('when performing a delete user operation', () => {
    it('should call delete() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      await aimsClient.deleteUser(accountId, userId);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "DELETE" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/users/${userId}` );
    });
  });
  describe('when retrieving a user record', () => {
    it('should call fetch() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      await aimsClient.getUserDetailsById(accountId, userId);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "GET" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/users/${userId}` );
    });
  });
  describe('when retrieving permissions for a user', () => {
    it('should call fetch() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      await aimsClient.getUserPermissions(accountId, userId);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "GET" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/users/${userId}/permissions` );
    });
  });
  describe('when retrieving account details', () => {
    it('should call fetch() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      await aimsClient.getAccountDetails(accountId);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "GET" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/account` );
    });
  });
  describe('when enabling MFA for a user account', () => {
    it('should call post() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      await aimsClient.requireMFA(accountId, true);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "POST" );
      expect( payload.data ).toEqual( { mfa_required: true } );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/account` );
    });
  });
  describe('when changing a user password', () => {
    it('should call post() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      const email = 'someone@somewhere.com';
      const password = 'xyz123';
      const newPassword = 'ABC007';
      await aimsClient.changePassword(email, password, newPassword);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "POST" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/change_password` );
      expect( payload.data ).toEqual( { email, current_password: password, new_password: newPassword } );
    });
  });
  describe("when retrieving token info for a specific token", () => {
    it("should call the correct URL", async() => {
      await aimsClient.getTokenInfo( "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );
      expect( stub.mock.calls.length ).toEqual( 1 );
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "GET" );
      expect( payload.url ).toEqual( `${globalBaseURL}/aims/v1/token_info` );
      expect( payload.headers['X-AIMS-Auth-Token'] ).toEqual( 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' );
    } );
  } );
  describe('when initiating a password reset', () => {
    it('should call post() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      const returnTo = 'https://console.alertlogic.net';
      const email = 'someone@somewhere.com';
      await aimsClient.initiateReset(email, returnTo);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "POST" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/reset_password` );
      expect( payload.data ).toEqual( { email, return_to: returnTo } );
    });
  });
  describe('when initiating a password reset with a token', () => {
    it('should call set() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      const token = 'xyz-123';
      const password = 'P@ssw0rd';
      await aimsClient.resetWithToken(token, password);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "PUT" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/reset_password/${token}` );
      expect( payload.data ).toEqual( { password } );
    });
  });
  describe('when creating a new role', () => {
    it('should call post() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      const name = 'RoleA';
      const permissions = { foo: 'bar' };
      await aimsClient.createRole(accountId, name, permissions);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "POST" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/roles` );
      expect( payload.data ).toEqual( { name, permissions } );
    });
  });
  describe('when deleting a role', () => {
    it('should call delete() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      const roleId = '00-22-xx-zz';
      await aimsClient.deleteRole(accountId, roleId);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "DELETE" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/roles/${roleId}` );
    });
  });
  describe('when retrieving a global role', () => {
    it('should call fetch() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      const roleId = '00-22-xx-zz';
      await aimsClient.getGlobalRole(roleId);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "GET" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/roles/${roleId}` );
    });
  });
  describe('when retrieving an account role', () => {
    it('should call fetch() on the AlDefaultClient instance with a correctly constructed payload', async() => {
      const roleId = '00-22-xx-zz';
      await aimsClient.getAccountRole(accountId, roleId);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "GET" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/roles/${roleId}` );
    });
  });
  describe('when retrieving all global roles', () => {
    it('should call fetch() on the AlDefaultClient instance to the roles endpoint', async() => {
      await aimsClient.getGlobalRoles();
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "GET" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/roles` );
    });
  });
  describe('when retrieving all account roles', () => {
    it('should call fetch() on the AlDefaultClient instance to the roles endpoint', async() => {
      await aimsClient.getAccountRoles(accountId);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "GET" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/roles` );
    });
  });
  describe('when updating the name and permissions of a role', () => {
    it('should call post() on the AlDefaultClient instance to the roles endpoint with a payload containing the name and permissions', async() => {
      const name = 'Mega Power User';
      const permissions = { '*:own:*:*': 'allowed', 'aims:own:grant:*':'allowed' };
      await aimsClient.updateRole(accountId, name, permissions);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "POST" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/roles` );
    });
  });
  describe('when updating the name of a role', () => {
    it('should call post() on the AlDefaultClient instance to the roles endpoint with a payload containing the name', async() => {
      const name = 'Mega Power User';
      await aimsClient.updateRoleName(accountId, name);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "POST" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/roles` );
      expect( payload.data ).toEqual( { name } );
    });
  });
  describe('when updating the permissions of a role', () => {
    it('should call post() on the AlDefaultClient instance to the roles endpoint with a payload containing the name', async() => {
      const permissions = { '*:own:*:*': 'allowed', 'aims:own:grant:*':'allowed' };
      await aimsClient.updateRolePermissions(accountId, permissions);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "POST" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/roles` );
      expect( payload.data ).toEqual( { permissions } );
    });
  });
  describe('when enrolling a users MFA device', () => {
    it('should call post() on the AlDefaultClient instance to the mfa endpoint with the supplied uri and codes', async() => {
      const uri = 'otpauth://totp/Alert%20Logic:admin@company.com?secret=GFZSA5CINFJSA4ZTNNZDG5BAKM2EMMZ7&issuer=Alert%20Logic&algorithm=SHA1';
      const codes = ['123456', '456789'];
      await aimsClient.enrollMFA(uri, "Some Token", codes);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "POST" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/user/mfa/enroll` );
      expect( payload.data ).toEqual( { mfa_uri: uri, mfa_codes: codes } );
    });
  });
  describe('when removing a users MFA device', () => {
    it('should call delete() on the AlDefaultClient instance to the mfa endpoint with the supplied email', async() => {
      const email = 'admin@company.com';
      await aimsClient.deleteMFA(email);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "DELETE" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/user/mfa/${email}` );
    });
  });
  describe('when retrieving user details', () => {
    it('should call fetch() on the AlDefaultClient instance to the users endpoint with any extra params supplied', async() => {
      const reqParams = { include_role_ids: true, include_user_credential: true };
      await aimsClient.getUserDetails(accountId, userId, reqParams);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "GET" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/users/${userId}` );
    });
  });
  describe('when retrieving users', () => {
    it('should call fetch() on the AlDefaultClient instance to the users endpoint with any extra params supplied', async() => {
      const reqParams = { include_role_ids: true, include_user_credential: true };
      await aimsClient.getUsers(accountId, reqParams);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "GET" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/users` );
    });
  });
  describe('when creating an access key', () => {
    it('should call post() on the AlDefaultClient instance to the access_keys endpoint with the label value supplied', async() => {
      const label = 'my-key';
      await aimsClient.createAccessKey(accountId, userId, label);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "POST" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/users/${userId}/access_keys` );
      expect( payload.data ).toEqual( { label } );
    });
  });
  describe('when updating an access key', () => {
    it('should call post() on the AlDefaultClient instance to the access_keys endpoint with the label value supplied', async() => {
      const label = 'my-key';
      const accessKeyId = '002211-22dddc';
      await aimsClient.updateAccessKey(accessKeyId, label);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "POST" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/access_keys/${accessKeyId}` );
      expect( payload.data ).toEqual( { label } );
    });
  });
  describe('when retrieving an access key', () => {
    it('should call fetch() on the AlDefaultClient instance to the access_keys endpoint for the supplied access key id value', async() => {
      const accessKeyId = '002211-22dddc';
      await aimsClient.getAccessKey(accessKeyId);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "GET" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/access_keys/${accessKeyId}` );
    });
  });
  describe('when retrieving all access keys for a user', () => {
    it('should call fetch() on the AlDefaultClient instance to the access_keys endpoint for the supplied user id value', async() => {
      await aimsClient.getAccessKeys(accountId, userId );
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "GET" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/users/${userId}/access_keys?out=full` );
    });
  });
  describe('when deleting an access key for a user', () => {
    it('should call delete() on the AlDefaultClient instance to the access_keys endpoint for the supplied user and access key id values', async() => {
      const accessKeyId = '002211-22dddc';
      await aimsClient.deleteAccessKey(accountId, userId, accessKeyId);
      expect(stub.mock.calls.length).toEqual(1);
      const payload = stub.mock.calls[0][0];
      expect( payload.method ).toEqual( "DELETE" );
      expect( payload.url ).toEqual( `${apiBaseURL}/aims/v1/${accountId}/users/${userId}/access_keys/${accessKeyId}` );
    });
  });
  describe( 'AIMSEnrollURI', () => {
      it("should be constructable", () => {
          let uri = new AIMSEnrollURI( "knielsen@alertlogic.com", "dunderMifflin1234" );
          let uriValue = uri.toString();
          expect( uriValue ).toEqual(`otpauth://totp/Alert%20Logic:knielsen@alertlogic.com?secret=dunderMifflin1234&issuer=Alert%20Logic&algorithm=SHA1` );
      } );
  } );
});
