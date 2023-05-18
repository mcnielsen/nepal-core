
export interface AlEndpointDescriptor {
    method?:string;
    data?:any;                          //  Provided as a convenience
    debug?:boolean;
    credentialed?:boolean;

    configuration?:string;
    stack?:string;
    prefix?:string;
    service?:string;
    version?:string|number;
    residency?:string;
    accountId?:string;
    path?:string;
    
    contextualAccountId?:string;        //  used for endpoint resolution when accountId is not part of the path
    targetEndpoint?:string;             //  used for endpoint resolution when targetEndpoint is not indicated by a stack/service pair
    noAutoResolution?:boolean;          //  disables endpoint resolution where it would otherwise occur
    noDevImplementation?:boolean;       //  indicates there is no local development equivalent for an endpoint (e.g., magma authentication proxying)
    aimsAuthHeader?:boolean;            //  special cases where AIMS header should be suppressed even in an authenticated state
}

/**
 * Describes a network request
 */
export interface AlNetworkRequestDescriptor {
    method?:string;
    data?:any;
    debug?:boolean;
    credentialed?:boolean;
    url?:string;
    params?:{[parameterName:string]:string|number|boolean|undefined};
    headers?:{[headerName:string]:string};

    responseType?:"json"|"blob"|"arraybuffer"|"text";

    endpoint?: AlEndpointDescriptor;
}

/**
 * Abstract representation of a network response.
 */
export interface AlNetworkResponse<Type=any> {
    request:AlNetworkRequestDescriptor;
    status:number;
    statusText:string;
    headers:{[headerName:string]:string};
    data:Type;
}

/**
 * This request configuration format is provided for backwards compatibility.  Please don't use it anymore.
 */
export interface APIRequestParams {
    /**
     *  The following parameters are used to resolve the correct service location and request path.
     *  The presence of `service_name` on a request triggers this process.
     */
    url?: string;
    method?: string;
    baseURL?: string;
    headers?: any;
    params?: any;
    data?: any;
    withCredentials?: boolean;
    responseType?: "json"|"blob"|"arraybuffer"|"text";

    target_endpoint?:string;          //  Which endpoint should be resolved for this request?  See note about endpoint resolution above.
    service_stack?:string;            //  Indicates which service stack the request should be issued to.  This should be one of the location identifiers in @al/common's AlLocation.
    service_name?: string;            //  Which service are we trying to talk to?
    residency?: string;               //  What residency domain do we prefer?  Defaults to 'default'.
    service_prefix?: string;          //  Does this endpoint need a specific prefix before service, version, and account are integrated?  Most services should not need this, only dumb ones.
    version?: string|number|null;     //  What version of the service do we want to talk to?
    account_id?: string;              //  Which account_id's data are we trying to access/modify through the service?
    context_account_id?:string;       //  If provided, uses the given account's endpoints/residency to determine service URLs _without_ adding the account ID to the request path.

    path?: string;                    //  What is the path of the specific command within the resolved service that we are trying to interact with?
    noEndpointsResolution?:boolean;   //  If set and truthy, endpoints resolution will *not* be used before the request is issued.
    aimsAuthHeader?:boolean;          //  If `true` AND the user is authenticated, forces the addition of the X-AIMS-Auth-Token header; if `false`, suppresses the header when it would ordinarily be added.
    rawResponse?:boolean;             //  If set and truthy, the entire response object (not just its data payload) will be emitted as the result of a successful request.

    validation?: any;
    debug?: boolean;
}

export type ValidRequestSpecifier = AlEndpointDescriptor | AlNetworkRequestDescriptor | APIRequestParams;

export function isEndpointDescriptor( entity:any ):entity is AlEndpointDescriptor {
    return typeof( entity ) === 'object' 
            && ! ( 'url' in entity )
            && 
            (
                'service' in entity && typeof( entity.service ) === 'string' 
                || 'accountId' in entity && typeof( entity.service ) === 'string' 
                ||'path' in entity && typeof( entity.path ) === 'string'
            );
}

export function isResponse<Type=any>( instance:any ):instance is AlNetworkResponse<Type> {
    if ( instance.hasOwnProperty("status")
        && instance.hasOwnProperty('statusText')
        && instance.hasOwnProperty('headers' )
        && instance.hasOwnProperty( 'data' ) ) {
        return true;
    }
    return false;
}

export function isLegacyRequestConfig( config:any ):config is APIRequestParams {
    if ( ( 'service_name' in config || 'service_stack' in config ) && 'path' in config ) {
        return true;
    }
    return false;
}
