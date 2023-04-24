import {
    AlClient,
    AlLocation, 
    AlEntitlementCollection, 
} from "../common";
import { AlExecutionContext } from '../context';
import { AlBaseAPIClient } from '../client';

@AlClient( {
    name: "subscriptions",
    version: 1,
    configurations: {
        default: {
            stack: AlLocation.GlobalAPI,
            service: "subscriptions",
            version: 1,
        }
    }
} )
export class Subscriptions extends AlBaseAPIClient {

    private internalUser:boolean = false;

    constructor() {
        super();
    }

  /**
   * GET all Entitlements for an account
   * GET /subscriptions/v1/:account_id/entitlements
   */
    async getEntitlements( accountId:string, queryParams? ):Promise<AlEntitlementCollection> {
        const rawEntitlementData = await this.getRawEntitlements( accountId, queryParams );
        return AlEntitlementCollection.import( rawEntitlementData, this.internalUser );
    }

  /**
   * Get Entitlements
   * GET /subscriptions/v1/:account_id/entitlements
   */
    async getRawEntitlements(accountId, queryParams?) {
        return this.get( { accountId, path: '/entitlements', debug: true }, queryParams );
    }

  /**
   * Get Entitlement

  /**
   * List Account Ids with a provided entitlement
   * GET /subscriptions/v1/account_ids/entitlement/:product_family
   */
    async getAccountsByEntitlement(accountId, productFamily) {
        return this.get( { accountId, path: `/entitlements/${productFamily}` } );
    }

  /**
   * Create AWS subscriptions for the provided customer.
   * POST /subscriptions/v1/:account_id/subscription/aws
   */
    async createAWSSubscription(accountId, subscription) {
        return this.post( { accountId, path: `/subscription/aws`, data: subscription } );
    }

  /**
   * Create full subscriptions
   * POST /subscriptions/v1/:account_id/subscription
   */
    async createFullSubscription(accountId, entitlements) {
        const subscription = {
            entitlements,
            active: true,
            type: 'manual',
        };
        return this.post( { accountId, path: '/subscription' }, subscription );
    }

  /**
   * Create standard subscriptions for the provided customer.
   * POST /subscriptions/v1/:account_id/subscription/sync/standard
   */
    async createStandardSubscription(accountId) {
        return this.post({ accountId, path: '/subscription/sync/standard' } );      //  who needs data
    }

  /**
   * Get subscription
   * GET /subscriptions/v1/:account_id/subscription/:subscription_id
   */
    async getSubscription(accountId, subscriptionId) {
        return this.get( { accountId, path: `/subscription/${subscriptionId}` } );
    }

  /**
   * Get subscriptions
   * GET
   * /subscriptions/v1/:account_id/subscriptions
   * "https://api.global-integration.product.dev.alertlogic.com/subscriptions/v1/01000001/subscriptions"
   */
    async getSubscriptions(accountId) {
        return this.get( { accountId, path: '/subscriptions' } );
    }

  /**
   * Update AWS subscription
   * PUT /subscriptions/v1/:account_id/subscription/aws
   */
    async updateAWSSubscription(accountId, subscription) {
        return this.put( { accountId, path: '/subscription/aws' }, subscription );
    }

    public setInternalUser( internal:boolean ) {
        this.internalUser = internal;
    }
}
