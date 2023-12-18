import {
    AIMSAccount,
    AIMSUser,
    AIMSLicenseAcceptanceStatus,
} from "../../aims-client";
import {
    AlTrigger,
    AlTriggeredEvent,
} from "../../common/utility";
import { AlEntitlementCollection } from "../../subscriptions-client/types";

/**
 * AlSessionStartedEvent is broadcast by an AlSessionInstance whenever a new session is created by a successful authentication.
 */
@AlTrigger( 'AlSessionStarted' )
export class AlSessionStartedEvent extends AlTriggeredEvent<void>
{
    constructor( public user:AIMSUser,
                 public primaryAccount:AIMSAccount ) {
        super();
    }
}

/**
 * AlSessionEndedEvent is broadcast by an AlSessionInstance whenever an existing session is destroyed.
 */
@AlTrigger( 'AlSessionEnded' )
export class AlSessionEndedEvent extends AlTriggeredEvent<void>
{
    constructor() {
        super();
    }
}

/**
 * AlActingAccountChangedEvent is broadcast by an AlSessionInstance whenever the acting account is initially changed.
 * This event should be regarded as the *beginning* of the account change process, and provides attentive services to opportunity to
 * flush any account-specific stateful data and any views to evaluate whether they are still valid.
 */
@AlTrigger( 'AlActingAccountChanged' )
export class AlActingAccountChangedEvent extends AlTriggeredEvent<void>
{
    constructor( public previousAccount:AIMSAccount,
                 public actingAccount:AIMSAccount,
    ) {
        super();
    }
}

/**
 * AlActingAccountResolvedEvent is broadcast by an AlSessionInstance whenever the acting account has been changed
 * and its roles, entitlements (acting and primary), and other state data have been retrieved from their respective services.
 * This event is the second half of the process whose beginning is indicated by AlActingAccountChangedEvent.
 */
@AlTrigger( 'AlActingAccountResolved' )
export class AlActingAccountResolvedEvent extends AlTriggeredEvent<void>
{
    constructor( public actingAccount:AIMSAccount,
                 public entitlements:AlEntitlementCollection,
                 public primaryEntitlements:AlEntitlementCollection,
                 public licenseAcceptance?:AIMSLicenseAcceptanceStatus,
                 public coreServiceError?:string ) {
        super();
    }
}

/**
 * AlActiveDatacenterChangedEvent is broadcast by an AlSessionInstance whenever the active datacenter has been changed.
 */
@AlTrigger( 'AlActiveDatacenterChanged' )
export class AlActiveDatacenterChangedEvent extends AlTriggeredEvent<void>
{
    constructor( public insightLocationId:string,
                 public residency:string,
                 public metadata:unknown ) {
        super();
    }
}

/**
 * AlDatacenterSessionAvailable event is used by navigation layer to indicate when a given datacenter is ready to interact with.
 */
@AlTrigger( 'AlDatacenterSessionEstablished' )
export class AlDatacenterSessionEstablishedEvent extends AlTriggeredEvent<void>
{
    constructor( public insightLocationId:string ) {
        super();
    }
}

/**
 * AlDatacenterSessionError event is used to indicate when there is a problem establishing or persisting a session in an external datacenter.
 */
@AlTrigger( 'AlDatacenterSessionError' )
export class AlDatacenterSessionErrorEvent extends AlTriggeredEvent<void>
{
    constructor( public insightLocationId:string, public errorType:string, public errorDetails:unknown ) {
        super();
    }
}

/**
 * AlExternalTrackableEvent is used to catch runtime metrics from embedded defender views and relay them to google analytics.
 */
@AlTrigger( 'AlExternalTrackableEvent' )
export class AlExternalTrackableEvent extends AlTriggeredEvent<void>
{
    constructor( public data:unknown ) {
        super();
    }
}

/**
 * AlFortraTokenChangedEvent is emitted by an AlSessionInstance each time the Fortra token is refreshed.
 */
@AlTrigger( 'AlFortraTokenChanged' )
export class AlFortraTokenChangedEvent extends AlTriggeredEvent<void>
{
    constructor( public token:string ) {
        super();
    }
}
