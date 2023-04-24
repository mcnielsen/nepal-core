import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    Method,
} from 'axios';

import { 
    AlErrorHandler,
    AlNetworkRequestDescriptor, 
    AlNetworkResponse 
} from '@al/core';

export class WrappedAxiosRequest<Type = any> implements AlNetworkResponse<Type>{

    public status               =   0;
    public statusText           =   "pending";
    public headers:{[header:string]:string} = {};
    public data:any;

    public rawResponse?:AxiosResponse;

    constructor( public axios:AxiosInstance, public request:AlNetworkRequestDescriptor ) {
    }

    async execute():Promise<AlNetworkResponse> {
        try {
            let axiosRequestConfig = this.convertRequest( this.request );
            this.rawResponse = await this.axios( axiosRequestConfig );
            this.unpackResponse();
        } catch( e ) {
            console.log(e);
            AlErrorHandler.log( e, `Failed to dispatch request` );
        }
        return this;
    }

    protected convertRequest( request:AlNetworkRequestDescriptor ):AxiosRequestConfig {
        let requestConfig:AxiosRequestConfig = {
            url: request.url || '',
            method: request.method as Method || "GET",
            headers: request.headers || {},
            data: request.data || null
        };
        if ( typeof( request.responseType ) !== 'undefined' ) {
            requestConfig.responseType = request.responseType;
        }
        if ( typeof( request.credentialed ) === 'boolean' ) {
            requestConfig.withCredentials = request.credentialed;
        }
        return requestConfig;
    }

    protected unpackResponse() {
        this.status = this.rawResponse!.status;
        this.statusText = this.rawResponse!.statusText;
        this.headers = this.rawResponse!.headers;
        this.data = this.rawResponse.data;
    }

    public json():Type {
        return this.data as Type;
    }
}

