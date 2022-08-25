/**
 * Author: Kevin <knielsen@alertlogic.com>
 * Copyright 2022 Alert Logic, Inc.
 */

/**
 * @public
 *
 * Annotation for API Client classes.  Allows clients for specific APIs to be instantiated on-demand instead of during runtime initialization,
 * and allows generic methods to be defined as data instead of as a literal method.
 */

export interface AlServiceDescriptor {
    service_stack?:string;
    service_name?:string;
    version?:string|number;
    residencyAware?:boolean;
}

export const serviceClientBlueprints:{[clientId:string]:{ctor:Function, definition: AlServiceDescriptor}} = {};

/* tslint:disable:function-name */
export function ServiceClient<ServiceClass=any>( definition: AlServiceDescriptor ) {
    return function( ctor:Function ) {
        ctor.prototype.clientId = definition.service_name;
        ctor.prototype.definition = definition;
        serviceClientBlueprints[definition.service_name] = { ctor, definition };
    };
}


