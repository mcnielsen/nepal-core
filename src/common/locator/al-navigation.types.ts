/**
 *  This is a collection of interfaces and types for navigation constructs that don't fit into other categories.
 *
 *  Author: McNielsen <knielsen@alertlogic.com>
 *  Copyright 2020 Alert Logic Inc.
 */

import { AlRouteDefinition, AlRouteCondition, AlRouteAction } from './al-route.types';

/**
 * @public
 *
 * This is a top-level interface for the structure of a schema document, which is a set of compiled menus and behavioral rules.
 */
export interface AlNavigationSchema
{
    name: string;
    description: string;
    menus: {[menuId:string]:AlRouteDefinition};
    namedRoutes: {[routeName:string]:AlRouteDefinition};
    conditions: {[conditionId:string]:AlRouteCondition};
}

/**
 * AlExperienceToggle defines a set of conditions under which an experience flag will be turned on.
 * Internally, these will be evaluated using the same mechanics as AlRouteCondition, with the addition
 * of time constraints and specific accounts.
 */
export interface AlExperienceToggle
{
    //  If provided, the timestamp or iso8601 datetime string after which the experience flag should be enabled
    after?:string|number;

    //  If provided, the timestamp or iso8601 datetime string before which the experience flag should be enabled
    before?:string|number;

    //  If provided, an array of *acting accounts* for which the experience flag should be enabled
    accounts?:string[];

    //  If provided, an array of *primary accounts* for which the experience flag should be enabled
    primaryAccounts?:string[];

    //  If provided, an array of environments in which the experience flag should be enabled
    environments?:string[];

    //  If provided, an entitlement expression (or array of entitlement expressions) that must be satisfied for the experience flag to be enabled.
    entitlements?:string|string[];

    //  If provided, an entitlement expression (or array of entitlement expressions) that the primary account's entitlements must satisfy for the experience flag to be enabled.
    primaryEntitlements?:string|string[];
}

/**
 * Describes the entry location, availability criteria, and prompt behaviors of a specific experience (for the purposes of this
 * type, and "experience" = a specific variation or common subset of a feature.
 */
export interface AlExperienceMapping
{
    /*
     * A descriptive name for the experience
     */
    name:string;

    /**
     * A route or trigger that can be used to imperatively invoke the experience
     */
    entryRoute:AlRouteAction;

    /**
     * A searchlib compatible expression determining whether the experience is available to a given context,
     * in either raw or SQL-style form.
     */
    availabilityQuery:string|any;

    /**
     * An optional boolean, toggle, or array of toggles that determine when this experience should be enabled.  If provided,
     * a positive match will supercede `availabilityQuery`.  This can be used to schedule enablement for specific customers
     * in specific environments in advance of the addition of an entitlement.
     */
    trigger:AlExperienceToggle|AlExperienceToggle[]|boolean;

    /**
     * If provided, defines the zero state to provide when an experience isn't available.
     */
    unavailable?: {
        title:string|boolean;
        description:string|boolean;
        iconClass?:string;
        iconText?:string;
    };

    /**
     * Describes how related complementary/alternative experiences should be cross-referenced from this one.
     */
    crosslink?: {
        experienceId:string;
        strategy:"reroute"|"trigger"|"above-content";
        caption:string;
        trigger:string;
    }[];
}
