import { AlLocation, AlLocationContext, AlLocationDescriptor, AlInsightLocations } from './al-locator.types';

type UriMappingItem =
{
    location:AlLocationDescriptor,
    matcher?:RegExp,
    matchExpression:string
};

/**
 * @public
 *
 * This class accepts a list of location descriptors, an acting URL, and an optional context specification, and provides the ability
 * to calculate environment- and residency- specific target URLs.
 */
export class AlLocatorMatrix
{
    public static totalTime = 0;
    public static totalSeeks = 0;

    private actingUri:string|undefined;
    private actor:AlLocationDescriptor|undefined;

    private uriMap:{[pattern:string]:UriMappingItem[]} = {};
    private nodeCache:{[locTypeId:string]:AlLocationDescriptor} = {};
    private nodeDictionary:{[hashKey:string]:AlLocationDescriptor} = {};

    private context:AlLocationContext = {
        environment:        "production",
        residency:          "US",
        insightLocationId:  undefined,
        accessible:         undefined
    };


    constructor( nodes:AlLocationDescriptor[] = [], actingUri:string|boolean = true, context?:AlLocationContext ) {
        if ( context ) {
            this.setContext( context );
        }
        if ( nodes && nodes.length ) {
            this.setLocations( nodes );
        }
        if ( typeof( actingUri ) === 'boolean' || actingUri ) {
            this.setActingUri( actingUri );
        }
    }

    /**
     * Resets locator state to its "factory presets"
     */
    public reset() {
        this.nodeCache = {};
        this.context = {
            environment:        "production",
            residency:          "US",
            insightLocationId:  undefined,
            accessible:         undefined
        };
        this.actingUri = undefined;
    }

    /**
     * Retrieves the ID of the environment associated with the current acting URL.
     */
    public getCurrentEnvironment():string {
        return this.context.environment || "production";
    }

    /**
     * Retrieves the current residency (US or EMEA)
     */
    public getCurrentResidency():string {
        return this.context.residency || "US";
    }

    /**
     * Arguably the only important general-purpose functionality of this service.
     * Calculates a URL from a location identifier, an optional path fragment, and an optional context.
     *
     * @returns The resulting URL.
     */
    public resolveURL( locTypeId:string, path?:string, context?:AlLocationContext ) {
        const loc = this.getNode( locTypeId, context );
        let url:string;
        if ( loc ) {
            url = loc.uri;
            //  For historical reasons, some nodes (like auth0) are represented without protocols (e.g., alertlogic-integration.auth0.com instead of https://alertlogic-integration.auth0.com).
            //  For the purposes of resolving functional links, detect these protocolless domains and add the default https:// protocol to them.
            if ( ! url.startsWith("http") ) {
                url = `https://${url}`;
            }
            if ( loc && loc === this.actor && this.context.path ) {
                url += `/${this.context.path}`;
            }
        } else {
            /* istanbul ignore else */
            if ( typeof( window ) !== 'undefined' ) {
                url = window.location.origin + ( ( window.location.pathname && window.location.pathname.length > 1 ) ? window.location.pathname : '' );
            } else {
                url = "http://localhost:9999";
            }
        }
        if ( path ) {
            url += path;        //  wow, that `const` keyword is so useful!  except not.
        }
        return url;
    }

    /**
     *  Resolves a literal URI to a service node.
     */
    public getNodeByURI( targetURI:string ):AlLocationDescriptor|undefined {
        let start = this.timestamp(0);
        let result:AlLocationDescriptor|undefined = undefined;
        Object.entries( this.uriMap ).find( ( [ keyword, candidates ] ) => {
            if ( targetURI.includes( keyword ) ) {
                let hit = candidates.find( candidate => {
                    if ( candidate.location.inert ) {
                        return false;
                    }
                    if ( targetURI.startsWith( candidate.matchExpression ) ) {
                        return true;        //  exact match
                    }
                    if ( ! candidate.matcher ) {
                        candidate.matcher = new RegExp( this.escapeLocationPattern( candidate.matchExpression ) );
                    }
                    if ( candidate.matcher.test( targetURI ) ) {
                        return true;        //  matched by regular expression
                    }
                    return false;
                } );
                if ( hit ) {
                    result = hit.location;
                    const baseUrl = this.getBaseUrl( targetURI );
                    if ( baseUrl !== result.uri ) {
                        result.originalUri = result.uri;
                        result.uri = baseUrl;
                    }
                    return true;
                }
            }
            return false;
        } );

        let duration = this.timestamp( 1000 ) - start;
        AlLocatorMatrix.totalTime += duration;
        AlLocatorMatrix.totalSeeks++;

        return result;
    }

