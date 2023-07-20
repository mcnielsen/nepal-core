import { 
    AIMSSessionDescriptor,
    AlAbstractClient, 
    AlNetworkRequestDescriptor,
    AlNetworkResponse,
    AlLocatorMatrix,
    AlLocationContext,
    AlLocationDictionary,
    AlLocationDescriptor,
    AlTriggerStream, 
    AlEventStream, 
    AlTriggeredEventCallback, 
    AlTriggeredEvent, 
    AlTriggerSubscription ,
    AlParamPreservationRule,
    AlContextProvider,
    ConfigOption,
} from '../common';
import { RootClient } from '../client';

import { AlSessionInstance } from '../session/al-session';
import { initializeAlGlobals } from './globals';

export abstract class AlExecutionContext 
                    extends AlEventStream 
                    implements AlContextProvider 
{
    protected static defaultContext?:AlExecutionContext;

    public get environment() { return this.locatorService?.environment ?? 'production'; }
    public get residency() { return this.locatorService?.residency ?? 'US' ; }
    public get locationId() { return this.locatorService?.locationId ?? 'unspecified'; }
    public get accessibleLocationIds() { return this.locatorService?.accessibleLocationIds ?? []; }
    public defaultAccountId?:string;

    protected defaultOptions:{[optionKey:string]:string|number|boolean|unknown} = {
        'session_via_gestalt': false,
        'session_gestalt_domain': 'cd17:accounts',
        'session_metadata': true,
        'session_consolidated_resolver': false,
        'disable_endpoints_resolution': false,
        'xcontent_local': false,
        'xcontent_asset_path': '/assets/content',
        'navigation_use_conduit': false,
        'navigation_use_gestalt': true,
        'navigation_asset_path': 'assets/navigation',
        'navigation_default_authentication': null,
        'navigation_debug': false,
        'headless': false,
        'headless_uri': '',
        'strict_collision_handling': true,
    };

    protected options:{[optionKey:string]:string|number|boolean|unknown} = Object.assign( {}, this.defaultOptions );
    protected paramPreservationZones:{[zoneKey:string]:AlParamPreservationRule} = {};
    protected clientInstances:{[clientId:string]:AlAbstractClient} = {};
    protected data:{[item:string]:any} = {};
    protected locatorService?:AlLocatorMatrix;
    protected sessionInstance?:AlSessionInstance;
    protected context = {
        environment: "production",
        residency: "US",
        locationId: undefined,
        accessibleLocationIds: []
    };
    protected provisionalToken?:string;

    constructor( options?:{[optionKey:string]:string|number|boolean|unknown} ) {
        super();
        if ( ! AlExecutionContext.defaultContext ) {
            AlExecutionContext.defaultContext = this;
        }
        this.setOptions( options );
        this.sessionInstance = new AlSessionInstance( this );
        initializeAlGlobals( this.sessionInstance, this.locator, this.client( RootClient ) );
    }

    public static getOption<ValueType=any>( option:ConfigOption, defaultValue?:ValueType ):ValueType|undefined {
        return AlExecutionContext.default.getOption<ValueType>( option, defaultValue ) ?? defaultValue;
    }

    public static setOption<ValueType=any>( option:ConfigOption, value:ValueType ) {
        return AlExecutionContext.default.setOption<ValueType>( option, value );
    }

    public static findParamPreservationRule( path:string ):AlParamPreservationRule|null {
        return AlExecutionContext.default.findParamPreservationRule( path ) ?? null;
    }

    public static on<EventType extends AlTriggeredEvent>( eventType:Function, callback: AlTriggeredEventCallback<EventType> ):AlTriggerSubscription<EventType> {
        return AlExecutionContext.default.on<EventType>( eventType, callback );
    }

    public static resolveURL( locationId:string, path?:string, queryParams?:{[parameterId:string]:string|number|boolean|null}, context?:AlLocationContext ) {
        return AlExecutionContext.default.resolveURL( locationId, path, queryParams, context );
    }

    public static resolveNodeByURI( uri:string ):AlLocationDescriptor|undefined {
        return AlExecutionContext.default.resolveNodeByURI( uri );
    }

    public static resolveNode( locationTypeId:string ):AlLocationDescriptor|undefined {
        return AlExecutionContext.default.resolveNode( locationTypeId );
    }

    public static get environment():string {
        return AlExecutionContext.default.environment;
    }

    public static get residency():string {
        return AlExecutionContext.default.residency;
    }

    public static get locationId():string {
        return AlExecutionContext.default.locationId;
    }

    public static get accessibleLocationIds() { 
        return AlExecutionContext.default.accessibleLocationIds; 
    }

    public static target( environment?:string|AlLocationContext, residency?:"US"|"EMEA"|string, locationId?:string, accessibleLocationIds?:string[] ) {
        return AlExecutionContext.default.target( environment, residency, locationId, accessibleLocationIds );
    }

    public static reset() {
        return AlExecutionContext.default.reset();
    }

    public static get locator():AlLocatorMatrix {
        return AlExecutionContext.default.locator;
    }

    public static get session():AlSessionInstance {
        return AlExecutionContext.default.sessionInstance;
    }

    public static get default():AlExecutionContext {
        if ( ! AlExecutionContext.defaultContext ) {
            throw new Error(`Please instantiate an appropriate execution context before using this functionality.` );
        }
        return AlExecutionContext.defaultContext;
    }

    public static client<ClientType extends AlAbstractClient>( clientClass: new() => ClientType ):ClientType {
        return AlExecutionContext.default.client( clientClass );
    }

    public resolveNode( locationTypeId:string ):AlLocationDescriptor|undefined {
        return this.locator.getNode( locationTypeId );
    }

    public resolveNodeByURI( uri:string ):AlLocationDescriptor|undefined {
        return this.locator.getNodeByURI( uri );
    }

    public resolveURL( locationId:string, path?:string, queryParams?:{[parameterId:string]:string|number|boolean|null}, context?:AlLocationContext ) {
        let uri = this.locator.resolveURL( locationId, path, context );
        if ( queryParams ) {
            uri = uri + "?" +
                Object.entries(queryParams)
                    .map( ( [ p, v ] ) => {
                        if ( typeof( v ) === 'undefined' ) {
                            return null;
                        } else if ( Array.isArray( v ) ) {
                            return `${p}=${v.map( ( arrayValue ) => arrayValue ? encodeURIComponent( arrayValue.toString() ) : "null" ).join("&")}`;
                        } else {
                            return `${p}=${encodeURIComponent( typeof( v ) === 'string' ? v : v.toString() )}`;
                        }
                    } )
                    .filter( p => p )
                    .join("&");
        }
        return uri;
    }

    public setProvisionalToken( token:string ) {
        this.provisionalToken = token;
    }

    public clearProvisionalToken() {
        this.provisionalToken = undefined;
    }

    public getAIMSToken():string|undefined {
        if ( this.sessionInstance && this.sessionInstance.isActive() ) {
            return this.sessionInstance.getToken();
        }
        if ( this.provisionalToken ) {
            return this.provisionalToken;
        }
        return undefined;
    }

    public get locator():AlLocatorMatrix {
        if ( ! this.locatorService ) {
            this.locatorService = new AlLocatorMatrix( AlLocationDictionary, true );
        }
        return this.locatorService;
    }

    public get session():AlSessionInstance {
        if ( ! this.sessionInstance ) {
            this.sessionInstance = new AlSessionInstance( this );
        }
        return this.sessionInstance;
    }

    public getDataItem<Type=any>( itemName:string, defaultValue?:Type|{():Type} ) {
        if ( ! ( itemName in this.data ) ) {
            if ( defaultValue instanceof Function ) {
                this.data[itemName] = defaultValue();
            } else if ( typeof( defaultValue ) === 'object' ) {
                this.data[itemName] = defaultValue;
            } else if ( defaultValue ) {
                throw new Error(`Invalid usage: contextual data must be an object literal` );
            }
        }
        return this.data[itemName] as Type;
    }

    public setDataItem<Type=any>( itemName:string, value:Type|{():Type}, persistFor:number = 0 ) {
        if ( value instanceof Function ) {
            this.data[itemName] = value();
        } else {
            this.data[itemName] = value;
        }
    }

    /**
     * Focuses the context around a specific environment.  
     */
    public target( envContextOrURL?:string|AlLocationContext, 
                   residency?:"US"|"EMEA"|string,
                   locationId?:string,
                   accessibleLocationIds?:string[] ) {
        if ( typeof( envContextOrURL ) === 'string' ) {
            if ( envContextOrURL.startsWith("http://") || envContextOrURL.startsWith("https://") ) {
                this.locatorService.setActingUrl( envContextOrURL );
            } else {
                this.locatorService.target( { environment: envContextOrURL, residency, locationId, accessibleLocationIds } );
            }
        } else if ( typeof( envContextOrURL ) === 'object' && envContextOrURL !== null ) {
            this.locatorService.target( envContextOrURL );
        }
    }

    public setOption<ValueType=any>( option:ConfigOption, value:ValueType ):AlExecutionContext {
        this.options[option] = value;
        return this;
    }

    public setOptions( options?:{[optionKey:string]:string|number|boolean|unknown} ) {
        if ( options ) {
            Object.entries( option => ( [ optKey, optValue ] ) => this.setOption( optKey, optValue ) );
        }
    }

    public getOption<ValueType=any>( option:ConfigOption, defaultValue?:ValueType ):ValueType|undefined {
        if ( ( option as string ) in this.options ) {
            return this.options[option] as ValueType;
        }
        return defaultValue;
    }

    public getOptions() {
        return this.options;
    }

    public reset() {
        this.options    =   Object.assign( {}, this.defaultOptions );
        this.data       =   {};
        if ( this.locatorService ) {
            this.locatorService.reset();
        }
    }

    /*
    public remapLocation( locationTypeId:string, baseURL:string, environment?:string, residency?:string ) {
        AlLocatorService.remapLocationToURI( locationTypeId, baseURL, environment, residency );
    }
    */

    public useLocalContent( assetBasePath:string = 'assets/external' ):AlExecutionContext {
        this.setOption( ConfigOption.LocalManagedContent, true );
        this.setOption( ConfigOption.NavigationViaGestalt, false );
        this.setOption( ConfigOption.NavigationViaConduit, false );
        this.setOption( ConfigOption.ManagedContentAssetPath, assetBasePath );
        this.setOption( ConfigOption.NavigationAssetPath, `${assetBasePath}/navigation` );
        return this;
    }

    /**
     * Sets the map of parameter preservation rules for consumption by the navigation layer.
     */
    public setParamPreservationRules( rulesMap: { [zoneKey: string]: AlParamPreservationRule } ):AlExecutionContext {
        Object.entries( rulesMap ).forEach( ( [ zoneKey, rule ] ) => {
            this.paramPreservationZones[zoneKey] = rule;
        } );
        return this;
    }

    /**
     * Saves a parameter preservation rule for consumption by the navigation layer.
     */
    public addParamPreservationRule( zoneKey:string, rule:AlParamPreservationRule ) {
        this.paramPreservationZones[zoneKey] = rule;
        return this;
    }

    /**
     * Removes a parameter preservation rule
     */
    public removeParamPreservationRule( zoneKey:string ) {
        delete this.paramPreservationZones[zoneKey];
        return this;
    }

    /**
     * Finds the parameter preservation rule that should apply to a given path (used by navigation layer)
     */
    public findParamPreservationRule( path:string ):AlParamPreservationRule|null {
        return Object.values( this.paramPreservationZones )
                    .find( zone => zone.applyTo.some( pathMatcher => pathMatcher.test( path ) ) );
    }

    public client<ClientType extends AlAbstractClient>( clientClass: new() => ClientType ):ClientType {
        if ( ! clientClass.prototype.apiClientId ) {
            throw new Error(`Cannot instantiate an API client without an '@AlApiClient' annotation` );
        }
        if ( ! ( clientClass.prototype.apiClientId in this.clientInstances ) ) {
            const instance:ClientType = new clientClass();
            ( instance as any ).context = this;
            this.clientInstances[clientClass.prototype.apiClientId] = instance;
        }
        return this.clientInstances[clientClass.prototype.apiClientId] as ClientType;
    }

    abstract base64Decode( input:string ):string;
    abstract base64Encode( input:string ):string;
    abstract handleRequest<YieldType=any>( request:AlNetworkRequestDescriptor ):Promise<AlNetworkResponse<YieldType>>;
}

export function client<ClientType extends AlAbstractClient>( clientClass: new() => ClientType, context?:AlExecutionContext ):ClientType {
    context = context || AlExecutionContext.default;
    return context.client( clientClass );
}
