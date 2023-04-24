/**
 * Module to deal with available AIMS Public API endpoints
 */

import {
    AlLocation,
    AIMSAccessKey,
    AIMSAccount,
    AIMSAuthenticationTokenInfo,
    AIMSOrganization,
    AIMSRole,
    AIMSSessionDescriptor,
    AIMSTopology,
    AIMSUser,
    AIMSUserDetails,
    AlClient,
} from '../common';
import { AlExecutionContext } from '../context';
import { AlBaseAPIClient } from '../client';

@AlClient( {
    name: "aims",
    version: 1,
    configurations: {
        default: {
            stack: AlLocation.InsightAPI,
            service: "aims",
            version: 1
        },
        global: {
            stack: AlLocation.GlobalAPI,
            service: "aims",
            version: 1,
            noAutoResolution: true
        }
    }
} )
export class AIMS extends AlBaseAPIClient {

  constructor() {
      super();
  }

  /**
   * Create a user
   * POST /aims/v1/:account_id/users?one_time_password=:one_time_password
   */
    async createUser(accountId: string, name: string, email: string, mobilePhone: string) {
        return this.post<AIMSUser>( {
                                        accountId: accountId,
                                        path: '/users',
                                    }, 
                                    { 
                                        name,
                                        email, 
                                        mobile_phone: mobilePhone
                                    } );
    }

  /**
   * Create a user with details
   * POST /aims/v1/:account_id/users
   */
    async createUserWithDetails( accountId: string, userDetails:AIMSUserDetails ) {
        return this.post<AIMSUser>( {
                                        accountId: accountId,
                                        path: '/users',
                                    }, 
                                    userDetails );
    }

  /**
   * Update user details
   * POST /aims/v1/:account_id/users/:user_id
   */
    async updateUserDetails(accountId: string, userId: string, data:AIMSUserDetails):Promise<AIMSUser> {
        return this.post<AIMSUser>( {
                                        accountId: accountId,
                                        path: `/users/${userId}`,
                                    },
                                    data );
    }

  /**
   * Delete a user
   * DELETE /aims/v1/:account_id/users/:user_id
   */
    async deleteUser(accountId: string, userId: string) {
        return this.delete( { accountId: accountId, path: `/users/${userId}` } );
    }

  /**
   * Get user details
   * GET /aims/v1/:account_id/users/:user_id
   */
    async getUserDetailsById(accountId: string, userId: string) {
        return this.get<AIMSUser>( { accountId: accountId, path: `/users/${userId}` } );
    }

    async getUserDetailsByUserId(userId: string) {
        return this.get<AIMSUser>( { path: `/user/${userId}` } );
    } 

  /**
   * Get user permissions
   * GET /aims/v1/:account_id/users/:user_id/permissions
   */
    async getUserPermissions(accountId: string, userId: string):Promise<unknown> {
        return this.get( { accountId: accountId, path: `/users/${userId}/permissions` } );
    }

  /**
   * Get Account Details
   * GET /aims/v1/:account_id/account
   */
    async getAccountDetails(accountId: string) {
        return this.get<AIMSAccount>( { accountId: accountId, path: '/account' } );
    }

  /**
   * List account IDs, by relationship can be managing, managed and bills_to
   * GET /aims/v1/:account_id/account_ids/:relationship
   */
    async getAccountIdsByRelationship(accountId: string, relationship: string, queryParams?:any ):Promise<string[]> {
        const payload = await this.get<any>( { accountId: accountId, path: `/account_ids/${relationship}` }, queryParams );
        return payload.account_ids;
    }

  /**
   * List accounts, by relationship can be managing, managed and bills_to
   * GET /aims/v1/:account_id/accounts/:relationship
   */
    async getAccountsByRelationship(accountId: string, relationship: string, queryParams?):Promise<AIMSAccount[]> {
        const payload = await this.get<any>({ accountId, path: `/accounts/${relationship}`}, queryParams );
        return payload.accounts as AIMSAccount[];
    }

