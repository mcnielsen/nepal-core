/**
 * Module to deal with available Correlations Public API endpoints
 */
import {
  AlDefaultClient, AlLocation
} from '@al/core';

export interface AlTicketMasterResponse {
    ticket: string;
}

export class AlTicketMasterClientInstance {

    private serviceName = 'ticketmaster';

    constructor() {
    }

    /**
     * Function to get the ticket
     *
     * @param accountID string
     *
     * @returns Observable
     */
    async getTicket(accountId: string): Promise<AlTicketMasterResponse> {
        return AlDefaultClient.post<any>({
            service_stack: AlLocation.InsightAPI,
            service_name: this.serviceName,
            version: 'v1',
            account_id: accountId,
            path: 'ticket',
        });
     }
}
