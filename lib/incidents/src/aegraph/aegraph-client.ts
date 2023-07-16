import { AlDefaultClient } from '@al/core';

export class AegraphClientInstance {
    private serviceName = 'aegraph';

    public constructor() {
    }

    public async getByRange(cid: number, timestamp: { start: number, end: number }, filters?: {[k:string]:string}): Promise<any> {
        return AlDefaultClient.get<any>({
            service_name: this.serviceName,
            path: `/${cid}/graphs/`,
            version: 'v1',
            params: {
                start_ts: timestamp.start,
                end_ts: timestamp.end,
                ...filters
            },
        });
    }
}

