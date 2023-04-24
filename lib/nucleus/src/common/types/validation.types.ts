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