    /**
     *  Gets the currently acting node.
     */
    public getActingNode():AlLocationDescriptor|undefined {
        return this.actor;
    }

    /**
     *  @deprecated
     *
     *  Nested nodes (e.g., an application living inside another application) are official dead, making this method
     */
    /* tslint:disable:no-unused-variable */
    public resolveNodeURI( node:AlLocationDescriptor ):string {
        console.warn("Deprecation warning: please do not use resolveNodeURI directly; just use the location's 'uri' property." );
        return node.uri;
    }

    /**
     *  Updates the locator matrix model with a set of service node descriptors.
     *
     *  @param nodes - A list of service node descriptors.
     */
    public setLocations( nodes:AlLocationDescriptor[] ) {
        nodes.forEach( baseNode => {
            const environments:string[] = typeof( baseNode.environment ) !== 'undefined' ? baseNode.environment.split("|") : [ 'production' ];
            environments.forEach( environment => {
                let node:AlLocationDescriptor = Object.assign( {}, baseNode, { environment: environment } );
                //  These are the hash keys
                this.nodeDictionary[`${node.locTypeId}-*-*`] = node;
                this.nodeDictionary[`${node.locTypeId}-${environment}-*`] = node;
                if ( node.residency ) {
                    this.nodeDictionary[`${node.locTypeId}-${environment}-${node.residency}`] = node;
                    if ( node.insightLocationId ) {
                        this.nodeDictionary[`${node.locTypeId}-${environment}-${node.residency}-${node.insightLocationId}`] = node;
                    }
                }
                if ( node.inert ) {
                    return;
                }

                const keyword = node.keyword || node.uri;
                if ( ! this.uriMap.hasOwnProperty( keyword ) ) {
                    this.uriMap[keyword] = [];
                }

                this.uriMap[keyword].push( {
                    location: node,
                    matchExpression: node.uri
                } );

                if ( node.aliases ) {
                    node.aliases.forEach( alias => {
                        this.uriMap[keyword].push( {
                            location: node,
                            matchExpression: alias
                        } );
                    } );
                }
            } );
        } );

        Object.values( this.uriMap ).forEach( candidates => {
            candidates.sort( ( a, b ) => ( a.location.weight || 0 ) - ( b.location.weight || 0 ) );
        } );
    }

    public remapLocationToURI( locTypeId:string, uri:string, environment?:string, residency?:string ) {
        this.nodeCache = {};    //  flush lookup cache
        const remap = ( node:AlLocationDescriptor ) => {
            node.originalUri = node.uri;
            node.uri = uri;
            node.environment = environment || node.environment;
            node.residency = residency || node.residency;
        };
        for ( let hashKey in this.nodeDictionary ) {
            if ( this.nodeDictionary.hasOwnProperty( hashKey ) ) {
                if ( this.nodeDictionary[hashKey].locTypeId === locTypeId ) {
                    remap( this.nodeDictionary[hashKey] );
                }
            }
        }
        Object.values( this.uriMap ).forEach( candidates => {
            candidates.forEach( match => {
                if ( match.location.locTypeId === locTypeId ) {
                    remap( match.location );
                }
            } );
        } );
        this.setActingUrl( true, true );
    }

