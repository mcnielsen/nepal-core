/**
 * This cluster of functions is intended to ease manipulation of deeply nested structures that are untyped or only partially typed.
 *
 * `getJsonPath` retrieves a value from a deeply nested object.
 * `setJsonPath` sets a value into a deeply nested object.
 * `deepMerge` collapses
 */
export function getJsonPath<Type=any>( target:any, path:string|string[], defaultValue?:Type ):Type|undefined {
    if ( typeof( target ) === 'object' && target !== null ) {
        if ( typeof( path ) === 'string' ) {
            path = path.split(".") || [];
        }
        let element = path.shift();
        if ( element && target.hasOwnProperty( element ) ) {
            if ( path.length === 0 ) {
                return target[element] as Type;
            } else {
                return getJsonPath<Type>( target[element], path, defaultValue );
            }
        }
    }
    return defaultValue;
}

export function setJsonPath<Type=any>( target:any, path:string|string[], value:Type ):Type|undefined {
    if ( typeof( target ) === 'object' && target !== null ) {
        if ( typeof( path ) === 'string' ) {
            path = path.split(".") || [];
        }
        let element = path.shift() as string;
        if ( element && path.length === 0 ) {
            let previousValue = target.hasOwnProperty( element ) ? target[element] as Type : undefined;
            target[element] = value;
            return previousValue;
        } else {
            if ( target.hasOwnProperty( element ) ) {
                if ( typeof( target[element] ) !== 'object' || target[element] === null ) {
                    console.warn(`Property collision: deep set to non-object property '${element}' will overwrite previous value.` );
                    target[element] = {};
                }
            } else {
                target[element] = {};
            }
            return setJsonPath<Type>( target[element], path, value );
        }
    }
    return undefined;
}

export function deepMerge( target:any, ...imports:any[] ):any {
    let smoosher = ( target:any, source:any ) => {
        if ( source && typeof( source ) === 'object' ) {
            Object.entries( source ).forEach( ( [ key, value ] ) => {
                if ( typeof( value ) === 'object' && value !== null ) {
                    if ( Array.isArray( value ) ) {
                        target[key] = value;
                    } else if ( target.hasOwnProperty( key ) && ( typeof( target[key] ) !== 'object' || target[key] === null ) ) {
                        target[key] = {};
                    }
                    if ( ! target.hasOwnProperty( key ) ) {
                        target[key] = {};
                    }
                    smoosher( target[key], value );
                } else {
                    target[key] = value;
                }
            } );
        }
    };
    imports.forEach( importObject => smoosher( target, importObject ) );
    return target;
}
