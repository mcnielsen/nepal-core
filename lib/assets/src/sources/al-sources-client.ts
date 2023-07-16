/**
 * Module to deal with available Sources Public API endpoints
 */
import {
    AlDefaultClient,
} from '@al/core';

import {
    EnvironmentCredential,
    EnvironmentSource
} from './types';

export class AlSourcesClientInstance {

    private serviceName = 'sources';
    /* istanbul ignore next */
    constructor() {
    }

    async getSources(accountId: string, filters?: string): Promise<EnvironmentSource[]>{
        const sources = await AlDefaultClient.get({
            service_name: this.serviceName,
            account_id: accountId,
            path: '/sources',
            params: filters,
            version: 1
        });
        return sources as EnvironmentSource[];
    }

    async getSource(accountId: string, sourceId: string): Promise<EnvironmentSource> {
        const source = await AlDefaultClient.get({
            service_name: this.serviceName,
            account_id: accountId,
            path: `/sources/${sourceId}`,
            version: 1
        });
        return source as EnvironmentSource;
    }

    async createSource(accountId: string, source: EnvironmentSource): Promise<EnvironmentSource> {
        const create = await AlDefaultClient.post({
            service_name: this.serviceName,
            account_id: accountId,
            path: '/sources',
            data: source,
            version: 1
        });
        return create as EnvironmentSource;
    }

    async replaceSource(accountId: string, sourceId: string, source: EnvironmentSource): Promise<EnvironmentSource> {
        const replacedSource = await AlDefaultClient.put({
            service_name: this.serviceName,
            account_id: accountId,
            path: `/sources/${sourceId}`,
            data: source,
            version: 1
        });
        return replacedSource as EnvironmentSource;
    }

    async deleteSource(accountId: string, sourceId: string): Promise<void> {
        return await AlDefaultClient.delete({
            service_name: this.serviceName,
            account_id: accountId,
            path: `/sources/${sourceId}`,
            version: 1
        });
    }

    async deleteAllSources(accountId: string, filters?: string): Promise<void> {
         return await AlDefaultClient.delete({
            service_name: this.serviceName,
            account_id: accountId,
            path: '/sources',
            params: filters,
            version: 1
        });
    }

    async getCredentials(accountId: string, filters?: string): Promise<EnvironmentCredential[]> {
        const sources = await AlDefaultClient.get({
            service_name: this.serviceName,
            account_id: accountId,
            path: '/credentials',
            params: filters,
            version: 1
        });
        return sources as EnvironmentCredential[];
    }

    async getCredential(accountId: string, credentialId: string): Promise<EnvironmentCredential> {
        const source = await AlDefaultClient.get({
            service_name: this.serviceName,
            account_id: accountId,
            path: `/credentials/${credentialId}`,
            version: 1
        });
        return source as EnvironmentCredential;
    }

    async createCredential(accountId: string, credential: EnvironmentCredential): Promise<EnvironmentCredential> {
        const create = await AlDefaultClient.post({
            service_name: this.serviceName,
            account_id: accountId,
            path: '/credentials',
            data: credential,
            version: 1
        });
        return create as EnvironmentCredential;
    }

    async replaceCredential(accountId: string, sourceId: string, credential: EnvironmentCredential): Promise<EnvironmentCredential> {
        const replacedCredential = await AlDefaultClient.put({
            service_name: this.serviceName,
            account_id: accountId,
            path: `/credentials/${sourceId}`,
            data: credential,
            version: 1
        });
        return replacedCredential as EnvironmentCredential;
    }

    async deleteCredential(accountId: string, credentialId: string, filters?: string): Promise<void> {
        return await AlDefaultClient.delete({
            service_name: this.serviceName,
            account_id: accountId,
            path: `/credentials/${credentialId}`,
            params: filters,
            version: 1
        });
    }
}
