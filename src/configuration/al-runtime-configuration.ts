import { AlLocatorService, AlLocationContext } from '../common/locator/index';

/**
 * AlRuntimeConfiguration provides a single interface to control different behaviors across Alert Logic's UI surface area.
 * Many of these are used by the navigation and generic component libraries.
 *
 *   - ConfigOption.GestaltAuthenticate - if true, indicates that AlSession should authenticate via gestalt's session proxy; otherwise,
 *      authentication is performed directly against global AIMS.  Defaults to false.
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
 */

export enum ConfigOption {
    GestaltAuthenticate         = "session_via_gestalt",
    ResolveAccountMetadata      = "session_metadata",
    ConsolidatedAccountResolver = "session_consolidated_resolver",
    DisableEndpointsResolution  = "client_disable_endpoints",
    LocalManagedContent         = "xcontent_local",
    ManagedContentAssetPath     = "xcontent_asset_path",
    NavigationViaConduit        = "navigation_use_conduit",
    NavigationViaGestalt        = "navigation_use_gestalt",
    NavigationAssetPath         = "navigation_asset_path",
    NavigationDefaultAuthState  = "navigation_default_authentication",
    NavigationIntegratedAuth    = "navigation_use_integrated_auth"
}

/**
 *
 */
export class AlRuntimeConfiguration {

    protected static defaultOptions:{[optionKey:string]:string|number|boolean|unknown} = {
        'session_via_gestalt': false,
        'session_metadata': true,
        'session_consolidated_resolver': false,
        'disable_endpoints_resolution': false,
        'xcontent_local': false,
        'xcontent_asset_path': '/assets/content',
        'navigation_use_conduit': false,
        'navigation_use_gestalt': true,
        'navigation_asset_path': 'assets/navigation',
        'navigation_default_authentication': null
    };

    protected static options:{[optionKey:string]:string|number|boolean|unknown} = Object.assign( {}, AlRuntimeConfiguration.defaultOptions );

    public static setContext( environment:string, residency:"US"|"EMEA" = "US", locationId?:string ) {
        let context:AlLocationContext = { environment, residency };
        if ( locationId ) {
            context.insightLocationId = locationId;
        }
        AlLocatorService.setContext( context );
    }

    public static setOption<ValueType=any>( option:ConfigOption, value:ValueType ) {
        this.options[option] = value;
    }

    public static getOption<ValueType=any>( option:ConfigOption, defaultValue?:ValueType ):ValueType|undefined {
        if ( ( option as string ) in this.options ) {
            return this.options[option] as ValueType;
        }
        return defaultValue;
    }

    public static reset() {
        this.options = Object.assign( {}, AlRuntimeConfiguration.defaultOptions );
    }

    public static remapLocation( locationTypeId:string, baseURL:string, environment?:string, residency?:string ) {
        AlLocatorService.remapLocationToURI( locationTypeId, baseURL, environment, residency );
    }
}
