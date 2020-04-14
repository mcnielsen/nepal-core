import {
    AIMSAccount,
    AIMSUser,
    AlEndpointsServiceCollection,
} from '@al/client';
import { AlEntitlementRecord } from '@al/subscriptions';
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
