import {
    AIMSAccount,
    AIMSAuthentication,
    AlChangeStamp,
} from '@al/client';

export interface AIMSAuthenticationTokenInfo extends AIMSAuthentication {
    entity_id?: string;
    entity_type?: string;
    requester_id?: string;
    roles?: AIMSRole[];
}

export interface AIMSRole {
    id: string;
    account_id: string;
    name: string;
    permissions: {
        [key: string]: string;
    };
    legacy_permissions: any[];
    version: number;
    global?: boolean;
    created?: AlChangeStamp;
    modified?: AlChangeStamp;
}

export interface AIMSAccessKey {
    access_key_id: string;
    user_id: string;
    account_id: string;
    label: string;
    created?: AlChangeStamp;
    modified?: AlChangeStamp;
    secret_key?: string;
}

export interface AIMSOrganization {
    account_id: string;
    location_id: string;
    id: string;
    version: number;
    created: AlChangeStamp;
    modified: AlChangeStamp;
    url: string;
}

export interface AIMSTopology extends AIMSAccount {
    id: string;
    managing?: AIMSTopology[];
    managed?: AIMSTopology[];
}