  /**
   *  Retrieve a union of user records corresponding to a managed relationship hierarchy between two accounts.
   *  This is a placeholder for a better implementation based on a relationship topology endpoint from AIMS.0
   *  @deprecated use getAccountsIdsByRelationship in conjunction with getUsersFromAccounts
   */
    async getUsersFromManagedRelationship( leafAccountId:string, terminalAccountId?:string, failOnError:boolean = true ):Promise<AIMSUser[]> {
        let users = await this.getUsers( leafAccountId, { include_role_ids: false, include_user_credential: false } );
        try {
            let managing = await this.getAccountsByRelationship( leafAccountId, "managing" );
            if ( managing.length > 0 ) {
                managing.sort( ( a, b ) => parseInt( b.id, 10 ) - parseInt( a.id, 10 ) );               //  this is gross hackery.  Kevin did not implement this.  Tell no-one of what you've seen!
                let parentUsers = await this.getUsersFromManagedRelationship( managing[0].id, terminalAccountId );
                if ( Array.isArray( parentUsers ) ) {
                    users = users.concat( parentUsers );
                }
            }
        } catch( e ) {
            if ( failOnError ) {
                throw e;
            }
        }
        return users;
    }

  /**
   * Update account MFA requirements
   * POST /aims/v1/:account_id/account
   */
    async requireMFA(accountId: string, mfaRequired: boolean):Promise<AIMSAccount> {
        return this.post<AIMSAccount>( { accountId: accountId, path: '/account' },
                                       { mfa_required: mfaRequired } );
    }

  /**
   * Update account session idle expiration
   * POST /aims/v1/:account_id/account
   */
    async setAccountIdleThreshold( accountId:string, seconds:number|null ) {
        await this.post( { accountId: accountId, path: '/account' }, 
                         { idle_session_timeout: seconds } );
    }

  /**
   * Change a user's password
   * POST /aims/v1/change_password
   */
    async changePassword(email: string, password: string, newPassword: string) {
        await this.post( { path: '/change_password' }, 
                         { email, current_password: password, new_password: newPassword } );
    }

  /**
   * Obtain Authentication Token Information for a specific access token
   * GET /aims/v1/token_info
   */
    public async getTokenInfo( accessToken:string ):Promise<AIMSAuthenticationTokenInfo> {
        return this.get<AIMSAuthenticationTokenInfo>( {
            endpoint: {
                configuration: "global",
                noAutoResolution: true,
                path: '/token_info',
            },
            headers: {
                'X-AIMS-Auth-Token': accessToken
            },
        } );
    }

  /**
   * Initiate the password reset process for a user
   * POST /aims/v1/reset_password
   */
    async initiateReset(email: string, returnTo: string) {
        return this.post( { path: '/reset_password' }, { email, return_to: returnTo } );
    }

  /**
   * Reset a user's password using a token
   * PUT /aims/v1/reset_password/:token
   */
    async resetWithToken(token: string, password: string) {
        return this.put( { path: `/reset_password/${token}` }, { password } );
    }

  /**
   * Create a role
   * POST /aims/v1/:account_id/roles
   */
    async createRole(accountId: string, name: string, permissions) {
        return this.post( { accountId: accountId, path: '/roles' },
                          { name, permissions } );
    }

  /**
   * Delete a role
   * DELETE /aims/v1/:account_id/roles/:role_id
   */
    async deleteRole(accountId: string, roleId: string) {
        return this.delete( { accountId: accountId, path: `/roles/${roleId}` } );
    }

  /**
   * Grant a role
   * PUT /aims/v1/:account_id/users/:user_id/roles/:role_id
   */
    async grantRole(accountId:string, userId:string, roleId:string) {
        return this.put( { accountId, path: `/users/${userId}/roles/${roleId}` } );
    }

  /**
   * Revoke a role
   * DELETE /aims/v1/:account_id/users/:user_id/roles/:role_id
   */
    async revokeRole(accountId:string, userId:string, roleId:string) {
        return this.delete({ accountId: accountId, path: `/users/${userId}/roles/${roleId}` });
    }

