import { AlDefaultClient } from '../../client/al-api-client';
import { AxiosResponse } from 'axios';
import { AlBaseError } from '../errors';

export function normalizeError( error:AxiosResponse|AlBaseError|string|any ):AlBaseError {
    if ( AlDefaultClient.isResponse( error ) ) {
        return new AlBaseError( error.statusText );
    } else if ( error instanceof AlBaseError ) {
        return error;
    } else if ( typeof( error ) === 'string' ) {
        return new AlBaseError( error );
    } else {
        return new AlBaseError( "An internal error has occurred." );
    }
}
