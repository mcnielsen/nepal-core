
import { AlEndpointsServiceCollection } from "../../api-client";
import {
    AIMSAccount,
    AIMSUser,
} from "../../api-client/types";
import { AlEntitlementRecord } from "../../subscriptions-client/types";
import { AlFeatureNode } from './al-fox.types';

export interface AlConsolidatedAccountMetadata {
    user:AIMSUser;
    primaryAccount:AIMSAccount;
    actingAccount:AIMSAccount;
    managedAccounts?:AIMSAccount[];
    primaryEntitlements:AlEntitlementRecord[];
    effectiveEntitlements:AlEntitlementRecord[];
    foxData:AlFeatureNode;
    endpointsData:AlEndpointsServiceCollection;
}
