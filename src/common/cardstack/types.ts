/**
 *  A collection of abstract types to facilitate the most common view in the Alert Logic UI world,
 *  the infinite scroll + filters card list.
 *
 *  For the sake of giving these types a common and somewhat unique namespace, these types will refer to them
 *  as a "cardstack", and all types will be prefixed with AlCardstack.
 *
 *  Author: Big Orange Geek <knielsen@alertlogic.com>
 *  Copyright 2019 but almost 2020 Alert Logic, Inc.
 */

/**
 * Describes a specific property value.  Only necessary for values that can be filtered on.
 */
export interface AlCardstackValueDescriptor
{
    //  A reference to the property this value belongs to
    property:string;

    //  The discrete value (typically a string, but could be anything -- so long as it supports object equivalence and `toString()`
    value:any;

    //  caption
    caption:string;

    //  plural caption, if applicable
    captionPlural:string;

    //  Unique key for this value, defaulting to `${property}-${value.toString()}`
    valueKey:string;

    //  Should the filter be selected by default?
    default?:boolean;

    //  Indicates whether or not the value is currently being used as a filter.
    activeFilter?:boolean;

    //  Aggregate count (number of matching cards after *all* filters are applied).
    count?:number;

    //  Pre-filter count (number of matching cards with this property/value, before any other filters are applied).
    prefilterCount?:number;

    // Define the type of the descriptor
    type?:string;

    // Arbitrary metadata, such as icon class or entitlement limitations
    metadata?:{[property:string]:unknown};
}

/**
 * This is an abstract description of a property.  Many of the individual properties may be omitted from a given instance.
 */
export interface AlCardstackPropertyDescriptor
{
    //  The service or namespace in which the field has meaning (e.g., "iris" or "herald")
    domain?:string;

    //  The literal property of this value on the entity's DTO
    property:string;

    //  The user-friendly name (e.g., "Scheduled Report" or "Incident")
    caption:string;

    //  The user-friendly plural name
    captionPlural?:string;

    // The user-friendly description of the cardstack
    description?:string;

    //  An array of possible values the property may have (value/caption pairs, plus some miscellaneous state properties) if the property has discrete values.
    values: AlCardstackValueDescriptor[];

    //  Indicates whether or not multiple items from this property can be selected (applies to filterable properties only)
    multiSelect?:boolean;

    //  Indicates whether the property's value list should be dynamically populated based on ingested data.
    autoIndex?:boolean;

    //  Indicates whether view filtration/sort for this property should be executed remotely.  If true, filtering or sorting by this property will automatically reset the view.
    remote?:boolean;

    //  Indicates whether or not the property is currently being filtered on.
    activeFilter?:boolean;

    //  Arbitrary metadata, such as icon class or entitlement limitations
    metadata:{[property:string]:any};

    // An optional sort position to be applied when converting this property to a filter in the consuming cardstack component
    sortPositionIndex?: number;
}

/**
 *  Describes the general characteristics of a given cardstack view.
 */
export interface AlCardstackCharacteristics
{
    /**
     *  Describees the principal entity being described inside a cardstack (e.g., "Scheduled Reports" or "Observations")
     */
    entity: AlCardstackPropertyDescriptor;

    /**
     *  Identifies a set of properties (referenced by ID) that the cardstack's content can be grouped by.
     *  An empty array indicates that grouping is not supported for this cardstack and the group by selector should not be shown.
     */
    groupableBy: (string|AlCardstackPropertyDescriptor)[];

    /*  Identifies a set of properties (referenced by ID) that the cardstack's content can be sorted by.
     *  An empty array indicates that sorting is not supported for this cardstack and the sort by selector should not be shown.
     */
    sortableBy: (string|AlCardstackPropertyDescriptor)[];

    /**
     *  Identifies a set of properties (referenced by ID) that the cardstack's content can be filtered by.
     *  An empty array indicates that filtering is not supported for this cardstack, and the filter panel should not be shown.
     */
    filterableBy: (string|AlCardstackPropertyDescriptor)[];

