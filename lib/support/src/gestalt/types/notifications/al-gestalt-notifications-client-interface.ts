import { AlCardstackCharacteristics } from '@al/core/cardstack';
import { AlAlertDefinition } from './al-alert-definition';
import { AlGenericAlertOptions } from './notification.types';

export interface AlGestaltNotificationsClientInterface {
    getGenericAlertOptions(accountId: string, entity: string): Promise<AlGenericAlertOptions>;

    getNotificationsCharacteristics(accountId: string, entity: string): Promise<AlCardstackCharacteristics>;

    getNotificationsList(accountId: string, entity: string): Promise<AlAlertDefinition[]>;

    deleteEntity(accountId: string, hierarchyType: string, ids: string[]): Promise<boolean>;

}