    public setActingUrl( actingUri:string|boolean|undefined, forceRefresh:boolean = false ) {
        if ( actingUri === undefined ) {
            this.actingUri = undefined;
            this.actor = undefined;
            return;
        }

        if ( typeof( actingUri ) === 'boolean' ) {
            /* istanbul ignore else */
            if ( typeof( window ) !== 'undefined' ) {
                actingUri = window.location.origin + ( ( window.location.pathname && window.location.pathname.length > 1 ) ? window.location.pathname : '' );
            } else {
                actingUri = "http://localhost:9999";
            }
        }
        /**
         *  This particular piece of black magic is responsible for identifying the active node by its URI
         *  and updating the ambient context to match its environment and data residency attributes.  It is
         *  opaque for a reason :)
         */
        if ( actingUri !== this.actingUri || forceRefresh ) {
            this.actingUri = actingUri;
            this.actor = this.getNodeByURI( actingUri );
            const path = this.extractUrlPath( actingUri );
            if ( this.actor ) {
                this.setContext( {
                    path,
                    environment: this.actor.environment || this.context.environment,
                    residency: this.actor.residency || this.context.residency,
                } );
            } else {
                let environment = "production";
                if ( actingUri.startsWith("http://localhost" ) ) {
                    environment = "development";
                } else if ( actingUri.includes("product.dev.alertlogic.com") ) {
                    environment = "integration";
                }
                this.setContext( {
                    environment,
                    path,
                    residency:          "US",
                    insightLocationId:  undefined,
                    accessible:         undefined,
                } );
            }
        }
    }

    public setActingUri( actingUrl:string|boolean|undefined ) {
        return this.setActingUrl( actingUrl );
    }

    public search( filter:{(node:AlLocationDescriptor):boolean} ):AlLocationDescriptor[] {
        return Object.values( this.nodeDictionary ).filter( filter );
    }

    public findOne( filter:{(node:AlLocationDescriptor):boolean} ):AlLocationDescriptor|undefined {
        return Object.values( this.nodeDictionary ).find( filter );
    }

    /**
     *  Sets the acting context (preferred environment, data residency, location attributes).
     *  This acts as a merge against existing context, so the caller can provide only fragmentary information without borking things.
     */
    public setContext( context?:AlLocationContext ) {
        this.nodeCache = {};    //  flush lookup cache
        this.context.insightLocationId = context && context.insightLocationId ? context.insightLocationId : this.context.insightLocationId;
        this.context.accessible = context && context.accessible && context.accessible.length ? context.accessible : this.context.accessible;
        /* istanbul ignore next */
        if ( this.context.insightLocationId ) {
            let locationNode = this.findOne( n => { return n.insightLocationId === this.context.insightLocationId; } );
            if ( locationNode && locationNode.residency ) {
                this.context.residency = locationNode.residency;
            }
            //  This block defaults to setting contextual residency to match the bound location.
        }
        this.context.environment = context && context.environment ? context.environment : this.context.environment;
        this.context.residency = context && context.residency ? context.residency : this.context.residency;
        this.normalizeContext();
    }

    public getContext():AlLocationContext {
        return this.context;
    }

    /**
     *  Gets a service node by ID, optionally using a context to refine its selection logic.  The context defaults
     *  to the locator matrix instance's current context; if the default is used, the result of the lookup will be stored
     *  for performance optimization.
     *
     *  @param locTypeId - The ID of the service node to select.  See al-service-identity.ts for constant values.
     *  @param context - Additional context to shape the selection logic.
     *
     *  @returns A node descriptor (or null, if no node matches).
     */
    public getNode( locTypeId:string, context?:AlLocationContext ):AlLocationDescriptor|null {
        if ( this.nodeCache.hasOwnProperty( locTypeId ) && !context ) {
            return this.nodeCache[locTypeId];
        }
        let environment = context && context.environment ? context.environment : this.context.environment;
        let residency = context && context.residency ? context.residency : this.context.residency;
        let insightLocationId = context && context.insightLocationId ? context.insightLocationId : this.context.insightLocationId;
        let accessible = context && context.accessible ? context.accessible : this.context.accessible;
        let node = null;

        if ( insightLocationId ) {
            if ( this.nodeDictionary.hasOwnProperty( `${locTypeId}-${environment}-${residency}-${insightLocationId}` ) ) {
                node = this.nodeDictionary[`${locTypeId}-${environment}-${residency}-${insightLocationId}`];
            }
        }

        if ( ! node && accessible && accessible.length ) {
            for ( let i = 0; i < accessible.length; i++ ) {
                let accessibleLocationId = accessible[i];
                if ( accessibleLocationId !== insightLocationId ) {
                    if ( this.nodeDictionary.hasOwnProperty( `${locTypeId}-${environment}-${residency}-${accessibleLocationId}` ) ) {
                        node = this.nodeDictionary[`${locTypeId}-${environment}-${residency}-${accessibleLocationId}`];
                    }
                }
            }
        }
        if ( ! node && environment && residency && this.nodeDictionary.hasOwnProperty( `${locTypeId}-${environment}-${residency}`) ) {
            node = this.nodeDictionary[`${locTypeId}-${environment}-${residency}`];
        }
        if ( ! node && environment && this.nodeDictionary.hasOwnProperty( `${locTypeId}-${environment}-*`) ) {
            node = this.nodeDictionary[`${locTypeId}-${environment}-*`];
        }
        if ( ! node && this.nodeDictionary.hasOwnProperty( `${locTypeId}-*-*`) ) {
            node = this.nodeDictionary[`${locTypeId}-*-*`];
        }
        if ( node && ! context ) {
            //  Save it in a dictionary for faster lookup next time
            this.nodeCache[locTypeId] = node;
        }

        return node;
    }

