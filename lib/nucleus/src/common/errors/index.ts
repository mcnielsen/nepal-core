import { AlNetworkResponse, AlNetworkRequestDescriptor, isResponse } from '../types';
/**
 * A collection of classed error types.
 *
 * Author: Kevin Nielsen <knielsen@alertlogic.com>
 * Copyright 2K*

/**
 * @public
 *
 * A base error class used to provide consistent prototype chaining.
 */
export class AlError extends Error
{
    /* tslint:disable:variable-name */
    __proto__: Error;

    public static upstream?:{(error:AlError):void};

    /**
     * Optional reference to underlying Error, network request, or <any>thing that triggered this error.
     */
    public origin?:Error|AlError|unknown;
    public details?:{[key:string]:any};

    constructor( message?:string, derivedFrom?:Error|AlError|any, details?:{[key:string]:any} ) {
        const trueProto = new.target.prototype;
        super(message);
        this.origin = derivedFrom;
        this.details = details;

        this.__proto__ = trueProto;
    }

    /**
     *  Logs a normalized error message to the console.
     *
     *  @param error Can be an AxiosResponse, Error, string, or anything else (although "anything else" will be handled with a generic error message).
     */
    public static log( error:AlNetworkResponse|AlError|Error|string|any, commentary?:string, ...details:any[] ) {
        let normalized = AlError.normalize( error );
        console.log( commentary ? `${commentary}: ${normalized.message}` : normalized.message, details.length > 0 ? details : undefined, error );
    }

    /**
     * Reports an error to an external error reporting service.
     */
    public static report( error:AlNetworkResponse|AlError|Error|string|any, commentary?:string, ...details:any[] ) {
        let normalized = AlError.normalize( error, commentary, ...details );
        if ( this.upstream ) {
            this.upstream( normalized );
        }
    }

    /**
     * Normalizes anything into an AlError.
     *
     * @param error Can be an AlNetworkResponse (in which case the method will return an AlAPIServerError),
     *              any other Error or derived class, string, or anything really.
     * @returns AlError of the appropriate flavor.
     */
    public static normalize( error:AlNetworkResponse|AlError|Error|string|any, commentary?:string, ...details:any[] ):AlError {
        if ( error instanceof AlError ) {
            return error;
        } else if ( isResponse( error ) ) {
            let request = error.request as AlNetworkRequestDescriptor;
            let statusCode = `status` in error ? error.status : 0;
            if ( request && request.endpoint ) {
                let serviceName = `service` in request.endpoint ? request.endpoint.service : request.url;
                let errorText = `Received an unexpected ${statusCode} (${error.statusText}) response from '${serviceName}'.`;
                return new AlAPIServerError( errorText, serviceName, statusCode, error );
            } else {
                let errorText = `Received an unexpected ${statusCode} (${error.statusText}) response.`;
                return new AlAPIServerError( errorText, 'unknown', statusCode, error );
            }
        } else if ( error instanceof Error ) {
            return new AlError( error.message, error );
        } else if ( typeof( error ) === 'string' ) {
            return new AlError( error );
        } else {
            console.log("Not sure how to convert this to an error: ", error );
            return new AlError( `An unexpected internal error occurred.`, error );
        }
    }
}

/**
 * @public
 *
 * This error should be used when an HTTP 5xx response (or other general error) is received
 * from an internal API.
 */
export class AlAPIServerError extends AlError
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
export class AlDataValidationError extends AlError
{
    constructor( message:string,
                 public data:unknown,
                 public schemaId:string,
                 public validationErrors:any[] = [],
                 public request?:AlNetworkRequestDescriptor ) {
        super( message );
    }
}

/**
 * @deprecated
 *
 * The AlResponseValidationError is intended to alert of unexpected responses from an internal API.
 * These responses need to be identified separately from other errors so that the relevant
 * system health checks or communication with an appropriate backend team can be organized in response.
 * Please note that this should NOT be used to handler general server-side failures; please see AlAPIServerError
 * for that error condition.
 *
 * @param message - Descriptive error text
 * @param errors - Unstructured information about specific response validation issues
 */
