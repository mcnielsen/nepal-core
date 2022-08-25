import { ServiceClient } from "../types";
import { AlBaseServiceClient } from '../al-xhr-adapter';
import { AlLocation } from "../../common/navigation";
import { AlEntitlementCollection } from './types';

@ServiceClient( {
    service_name: "subscriptions",
    service_stack: AlLocation.GlobalAPI,
    version: 1
} )
export class AlsSubscriptions extends AlBaseServiceClient {

  private internalUser:boolean = false;

  constructor() {
      super();
  }

  /**
   * GET all Entitlements for an account
   * /subscriptions/v1/:account_id/entitlements
   * "https://api.global-integration.product.dev.alertlogic.com/subscriptions/v1/01000001/entitlements"
   */
  async getEntitlements( accountId:string, queryParams? ):Promise<AlEntitlementCollection> {
    const rawEntitlementData = await this.getRawEntitlements( accountId, queryParams );
    return AlEntitlementCollection.import( rawEntitlementData, this.internalUser );
  }

  /**
   * Get Entitlements
   * GET
   * /subscriptions/v1/:account_id/entitlements
   * "https://api.global-integration.product.dev.alertlogic.com/subscriptions/v1/01000001/entitlements"
   */
  async getRawEntitlements(accountId, queryParams?) {
    return this.get({
      account_id: accountId,
      path: '/entitlements',
      params: queryParams,
      ttl: 5 * 60 * 1000    /* 5 minute in-memory caching */
    });
  }

  /**
   * Get Entitlement

  /**
   * List Account Ids with a provided entitlement
   * GET
   * /subscriptions/v1/account_ids/entitlement/:product_family
   * "https://api.global-integration.product.dev.alertlogic.com/subscriptions/v1/account_ids/entitlement/log_manager"
   */
  async getAccountsByEntitlement(accountId, productFamily) {
    return this.get({
      account_id: accountId,
      path: `/entitlements/${productFamily}`
    });
  }

  /**
   * Create AWS subscriptions for the provided customer.
   * POST
   * /subscriptions/v1/:account_id/subscription/aws
   * https://api.global-integration.product.dev.alertlogic.com/subscriptions/v1/01000001/subscription/aws
   * -d '{"product_code":"ebbgj0o0g5cwo4**********",
   *      "aws_customer_identifier":"7vBT7cnzEYf",
   *      "status":"subscribe-success"}'
   */
  async createAWSSubscription(accountId, subscription) {
    return this.post( {
      service_stack: AlLocation.InsightAPI,
      account_id: accountId,
      path: '/subscription/aws',
      data: subscription,
    });
  }

  /**
   * Create full subscriptions
   * POST
   * /subscriptions/v1/:account_id/subscription
   * "https://api.global-integration.product.dev.alertlogic.com/subscriptions/v1/:account_id/subscription"
   * -d '{"active": true,
   *      "type": "manual",
   *      "entitlements":[
   *        {"product_family":"log_manager",
   *          "status": 'active|canceled|pending_activation',
   *          "end_date": Timestamp,
   *          "value_type": 'months', // Only allowed when product_family is ids_data_retention or log_data_retention
   *          "value": #Months, // Only allowed when product_family is ids_data_retention or log_data_retention}]
   *      }'
   */
  async createFullSubscription(accountId, entitlements) {
    const subscription = {
      entitlements,
      active: true,
      type: 'manual',
    };
    return this.post( {
      account_id: accountId,
      path: '/subscription',
      data: subscription,
    });
  }

  /**
   * Create standard subscriptions for the provided customer.
   * POST
   * /subscriptions/v1/:account_id/subscription/sync/standard
   * "https://api.global-integration.product.dev.alertlogic.com/subscriptions/v1/01000001/subscription/sync/standard"
   */
  async createStandardSubscription(accountId) {
    return this.post({
      account_id: accountId,
      path: '/subscription/sync/standard',
    });
  }

  /**
   * Get subscription
   * GET
   * /subscriptions/v1/:account_id/subscription/:subscription_id
   * "https://api.global-integration.product.dev.alertlogic.com/subscriptions/v1/01000001/subscription/AAB2A94F-2A2F-474E-BEFD-C387E595F153"
   */
  async getSubscription(accountId, subscriptionId) {
    return this.get( {
      account_id: accountId,
      path: `/subscription/${subscriptionId}`,
    });
  }

  /**
   * Get subscriptions
   * GET
   * /subscriptions/v1/:account_id/subscriptions
   * "https://api.global-integration.product.dev.alertlogic.com/subscriptions/v1/01000001/subscriptions"
   */
  async getSubscriptions(accountId) {
    return this.get( {
      account_id: accountId,
      path: '/subscriptions',
    });
  }

  /**
   * Update AWS subscription
   * PUT
   * /subscriptions/v1/:account_id/subscription/aws
   * "https://api.global-integration.product.dev.alertlogic.com/subscriptions/v1/01000001/subscription/aws"
   * -d '{"product_code":"ebbgj0o0g5cwo4**********",
   *      "status":"unsubscribe-success"}'
   */
  async updateAWSSubscription(accountId, subscription) {
    return this.put( {
      account_id: accountId,
      path: '/subscription/aws',
      data: subscription,
    });
  }

  public setInternalUser( internal:boolean ) {
    this.internalUser = internal;
  }
}
