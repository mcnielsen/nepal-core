import { getJsonPath } from './json-utilities';
import { AlDataValidationError } from '../errors/al-error.types';
import * as tv4 from 'tv4';

/**
 * Provides an interface for API clients or other services that can provide validation schemas.
 * A validation schema is just a JSON object describing a data structure according to the JSON Schema
 * v4 specification.
 */
export interface AlValidationSchemaProvider {
    hasSchema: ( schemaId:string ) => boolean;
    getSchema: ( schemaId:string ) => Promise<any>;
    getProviders?: () => AlValidationSchemaProvider[];
}

interface TV4Error {
    code:number;
    message: string;
    dataPath: string;
    schemaPath: string;
}

export interface AlValidationResponse {
    valid: boolean;
    error?: TV4Error;
    missing?: string[];
}

/**
 * The workhorse class that actually performs validation.
 */
export class AlJsonValidator {

    protected static validationApi:any;

    protected providers:AlValidationSchemaProvider[] = [];

    constructor( ...initialProviders:AlValidationSchemaProvider[] ) {
        this.addProviders( ...initialProviders );
        if ( ! AlJsonValidator.validationApi ) {
            AlJsonValidator.validationApi = tv4.freshApi();
        }
    }

    public async test( target:any, schemaId:string ):Promise<AlValidationResponse> {
        let [ baseSchemaId, definitionId ] = schemaId.split("#");
        let schema = await this.findSchema( baseSchemaId );
        if ( definitionId ) {
            schema = getJsonPath( schema, definitionId.replace( /\//g, "." ) );
            if ( ! schema ) {
                throw new Error( `The schema '${baseSchemaId}' does not contain a definition at path '${definitionId}'` );
            }
        }
        let result = AlJsonValidator.validationApi.validateResult( target, schema, true, false ) as AlValidationResponse;
        return result;
    }

    /**
     * Adds a single schema provider to the list of registered providers
     */
    public addProvider( provider:AlValidationSchemaProvider ) {
        this.providers.push( provider );
        if ( 'getProviders' in provider ) {
            this.addProviders( ...provider.getProviders() );
        }
    }

    /**
     * Adds multiple schema providers to the list of registered providers
     */
    public addProviders( ...providers:AlValidationSchemaProvider[] ) {
        providers.forEach( provider => this.addProvider( provider ) );
    }

    /**
     * Retrieves a schema from a schema provider.
     */
    protected async findSchema( schemaId:string ):Promise<any> {
        let originProvider = this.providers.find( provider => provider.hasSchema( schemaId ) );
        if ( ! originProvider ) {
            throw new Error(`Required schema '${schemaId}' could not be found.` );
        }
        let schema = await originProvider.getSchema( schemaId );
        AlJsonValidator.validationApi.addSchema( schemaId, schema );
        let missing = AlJsonValidator.validationApi.getMissingUris() as string[];
        if ( missing && missing.length ) {
            await Promise.all( missing.map( missingSchemaId => this.findSchema( missingSchemaId ) ) );  //  economical, no?
        }
        return schema;
    }
}
