import { AxiosRequestConfig } from 'axios';
import {
    AlTrigger,
    AlTriggeredEvent,
} from "../../../nepal-common";

@AlTrigger( 'AlClientBeforeRequest' )
export class AlClientBeforeRequestEvent extends AlTriggeredEvent<void>
{
    constructor( public request:AxiosRequestConfig ) {
        super();
    }
}
