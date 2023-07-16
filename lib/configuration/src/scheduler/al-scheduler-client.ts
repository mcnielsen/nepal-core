/**
 * Module to deal with available Sources Public API endpoints
 */
import { AlDefaultClient } from '@al/core';
import {
    ScanStatusSummary,
    ScanTarget
} from './types';

export class AlSchedulerClientInstance {

    private serviceName = 'scheduler';
    private serviceVersion: number = 1;
    /* istanbul ignore next */
    constructor() {
    }

    async getScanStatusSummary(accountId: string, deploymentId: string, queryParams?: {vpc_key: string}): Promise<ScanStatusSummary> {
        const summary = await AlDefaultClient.get({
            service_name: this.serviceName,
            account_id: accountId,
            path: `${deploymentId}/summary`,
            params: queryParams,
            version: 1
        });
        return summary as ScanStatusSummary;
    }

    async getScanTargets(accountId: string, deploymentId: string): Promise<ScanTarget[]> {
        const response = await AlDefaultClient.get({
            service_name: this.serviceName,
            account_id: accountId,
            path: `${deploymentId}/targets`,
            version: this.serviceVersion
        });
        return (response?.targets ?? []) as ScanTarget[];
    }

    async scanAsset(accountId: string, deploymentId: string, assetKey: string, force: boolean = false): Promise<void> {
        return await AlDefaultClient.put({
            service_name: this.serviceName,
            account_id: accountId,
            path: `${deploymentId}/scan`,
            params: {asset: assetKey, force: force},
            version: this.serviceVersion
        });
    }

}
