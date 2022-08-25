import { AxiosResponse } from 'axios';
import { AlBaseError, AlAPIServerError, AlWrappedError } from './types';

/**
 * AlErrorHandler is a simple utility class for normalizing errors and exceptions into a known format.
 */

export class AlErrorHandler
{
    /**
     *  Logs a normalized error message to the console.
     *
     *  @param error Can be an AxiosResponse, Error, string, or anything else (although "anything else" will be handled with a generic error message).
     */
    public static log( error:AxiosResponse|AlBaseError|Error|string|any, commentary?:string ) {
        let normalized = AlErrorHandler.normalize( error );
        console.log( commentary ? `${commentary}: ${normalized.message}` : normalized.message );
    }

    /**
     * Type guard: object is an AxiosResponse
     */
    public static isResponse( instance:any ):instance is AxiosResponse {
        if ( typeof( instance ) === 'object' && instance !== null
                && 'status' in instance && 'statusText' in instance && 'headers' in instance && 'config' in instance ) {
            return true;
        }
        return false;
    }

    /**
     * Normalizes an error into an AlBaseError.
     *
     * @param error Can be an AxiosResponse (in which case the method will return an AlAPIServerError),
     *              any other Error or derived class, string, or anything.
     * @returns AlBaseError of the appropriate flavor.
     */
    public static normalize( error:AxiosResponse|AlBaseError|Error|string|any ):AlBaseError {
        if ( error instanceof AlBaseError ) {
            return error;
        } else if ( AlErrorHandler.isResponse( error ) ) {
            let config = error.config as any;
            let serviceName = `service_name` in config ? config.service_name : config.url;
            let statusCode = `status` in error ? error.status : 0;
            let errorText = `Received an unexpected ${statusCode} (${error.statusText}) response from '${serviceName}' at '${error.config.url}'.`;
            return new AlAPIServerError( errorText, serviceName, statusCode, error );
        } else if ( error instanceof Error ) {
            return new AlBaseError( error.message, error );
        } else if ( typeof( error ) === 'string' ) {
            return new AlBaseError( error );
        } else {
            console.log("Not sure how to convert this to an error: ", error );
            return new AlBaseError( `An unexpected internal error occurred.`, error );
        }
    }

    public static wrap( error:AxiosResponse|AlBaseError|Error|string|any, message:string ):AlWrappedError {
        return new AlWrappedError( message, error );
    }
}
