import {
    RawAxiosRequestConfig,
    AxiosResponse,
    Method
} from 'axios';
import { AlLocation } from '../navigation';

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
 *
 * IMPORTANT NOTE ON ENDPOINT RESOLUTION (7.24.2020)
 *
 * The request properties `target_endpoint`, `service_stack`, `service_name`, `residency`, and `account_id`,
 * `context_account_id`, `noEndpointsResolution` are used in combination to determine how the base target URL
 * should be calculated, using the following basic rules:  If a `url` is specified explicitly or the user is not authenticated,
 * ALL of this logic will be ignored and the default endpoint values provided by AlLocatorService will be used instead.  Otherwise:
 *
 * - If `noEndpointsResolution` is set to true, endpoints resolution will be circumvented completely and AlLocatorService defaults
 *   will be used instead.
 *
 * - If `target_endpoint` is provided, that string will be used as the key of the service to resolve.  Otherwise, if `service_stack`
 *   references the Insight API stack and `service_name` is provided, then `service_name` will be used.  If neither of these
 *   conditions is met, resolution will be circumvented just as if `noEndpointsResolution` were `true`.
 *
 * - Endpoints will be resolved for `context_account_id` (if set), otherwise `account_id`, and in the absence of an explicitly
 *   indicated account, the active session's primary account ID (stored locally as `defaultAccountId`) will be used.
 *
 * - If residency is provided, it will override the residency associated with the active session's `activeDatacenter()`.
 *
 * The default behavior is influence by the default request values, which are
 *      `service_stack`: `true`
 *      `residency`: `default`
 */
export interface APIRequestParams {
    /**
     *  The following parameters are used to resolve the correct service location and request path.
     *  The presence of `service_name` on a request triggers this process.
     */

    //  Which endpoint should be resolved for this request?  See note about endpoint resolution above.
    target_endpoint?:string;

    //  Indicates which service stack the request should be issued to.  This should be one of the location identifiers in @al/common's AlLocation.
    service_stack?:string;

    //  Which service are we trying to talk to?
    service_name?: string;

    //  What residency domain do we prefer?  Defaults to 'default'.
    residency?: string;

    //  Does this endpoint need a specific prefix before service, version, and account are integrated?  Most services should not need this, only dumb ones.
    service_prefix?: string;

    //  What version of the service do we want to talk to?
    version?: string|number|null;

    //  Which account_id's data are we trying to access/modify through the service?
    account_id?: string;

    //  If provided, uses the given account's endpoints/residency to determine service URLs _without_ adding the account ID to the request path.
    context_account_id?:string;

    //  What is the path of the specific command within the resolved service that we are trying to interact with?
    path?: string;

    //  If set and truthy, endpoints resolution will *not* be used before the request is issued.
    noEndpointsResolution?:boolean;

    //  If `true` AND the user is authenticated, forces the addition of the X-AIMS-Auth-Token header; if `false`, suppresses the header when it would ordinarily be added.
    aimsAuthHeader?:boolean;

    //  If set and truthy, the entire response object (not just its data payload) will be emitted as the result of a successful request.
    rawResponse?:boolean;

    /**
     *  Should data fetched from this endpoint be cached?  0 ignores caching, non-zero values are treated as milliseconds to persist retrieved data in local memory.
     *  If provided, `cacheKey` is used to identity unique and redundant/overlapping GET requests in place of a fully qualified URL.
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
     *  If automatic retry functionality is desired, specify the maximum number of retries and interval multiplier here.
     */
    retry_count?: number;             //  Maximum number of retries
    retry_interval?: number;          //  Delay between any two retries = attemptIndex * retryInterval, defaults to 1000ms

    curl?:boolean;                    //  Emit curl diagnostic output for this request

    _owner?:any;
}

export type HybridRequestDescriptor = RawAxiosRequestConfig&APIRequestParams;

/**
 * This describes the shape of a semi-standard IWS error (although it is not used everywhere)
 */
export interface StandardErrorResponse extends HybridRequestDescriptor {
    data: {
        errorinfo?: {
            code:string;
            description:string;
            error_id:string;
        },
        message?:string
    };
}
