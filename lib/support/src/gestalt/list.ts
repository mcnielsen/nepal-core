import {
    ALCargoV2,
    ScheduledReportV2,
} from "@al/core/reporting";
import { AlBadRequestError } from '@al/core';
import {
    AlHeraldAccountSubscriptionV2,
    AlHeraldClientV2,
    AlHeraldSubscriptionsQueryV2,
} from "@al/core/reporting";
import orderBy from 'lodash-es/orderBy';
import { AlGenericAlertDefinition } from './types/index';
import { CharacteristicsUtility } from './characteristics-utility';

export interface SortParams {
    sortField?: string;
    sortDirection?: string;
}

export class ListHandler {

    constructor(
        private accountId: string,
        private entityType?: string,
        private params?:SortParams,
    ) {
    }

    static handle(accountId: string, entityType: string, params?:SortParams) {
        const list = new ListHandler(accountId, entityType, params);
        return list.handleInternal();
    }

    private handleInternal(): Promise<AlGenericAlertDefinition[]> {
        switch (this.entityType) {
            case 'incident':
                return this.alertList('incidents/alerts');
            case 'manage_alerts':
                return this.alertList()
                    .then( list => list.filter( item => [ "incidents/alerts", "observations/notification","health/alerts" ].includes( item.type.notificationType ) ) );
            case 'scheduled_report':
                return this.scheduledReportList(['tableau']);
            case 'manage_scheduled':
                return CharacteristicsUtility.validateEntitlement(this.accountId, `detect|respond`).then((fimAllowed:boolean)=>{
                    if(fimAllowed){
                        return this.scheduledReportList(['tableau', 'search']);
                    }else{
                        return this.scheduledReportList(['tableau']);
                    }
                });
            default:
                throw new AlBadRequestError(`The parameter 'entityType' is not implemented yet, ${this.entityType}`, 'path', 'entityType');
        }
    }

    private async alertList(notificationType?:string): Promise<AlGenericAlertDefinition[]> {
        const params:AlHeraldSubscriptionsQueryV2 = { include_subscribers: true };
        if (notificationType) {
            params.notification_type = notificationType;
        }
        const subscriptionsResult = await AlHeraldClientV2.getAllSubscriptionsByAccount(this.accountId, params);
        let mapped = subscriptionsResult.map((item: AlHeraldAccountSubscriptionV2) => AlGenericAlertDefinition.fromSubscription( item ) );

        if (this.params?.sortField){
            const field = this.params.sortField as string;
            let dir: 'asc'|'desc' = 'asc';
            if (this.params.sortDirection?.toLowerCase() === 'asc') {
                dir = 'asc';
            } else if (this.params.sortDirection?.toLowerCase() === 'desc'){
                dir = 'desc';
            }
            mapped = orderBy(mapped, ((x)=> (x.properties as any)[field]), [dir]);
        }

        return mapped;
    }

    private async scheduledReportList(type?:string[]): Promise<AlGenericAlertDefinition[]> {

        let cargoRequests = [];
        let heraldRequests = [];
        if (type && type.indexOf('tableau') !== -1) {
            const filterType = 'tableau';
            const heraldParams: AlHeraldSubscriptionsQueryV2 = {include_subscribers: true};
            heraldParams.notification_type = 'tableau/notifications';
            cargoRequests.push(ALCargoV2.getAllSchedules(this.accountId, filterType));
            heraldRequests.push(AlHeraldClientV2.getAllSubscriptionsByAccount(this.accountId, heraldParams));
        }
        if (type && type.indexOf('search') !== -1){
            const filterType = 'search_v2';
            const heraldParams: AlHeraldSubscriptionsQueryV2 = {include_subscribers: true};
            heraldParams.notification_type = 'search/notifications';
            cargoRequests.push(ALCargoV2.getAllSchedules(this.accountId, filterType));
            heraldRequests.push(AlHeraldClientV2.getAllSubscriptionsByAccount(this.accountId, heraldParams));
        }

        const scheduledResult = await Promise.all(cargoRequests).then((results) => {
            let combined:ScheduledReportV2[] = [];
            results.map((result)=>{
                combined.push(...result.schedules);
            });
            return combined;
        });

        const subscriptionsResult = await Promise.all(heraldRequests).then(results => {
            const combined = results.reduce((acc, result) => {
                return acc.concat(result);
            });
            return combined;
        });
        // create a dictionary with the herald results
        const heraldDict = subscriptionsResult.reduce((obj, item: AlHeraldAccountSubscriptionV2) => {
            if (item.external_id) {
                obj[item.external_id] = item;
            }
            return obj;
        }, {} as { [i: string]: AlHeraldAccountSubscriptionV2 });

        return scheduledResult.map((item: ScheduledReportV2) => {
            const report = AlGenericAlertDefinition.fromSchedule( item );
            if (report.id && heraldDict.hasOwnProperty(report.id)) {
                report.mergeSubscription(heraldDict[report.id]);
                return report;
            } else {
                return null;
            }
        }).filter( i => i !== null ) as AlGenericAlertDefinition[];
    }
}
