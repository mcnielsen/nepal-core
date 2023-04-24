import { AlResponderExecutionsHistoryResultAggregations } from "@al/core/reporting";

export interface AlTriggerTimeRangeParams {
    startTime?: number;
    endTime?: number;
}

export interface AlTriggerTrends {
    triggers?: { [key: string]: string };
    aggregations?: AlResponderExecutionsHistoryResultAggregations;
}