  /**
   * Get global role, a role that is shared among accounts.
   * GET /aims/v1/roles/:role_id
   */
    async getGlobalRole(roleId: string) {
        return this.get({ path: `/roles/${roleId}`});
    }

  /**
   * Get role
   * GET /aims/v1/:account_id/roles/:role_id
   */
    async getAccountRole(accountId: string, roleId: string) {
        return this.get({ accountId: accountId, path: `/roles/${roleId}` });
    }

  /**
   * Get assigned roles
   * GET /aims/v1/:account_id/users/:user_id/roles
   */
    async getAssignedRoles( accountId:string, userId:string ):Promise<AIMSRole[]> {
        const payload = await this.get<any>({ accountId: accountId, path: `/users/${userId}/roles` } );
        return payload.roles;
    }

  /**
   * List global roles, roles that are shared among all accounts.
   * GET /aims/v1/roles
   */
    async getGlobalRoles():Promise<AIMSRole[]> {
        const payload = await this.get<any>( { path: '/roles' } );
        return payload.roles as AIMSRole[];
    }

  /**
   * List roles for an account. Global roles are included in the list.
   * GET /aims/v1/:account_id/roles
   */
    async getAccountRoles(accountId: string):Promise<AIMSRole[]> {
        const payload = await this.get<any>( { accountId: accountId, path: '/roles' } );
        return payload.roles as AIMSRole[];
    }

  /**
   * Update Role Name and Permissions
   * POST /aims/v1/:account_id/roles/:role_id
   */
    async updateRole(accountId: string, name: string, permissions) {
        return this.post( { accountId: accountId, path: '/roles' },
                          { name, permissions } );
    }

  /**
   * Update Role Name
   * POST /aims/v1/:account_id/roles/:role_id
   */
    async updateRoleName(accountId: string, name: string) {
        return this.post( { accountId: accountId, path: '/roles' },
                          { name } );
    }

  /**
   * Update Role Permissions
   * POST /aims/v1/:account_id/roles/:role_id
   */
    async updateRolePermissions(accountId: string, permissions) {
        return await this.post<AIMSRole>( { accountId: accountId, path: '/roles' }, 
                                          { permissions } );
    }

  /**
   * Enroll an MFA device for a user
   * POST /aims/v1/user/mfa/enroll
   */
    async enrollMFA( uri: string, sessionToken:string, codes:string[] ) {
        return this.post( {
            endpoint: {
                path: '/user/mfa/enroll',
                noAutoResolution: true,
            },
            data: { 
                mfa_uri: uri, 
                mfa_codes: codes 
            },
            headers: {
              'X-AIMS-Session-Token': sessionToken
            }
        } );
    }

  /**
   * Enroll an MFA device for a user (when no AIMS token available).
   * POST /aims/v1/user/mfa/enroll
   */
    async enrollMFAWithoutAIMSToken(mfaUriString:string, codes:string[], email:string, password:string ) {
        return this.post( {
            endpoint: {
                path: '/user/mfa/enroll',
                noAutoResolution: true,
            },
            data: {
                mfa_uri: mfaUriString,
                email: email,
                password: password,
                mfa_codes: codes
            }
        } );
    }

  /**
   * Remove a user's MFA device
   * DELETE /aims/v1/user/mfa/:email
   */
    async deleteMFA(email: string) {
        return this.delete( { path: `/user/mfa/${email}` });
    }

    async getUserDetails(accountId: string, userId: string, queryParams?: {include_role_ids?: boolean, include_user_credential?: boolean}) {
        return this.get<AIMSUser>( { accountId: accountId, path: `/users/${userId}` }, queryParams );
    }

