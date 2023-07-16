/**
 * Module to deal with available Deployments Public API endpoints
 */
import {
    AlDefaultClient,
    AlLocation,
} from '@al/core';
import {
    WhiteListTag
} from './types';

export class AlwsWhitelistClientInstance {

    private serviceName = 'whitelist';
    private serviceVersion = 'v1';

    /* istanbul ignore next */
    constructor() { }

    async listTags(accountId: string, deploymentId: string): Promise<WhiteListTag[]> {
        return AlDefaultClient.get<WhiteListTag[]>({
            service_stack: AlLocation.InsightAPI,
            version: this.serviceVersion,
            service_name: this.serviceName,
            account_id: accountId,
            path: `/${deploymentId}`
        });
    }

    async addTag(accountId: string, deploymentId: string, tag: WhiteListTag): Promise<WhiteListTag> {
        return AlDefaultClient.post<WhiteListTag>({
            service_stack: AlLocation.InsightAPI,
            version: this.serviceVersion,
            service_name: this.serviceName,
            account_id: accountId,
            data: tag,
            path: `/${deploymentId}`
        });
    }

    async deleteTag(accountId: string, deploymentId: string, tag: WhiteListTag): Promise<void> {
        return AlDefaultClient.delete({
            service_stack: AlLocation.InsightAPI,
            version: this.serviceVersion,
            service_name: this.serviceName,
            account_id: accountId,
            data: tag,
            path: `/${deploymentId}`
        });
    }
}
