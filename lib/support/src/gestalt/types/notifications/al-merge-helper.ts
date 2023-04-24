/**
 * A simple utility class for translating data between objects and intermediary representations.
 * The most obvious use cases are unpacking a DTO into a class instance, or merging multiple DTOs into a complex model.
 * Mostly this class is a structured way of avoiding the endless repetition of "if x.hasOwnProperty( x )".
 */

export class AlMergeHelper {

    constructor( public source:any, public target:any ) {
    }

    /**
     * Copies one or more properties from the source into the target.
     */
    public copy( ...sourceProperties:string[] ) {
        sourceProperties.forEach( sourceProperty => {
            if ( sourceProperty in this.source ) {
                if ( typeof( this.source[sourceProperty] ) !== 'undefined' ) {
                    this.target[sourceProperty] = this.source[sourceProperty];
                }
            }
        } );
    }

    /**
     * Copies a property from the source to a different property name in the target.
     */
    public rename( sourceProperty:string, targetProperty:string ) {
        if ( sourceProperty in this.source ) {
            if ( typeof( this.source[sourceProperty] ) !== 'undefined' ) {
                this.target[targetProperty] = this.source[sourceProperty];
            }
        }
    }

    /**
     * Copies an array of properties from source to a different property name in the target.
     */
    public renameAll( ...properties:[ string, string ][] ) {
        properties.forEach( ( [ sourceProperty, targetProperty ] ) => this.rename( sourceProperty, targetProperty ) );
    }

    /**
     * Transforms a property from the source into a new property in the target.
     */
    public transform( sourceProperty:string, targetProperty:string, transformer:{(input:unknown):any} ) {
        if ( sourceProperty in this.source ) {
            if ( typeof( this.source[sourceProperty] ) !== 'undefined' ) {
                this.target[targetProperty] = transformer( this.source[sourceProperty] );
            }
        }
    }

    /**
     * Executes a callback against a property in the source object.
     */
    public with<PropertyType=any>( sourceProperty:string, action:{(value:PropertyType):void}) {
        if ( sourceProperty in this.source ) {
            if ( typeof( this.source[sourceProperty] ) !== 'undefined' ) {
                action( this.source[sourceProperty] );
            }
        }
    }

    /**
     * Creates a child merge helper that targets a child property.
     */
    public descend( sourceProperty:string, targetProperty:string|null, action:{(merger:AlMergeHelper):void} ) {
        if ( sourceProperty in this.source ) {
            if ( typeof( this.source[sourceProperty] ) !== 'undefined' ) {
                if ( targetProperty && ! ( targetProperty in this.target ) ) {
                    this.target[targetProperty] = {};
                }
                const target = targetProperty ? this.target[targetProperty] : this.target;
                action( new AlMergeHelper( this.source[sourceProperty], target ) );
            }
        }
    }
}
