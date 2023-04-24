import { AxiosRequestConfig, AxiosResponse } from 'axios';
import {
    AlTrigger,
    AlTriggeredEvent,
} from "../../common";
import { APIRequestParams } from '../types';

@AlTrigger( 'AlClientBeforeRequest' )
export class AlClientBeforeRequestEvent extends AlTriggeredEvent<void>
{
    constructor( public request:APIRequestParams ) {
        super();
    }
}

@AlTrigger( 'AlClientAPIError' )
export class AlClientAPIErrorEvent extends AlTriggeredEvent<void>
{
    constructor( public request:APIRequestParams, public errorResponse:AxiosResponse ) {
        super();
    }
}
