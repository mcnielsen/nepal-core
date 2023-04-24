import { AlGestaltClientInstance } from './al-gestalt-client';
import { AlGestaltNotificationsClientInstance } from './al-gestalt-notifications-client';
import { AlGestaltDashboardsClientInstance } from './al-gestalt-dashboards-client';
import { AlGlobalizer } from '@al/core';

/* tslint:disable:variable-name */
export const ALGestalt:AlGestaltClientInstance = AlGlobalizer.instantiate(
    "al.gestalt", () => new AlGestaltClientInstance()
);
export const ALGestaltNotifications:AlGestaltNotificationsClientInstance = AlGlobalizer.instantiate(
    "al.gestalt.notifications", () => new AlGestaltNotificationsClientInstance()
);
export const AlGestaltDashboardsClient:AlGestaltDashboardsClientInstance = AlGlobalizer.instantiate(
    "al.gestalt.dashboard", () => new AlGestaltDashboardsClientInstance()
);
/* tslint:enable:variable-name */

export * from './al-gestalt-client';
export * from './al-gestalt-notifications-client';
export * from './types';
export * from './characteristics';
export * from './characteristics-utility';
export * from './list';
