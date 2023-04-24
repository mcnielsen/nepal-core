import { 
    AlExecutionContext, 
    AIMSSessionDescriptor,
    AlNetworkRequestDescriptor,
    AlNetworkResponse,
    AlBeforeNetworkRequest,
    AlAfterNetworkRequest,
} from '@al/core';

import { WrappedAxiosRequest } from './axios.client';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export class AlBrowserExecutionContext extends AlExecutionContext {

    protected axiosInstance:AxiosInstance;

    constructor() {
        super();
    }

    public base64Decode( input:string ):string {
        return atob( input );
    }

    public base64Encode( input:string ):string {
        return btoa( input );
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
        if ( this.axiosInstance ) {
            return this.axiosInstance;
        }

        let headers = {
            'Accept': 'application/json, text/plain, */*'
        };

        this.axiosInstance = axios.create({
            timeout: 0,
            withCredentials: false,
            headers: headers,
        });

        this.axiosInstance.interceptors.request.use( ( config:AxiosRequestConfig ) => {
            config.validateStatus = ( responseStatus:number ) => {
                //  This forces all responses to run through our response interceptor
                return true;
            };
            return config;
        } );
        return this.axiosInstance;
    }
}
