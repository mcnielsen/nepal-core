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

export interface AlExperienceToggle
{
    after?:string|number;
    before?:string|number;
    accounts?:string[];
    environments?:string[];
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
