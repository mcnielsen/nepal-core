/**
 *  FOX (Features, Options, and eXperiences) is a proposal for consolidating entitled experiences into a simple hierarchical structure.
 *  A given feature (AlFeatureNode) can contain any of the following:
 *     - options, arbitrary switches controlling limits, extensions, or flavors of a given feature;
 *     - xp (experiences), an object defining available and active experiences of that feature;
 *     - child feature nodes
 */
import { getJsonPath } from "../../common/utility";

export interface AlExperienceDescriptor {
    available:string[];
    active:string|null;
    prompt?:string;
}

export type AlOptionsDescriptor = {[option:string]:string|number|boolean};

export interface AlFeatureNode {
    xp:AlExperienceDescriptor;
    options:AlOptionsDescriptor;
    [index:string]:AlFeatureNode|AlExperienceDescriptor|AlOptionsDescriptor|undefined;
}

export class AlFoxSnapshot {

    protected root:AlFeatureNode = AlFoxSnapshot.emptyFeatureNode();

    constructor( rawData?:unknown ) {
        if ( rawData ) {
            AlFoxSnapshot.interpretFeatureNode( this.root, rawData );
        }
    }

    public static emptyFeatureNode():AlFeatureNode {
        return {
            xp: {
                available: [ "default" ],
                active: "default"
            },
            options: {}
        };
    }

    /**
     *  Unpacks an experience descriptor from raw data
     */
    public static interpretExperience( xpData:any ):AlExperienceDescriptor {
        if ( typeof( xpData ) === 'string' ) {
            return {
                "available": [ xpData ],
                "active": xpData
            };
        } else if ( typeof( xpData ) === 'boolean' ) {
            return {
                "available": [ "default" ],
                "active": "default"
            };
        } else if ( typeof( xpData ) === 'object' && xpData !== null && ! Array.isArray( xpData ) ) {
            const available = xpData.hasOwnProperty( "available" ) ? xpData['available'] as string[] : [];
            let active = xpData.hasOwnProperty("active" ) ? xpData['active'] as string : null;
            if ( active === null || ! available.includes( active ) ) {
                if ( available.length ) {
                    active = available[0];
                } else {
                    active = null;
                }
            }
            let prompt = xpData.hasOwnProperty("prompt") ? xpData['prompt'] as string : undefined;
            if ( prompt && ! available.includes( prompt ) ) {
                prompt = undefined;
            }
            return { available, active, prompt };
        } else {
            throw new Error("Data structure warning: experience structure ('xp') was not in a valid format." );
        }
    }

    /**
     *  Unpacks an option dictionary from raw data
     */
    public static interpretOptions( optionsData:any ):AlOptionsDescriptor {
        if ( typeof( optionsData ) === 'object' && optionsData !== null ) {
            return optionsData as AlOptionsDescriptor;
        }
        return {};
    }

    /**
     *  Unpacks a feature node from raw data.
     */
    public static interpretFeatureNode( node:AlFeatureNode, data:unknown ) {
        if ( typeof( data ) === 'string' || typeof( data ) === 'boolean' ) {
            node.xp = AlFoxSnapshot.interpretExperience( data );
            return;
        }
        if ( data === null || typeof( data ) !== 'object' || Array.isArray( data ) ) {
            throw new Error("Data structure warning: input data was not an object" );
        }
        Object.entries( data as any ).forEach( ( [ key, value ]:[ string, any ] ) => {
            if ( key === 'xp' ) {
                node.xp = AlFoxSnapshot.interpretExperience( value );
            } else if ( key === 'options' ) {
                node.options = AlFoxSnapshot.interpretOptions( value );
            } else {
                node[key] = AlFoxSnapshot.emptyFeatureNode();
                AlFoxSnapshot.interpretFeatureNode( node[key] as AlFeatureNode, value );
            }
        } );
    }

    /**
     *  Retrieves a reference to the root feature node.
     */
    public getRoot( simplify:boolean = true ):AlFeatureNode {
        if ( simplify ) {
            return this.simplify( this.root );
        }
        return this.root;
    }

    /**
     *  Retrieves a feature node by "." separated path; always returns a valid result, even if it isn't defined in the dataset (access safe).
     */
    public getFeature( featurePath:string|string[] ):AlFeatureNode {
        return getJsonPath<AlFeatureNode>( this.getRoot(), featurePath ) || AlFoxSnapshot.emptyFeatureNode();
    }

    /**
     * Retrieves a feature's experience descriptor
     */
    public getFeatureExperience( featurePath:string|string[] ):AlExperienceDescriptor {
        return this.getFeature( featurePath ).xp;
    }

    /**
     * Retrieves a feature's options dictionary
     */
    public getFeatureOptions( featurePath:string|string[] ):AlOptionsDescriptor {
        return this.getFeature( featurePath ).options;
    }

    public merge( snapshot:AlFoxSnapshot ) {
        this.innerMerge( snapshot.getRoot( false ), this.root );
    }

    protected simplify( node:AlFeatureNode ) {
        return node;
    }

    protected innerMerge( node:AlFeatureNode, target?:AlFeatureNode ) {
        target = target || this.root;
        Object.entries( node ).forEach( ( [ k, v ] ) => {
            if ( k === 'xp' && v ) {
                let xp = v as AlExperienceDescriptor;
                if ( xp.available ) {
                    xp.available.forEach( x => {
                        if ( ! target.xp.available.includes( x ) ) {
                            target.xp.available.push( x );
                        }
                    } );
                }
                if ( xp.active && target.xp.available.includes( xp.active ) ) {
                    target.xp.active = xp.active;
                }
                if ( xp.prompt && target.xp.available.includes( xp.prompt ) ) {
                    target.xp.prompt = xp.prompt;
                }
            } else if ( k === 'options' ) {
                Object.assign( target.options, v );
            } else {
                if ( target.hasOwnProperty( k ) ) {
                    this.innerMerge( v as AlFeatureNode, target[k] as AlFeatureNode );
                } else {
                    target[k] = v as AlFeatureNode;
                }
            }
        } );
    }
}
