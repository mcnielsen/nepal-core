import { AxiosRequestConfig, AxiosResponse } from 'axios';
import {
    AlTrigger,
    AlTriggeredEvent,
} from "../common";
import { HybridRequestDescriptor } from './types';

@AlTrigger( 'AlClientBeforeRequest' )
export class AlClientBeforeRequestEvent extends AlTriggeredEvent<void>
{
    constructor( public request:HybridRequestDescriptor ) {
        super();
    }
}

@AlTrigger( 'AlClientAPIError' )
export class AlClientAPIErrorEvent extends AlTriggeredEvent<void>
{
    constructor( public request:HybridRequestDescriptor, public errorResponse:AxiosResponse ) {
        super();
    }
}
