import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    Method,
} from 'axios';
import { 
    AIMSSessionDescriptor,
    AlExecutionContext, 
    ConfigOption,
    AlNetworkRequestDescriptor, 
    AlNetworkResponse,
    AlEntitlementCollection,
    AlBeforeNetworkRequest,
    AlAfterNetworkRequest,
} from '@al/core';

import { WrappedAxiosRequest, WrappedAxiosRequestConfig } from './axios-wrapper';

export class AlNodeExecutionContext extends AlExecutionContext {

    public axios:AxiosInstance;

    constructor() {
        super();
        this.setOption( ConfigOption.DisableEndpointsResolution, true );
        this.setOption( ConfigOption.ResolveAccountMetadata, false );
        this.setOption( ConfigOption.LocalManagedContent, true );
    }

    public base64Encode( data:string ):string {
        return Buffer.from( data, 'utf8' ).toString( 'base64' );
    }

    public base64Decode( data:string ):string {
        return Buffer.from( data, 'base64' ).toString( 'utf8' );
    }

    public async handleRequest<YieldType = any>( requestConfig:AlNetworkRequestDescriptor ):Promise<AlNetworkResponse<YieldType>> {
        this.dispatch( new AlBeforeNetworkRequest( requestConfig ) );        //    Allow event subscribers to modify the request (e.g., add a session token header) if they want
        let wrapper = new WrappedAxiosRequest( this.getAxiosInstance(), requestConfig );
        let result = await wrapper.execute();
        this.dispatch( new AlAfterNetworkRequest( requestConfig, result ) );
        return result;
    }

    /**
     * Instantiate a properly configured axios client for services
     */
    protected getAxiosInstance(): AxiosInstance {
        if ( this.axios ) {
            return this.axios;
        }

        let headers = {
            'Accept': 'application/json, text/plain, */*'
        };

        this.axios = axios.create({
            timeout: 0,
            withCredentials: false,     //  an essential default value 
            headers: headers
        });

        this.axios.interceptors.request.use( this.axiosRequestHook );
        this.axios.interceptors.response.use( this.axiosResponseHook );
        return this.axios;
    }

    protected axiosRequestHook( config:AxiosRequestConfig ) {
        config.validateStatus = ( responseStatus:number ) => {
            //  This forces all responses to pass through our response interceptor, even error responses
            return true;
        };
        return config;
    }

    protected axiosResponseHook( response:AxiosResponse<any> ) {
        const wrappedConfig = response.config as WrappedAxiosRequestConfig;
        if ( wrappedConfig.wrapper ) {
            return wrappedConfig.wrapper.complete( response );
        } else {
            if ( response.status < 200 || response.status >= 400 ) {
                return Promise.reject( response );
            } else {
                return Promise.resolve( response );
            }
        }
    }
}
