import {
    AIMSAccount,
    AIMSUser,
} from '../../aims-client/types';
import { AlEntitlementRecord } from "../../subscriptions-client/types";

export interface AlConsolidatedAccountMetadata {
    user:AIMSUser;
    primaryAccount:AIMSAccount;
    actingAccount:AIMSAccount;
    managedAccounts?:AIMSAccount[];
    primaryEntitlements:AlEntitlementRecord[];
    effectiveEntitlements:AlEntitlementRecord[];
    endpointsData:any;
}

export interface AlSessionProfile {
    entitlements?:string[];
    primaryEntitlements?:string[];
    globalExperience?:string;
    experiences?:string[];
}
