/**
 * Module to deal with available Azure Explorer Public API endpoints
 */
import { AlDefaultClient } from '@al/core';
import { AlAzureExplorerValidationParams, AlAzureExplorerValidationResponse } from './types';

export class AlAzureExplorerClientInstance {


  protected serviceName = 'azure_explorer';
  protected serviceVersion = 'v1';

  constructor() {
  }

  async validateExistingCredentials(accountId: string,
                                    environmentId: string): Promise<AlAzureExplorerValidationResponse> {
    return AlDefaultClient.post<AlAzureExplorerValidationResponse>({
      version: this.serviceVersion,
      service_name: this.serviceName,
      account_id: accountId,
      path: `/environments/${environmentId}/validate_credentials`,
    });
  }

  async validateExternalCredentials(validationParams: AlAzureExplorerValidationParams, accountId?: string): Promise<AlAzureExplorerValidationResponse> {
    return AlDefaultClient.post<AlAzureExplorerValidationResponse>({
      version: this.serviceVersion,
      service_name: this.serviceName,
      path: 'validate_credentials',
      account_id: accountId,
      data: validationParams,
    });
  }

}



