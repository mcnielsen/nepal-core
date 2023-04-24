import { AlNetworkRequestDescriptor, AlNetworkResponse } from './network.types';

/**
 * Describes a set of paths where specific query parameters should be preserved across navigation events, or removed when
 * navigation outside of the application area occurs.
 */
export interface AlParamPreservationRule {
    /**
     * One or more regexes describing logical paths to which these particular rules should be applied
     */
    applyTo:RegExp[];

    /**
     * Query parameters that should be preserved across requests
     */
    whitelist?:string[];

    /**
     * Query parameters that should be destroyed when navigating to a non-matching path
     */
    volatile?:string[];
}

/**
 * Provides a single interface to control different behaviors across Alert Logic's UI surface area.
 * Many of these are used by the navigation and generic component libraries.
 *
 *   - ConfigOption.GestaltAuthenticate - if true, indicates that AlSession should authenticate via gestalt's session proxy; otherwise,
 *      authentication is performed directly against global AIMS.  Defaults to false.
 *
 *   - ConfigOption.GestaltDomain - If the GestaltAuthenticate option is enabled, this indicates which application will proxy requests to gestalt.
 *
 *   - ConfigOption.ResolveAccountMetadata - if true, AlSession's `setActingAccount` method will retrieve metadata (entitlements and account details)
 *      for the primary and acting account before resolving.  Otherwise, `setActingAccount` will resolve immediately.  Defaults to `true`.
 *
 *   - ConfigOption.ConsolidatedAccountResolver - if true and account metadata resolution is enabled, gestalt's consolidated resolver endpoint
 *      will be used instead of individual calls to subscriptions and AIMS.  Defaults to false.
 *
 *   - ConfigOption.LocalManagedContent - controls whether AlExternalContentManagerService (@al/ng-generic-components) retrieves static content
 *      from gestalt's content endpoints, or attempts to retrieve it from local assets.  Defaults to 'false.'  This is mostly useful for testing
 *      purposes.
 *
 *   - ConfigOption.ManagedContentAssetPath - if local managed content is enabled, indicates the base path to retrieve static content from.
 *
 *   - ConfigOption.NavigationViaConduit - if enabled, AlNavigationService will attempt to retrieve navigation metadata from a conduit request
 *      (which queries console.account for a static asset).  Defaults to 'false.'
 *
 *   - ConfigOption.NavigationViaGestalt - if enabled, AlNavigationService will attempt to retrieve navigation metadata from gestalt
 *      (via AlExternalContentManagerService).  Defaults to 'true.'
 *
 *   - ConfigOption.NavigationAssetPath - if neither conduit nor gestalt navigation options are enabled, AlNavigationService falls back to retrieving
 *      local navigation metadata.  Defaults to 'assets/navigation'.
 *
 *   - ConfigOption.NavigationDefaultAuthState - tristate option indicates whether the default navigation state of the app is
 *      true (user must be authenticated to access), false (no session is required to access), or `null`, in which case the authentication property
 *      of navigational structures is used to determine which navigational options are available.  Defaults to 'null.'
 *
 *   - ConfigOption.NavigationDiagnostics - when enabled, causes the navigation layer to emit "helpful" commentary.
 *
 *   - ConfigOption.Headless and ConfigOption.ActingURI are provided to support angular universal pre-rendering, where there is no DOM
 *      and no browser context, but the libraries need to be marshalled as though there were.
 */

export enum ConfigOption {
    GestaltAuthenticate         = "session_via_gestalt",
    GestaltDomain               = "session_gestalt_domain",
    ResolveAccountMetadata      = "session_metadata",
    ConsolidatedAccountResolver = "session_consolidated_resolver",
    DisableEndpointsResolution  = "client_disable_endpoints",
    LocalManagedContent         = "xcontent_local",
    ManagedContentAssetPath     = "xcontent_asset_path",
    NavigationViaConduit        = "navigation_use_conduit",
    NavigationViaGestalt        = "navigation_use_gestalt",
    NavigationAssetPath         = "navigation_asset_path",
    NavigationDefaultAuthState  = "navigation_default_authentication",
    NavigationIntegratedAuth    = "navigation_use_integrated_auth",
    NavigationDiagnostics       = "navigation_debug",
    Headless                    = "headless",
    HeadlessActingURI           = "headless_uri",
}

/**
 * Describes the data and functionality that an execution context will provide to other services
 */
export interface AlContextProvider {
    environment:string;
    residency:string;
    locationId?:string;
    accessibleLocationIds?:string[];
    defaultAccountId?:string;

    resolveURL: (locationId:string, path?:string, queryParams?:{[paramerId:string]:string|number|boolean|null}, context?:any ) => string;
    getDataItem<Type>( itemName:string, defaultValue?:any|{():any} ):Type;
    setDataItem<Type>( itemName:string, value:Type, persistFor?:number );
    setOption<Type>( option:ConfigOption, value:Type ):void;
    getOption<Type=any>( option:ConfigOption, defaultValue?:Type ):Type;
    target( environment?:string, residency?:"US"|"EMEA"|string, locationId?:string, accessibleLocationIds?:string[] ):void;

    handleRequest<YieldType>( request:AlNetworkRequestDescriptor ):Promise<AlNetworkResponse<YieldType>>;
    base64Encode( data:string ):string;
    base64Decode( data:string ):string;
}
