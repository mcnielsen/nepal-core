import { 
    AlContextProvider, 
    ConfigOption,
    AlTrigger, AlTriggeredEvent,
    AlBaseError,
    AlLocation,
    AlEndpointDescriptor, 
    AlNetworkRequestDescriptor, 
    APIRequestParams,
    ValidRequestSpecifier,
    AlNetworkResponse,
    AlClientDefinition,
    AlAbstractClient,
    AlClient,
    AlMutex,
    getJsonPath,
    setJsonPath,
} from '../common';
        
/**
 *  A dictionary of resolved endpoints, keyed by environment, account, service, and residency.
 *  Residency may be US, EMEA, or default (which corresponds with the legacy "infer from primary account's default location" logic.
 */
type AlEndpointsDictionary = {
  [environment:string]: {
    [accountId:string]: {
      [serviceId:string]: {
        [residency:string]: string;
      };
    }
  }
};

/**
 * Base class for Alert Logic API clients.
 */
export class AlBaseAPIClient extends AlAbstractClient {

    /**
     * The following list of services are the ones whose endpoints will be resolved by default.  Added globally/commonly used services here for optimized API performance.
     */
    protected static defaultServiceList = [ "aims", "subscriptions", "search", "sources", "assets_query", "assets_write", "dashboards", "suggestions", "connectors", "herald" ];
    /**
     * The following list of services are the ones whose endpoints will need to be determined for the current context active residency location.
     */
    protected static resolveByResidencyServiceList = [ "iris", "kalm", "ticketmaster", "tacoma", "responder", "responder-async", "cargo" ];

    /** 
     * List of api stacks that should utilize "automatic" endpoints resolution by default 
     */
    protected static endpointsStackWhitelist = [ AlLocation.InsightAPI, AlLocation.MDRAPI ];

    protected static endpointsGuard =   new AlMutex();
    protected static defaultResidency = 'default';

    public context:AlContextProvider;

    constructor() {
        super();
    }

    public static isEndpointDescriptor( entity:any ):entity is AlEndpointDescriptor {
        return typeof( entity ) === 'object' 
                && ! ( 'url' in entity )
                && 
                (
                    'service' in entity && typeof( entity.service ) === 'string' 
                    || 'accountId' in entity && typeof( entity.service ) === 'string' 
                    ||'path' in entity && typeof( entity.path ) === 'string'
                );
    }

    public static isResponse<Type=any>( instance:any ):instance is AlNetworkResponse<Type> {
        if ( instance.hasOwnProperty("status")
            && instance.hasOwnProperty('statusText')
            && instance.hasOwnProperty('headers' )
            && instance.hasOwnProperty( 'data' ) ) {
            return true;
        }
        return false;
    }

    public static isLegacyRequestConfig( config:any ):config is APIRequestParams {
        if ( ( 'service_name' in config || 'service_stack' in config ) && 'path' in config ) {
            return true;
        }
        return false;
    }

    get endpointCache():AlEndpointsDictionary {
        return this.context.getDataItem<AlEndpointsDictionary>( "endpointCache", {} );
    }

    public async normalize( config:ValidRequestSpecifier, method?:string, data?:any, queryParams?:{[param:string]:string|number|boolean|null} ):Promise<AlNetworkRequestDescriptor> {
        if ( AlBaseAPIClient.isEndpointDescriptor( config ) ) {
            return await this.normalizeRequest( method || "GET", config, data, queryParams );
        } else {
            return await this.normalizeRequest( config.method || "GET", config, data || config.data, queryParams || config.params );
        }
    }

    /**
     * Resolves accumulated endpoints data for the given account.
     *
     * Update Feb 2021
     * ---------------
     * This has been overhauled to deal with services whose endpoints now must be determined for the current context residency (selected datacenter location in UI).
     * The reason for this is to cater for scenarios where a parent account manages children that are located across different geographical locations to one another and therefore
     * any data retrieval for views in the UI where child account roll-ups exist must be fetched from the appropriate location.
     * The previous implementation ALWAYS calculated service endpoints for the default location of the primary account for the logged in user and so any roll ups for views for child accounts never worked eva!!!
     *
     */
    public async resolveDefaultEndpoints( accountId:string, serviceList:string[] ) {
        try {
            let response = await this.context.handleRequest<any>( {
                method: 'POST',
                url: this.context.resolveURL( AlLocation.GlobalAPI, `/endpoints/v1/${accountId}/residency/default/endpoints` ),
                data: serviceList,
                headers: { 'x-aims-auth-token': this.context.getAIMSToken() }
            } );
            Object.entries( response.data ).forEach( ( [ serviceName, endpointHost ] ) => {
                let host = endpointHost as string;
                if ( host.startsWith("async.") ) { // naming convention for WebSocket services
                    host = `wss://${host}`; // add prefix for websocket protocol
                } else if ( !host.startsWith("http") ) {
                    host = `https://${host}`;      //  ensuring domains are prefixed with protocol
                }
                setJsonPath( this.endpointCache,
                                [ this.context.environment, accountId, serviceName, AlBaseAPIClient.defaultResidency ],
                                host );
            } );
            return this.endpointCache;
        } catch ( e ) {
            return this.fallbackResolveEndpoints( accountId, serviceList, AlBaseAPIClient.defaultResidency );
        }
    }

