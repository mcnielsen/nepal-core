/**
 * Module to deal with available Themis Public API endpoints
 */
import {
  AlDefaultClient,
  AlLocation,
} from '@al/core';

export interface ThemisRoleDocument {
  type?: 'ci_full' | 'cd_full' | 'ci_x_account_ct' | 'ci_readonly' | 'ci_essentials' | 'ci_manual';
  platform_type?: 'aws' | 'azure';
  policy_document?: any;
  external_id?: string;
  aws_account_id?: string;
  version?: string;
  cft?: {
      s3_bucket?: string;
      s3_key?: string;
      s3_url?: string;
  };
}

export interface AWSRole {
  platform_type: 'aws';
  role_type: 'ci_full' | 'cd_full' | 'ci_x_account_ct' | 'ci_readonly' | 'ci_essentials' | 'ci_manual';
  role_version?: string;
  arn?: string;
  external_id?: string;
}

export interface AWSRoleValidationResponse {
  status?: string;
  message?: string;
  version?: string;
}

class ThemisClient {

  private serviceName = 'themis';

  constructor() {}

  async getRole(
      accountId: string,
      platformType: 'aws' | 'azure',
      roleType: 'ci_full' | 'cd_full' | 'ci_x_account_ct' | 'ci_readonly' | 'ci_essentials' | 'ci_manual',
      roleVersion: string
  ): Promise<ThemisRoleDocument> {
      const role = await AlDefaultClient.get({
          service_stack: AlLocation.InsightAPI,
          version: 'v1',
          service_name: this.serviceName,
          account_id: accountId,
          path: `/roles/${platformType}/${roleType}/${roleVersion}`,
      });
      return role as ThemisRoleDocument;
  }

  async getRoles(accountId: string): Promise<{roles: ThemisRoleDocument[]}> {
      const roles = await AlDefaultClient.get({
          service_stack: AlLocation.InsightAPI,
          version: 'v1',
          service_name: this.serviceName,
          account_id: accountId,
          path: '/roles',
      });
      return roles as { roles: ThemisRoleDocument[] };
  }

  async validateRoleCredentials(accountId: string, awsRole: AWSRole): Promise<AWSRoleValidationResponse> {
      const validate = await AlDefaultClient.post({
          service_stack: AlLocation.InsightAPI,
          version: 'v1',
          service_name: this.serviceName,
          account_id: accountId,
          path: `/validate/${awsRole.platform_type}/${awsRole.role_type}`,
      });
      return validate as AWSRoleValidationResponse;
  }
}

export const themisClient = new ThemisClient();
