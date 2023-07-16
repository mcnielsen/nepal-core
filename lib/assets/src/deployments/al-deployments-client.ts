/**
 * Module to deal with available Deployments Public API endpoints
 */
import {
  AlDefaultClient,
  AlLocation,
} from '@al/core';
import {
  Deployment,
  DeploymentCreateBody,
  DeploymentUpdateBody,
} from './types';

export class AlDeploymentsClientInstance {

  private serviceName = 'deployments';
  private serviceVersion = 'v1';

  /* istanbul ignore next */
  constructor() {
  }

  async createDeployment(accountId: string, deploymentRequest: DeploymentCreateBody): Promise<Deployment> {
    return AlDefaultClient.post<Deployment>({
      service_stack: AlLocation.InsightAPI,
      version: this.serviceVersion,
      service_name: this.serviceName,
      account_id: accountId,
      path: '/deployments',
      data: deploymentRequest,
    });
  }

  async updateDeployment(accountId: string, deploymentId: string, deploymentRequest: DeploymentUpdateBody): Promise<Deployment> {
    return AlDefaultClient.put<Deployment>({
      service_stack: AlLocation.InsightAPI,
      version: this.serviceVersion,
      service_name: this.serviceName,
      account_id: accountId,
      path: `/deployments/${deploymentId}`,
      data: deploymentRequest,
    });
  }

  async deleteDeployment(accountId: string, deploymentId: string): Promise<void> {
    return AlDefaultClient.delete({
      service_stack: AlLocation.InsightAPI,
      version: this.serviceVersion,
      service_name: this.serviceName,
      account_id: accountId,
      path: `/deployments/${deploymentId}`,
    });
  }

  async getDeployment(accountId: string, deploymentId: string): Promise<Deployment> {
    return AlDefaultClient.get<Deployment>({
      service_stack: AlLocation.InsightAPI,
      version: this.serviceVersion,
      service_name: this.serviceName,
      account_id: accountId,
      path: `/deployments/${deploymentId}`,
    });

  }

  async listDeployments(accountId: string, filters?: {[i:string]: string} | string[]): Promise<Deployment[]> {
    return AlDefaultClient.get<Deployment[]>({
      service_stack: AlLocation.InsightAPI,
      version: this.serviceVersion,
      service_name: this.serviceName,
      account_id: accountId,
      path: '/deployments',
      params: filters
    });
  }
}
