/**
 * Author: Kevin <knielsen@alertlogic.com>
 * Copyright 2021 Alert Logic, Inc.
 */

/**
 * @public
 *
 * Annotation for API Client classes.  Allows clients for specific APIs to be instantiated on-demand instead of during runtime initialization,
 * and allows generic methods to be defined as data instead of as a literal method.
 */

/* tslint:disable:function-name */
export function  AlAPIClientDef( apiDefinition: {
    stack:string,
    name:string,
    version:string|number,
    methods:{
        methodName:string,
        relativePath:string,
        parameters?: string[]
    }[]
} ) {
    return function( ctor:Function ) {
        ctor.prototype.apiDefinition = apiDefinition;
    };
}


