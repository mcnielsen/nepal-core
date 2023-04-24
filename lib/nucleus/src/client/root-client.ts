import { AlClient, ValidRequestSpecifier, AlEndpointDescriptor, AlNetworkResponse } from '../common/types';
import { AlBaseAPIClient } from './al-base-api-client';

@AlClient( {
    name: "default",
    version: 0,
    configurations: {
        default: {}
    }
} )
export class RootClient extends AlBaseAPIClient {
    constructor() {
        super();
    }

    public async get<ResponseType = any>(  config:ValidRequestSpecifier, 
                                           queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<ResponseType> {
        return super.get<ResponseType>( config, queryParams );
    }

    public async post<ResponseType = any>( config:ValidRequestSpecifier,
                                           data?:any,
                                           queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<ResponseType> {
        return super.post<ResponseType>( config, data, queryParams );
    }

    public async put<ResponseType = any>(  config:ValidRequestSpecifier,
                                           data?:any,
                                           queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<ResponseType> {
        return super.put<ResponseType>( config, data, queryParams );
    }

    public async delete<ResponseType = any>( config:ValidRequestSpecifier):Promise<ResponseType> {
        return super.delete<ResponseType>( config );
    }

    public async rawGet<ResponseType=any>( config:ValidRequestSpecifier, 
                                           queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<AlNetworkResponse<ResponseType>> {
        return super.rawGet<ResponseType>( config, queryParams );
    }

    public async rawPost<ResponseType=any>( config:ValidRequestSpecifier,
                                            data?:any,
                                            queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<AlNetworkResponse<ResponseType>>  {
        return super.rawPost<ResponseType>( config, data, queryParams );
    }

    public async rawPut<ResponseType=any>( config:ValidRequestSpecifier,
                                           data?:any,
                                           queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<AlNetworkResponse<ResponseType>>  {
        return super.rawPut<ResponseType>( config, data, queryParams );
    }

    public async rawDelete<ResponseType=any>( config:ValidRequestSpecifier):Promise<AlNetworkResponse<ResponseType>>  {
        return super.rawDelete<ResponseType>( config );
    }

    public async handleRequest<ResponseType = any>( method:string, config:ValidRequestSpecifier, 
                                                    data?:any,
                                                    queryParams?:{[parameterName:string]:string|number|boolean|undefined} ):Promise<AlNetworkResponse<ResponseType>> {
        return super.handleRequest<ResponseType>( method, config, data, queryParams );
    }

    public async flushCache( target:string|ValidRequestSpecifier ) {
        return super.flushCache( target );
    }
}

export type AlApiClient = RootClient;