export class AlResponseValidationError extends AlError
{
    constructor( message:string, public errors:any[] = [] ) {
        /* istanbul ignore next */
        super( message );
    }
}

/**
 * @public
 *
 * Used to indicate an invalid request to a service or API.
 *
 * @param message - The description of the error
 * @param inputType - Which type of input was malformed (e.g., query parameter, header, data)
 * @param inputProperty - Which data element was malformed (e.g., "filter", "X-AIMS-Auth-Token", ".data.accounts.id")
 * @param description - Additional descriptive content.
 */
export class AlBadRequestError extends AlError
{
    public httpResponseCode:number = 400;
    constructor( message:string,
                 public inputType?:string,
                 public inputProperty?:string,
                 public description?:string ) {
        /* istanbul ignore next */
        super( message );
    }
}

/**
 * @public
 *
 * Used to indicate that the current actor is not authenticated.
 *
 * @param message - The description of the error
 * @param authority - Which authentication authority made the authentication state claim.  Typically, this will be AIMS.
 */
export class AlUnauthenticatedRequestError extends AlError
{
    public httpResponseCode:number = 401;
    constructor( message: string,
                 public authority:string ) {
        /* istanbul ignore next */
        super( message );
    }
}

/**
 * @public
 *
 * Used to indicate that the current actor is not authorized to perform a given action.
 *
 * @param message - A general description of the error or error context.
 * @param resource - The resource that the actor is not authorized to access, e.g., "endpoints" or "deployments"
 */
export class AlUnauthorizedRequestError extends AlError
{
    public httpResponseCode:number = 403;
    constructor( message: string,
                 public resource:string ) {
        /* istanbul ignore next */
        super( message );
    }
}

/**
 * @public
 *
 * Used to indicate that the request cannot be completed because the underlying functionality is incomplete or unimplemented.
 *
 * @param message - A general description of the error or error context.
 */
export class AlUnimplementedMethodError extends AlError
{
    public httpResponseCode:number = 501;
    constructor( message:string ) {
        /* istanbul ignore next */
        super( message );
    }
}

/**
 * @public
 *
 * Used to indicate that an upstream service has failed to complete a request in the expected fashion.
 */
export class AlBadGatewayError extends AlError
{
    public httpResponseCode:number = 502;
    /* tslint:disable:no-unused-variable */
    constructor( message:string, public upstreamService:string, public requestDescriptor:unknown ) {
        /* istanbul ignore next */
        super(message);
    }
}

/**
 * @public
 *
 * Used to indicate that an upstream service is unavailable.
 */
export class AlServiceUnavailableError extends AlError
{
    public httpResponseCode:number = 503;
    /* tslint:disable:no-unused-variable */
    constructor( message:string, public upstreamService:string, public requestDescription:unknown ) {
        /* istanbul ignore next */
        super(message);
    }
}

/**
 * @public
 *
 * Used to indicate that an upstream service has failed to complete a request in a timely fashion.
 */
export class AlGatewayTimeoutError extends AlError
{
    public httpResponseCode:number = 504;
    /* tslint:disable:no-unused-variable */
    constructor( message:string, public upstreamService:string, public requestDescription:unknown ) {
        /* istanbul ignore next */
        super(message);
    }
}

/**
 * @public
 *
 * Used to indicate that a resource does not exist.
 *
 * @param message - A general description of the error and error context.
 */
export class AlNotFoundError extends AlError
{
    public httpResponseCode:number = 404;
    constructor( message:string ) {
        /* istanbul ignore next */
        super( message );
    }
}

/**
 * @public
 *
 * Used to wrap an underlying error with a human-friendly message and a reference to the original exception
 *
 * @param message - The human-friendly message
 * @param inner - the underly error
 */
export class AlWrappedError extends AlError {
    constructor( message:string, inner:any, details?:any ) {
        /* istanbul ignore next */
        super( message, inner, details );
    }

    public getInnerError():any {
        return this.origin;
    }
}