    /**
     *  Identifiers which properties in the DTO text searches should be applied against.
     *  NOTE: complex obj are not supported.  If 'remoteSearch' is true, these values will be ignored.
     */
    searchableBy?: string[];

    /**
     * If provided, indicates that the cards should be grouped into distinct sections based on a given attribute.
     * The captionPlural property of the property descriptor will be used as the header for each section.
     */
    sectionBy?: string|AlCardstackPropertyDescriptor;

    /**
     * A dictionary of property definitions referenced above.
     */
    definitions: {[propertyId:string]:AlCardstackPropertyDescriptor};

    /**
     * If true, indicates that the client should read all available data aggressively.  This is useful for views/entities where aggregation
     * cannot be provided service side and must be tabulated dynamically in the client.
     */
    greedyConsumer:boolean;

    /**
     * For filters with many values, these specify the maximum initial list size per filter
     * and the number of additional items that should be exposed with each press of "Show More"
     */
    filterValueLimit: number;
    filterValueIncrement: number;

    /**
     * If true, indicates that filter values with no matching results should be hidden from the filter list.
     */
    hideEmptyFilterValues:boolean;

    /**
     * If true, pagination will be executed locally
     */
    localPagination:boolean;

    /**
     * If true, search will be executed remotely (changes to search value will reload the view).  Otherwise, `searchableBy` will
     * be used to determine which entity properties the textual filter should be applied against.
     */
    remoteSearch:boolean;
}

/**
 *  Describes an aggregation descriptor for a given cardstack.  An aggregation descriptor is just a nested
 *  dictionary of properties -> values -> total counts.  If a given item is `null` rather than a number, that
 *  indicates that the UI should calculate the aggregation dynamically on the client side.
 */
export interface AlCardstackAggregations
{
    properties:{[property:string]:{
        [value:string]:number|null
    }};
}

/**
 * This is just a placeholder interface for whatever indexable properties a particular entity has.
 */
export interface AlCardstackItemProperties
{
    id:string;
    caption:string;
}

/**
 *  Describes a cardstack item, representing a single entity inside the view.
 *  This simple wrapper object contains a caption, a handful of common properties (referenced by the cardstack's characteristics), and
 *  a blob referencing the underlying entity data.
 */
export interface AlCardstackItem<EntityType=any,PropertyType extends AlCardstackItemProperties=any>
{
    /**
     * Each item has a unique identifier, although the format may vary by entity type or even be mixed across systems
     */
    id:string;

    /**
     * Textual caption (h1/title)
     */
    caption:string;

    /**
     * Indicates whether or not the given item is visible/displayed
     */
    visible?:boolean;

    /**
     * Indicates whether or not the given item is opened/expanded
     */
    expanded?:boolean;

    /**
     * Indicates which segment the data belongs to, if any
     */
    segment?:AlCardstackValueDescriptor;

    /**
     * Filterable/groupable/sortable properties
     */
    properties:PropertyType;

    /**
     * A reference to the minimial view of the underlying entity (e.g., incident, scheduled_report, observation, etc)
     */
    entity:EntityType;

    /**
     * Indicates whether or not the given item is checked
     */
    checked?: boolean;
}

/**
 *  Describes a page of items for display in a cardstack
 */
export interface AlCardstackPage<EntityType=any>
{
    items: AlCardstackItem<EntityType>;
    continuation_token?:string;
    pages_remaining:number;
}

/**
 *  This interfaces describes an active filter
 */
export interface AlCardstackActiveFilter<EntityType = any,PropertyType extends AlCardstackItemProperties=any>
{
    property:AlCardstackPropertyDescriptor;                 //  The property being filtered on
    propField:string;                                       //  The DTO field the property's value can be found on
    values:AlCardstackValueDescriptor[];                    //  The values being filtered for (descriptors)
    rawValues:any[];                                        //  The values being filtered for (raw values)

    /**
     *  The default callback will return true ("match") if any of the values in the filter match a given entity's value for that field, but it can be overridden to provide custom logic.
     */
    callback:{(entity:EntityType,properties:PropertyType,filter:AlCardstackActiveFilter<EntityType,PropertyType>):boolean};
}
