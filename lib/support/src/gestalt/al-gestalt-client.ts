/**
 * Gestalt API client.
 * Note: Put here gestalt endpoints without a service name.
 */
import {
    AlApiClient,
    AlDefaultClient,
    AlLocation,
} from '@al/core';

export class AlGestaltClientInstance {

    protected serviceStack:string = AlLocation.GestaltAPI;

    constructor( public client:AlApiClient = AlDefaultClient ) {
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
        const result = await this.client.get({
            service_stack: this.serviceStack,
            path: `/canary`,
        });
        return result as any;
    }
}
