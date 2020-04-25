/**
 * A client for interacting with the Alert Logic Search Public API.
 */
import {
    ALClient,
    APIRequestParams,
} from "../client";

export interface AlSearchSubmitV2 {
    update_ts: number;
    status_details: string;
    start_ts: number;
    search_uuid: string;
    search_status: string;
    results: Array<AlLogMessageV2>;
}

export interface AlLogMessageV2 {
    id: AlLogMessageIdV2;
    fields: AlLogMessageFieldsV2;
}

export interface AlLogMessageIdV2 {
    msgid: string;
    aid: string;
    account: string;
}

export interface AlLogMessageFieldsV2 {
    time_recv: string;
    source_id: string;
    program: string;
    priority: string;
    pid: string;
    metadata: any[];
    message: string;
    ingest_id: string;
    host_name: string;
    header: string;
    facility: string;
}

export interface AlSearchGetV2 {
    search_status: string;
    status_details: string;
    details: AlSearchDetailsV2;
    progress?: number;
    remaining?: number;
    results?: AlSearchGetResultsV2;
    next_token?: string;
}

export interface AlSearchDetailsV2 {
    query: string;
    search_type: string;
    start_ts: number;
    update_ts: number;
    stats: AlSearchStatsV2;
}

export interface AlSearchStatsV2 {
    fetchers_executed: number;
    filtered_batches: number;
    filtered_bytes: number;
    filtered_compressed_bytes: number;
    filtered_records: number;
    filters_executed: number;
    filters_scheduled: number;
    input_scanned_bytes: number;
    input_scanned_packets: number;
    input_scanned_records: number;
    output_records: number;
    recurse_sorts: number;
    sort_recurse_time: number;
    sorts_executed: number;
}

export interface AlSearchGetResultsV2 {
    columns: Array<string>;
    records: Array<AlSearchResultRecordV2>;
}

export interface AlSearchResultRecordV2 {
    fields: Object;
    id: AlSearchResultRecordIdV2;
}

export interface AlSearchResultRecordIdV2 {
    account: number;
    aid: number;
    msgid: string;
    datatype: string;
}

export interface AlSearchResultsQueryParamsV2 {
    limit?: number;
    offset?: number;
    starting_token?: string;
}

export interface AlSearchStatusV2 {
    search_status: string;
    status_details: string;
    details: AlSearchDetailsV2;
}

export interface AlAdditionalSubmitParams {
    search_type?: string;
    dry_run?: string;
    start?: number;
    end?: number;
    timeframe?: number;
}

// Grammar related interfaces
export interface AlSearchSQLGrammarSpec {
    help: string;
    insertText: string;
    label: string;
}

export interface AlSearchSQLGrammar {
    [key: string]: {
        keywords: {
            [key: string]: {
                spec: AlSearchSQLGrammarSpec[]
            }
        }
    };
}

class AlSearchClientV2 {

    private serviceName = 'search';

    /**
     *  Submit the Search Text to be processed
     */
    async submit(searchQuery: string, accountId: string, additionalParams?: AlAdditionalSubmitParams): Promise<AlSearchSubmitV2> {
        const submitRequestArgs: APIRequestParams = {
            service_name: this.serviceName,
            version: 2,
            account_id: accountId,
            path: `/searches`,
            data: searchQuery,
            headers: {'Content-Type': 'text/plain'}
        };
        if (additionalParams) {
            submitRequestArgs.params = additionalParams;
        }
        const results = await ALClient.post(submitRequestArgs);

        return results as AlSearchSubmitV2;
    }

    /**
     *  Get the Search results based in the uuid, additional parameters are allowed
     */
    async get(accountId: string, uuid: string, additionalParams?: AlSearchResultsQueryParamsV2): Promise<AlSearchGetV2> {
        const fetchRequestArgs: APIRequestParams = {
            service_name: this.serviceName,
            version: 2,
            account_id: accountId,
            path: `/searches/${uuid}`
        };
        if (additionalParams) {
            fetchRequestArgs.params = additionalParams;
        }
        const results = await ALClient.get(fetchRequestArgs);

        return results as AlSearchGetV2;
    }

    /**
     *  Get the Search status information based in the search uuid
     *
     *
     * @param accountId   Customer ID
     * @param uuid        Search ID
     *
     * @return Observable<SearchStatusV2>
     */
    async status(accountId: string, uuid: string): Promise<AlSearchStatusV2> {
        const status = await ALClient.get({
            service_name: this.serviceName,
            version: 2,
            account_id: accountId,
            path: `/searches/${uuid}/status`,
            ttl: 0,
        });
        return status as AlSearchStatusV2;
    }

    /**
     *  Delete a currently executing search operation in the backend
     */
    async delete(accountId: string, uuid: string): Promise<any> {
        const response = await ALClient.delete({
            service_name: this.serviceName,
            version: 2,
            account_id: accountId,
            path: `/searches/${uuid}`,
        });
        return response;
    }

    /**
     *  Get expert mode search grammar
     */
    async getGrammar(): Promise<AlSearchSQLGrammar> {
        const grammar = await ALClient.get({
            service_name: this.serviceName,
            version: 2,
            path: `/grammar`,
        });
        return grammar as AlSearchSQLGrammar;
    }
}

export const alSearchClientV2 = new AlSearchClientV2();
