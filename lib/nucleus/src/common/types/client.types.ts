import { AlContextProvider } from './context.types';
import { AlEndpointDescriptor } from './network.types';

export interface AlClientDefinition {
    name:string;
    version:number;
    configurations: {[configId:string]:AlEndpointDescriptor};
    defaultConfiguration?:string;
}

/**
 * No particular client -- trickery for prototype evaluation.  DO NOT use this class directly.
 */
export abstract class AlAbstractClient {
    public static registeredAPIClients:{[apiClientId:string]:Function} = {};

    public static registerAPIClient( apiClientId:string, factory:Function ) {
        AlAbstractClient.registeredAPIClients[apiClientId] = factory;
    }
}

/**
 * Annotation for an API client class that handles interaction with an Alert Logic API
 */
export function AlClient( definition:AlClientDefinition ) {
    return function( ctor:Function ) {
        ctor.prototype.apiClientId = `${definition.name}@v${definition.version}`;
        ctor.prototype.apiClientDefinition = definition;
        AlAbstractClient.registerAPIClient( ctor.prototype.apiClientId, ctor );
    };
}
