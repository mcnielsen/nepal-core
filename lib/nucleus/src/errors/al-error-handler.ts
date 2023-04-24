import { AlBaseError, AlWrappedError, AlNetworkResponse, AlNetworkRequestDescriptor } from '../common';
import { AlBaseAPIClient, AlAPIServerError } from '../client';

/**
 * AlErrorHandler is a simple utility class for normalizing errors and exceptions into a known format.
 */

export class AlErrorHandler
{
    /**
     *  Logs a normalized error message to the console.
     *
     *  @param error Can be a network response, Error, string, or anything else (although "anything else" will be handled with a generic error message).
     */
    public static log( error:AlNetworkResponse|AlBaseError|Error|string|any, commentary?:string ) {
        let normalized = AlErrorHandler.normalize( error );
        console.log( commentary ? `${commentary}: ${normalized.message}` : normalized.message );
    }

    public static report( error:AlNetworkResponse|AlBaseError|Error|string|any, commentary?:string ) {
        //  Placeholder
    }

    /**
     * Normalizes any error into an AlBaseError.
     *
     * @param error Can be a network response (in which case the method will return an AlAPIServerError),
     *              any other Error or derived class, string, or anything.
     * @returns AlBaseError of the appropriate flavor.
     */
    public static normalize( error:AlNetworkResponse|AlBaseError|Error|string|any ):AlBaseError {
        if ( error instanceof AlBaseError ) {
            return error;
        } else if ( AlBaseAPIClient.isResponse( error ) ) {
            let config:AlNetworkRequestDescriptor = error.request;
            let serviceName = config.endpoint?.service ?? config.url;
            let statusCode = `status` in error ? error.status : 0;
            let errorText = `Received an unexpected ${statusCode} (${error.statusText}) response from '${serviceName}'`;
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

    public static wrap( error:AlNetworkResponse|AlBaseError|Error|string|any, message:string ):AlWrappedError {
        return new AlWrappedError( message, error );
    }
}