    public async resolveResidencyAwareEndpoints( accountId:string, serviceList:string[] ) {
        try {
            let response = await this.context.handleRequest<any>( {
                method: 'POST',
                url: this.context.resolveURL( AlLocation.GlobalAPI, `/endpoints/v1/${accountId}/endpoints` ),
                data: serviceList,
                headers: { 'x-aims-auth-token': this.context.getAIMSToken() }
            } );
            Object.entries( response.data ).forEach( ( [ serviceName, residencyLocations ] ) => {
                Object.entries(residencyLocations).forEach(([residencyName, residencyHost]) => {
                    Object.entries(residencyHost).forEach(([datacenterId, endpointHost]) => {
                        let host = endpointHost as string;
                        if ( host.startsWith("async.") ) { // naming convention for WebSocket services
                            host = `wss://${host}`; // add prefix for websocket protocol
                        } else if ( !host.startsWith("http") ) {
                            host = `https://${host}`;      //  ensuring domains are prefixed with protocol
                        }
                        setJsonPath( this.endpointCache,
                                        [ this.context.environment, accountId, serviceName, residencyName ],
                                        host );
                    } );
                } );
            } );
            return this.endpointCache;
        } catch( e ) {
            return this.fallbackResolveEndpoints( accountId, serviceList, this.context.residency );
        }
    }

    public lookupDefaultServiceEndpoint(accountId: string, serviceName: string) {
        return getJsonPath<string>( this.endpointCache,
                                    [ this.context.environment, accountId, serviceName, AlBaseAPIClient.defaultResidency ],
                                    null );
    }

