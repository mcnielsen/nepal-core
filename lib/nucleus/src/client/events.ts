import { AlTrigger, AlTriggeredEvent, AlNetworkRequestDescriptor, AlNetworkResponse } from '../common';

@AlTrigger( 'AlClientBeforeRequest' )
export class AlBeforeNetworkRequest extends AlTriggeredEvent<void>
{
    constructor( public request:AlNetworkRequestDescriptor ) {
        super();
    }
}

@AlTrigger( 'AlClientAPIError' )
export class AlAfterNetworkRequest extends AlTriggeredEvent<void>
{
    constructor( public request:AlNetworkRequestDescriptor, public response:AlNetworkResponse ) {
        super();
    }
}

