/**
 * Gestalt API client
 */
import {
    AlDefaultClient,
    AlLocation,
} from '@al/core';
import {
    AlTriggerTimeRangeParams,
    AlTriggerTrends
} from './types';

export class AlGestaltDashboardsClientInstance {

    protected serviceStack: string = AlLocation.GestaltAPI;
    protected serviceName: string = 'dashboards';
    protected serviceVersion: string = 'v1';

    constructor() {
    }

    /**
     * get triggers trends and the trigger ids
     * GET
     * /dashboard/v1/:account_id/automated_response/trigger_trends
     * "https://gestalt-api.product.dev.alertlogic.com/dashboard/v1/:account_id/automated_response/trigger_trends"
     *
     * @param accountId AIMS Account ID
     * @param timeRange start and end time
     * @returns a promise with the trigger trends and triggers involved
     */
    async getTriggersTrends(accountId: string, params?: AlTriggerTimeRangeParams): Promise<AlTriggerTrends[]> {
        return AlDefaultClient.get({
            service_stack: this.serviceStack,
            service_name: this.serviceName,
            version: this.serviceVersion,
            params: params,
            path: `${accountId}/automated_response/trigger_trends`
        });
    }

}
