import { AxiosResponse } from 'axios';
import { AlBaseError, AlAPIServerError, AlWrappedError } from '../common/errors';
import { AlDefaultClient, APIRequestParams } from '../client';

/**
 * AlErrorHandler is a simple utility class for normalizing errors and exceptions into a known format.
 */

export class AlErrorHandler
{
    public static upstream?:{(error:AlBaseError):void};
    public static verbose = false;

    /**
     *  Logs a normalized error message to the console.
     *
     *  @param error Can be an AxiosResponse, Error, string, or anything else (although "anything else" will be handled with a generic error message).
     */
    public static log( error:AxiosResponse|AlBaseError|Error|string|any, commentary?:string, overrideVerbosity?:boolean ) {
        let normalized = AlErrorHandler.normalize( error );
        if ( AlErrorHandler.verbose || overrideVerbosity ) {
            console.log( commentary ? `${commentary}: ${normalized.message}` : normalized.message );
        }
    }

    /**
     * Reports an error to an external error reporting service.
     */
    public static report( error:AxiosResponse|AlBaseError|Error|string|any, commentary?:string, ...details:any[] ) {
        if ( AlErrorHandler.upstream ) {
            let normalized = AlErrorHandler.normalize( error );
            AlErrorHandler.upstream( normalized );
        } else {
            AlErrorHandler.log( error, commentary, true );
        }
    }

    /**
     * Normalizes an error into an AlBaseError.
     *
     * @param error Can be an AxiosResponse (in which case the method will return an AlAPIServerError),
     *              any other Error or derived class, string, or anything.
     * @returns AlBaseError of the appropriate flavor.
     */
    public static normalize( error:AxiosResponse|AlBaseError|Error|string|any, commentary?:string ):AlBaseError {
        if ( error instanceof AlBaseError ) {
            return error;
        } else if ( AlDefaultClient.isResponse( error ) ) {
            let config = error.config as APIRequestParams;
            let serviceName = `service_name` in config ? config.service_name : config.url;
            let statusCode = `status` in error ? error.status : 0;
            let errorText = `Received an unexpected ${statusCode} (${error.statusText}) response from '${serviceName}' at '${error.config.url}'.`;
            if ( commentary ) {
                errorText = `${commentary}: ${errorText}`;
            }
            return new AlAPIServerError( errorText, serviceName, statusCode, error );
        } else if ( error instanceof Error ) {
            let message = error.message;
            if ( commentary ) {
                message = `${commentary}: ${error.message}`;
            }
            return new AlBaseError( message, error );
        } else if ( typeof( error ) === 'string' ) {
            if ( commentary ) {
                error = `${commentary}: ${error}`;
            }
            return new AlBaseError( error );
        } else {
            return new AlBaseError( commentary || `An unexpected internal error occurred.`, error );
        }
    }

    public static wrap( error:AxiosResponse|AlBaseError|Error|string|any, message:string ):AlWrappedError {
        return new AlWrappedError( message, error );
    }
}
