import { AxiosRequestConfig } from 'axios';
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