    /**
     * Traps the pathname portion of a URI
     */
    protected extractUrlPath( url:string ):string|undefined {
        let match = url.match( /https?:\/\/[^\/]+\/(.*)/ );
        if ( match && match.length === 2 ) {
            return match[1];
        }
        return undefined;
    }

    /**
     * Escapes a domain pattern.
     *
     * All normal regex characters are escaped; * is converted to [a-zA-Z0-9_]+; and the whole expression is wrapped in ^....*$.
     */
    protected escapeLocationPattern( uri:string ):string {
        let pattern = "^" + uri.replace(/[-\/\\^$.()|[\]{}]/g, '\\$&');     //  escape all regexp characters except *, add anchor
        pattern = pattern.replace( /\*/g, "([a-zA-Z0-9_\-]+)" );            //  convert * wildcard into group match with 1 or more characters
        pattern += ".*$";                                                   //  add filler and terminus anchor
        return pattern;
    }

    /**
     * Chops off fragments, query strings, and any trailing slashes, and returns what *should* be just the base URL.
     * I make no promises about the quality of this code when confronted with incorrect or incomplete inputs.
     */
    protected getBaseUrl( uri:string ):string {
        const matches = /(^https?:\/\/[a-zA-Z0-9_\-\.:]+)(.*$)/.exec( uri );
        if ( matches ) {
            return matches[1];
        }
        if ( uri.indexOf("#") !== -1 ) {
            uri = uri.substring( 0, uri.indexOf("#") );
        }
        if ( uri.indexOf("?") !== -1 ) {
            uri = uri.substring( 0, uri.indexOf("?" ) );
        }
        if ( uri.length > 0 && uri[uri.length-1] === '/' ) {
            uri = uri.substring( 0, uri.length - 1 );
        }
        return uri;
    }

    /**
     * This method normalizes the current context.  In practice, this means mapping an insight location ID to the correct defender datacenter.
     * In other words, it is "black magic."  Or at least, dark gray.
     */
    protected normalizeContext() {
        if ( ! this.context.insightLocationId || ! this.context.accessible ) {
            return;
        }
        if ( ! AlInsightLocations.hasOwnProperty( this.context.insightLocationId ) ) {
            return;
        }
        const insightLocation = AlInsightLocations[this.context.insightLocationId];
        if ( insightLocation.alternatives ) {
            let selected = null;
            for ( let i = 0; i < insightLocation.alternatives.length; i++ ) {
                let candidateLocationId = insightLocation.alternatives[i];
                if ( this.context.accessible.indexOf( candidateLocationId ) !== -1 ) {
                    selected = candidateLocationId;
                    break;
                }
            }
            if ( selected === null ) {
                selected = insightLocation.alternatives[0];
            }
            this.context.insightLocationId = selected;
        }
        if ( insightLocation.residency && this.context.residency !== insightLocation.residency ) {
            //  Location IDs have higher specificity than residency settings, so given defender-uk-newport and residency: US, the residency should be overridden to reflect EMEA.
            this.context.residency = insightLocation.residency;
        }
    }

    protected timestamp( defaultValue:number ):number {
        return typeof( window ) !== 'undefined' && window.hasOwnProperty("performance") ? window.performance.now() : defaultValue;
    }
}

