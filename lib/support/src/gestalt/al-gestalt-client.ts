/**
 * Gestalt API client.
 * Note: Put here gestalt endpoints without a service name.
 */
import {
    AlDefaultClient,
    AlLocation,
} from '@al/core';

export class AlGestaltClientInstance {

    protected serviceStack:string = AlLocation.GestaltAPI;

    constructor() {
    }

    /**
     * Get gestalt canary to check if gestalt is responding.
     * This gestalt API endpoint is used by datadog.
     * GET
     * /canary
     *
     *  @returns a promise
     */
    async isGestaltResponding(): Promise<any> {
        const result = await AlDefaultClient.get({
            service_stack: this.serviceStack,
            path: `/canary`,
        });
        return result as any;
    }
}
