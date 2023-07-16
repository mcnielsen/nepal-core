import {
    AlDefaultClient,
    AlLocation
} from '@al/core';

import {
    AssetWriteDeclareAssetRequestBody,
    AssetWriteDeclareAssetResponse,
    AssetWriteDeletePropertiesRequestBody,
    AssetWriteDeletePropertiesResponse,
    AssetWriteNetworkRequestBody
} from './types';

export class AlAssetsWriteClientInstance {

    private readonly serviceName: string = 'assets_write';
    private readonly serviceVersion: string = 'v1';


    /* istanbul ignore next */
    constructor() {
    }

    /**
     * @remarks https://console.cloudinsight.alertlogic.com/api/assets_write/#api-Declare-CreateNetwork
     */
    async createNetwork(accountId: string,
        deploymentId: string,
        data: AssetWriteNetworkRequestBody): Promise<{ key: string }> {
        return AlDefaultClient.put({
            data,
            service_stack: AlLocation.InsightAPI,
            version: this.serviceVersion,
            service_name: this.serviceName,
            account_id: accountId,
            path: `/deployments/${deploymentId}/assets`,
        });
    }

    /**
     * DeclareModify - Declare Asset
     * DeclareModify - Remove Assets
     * DeclareModify - Remove Properties
     * @remarks https://console.cloudinsight.alertlogic.com/api/assets_write/#api-DeclareModify
     */
    async declareModifyAsset(accountId: string,
                             deploymentId: string,
                             data: AssetWriteDeclareAssetRequestBody | AssetWriteDeletePropertiesRequestBody ): Promise<AssetWriteDeclareAssetResponse> {
        return AlDefaultClient.put({
            data,
            service_stack: AlLocation.InsightAPI,
            version: this.serviceVersion,
            service_name: this.serviceName,
            account_id: accountId,
            path: `/deployments/${deploymentId}/assets`,
        });
    }
}