  /**
   * List Users
   * GET /aims/v1/:account_id/users
   */
    async getUsers( accountId: string,
                    queryParams?: {include_role_ids?: boolean, include_user_credential?: boolean} ):Promise<AIMSUser[]> {
        const payload = await this.get<any>( { accountId: accountId, path: '/users' }, queryParams );
        return payload.users as AIMSUser[];
    }

  /**
   * Create Access Key
   * POST /aims/v1/:account_id/users/:user_id/access_keys
   */
    async createAccessKey(accountId: string, userId: string, label: string) {
        return this.post<AIMSAccessKey>( { accountId: accountId, path: `/users/${userId}/access_keys` }, { label } );
    }

  /**
   * Update Access Key
   * POST /aims/v1/access_keys/:access_key_id
   */
    async updateAccessKey(accessKeyId: string, label: string) {
        return this.post<AIMSAccessKey>( { path: `/access_keys/${accessKeyId}` }, { label } );
    }

  /**
   * Get Access Key
   * GET /aims/v1/access_keys/:access_key_id
   */
    async getAccessKey(accessKeyId: string) {
        return this.get<AIMSAccessKey>( { path: `/access_keys/${accessKeyId}` } );
    }

  /**
   * List Access Keys
   * GET /aims/v1/:account_id/users/:user_id/access_keys?out=:out
   */
    async getAccessKeys(accountId: string, userId: string, ttl: number = 60000) {
        const payload = await this.get<any>( { accountId: accountId, path: `/users/${userId}/access_keys?out=full` } );
        return payload.access_keys as AIMSAccessKey[];
    }

  /**
   * Delete Access Key
   * DELETE /aims/v1/:account_id/users/:user_id/access_keys/:access_key_id
   */
    async deleteAccessKey(accountId: string, userId: string, accessKeyId: string) {
        return this.delete( { accountId: accountId, path: `/users/${userId}/access_keys/${accessKeyId}`} );
    }

  /**
   * Retrieve linked organization
   */
    async getAccountOrganization( accountId:string ):Promise<AIMSOrganization> {
        return this.get<AIMSOrganization>( { accountId: accountId, path: '/organization' } );
    }

  /**
   * This endpoint render's an accounts related accounts topologically by adding a :relationship field to the account object,
   * which contains an array of accounts that are directly related to it.
   * GET /aims/v1/:account_id/accounts/:relationship/topology
   * @param accountId {string}
   * @param relationship {'managed' | 'managing'}
   * @param queryParms {Object}
   */
    async getAccountRelationshipTopology(accountId: string, relationship: 'managed' | 'managing', queryParams?:any): Promise<AIMSTopology> {
        const payload = await this.get<any>( { accountId: accountId, path: `/accounts/${relationship}/topology`}, queryParams );
        return payload.topology as AIMSTopology;
    }

  /**
   * Returns the ids of the accounts to which an account is related.
   * The related accounts that are returned depend oonf the :relationship param.
   * If using a "managed" relationship, this returns all accounts that the current account manages.
   * If using a "managing" relationship, this returns all accounts that managing the current account.
   * @param accountId {string}
   * @param relationship {'managed' | 'managing'}
   * @param addCurrentId {boolean} [addCurrentId=true] true if wants add the current id to the return
   */
    async getAccountsIdsByRelationship(accountId: string, relationship: 'managed' | 'managing', addCurrentId: boolean = true): Promise<string[]> {
        const topology = await this.getAccountRelationshipTopology(accountId, relationship);

        function getIds(accounts: AIMSTopology[]): string[] {
            return accounts.flatMap(a => [a.id, ...getIds(Array.isArray(a[relationship]) ? a[relationship] : [])]);
        }
        const first = addCurrentId ? [accountId] : [];
        return [...first, ...getIds(topology[relationship])];
    }

  /**
   * Returns all users associated with a list of accounts
   * @param accountList {string[]}
   */
    async getUsersFromAccounts(accountList: string[]): Promise<AIMSUser[]> {
        return (await Promise.all(
            accountList.map(account => this.getUsers(account, { include_role_ids: false, include_user_credential: false }))
        )).flat();
    }
}
