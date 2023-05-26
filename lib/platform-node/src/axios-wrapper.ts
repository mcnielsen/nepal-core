import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    Method,
} from 'axios';

import { 
    AlError,
    AlNetworkRequestDescriptor, 
    AlNetworkResponse 
} from '@al/core';

export type WrappedAxiosRequestConfig = AxiosRequestConfig & {
    wrapper?: WrappedAxiosRequest;
};

export class WrappedAxiosRequest<Type = any> implements AlNetworkResponse<Type>{
    public status:number                    =   0;
    public statusText:string                =   "pending";
    public headers:{[header:string]:string} =   {};
    public data:Type                        =   null;

    public rawResponse?:AxiosResponse<any>;

    constructor( public axios:AxiosInstance, public request:AlNetworkRequestDescriptor ) {
    }

    public async execute():Promise<AlNetworkResponse> {
        let axiosRequestConfig = this.convertRequest( this.request );
        await this.axios( axiosRequestConfig );
        return this;
    }

    public complete( response:AxiosResponse<Type> ) {
        this.rawResponse = response;
        this.status = response.status;
        this.statusText = response.statusText;
        this.headers = response.headers;
        this.data = response.data;
        if ( this.status >= 200 && this.status < 300 ) {
            return Promise.resolve( response );
        } else {
            return Promise.reject( this );
        }
    }

    public json():Type {
        return this.data as Type;
    }

    protected convertRequest( request:AlNetworkRequestDescriptor ):WrappedAxiosRequestConfig {
        let requestConfig:WrappedAxiosRequestConfig = {
            url: request.url || '',
            method: request.method as Method || "GET",
            headers: request.headers || {},
            data: request.data || null,
            wrapper: this
        };
        if ( typeof( request.responseType ) !== 'undefined' ) {
            requestConfig.responseType = request.responseType;
        }
        if ( typeof( request.credentialed ) === 'boolean' ) {
            requestConfig.withCredentials = request.credentialed;
        }
        return requestConfig;
    }

}

