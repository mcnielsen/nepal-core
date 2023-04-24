/**
 * Gestalt API client
 */
import {
    AlApiClient,
    AlCardstackCharacteristics,
    AlDefaultClient,
    AlLocation,
    APIRequestParams,
} from '@al/core';
import { AlGestaltNotificationsClientInterface } from './types/notifications/al-gestalt-notifications-client-interface';
import {
    AlAlertDefinition,
    AlGenericAlertOptions,
} from './types';

export class AlGestaltNotificationsClientInstance implements AlGestaltNotificationsClientInterface {

    protected serviceStack:string = AlLocation.GestaltAPI;
    protected serviceName:string = 'notifications';
    protected serviceVersion:string = 'v1';

    constructor( public client:AlApiClient = AlDefaultClient ) {
    }

    /**
     * Updates user's subscription in a given account, feature and subkey
     * GET
     * /notifications/v1/:account_id/options/incident
     * "https://gestalt-api.product.dev.alertlogic.com/notifications/v1/2/options/incident"
     *
     * @param accountId AIMS Account ID
     * @param entity
     * @returns a promise with the subscriptions
     */
    async getGenericAlertOptions(accountId: string, entity:string): Promise<AlGenericAlertOptions> {
        const result = await this.client.get({
            service_stack: this.serviceStack,
            service_name: this.serviceName,
            version: this.serviceVersion,
            path: `${accountId}/options/${entity}`
        });
        return result as AlGenericAlertOptions;
    }

    /**
     * get characteristics for an entity and an account
     * GET
     * /notifications/v1/:account_id/characteristics/incident
     * "https://gestalt-api.product.dev.alertlogic.com/notifications/v1/2/characteristics/incident"
     *
     * @param accountId AIMS Account ID
     * @param entity incident
     * @returns a promise with the subscriptions
     */
    async getNotificationsCharacteristics(accountId: string, entity:string): Promise<AlCardstackCharacteristics> {
        const result = await this.client.get({
            service_stack: this.serviceStack,
            service_name: this.serviceName,
            version: this.serviceVersion,
            path: `${accountId}/characteristics/${entity}`
        });
        return result as AlCardstackCharacteristics;
    }

    /**
     * get list for an entity and an account
     * GET
     * /notifications/v1/:account_id/list/incident
     * "https://gestalt-api.product.dev.alertlogic.com/notifications/v1/2/list/incident"
     *
     * @param accountId AIMS Account ID
     * @param entity incident
     * @returns a promise with the subscriptions
     */
    async getNotificationsList(accountId: string, entity:string, version:number = 0, params?:{sortField?:string, sortDirection?:string}): Promise<AlAlertDefinition[]> {
        const result = await this.client.get({
            service_stack: this.serviceStack,
            service_name: this.serviceName,
            version: this.serviceVersion,
            path: `${accountId}/list/${entity}`,
            params: {
                version: version
            }
        });
        return result as AlAlertDefinition[];
    }

    /**
     * deletes the browser cache for this GET request.
     * GET
     * /notifications/v1/:account_id/list/:entity
     * "https://gestalt-api.product.dev.alertlogic.com/notifications/v1/2/list/incident"
     *
     * @param accountId AIMS Account ID
     * @param entity Could be incident or schedule
     * @returns a promise
     */
    async deleteNotificationsListCache(accountId: string, entity:string): Promise<void> {
        const config: APIRequestParams = {
            service_stack: this.serviceStack,
            service_name: this.serviceName,
            version: this.serviceVersion,
            path: `${accountId}/list/${entity}`
        };
        return await this.client.flushCache( config );
    }

    /**
     * remove an entity
     * DELETE
     * /notifications/v1/:account_id/entity/:entityType
     * https://gestalt-api.product.dev.alertlogic.com/notifications/v1/2/entity/:entityType
     *
     * @param accountId AIMS Account ID
     * @param entity incident
     * @param ids list of ids to delete
     */
    deleteEntity(accountId: string, hierarchyType:string, ids: string[]): Promise<boolean> {
        const strIds = ids.join(',');
        return this.client.delete({
            service_stack: this.serviceStack,
            service_name: this.serviceName,
            version: this.serviceVersion,
            path: `${accountId}/entity/${hierarchyType}?ids=${strIds}`
        });
    }

}

