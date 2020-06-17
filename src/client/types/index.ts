import {
    AxiosRequestConfig,
    AxiosResponse,
    Method
} from 'axios';

/**
 * Describes an execution request with all details or verbose an tracking purposes.
 */
export interface APIExecutionLogItem {
    method?: Method;                 // Request Method.
    url?: string;                    // Request URL.
    responseCode?: number;           // Response Code.
    responseContentLength?: number;  // Response content length.
    durationMs?: number;             // Total time to send and receive request.
    errorMessage?: string;           // If something bad happens.
}

/**
 * Describes an execution request with all details or verbose an tracking purposes.
 */
export interface APIExecutionLogSummary {
    numberOfRequests?: number;  // Number of requests.
    totalRequestTime?: number;  // Total request time.
    totalBytes?: number;        // Total bytes.
}

/**
 * Describes a single request to be issued against an API.
 * Please notice that it extends the underlying AxiosRequestConfig interface,
 * whose properties are detailed in node_modules/axios/index.d.ts or at https://www.npmjs.com/package/axios#request-config.
 */
export interface APIRequestParams extends AxiosRequestConfig {
    /**
    * The following parameters are used to resolve the correct service location and request path.
    * The presence of `service_name` on a request triggers this process.
    */
    service_stack?:string;            //  Indicates which service stack the request should be issued to.  This should be one of the location identifiers in @al/common's AlLocation.
    service_name?: string;            //  Which service are we trying to talk to?
    residency?: string;               //  What residency domain do we prefer?  Defaults to 'default'.
    version?: string|number;          //  What version of the service do we want to talk to?
    account_id?: string;              //  Which account_id's data are we trying to access/modify through the service?
    context_account_id?:string;       //  If provided, uses the given account's endpoints/residency to determine service URLs _without_ adding the account ID to the request path.
    path?: string;                    //  What is the path of the specific command within the resolved service that we are trying to interact with?
    noEndpointsResolution?:boolean;   //  If set and truthy, endpoints resolution will *not* be used before the request is issued.
    aimsAuthHeader?:boolean;          //  If `true` AND the user is authenticated, forces the addition of the X-AIMS-Auth-Token header; if `false`, suppresses the header when it would ordinarily be added.
    rawResponse?:boolean;             //  If set and truthy, the entire response object (not just its data payload) will be emitted as the result of a successful request.

    /**
    * Should data fetched from this endpoint be cached?  0 ignores caching, non-zero values are treated as milliseconds to persist retrieved data in local memory.
    * If provided, `cacheKey` is used to identity unique and redundant/overlapping GET requests in place of a fully qualified URL.
    */
    ttl?: number|boolean;
    cacheKey?:string;
    disableCache?:boolean;
    /**
    *  Specifies an array of alternate cache keys to clear, in a call.
    *  Example: ["/entity/info/12345","https://api.allapis.com/service/v1/2534/data"]
    *           This will delete both GET requests from browser cache and
    *           local storage cache.
    */
    flushCacheKeys?:string[];

    /**
    * If automatic retry functionality is desired, specify the maximum number of retries and interval multiplier here.
    */
    retry_count?: number;             //  Maximum number of retries
    retry_interval?: number;          //  Delay between any two retries = attemptIndex * retryInterval, defaults to 1000ms

    curl?:boolean;                    //    Emit curl diagnostic output for this request

    /**
    * @deprecated If provided, populates Headers.Accept
    */
    accept_header?: string;

    /**
    * @deprecated If provided, is simply copied to axios' `responseType` property
    */
    response_type?: string;
}

export class AlMockAxiosResponse implements AxiosResponse<any> {
    public statusText:string = '';
    public headers:any = {};
    public config:AxiosRequestConfig;

    constructor( public status:number, public data:any ) {
    }
}
