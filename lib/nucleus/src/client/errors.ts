/**
 * Author: Kevin Nielsen <knielsen@alertlogic.com>
 * Copyright 2K* Alert Logic, Inc.
 */

import { AlBaseError, AlNetworkResponse, AlNetworkRequestDescriptor } from '../common';

/**
 * @public
 *
 * This error should be used when an HTTP 5xx response (or other general error) is received
 * from an internal API.
 */
export class AlAPIServerError extends AlBaseError
{
    constructor( message:string,
                 public serviceName:string,
                 public statusCode:number,
                 origin?:AlNetworkResponse|any ) {
        super( message, origin );
    }
}

/**
 * @public
 *
 * The AlDataValidationError is intended to alert of unexpected responses from an internal API.
 * These responses need to be identified separately from other errors so that the relevant
 * system health checks or communication with an appropriate backend team can be organized in response.
 * Please note that this should NOT be used to handler general server-side failures; please see AlAPIServerError
 * for that error condition.
 *
 * @param message - Descriptive error text
 * @param data - a reference to the data that is invalid
 * @param schemaId - The top level schema that was used to validate the data
 * @param validationErrors - Unstructured information about specific response validation issues
 * @param request - A reference to the request from which the data was retrieved (if applicable)
 */
export class AlDataValidationError extends AlBaseError
{
    constructor( message:string,
                 public data:unknown,
                 public schemaId:string,
                 public validationErrors:any[] = [],
                 public request?:AlNetworkRequestDescriptor ) {
        super( message );
    }
}