    protected async get<ResponseType>(  config:ValidRequestSpecifier, 
                                        queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<ResponseType> {
        return ( await this.handleRequest<ResponseType>( "GET", config, queryParams ) ).data;
    }

    protected async post<ResponseType>( config:ValidRequestSpecifier,
                                        data?:any,
                                        queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<ResponseType> {
        return ( await this.handleRequest<ResponseType>( "POST", config, data, queryParams ) ).data;
    }

    protected async put<ResponseType>(  config:ValidRequestSpecifier,
                                        data?:any,
                                        queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<ResponseType> {
        return ( await this.handleRequest<ResponseType>( "PUT", config, data, queryParams ) ).data;
    }

    protected async delete<ResponseType>( config:ValidRequestSpecifier ):Promise<ResponseType> {
        return ( await this.handleRequest<ResponseType>( "DELETE", config ) ).data;
    }

    protected async rawGet<ResponseType>(  config:ValidRequestSpecifier, 
                                        queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<AlNetworkResponse<ResponseType>> {
        return await this.handleRequest<ResponseType>( "GET", config, queryParams );
    }

    protected async rawPost<ResponseType>( config:ValidRequestSpecifier,
                                        data?:any,
                                        queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<AlNetworkResponse<ResponseType>>  {
        return await this.handleRequest<ResponseType>( "POST", config, data, queryParams );
    }

    protected async rawPut<ResponseType>(  config:ValidRequestSpecifier,
                                        data?:any,
                                        queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<AlNetworkResponse<ResponseType>>  {
        return await this.handleRequest<ResponseType>( "PUT", config, data, queryParams );
    }

    protected async rawDelete<ResponseType>( config:ValidRequestSpecifier ):Promise<AlNetworkResponse<ResponseType>>  {
        return await this.handleRequest<ResponseType>( "DELETE", config );
    }

    protected async handleRequest<ResponseType>( method:string, 
                                                 config:ValidRequestSpecifier, 
                                                 data?:any,
                                                 queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<AlNetworkResponse<ResponseType>> {
        const normalized = await this.normalizeRequest( method, config, data, queryParams );
        const result = await this.context.handleRequest( normalized );
        if ( result.status < 200 || result.status >= 400 ) {
            throw result;
        }
        return result as AlNetworkResponse<ResponseType>;
    }

    protected async normalizeRequest( method:string,
                                      config:ValidRequestSpecifier,
                                      data?:any,
                                      queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<AlNetworkRequestDescriptor> {
        let normalized:AlNetworkRequestDescriptor = { method };
        if ( AlBaseAPIClient.isLegacyRequestConfig( config ) ) {
            normalized = { ...normalized, ...this.importLegacyRequestConfig( config ) };
        } else if ( AlBaseAPIClient.isEndpointDescriptor( config ) ) {
            normalized = { ...normalized, endpoint: config };
        } else {
            normalized = { ...normalized, ...config };
        }

        if ( normalized.endpoint ) {
            normalized = { ...normalized, ...( await this.calculateEndpointTarget( normalized ) ) };
        }

        if ( queryParams ) {
            normalized.params = queryParams;
        }
        if ( data ) {
            normalized.data = data;
        }
        if ( normalized.debug ) {
            console.log("Normalized: ", JSON.stringify( normalized, null, 4 ) );
        }
        return normalized;
    }

    protected async calculateEndpointTarget( request:AlNetworkRequestDescriptor ):Promise<AlNetworkRequestDescriptor> {
        const descriptor = request.endpoint;
        if ( descriptor ) {
            const prototype = Object.getPrototypeOf( this );
            const definition = prototype?.apiClientDefinition as AlClientDefinition;
            let configuration = definition?.configurations?.default;
            if ( descriptor.configuration ) {
                configuration = definition?.configurations[descriptor.configuration];
                if ( ! configuration ) {
                    throw new AlBaseError(`Invalid endpoint descriptor references undefined configuration '${descriptor.configuration}'`, undefined, descriptor );
                }
            }
            if ( configuration ) {
                Object.assign( descriptor, configuration );
            }

            /**
             * Bubble request properties from the endpoint descriptor to the request configuration, if provided
             */
            if ( descriptor.method ) {
                request.method = descriptor.method;
            }
            if ( typeof( descriptor.credentialed ) === 'boolean' ) {
                request.credentialed = descriptor.credentialed;
            }
            if ( descriptor.debug ) {
                request.debug = true;
            }
            if ( descriptor.data ) {
                request.data = descriptor.data;
            }
        }
        if ( descriptor && descriptor.targetEndpoint || descriptor.stack || descriptor.service ) {
            // If we are using endpoints resolution to determine our calculated URL, merge globalServiceParams into our descriptoruration
            if ( ! descriptor.noAutoResolution
                   && ! this.context.getOption<boolean>( ConfigOption.DisableEndpointsResolution, false )
                   && ( descriptor.targetEndpoint || ( descriptor.service && AlBaseAPIClient.endpointsStackWhitelist.includes( descriptor.stack ) ) ) ) {
                // Utilize the endpoints service to determine which location to use for this service/account pair
                request.url = await this.prepare( descriptor );
            }
            if ( ! request.url ) {
                let resolution = undefined;
                if ( descriptor.noDevImplementation && this.context.environment === 'development' ) {
                    resolution = { environment: 'integration' };
                }
                // If specific endpoints are disabled or unavailable, use the environment-level default
                request.url = this.context.resolveURL( descriptor.stack || AlLocation.InsightAPI, undefined, undefined, resolution );
            }
            if ( descriptor.prefix ) {
                request.url += `/${descriptor.prefix}`;
            }
            if ( descriptor.service ) {
                if ( descriptor.service === AlLocation.MDRAPI && request.url.includes( "{service}" ) ) {
                    request.url = request.url.replace( "{service}", descriptor.service );
                } else if ( descriptor.stack !== AlLocation.MDRAPI ) {
                    request.url += `/${descriptor.service}`;
                }
            }
            if ( descriptor.version ) {
                if ( typeof( descriptor.version ) === 'string' && descriptor.version.length > 0 ) {
                    request.url += `/${descriptor.version}`;
                } else if ( typeof( descriptor.version ) === 'number' && descriptor.version > 0 ) {
                    request.url += `/v${descriptor.version.toString()}`;
                }
            }
            if ( descriptor.accountId && descriptor.accountId !== '0' ) {
                request.url += `/${descriptor.accountId}`;
            }
            if ( 'path' in descriptor && descriptor.path.length > 0 ) {
              request.url += `${descriptor.path[0] === '/' ? '' : '/'}${descriptor.path}`;
            }
            if ( 'params' in request ) {
                request.url += this.normalizeQueryParams( request.params );
            }
            return request;
        } else {
            console.error(`Invalid endpoint descriptor`, descriptor );
            throw new AlBaseError( `Invalid endpoint descriptor cannot be resolved to a URL`, undefined, descriptor );
        }
    }

    /**
     * This converts an axios-based request configuration into the representation we use internally.
     */
    protected importLegacyRequestConfig( config:APIRequestParams ):AlNetworkRequestDescriptor {
        return {
            endpoint: {
                stack: 'service_stack' in config ? config.service_stack : AlLocation.InsightAPI,
                service: config.service_name || undefined,
                version: 'version' in config ? config.version : 'v1',
                path: config.path || undefined,
                accountId: config.account_id || undefined,
                residency: 'residency' in config ? config.residency : 'default',
                noAutoResolution: config.noEndpointsResolution || undefined,
                aimsAuthHeader: config.aimsAuthHeader || undefined,
                targetEndpoint: config.target_endpoint || undefined
            },
            data: config.data || undefined,
            headers: config.headers || undefined,
            params: config.params || undefined,
            credentialed: typeof( config.withCredentials ) === 'boolean' ? config.withCredentials : undefined,
            responseType: config.responseType,
            debug: config.debug || undefined
        };
    }

    /**
     * This method (and its partner, getServiceEndpoints) uses running promise sequences to retrieve endpoints (using the multiple endpoint lookup action)
     * in such a way that
     *    a) most basic services will be retrieved in a single call
     *    b) the initial call is guaranteed to included the service a request is being formed for
     *    c) only one outstanding call to the endpoints service will be issued, per account, at a given time
     *
     * @returns The resolved base URL of the given endpoint.
     */
    protected async prepare( requestParams:AlEndpointDescriptor ): Promise<string> {
        let result = await AlBaseAPIClient.endpointsGuard.run<string>( async () => {
            const environment         =   this.context.environment;
            const accountId           =   requestParams.contextualAccountId || requestParams.accountId || this.context.defaultAccountId || "0";
            const serviceEndpointId   =   requestParams.targetEndpoint || requestParams.service;
            const residencyAware      =   AlBaseAPIClient.resolveByResidencyServiceList.includes( serviceEndpointId );
            const residency           =   residencyAware ? this.context.residency : "default";

            let baseURL = getJsonPath<string>(  this.endpointCache,
                                                [ environment, accountId, serviceEndpointId, residency ],
                                                null );
            if ( baseURL ) {
                return baseURL;
            }

            let serviceList = residencyAware ? AlBaseAPIClient.resolveByResidencyServiceList : AlBaseAPIClient.defaultServiceList;
            if ( ! serviceList.includes(serviceEndpointId)) {
                serviceList.push(serviceEndpointId);
            }

            if ( residencyAware ) {
                await this.resolveResidencyAwareEndpoints( accountId, serviceList );
            } else {
                await this.resolveDefaultEndpoints( accountId, serviceList );
            }
            baseURL = getJsonPath<string>( this.endpointCache,
                                             [ environment, accountId, serviceEndpointId, residency ],
                                             null );
            if ( baseURL ) {
                return baseURL;
            }
            console.log(`WARNING: unable to resolve location of endpoint '${serviceEndpointId}' for account ${accountId} (${residencyAware ? "residency-aware" : "default mode"})` );
            return null;
        } );
        return result;
    }

    protected fallbackResolveEndpoints( accountId:string, serviceList:string[], residency:string ) {
        console.warn(`Could not retrieve data for endpoints for [${serviceList.join(",")}]; using defaults for environment '${this.context.environment}'` );
        let insightHost = this.context.resolveURL( AlLocation.InsightAPI );
        serviceList.forEach( serviceName => {
                setJsonPath( this.endpointCache,
                             [ this.context.environment, accountId, serviceName, residency ],
                             insightHost );
            } );
        return this.endpointCache;
    }

    /**
     * Flushes the cache keys corresponding to a given URL or request specifier
     */
    protected async flushCache( target:string|ValidRequestSpecifier ) {
        try {
            let url:string;
            if ( typeof( target ) === 'string' ) {
                url = target;
            } else if ( typeof( target ) === 'object' && target !== null ) {
                let normalized = await this.normalize( target );
                url = normalized.url;
            } else {
                return;
            }
            caches.delete( url );
        } catch( e ) {}
    }

    /**
     * Normalize query parameters from config api request.
     */
    private normalizeQueryParams(params: any):string {
        if ( typeof( params ) !== 'object' || ! params ) {
            return '';
        }
        try {
            let normalized = Object.entries( params )
                        .map( ( [ p, v ] ) => {
                            if ( typeof( v ) === 'undefined' ) {
                                return null;
                            }
                            if( Array.isArray(v) ) {
                                return v.map( ( arrayValue ) => {
                                    return `${p}=${encodeURIComponent( typeof( arrayValue ) === 'string' ? arrayValue : arrayValue.toString() )}`;
                                }).join("&");
                            }
                            return `${p}=${encodeURIComponent( typeof( v ) === 'string' ? v : v.toString() )}`;
                        })
                        .filter( p => p )
                        .join("&");
            return normalized.length > 0 ? `?${normalized}` : '';
        } catch( e ) {
            console.error( e );
            return '';
        }
    }
}

