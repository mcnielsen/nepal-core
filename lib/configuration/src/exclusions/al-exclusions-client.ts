import {
    AlDefaultClient,
    AlLocation
} from "@al/core";

import {
    ExclusionsRulesSnapshot,
    ExclusionsRulesDescriptor
} from "./types";

export class AlExclusionsClientInstance {
    protected serviceName = 'exclusions';
    protected serviceVersion = 'v1';

    constructor() {
    }

    /**
     * @remarks https://console.cloudinsight.alertlogic.com/api/exclusions/index.html#api-Exclusion_Rules-GetRules
     */
    async listRules(accountId: string, deploymentId: string, searchParams?: { [i: string]: string }): Promise<ExclusionsRulesSnapshot> {
        const rawData = await AlDefaultClient.get({
            service_stack: AlLocation.InsightAPI,
            version: this.serviceVersion,
            service_name: this.serviceName,
            account_id: accountId,
            path: `/${deploymentId}/rules`,
            params: searchParams
        });
        return ExclusionsRulesSnapshot.import(rawData);
    }

    /**
     * @remarks https://console.cloudinsight.alertlogic.com/api/exclusions/index.html#api-Exclusion_Rules-GetRule
     */
    async getRule(accountId: string, deploymentId: string, ruleId: string): Promise<ExclusionsRulesDescriptor> {
        const rawData = await AlDefaultClient.get({
            service_stack: AlLocation.InsightAPI,
            version: this.serviceVersion,
            service_name: this.serviceName,
            account_id: accountId,
            path: `/${deploymentId}/rules/${ruleId}`,
        });
        return ExclusionsRulesDescriptor.import(rawData);
    }

    /**
     * @remarks https://console.cloudinsight.alertlogic.com/api/exclusions/index.html#api-Exclusion_Rules-DeleteExclusionRule
     */
    async deleteRule(accountId: string, deploymentId: string, ruleId: string): Promise<void> {
        return AlDefaultClient.delete<void>({
            service_stack: AlLocation.InsightAPI,
            version: this.serviceVersion,
            service_name: this.serviceName,
            account_id: accountId,
            path: `/${deploymentId}/rules/${ruleId}`,
        });
    }

    /**
     * @remarks https://console.cloudinsight.alertlogic.com/api/exclusions/index.html#api-Exclusion_Rules-CreateExclusionRule
     */
    async createRule(accountId: string, deploymentId: string, data: ExclusionsRulesDescriptor): Promise<ExclusionsRulesDescriptor> {
        const rawData = AlDefaultClient.post({
            data,
            service_stack: AlLocation.InsightAPI,
            version: this.serviceVersion,
            service_name: this.serviceName,
            account_id: accountId,
            path: `/${deploymentId}/rules`,
        });
        return ExclusionsRulesDescriptor.import(rawData);
    }

    /**
     * @remarks https://console.cloudinsight.alertlogic.com/api/exclusions/index.html#api-Exclusion_Rules-UpdateExclusionRule
     */
    async updateRule(accountId: string, deploymentId: string, ruleId: string, data: ExclusionsRulesDescriptor): Promise<ExclusionsRulesDescriptor> {
        const rawData = AlDefaultClient.put({
            data,
            service_stack: AlLocation.InsightAPI,
            version: this.serviceVersion,
            service_name: this.serviceName,
            account_id: accountId,
            path: `/${deploymentId}/rules/${ruleId}`,
        });
        return ExclusionsRulesDescriptor.import(rawData);
    }

    /**
     * @remarks https://console.product.dev.alertlogic.com/api/exclusions/#api-Is_Asset_Excluded_API-ApplyExclusionRule
     */
    async isExcluded(accountId: string, deploymentId: string, assetType: string, assetKey: string,
                     feature: string = "scan", searchParams?: { [i: string]: string }): Promise<ExclusionsRulesDescriptor> {
        const rawData = await AlDefaultClient.get({
            service_stack: AlLocation.InsightAPI,
            version: 'v2',
            service_name: this.serviceName,
            account_id: accountId,
            path: `/${deploymentId}/is_excluded/${feature}/${assetType}/${assetKey}`,
            params: searchParams
        });
        return rawData? ExclusionsRulesDescriptor.import(rawData) : new ExclusionsRulesDescriptor();
    }

}
