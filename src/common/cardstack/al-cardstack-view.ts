import {
    AlCardstackAggregations,
    AlCardstackCharacteristics,
    AlCardstackItem,
    AlCardstackItemProperties,
    AlCardstackPropertyDescriptor,
    AlCardstackValueDescriptor,
    AlCardstackActiveFilter
} from './types';
import { AlStopwatch } from '../utility/al-stopwatch';

/**
 *  Manages a cardstack view state
 */
export abstract class AlCardstackView< EntityType=any,
                                       PropertyType extends AlCardstackItemProperties=any,
                                       CharacteristicsType extends AlCardstackCharacteristics = AlCardstackCharacteristics>
{
    public characteristics?:CharacteristicsType                                 =   undefined;  //  Characteristics of the view: fields, types, behaviors, etc.

    public loading:boolean                                                      =   false;      //  Indicates whether or not the view is currently loading

    // pagination common values
    public itemsPerPage:number                                                  =   50;         // items per page default value

    // pagination remote values
    public continuation: string| undefined                                      =   undefined;  // continuation for remote pagination

    // pagination values
    public loadedPages:number                                                   =   0;          //  Number of pages currently retrieved
    public remainingPages:number                                                =   1;          //  Number of pages of data remaining (or 1, if unknown); 0 when load is complete/EOS
    public localPagination: boolean                                             =   false;      //  If we are going to use local pagination the remainingPages and loadedPages are going to be reseted in every filter or search
    public rawCards:AlCardstackItem<EntityType>[]                               =   [];         //  All cards loaded,is going to be used to make local pagination
    public filteredCards:AlCardstackItem<EntityType>[]                          =   [];

    public cards:AlCardstackItem<EntityType>[]                                  =   [];         //  All cards loaded, both visible and invisible, in current sort order
    public visibleCards:number                                                  =   0;          //  Number of cards currently visible in view

    public textFilter:      string|RegExp|null                                  =   null;       //  Regular expression to filter results with (deprecated?)
    public groupingBy:      AlCardstackPropertyDescriptor|null                  =   null;       //  Grouping property
    public sortingBy:       AlCardstackPropertyDescriptor|null                  =   null;       //  Sortation property
    public sortOrder:       'asc'|'desc'                                        =   "asc";      //  Sortation direction, either "asc" or "desc".  Yes, "sortation" is a real word ;-)
    public dateRange:       Date[]                                              =   [];
    public checked: boolean = false;
    //  Defines which filters are currently "active"
    public activeFilters: AlCardstackActiveFilter<EntityType,PropertyType>[]    =   [];
    public autoIndexProperties:AlCardstackPropertyDescriptor[]                  =   [];

    //  If defined, indicates the view has failed to load and optionally provides description and details of error
    public error?:string|Error;

    //  Aggregation data
    public aggregations:AlCardstackAggregations = {
        properties: {}
    };

    public reduceFilters: {[property:string]:string[]} = {};

    protected filtersChanged = AlStopwatch.later( () => {
        if ( this.onFiltersChanged ) {
            this.onFiltersChanged();
        }
    } );

    constructor( characteristics?:CharacteristicsType ) {
        if ( characteristics ) {
            this.normalizeCharacteristics( characteristics );
        }
    }

    /**
     * Starts loading the view and digesting data
     */
    public async start() {
        this.loadedPages = 0;
        this.remainingPages = 0;
        this.continuation = undefined;
        this.loading = true;
        try {
            if ( ! this.characteristics ) {
                if ( ! this.generateCharacteristics ) {
                    throw new Error("Usage error: AlCardstackView extensions must either be constructed with characteristics or provide a `generateCharacteristics` method." );
                }
                const characteristics = await this.generateCharacteristics();
                this.normalizeCharacteristics( characteristics );
                if (this.characteristics.localPagination) {
                    this.fillPropertiesReduceFilters();
                }
            }
            let entities = await this.fetchData( true, this.getRemoteFilters() );

            this.rawCards = [];
            this.filteredCards = [];
            this.cards = [];

            let ingestedCards = this.ingest( entities );
            this.rawCards = ingestedCards;

            if( this.sortingBy && this.sortOrder && !this.sortingBy.remote) {
                this.applySortBy(this.sortingBy,  this.sortOrder );
            }

            this.filteredCards = this.rawCards;

            if ( this.characteristics.localPagination ) {
                let initialCards = this.filteredCards.slice(this.cards.length,  this.cards.length + this.itemsPerPage);
                this.addNextSection( initialCards );
            } else {
                this.applyFiltersAndSearch();
            }

            this.loading = false;
            if(this.onCardsChanged){
                this.onCardsChanged();
            }
        } catch( error ) {
            console.error("A fatal error prevented this view from starting!", error );
            this.error = error;
            this.loading = false;
        }
    }

    public updateCharacteristics( characteristics:AlCardstackCharacteristics ) {
        this.normalizeCharacteristics( Object.assign( this.characteristics, characteristics ) );
        this.filtersChanged.again();
    }

    /** set the first page of the filteredCards */
    public startPagination(filteredCards:{
        properties: PropertyType;
        entity: EntityType;
        id: string;
        caption: string;
    }[]){
        this.cards = filteredCards.slice( 0, Math.min(this.itemsPerPage, filteredCards.length ));
        this.resetPagination(filteredCards.length);
    }
    /**
     * Starts loading next batch data into view
     */
    public async continue() {
        this.loading = true;
        try {
            let entities :EntityType[] = [];
            let cardsSection:AlCardstackItem<EntityType>[];

            if (this.characteristics.localPagination) {
                cardsSection = this.filteredCards.slice(this.cards.length,  this.cards.length + this.itemsPerPage);
                this.addNextSection(cardsSection);
                this.loadedPages++;
                this.remainingPages--;
            } else {
                entities = await this.fetchData( false, this.getRemoteFilters() );
                cardsSection = this.ingest( entities );
                // if paging is remote and rest things are inline
                this.rawCards = [...this.rawCards, ...cardsSection];
                this.applyFiltersAndSearch();
            }

            if ( this.characteristics && this.characteristics.greedyConsumer && this.remainingPages > 0 ) {
                //  In greedy consumer mode, we essentially retrieve the entire dataset sequentially as part of the load cycle
                await this.continue();
            }
            this.loading = false;
        } catch( e ) {
            console.error("A fatal error prevented this view from continuing!", e );
            this.loading = false;
            this.error = e;
        }
    }

    /**
     * calculate the remaining pages
     * @param total items
     */
    public resetPagination(total:number){
        if(this.itemsPerPage) {
            this.loadedPages = 0;
            this.remainingPages = total / this.itemsPerPage;
        }
    }

    public getProperty( propertyId:string|AlCardstackPropertyDescriptor ):AlCardstackPropertyDescriptor {
        if ( typeof( propertyId ) === 'object' ) {
            return propertyId;
        }
        if ( this.characteristics && ! this.characteristics.definitions.hasOwnProperty( propertyId ) ) {
            throw new Error(`Internal error: cannot access undefined property '${propertyId}'` );
        }
        if(this.characteristics){
            return this.characteristics.definitions[propertyId];
        }
        throw new Error(`Internal error: cannot access undefined property '${propertyId}'` );
    }

    public getValue( propertyId:string|AlCardstackPropertyDescriptor, value:any ):AlCardstackValueDescriptor {
        let propDescriptor = typeof( propertyId ) === 'string' ? this.getProperty( propertyId ) : propertyId;
        if ( ! propDescriptor.hasOwnProperty( 'values' ) || propDescriptor.values.length === 0 ) {
            throw new Error(`The property '${propertyId}' does not have a dictionary of discrete values.`);
        }
        let valueDescriptor;
        if ( typeof( value ) === 'object' ) {
            valueDescriptor = propDescriptor.values.find( v => v === value );
        } else {
            valueDescriptor = propDescriptor.values.find( v => v.value === value || v.valueKey === value );
        }
        if ( ! valueDescriptor ) {
            throw new Error(`The property '${propertyId}' does not have a discrete value '${value.toString()}'` );
        }
        return valueDescriptor;
    }

    public applyFiltersAndSearch() {
        this.filteredCards = [ ...this.rawCards ].filter( c => this.evaluateCardState( c ) );
        this.visibleCards = this.filteredCards.length;

        if(this.localPagination){
            this.startPagination(this.filteredCards);
            this.resetPagination(this.filteredCards.length);
        } else{
            this.cards = this.filteredCards;
        }

        this.recalculateFilterTotals();
        this.recalculateFilterActivation();

        if(this.onCardsChanged){
            this.onCardsChanged();
        }
    }

    /**
     *  Applies a textual search filter to all properties/entities in the current list, or clears the current filter if `filterPattern` is null.
     *  This should cause the `visibleItem` count to be recalculated, possibly triggering a load of further pages of data.
     */
    public applyTextFilter( filterPattern:string|RegExp|null ) {
        if ( this.textFilter !== filterPattern ) {
            this.textFilter = filterPattern;
            if ( this.characteristics.remoteSearch ) {
                this.start();
            } else {
                this.applyFiltersAndSearch();
            }
        }
    }

    /**
     *  Applies grouping logic to the current view, or clears grouping if `property` is null.
     */
    public applyGroupingBy( descriptor:AlCardstackPropertyDescriptor|null ):boolean {
        return true;
    }

    /**
     *  Applies sorting logic to the current view, or restores default if `property` is null.
     *  This is the default implementation, which can be called if the deriving class doesn't implement OR wants to call into the super class.
     */
    public applySortBy( pDescriptor:AlCardstackPropertyDescriptor, order:string = "desc" ) {
        this.sortingBy = pDescriptor;
        this.sortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

        if ( this.sortingBy.remote ) {
            this.start();
            return;
        }

        this.rawCards = this.rawCards.sort( ( a, b ) => {
            let pa = a.properties[pDescriptor.property];
            let pb = b.properties[pDescriptor.property];
            if ( typeof( pa ) === 'string' || typeof( pb ) === 'string' ) {
                pa = pa ? pa: '';
                pb = pb ? pb : '';
                if ( order === 'asc' ) {
                    return pa.localeCompare( pb );
                } else {
                    return pb.localeCompare( pa );
                }
            } else if ( typeof( pa ) === 'number' || typeof( pb ) === 'number' ) {
                a = pa ? pa: 0;
                pb = pb ? pb : 0;
                if ( order === 'asc' ) {
                    return pa - pb;
                } else {
                    return pb - pa;
                }
            } else {
                if ( typeof( pa ) === 'undefined' && typeof( pb ) === 'undefined' ) {
                    return 0;
                } else {
                    throw new Error("Inconsistent property normalization: properties are not string or number, or are mixed." );
                }
            }
        } );
        this.applyFiltersAndSearch();
    }

    /**
     *  Applies a filter to the current view, optionally specifying a custom filter callback.
     */
    public applyFilterBy( vDescriptor:AlCardstackValueDescriptor,
                          callback?:{(entity:EntityType,properties:PropertyType,filter:AlCardstackActiveFilter<EntityType,PropertyType>):boolean} ) {
        const pDescriptor = this.getProperty( vDescriptor.property );
        const existing = this.activeFilters.find( filter => filter.property === pDescriptor );
        if ( existing ) {
            if ( existing.values.includes( vDescriptor ) ) {
                return;     //  no change
            }
            existing.values.push( vDescriptor );
            existing.rawValues = existing.values.map( vDescr => vDescr.value );
        } else {
            this.activeFilters.push( {
                property: pDescriptor,
                propField: pDescriptor.property,
                values: [ vDescriptor ],
                rawValues: [ vDescriptor.value ],
                callback: callback || this.defaultFilterCb
            } );
        }

        pDescriptor.activeFilter = true;
        vDescriptor.activeFilter = true;

        if ( pDescriptor.remote ) {
            this.start();       //  restart view
        } else {
            this.applyFiltersAndSearch();
        }
        this.filtersChanged.again();
        return false;
    }

    /**
     *  Removes a filter from the current view.
     */
    public removeFilterBy( vDescriptor:AlCardstackValueDescriptor ) {
        let existing = this.activeFilters.find( filter => filter.propField === vDescriptor.property );
        if ( ! existing ) {
            // could not find existing filter
            return;
        }

        vDescriptor.activeFilter = false;
        const pDescriptor = this.getProperty( vDescriptor.property );

        existing.values = existing.values.filter( value => value !== vDescriptor );
        if ( existing.values.length === 0 ) {
            this.activeFilters = this.activeFilters.filter( filter => filter.property !== pDescriptor );
            pDescriptor.activeFilter = false;
        } else {
            existing.rawValues = existing.values.map( vDescr => vDescr.value );
        }
        if ( pDescriptor.remote ) {
            this.start();       //  restart view
        } else {
            this.applyFiltersAndSearch();
        }
        this.filtersChanged.again();
        return false;
    }

    public clearFilters():void {
        let remoteFilter = false;
        this.activeFilters.forEach( filter => {
            filter.values.forEach( value => {
                value.activeFilter = false;
            } );
            filter.property.activeFilter = false;
            remoteFilter = remoteFilter || filter.property.remote;
        } );
        this.activeFilters = [];
        if ( remoteFilter ) {
            this.start();
        } else {
            this.applyFiltersAndSearch();
        }
        this.filtersChanged.again();
    }

    public markCardsAsCheck ():void {
        this.cards = this.cards.map( c => {
            c.checked =  this.checked ;
            return c;
        });
    }

    /**
     * Allows to mark the all cards as checked or unchecked
     * @param checked
     */
    public applySelect(checked: boolean):void {
        this.checked = checked;
        this.markCardsAsCheck();
    }

    /**
     *  Retrieves the next page of items using the current group/sort criteria.  The derived class must provide an implementation of this method,
     *  and it should set the `remainingPages` value when it completes execution.
     *
     *  The second parameter describes any active filters whose properties indicate that they will be applied externally (either in an API call or external
     *  filtration layer).
     */
    public abstract async fetchData( initialLoad:boolean, remoteFilters:AlCardstackActiveFilter[] ):Promise<EntityType[]>;

    /**
     *  Given an entity instance, allows the deriving class to populate a properties object -- which may be correlated or extracted or mapped as necessary
     *  from other data -- that can be used to sort, filter, group, and segment by.
     */
    public abstract deriveEntityProperties( entity:EntityType ):PropertyType;


    /**
     *  Optional method to notify when we make changes in the card list
     *  It call every time the something happend with the list
     */
    public onCardsChanged?():void;

    /**
     *  Optional method to respond when new property values are discovered
     */
    public onFiltersChanged?():void;

    /**
     *  Optional method to generate characteristics asynchronously, after constructor has executed.
     */
    public async generateCharacteristics?():Promise<CharacteristicsType>;

    /**
     *  Optional method to automatically index unrecognized property values
     */
    public decoratePropertyValue?( entity:EntityType, property:AlCardstackPropertyDescriptor, value:AlCardstackValueDescriptor );

    /**
     * Protected Internal Methods
     */

    protected recalculateFilterTotals() {
        let filtersChanged:boolean = false;
        this.characteristics.filterableBy.forEach( propName => {
            const pd = this.getProperty( propName );
            if ( ! pd.remote ) {      //  no local aggregation for remotely filtered properties, because no!
                pd.values.forEach( vd => {
                    let count = this.filteredCards.reduce( ( alpha, card ) => card.properties[pd.property] === vd.value ? alpha + 1 : alpha, 0 );
                    if ( count !== vd.count ) {
                        filtersChanged = true;
                    }
                    vd.count = count;
                    vd.prefilterCount = this.rawCards.reduce( ( alpha, card ) => card.properties[pd.property] === vd.value ? alpha + 1 : alpha, 0 );
                } );
            }
        } );
        if ( filtersChanged ) {
            this.filtersChanged.again();
        }
    }

    protected recalculateFilterActivation() {
        //  Reset activation state of the filterable taxonomy
        this.characteristics.filterableBy.map( filterable => this.getProperty( filterable ) ).forEach( filterProperty => {
            filterProperty.activeFilter = false;
            filterProperty.values.forEach( vDescr => {
                vDescr.activeFilter = false;
            } );
        } );
        this.activeFilters.forEach( filter => {
            filter.property.activeFilter = true;
            filter.values.forEach( vDescr => {
                vDescr.activeFilter = true;
            } );
        } );
    }

    protected addNextSection( newData: AlCardstackItem<EntityType,PropertyType>[] ) {
        this.cards = [ ...this.cards, ...newData ];
        this.cards.forEach( c => this.evaluateCardState( c ) );
        this.visibleCards = this.cards.reduce( ( count, card ) => count + ( card.visible ? 1 : 0 ), 0 );

        if (this.localPagination && this.checked && newData.length > 0) {
            this.markCardsAsCheck();
        }
    }

    protected ingest( entities:EntityType[] ): AlCardstackItem<EntityType>[] {
        let discoveredValues:boolean = false;
        let results:AlCardstackItem<EntityType>[] = entities.map(entity => {
            const properties = this.deriveEntityProperties(entity);
            if (properties) {
                let derivedProps = Object.keys(properties);
                if (this.characteristics.sortableBy) {
                    let filteredSortProps = this.characteristics.sortableBy.filter(sortProp => {
                        return !derivedProps.includes(sortProp as string);
                    });
                    if (filteredSortProps.length) {
                        console.warn('Sorting configuration missing for properties ', filteredSortProps, ' in deriveEntityProperties');
                    }
                }
                if (this.characteristics.filterableBy) {
                    let filteredProps = this.characteristics.filterableBy.filter(filterProp => {
                        return !derivedProps.includes(filterProp as string);
                    });
                    if (filteredProps.length) {
                        console.warn('Filter configuration missing for property ', filteredProps, ' in deriveEntityProperties');
                    }
                }
                if (!this.characteristics.remoteSearch) {
                    if (this.characteristics.searchableBy && this.characteristics.searchableBy.length) {
                        let filteredSearchProps = this.characteristics.searchableBy.filter(search => {
                            return !derivedProps.includes(search);
                        });
                        if (filteredSearchProps.length) {
                            console.warn('Search configuration missing for property ', filteredSearchProps, ' in deriveEntityProperties');
                        }
                    } else {
                        console.warn('Search configuration missing fileds on which search to be performed, please update searchableBy with fields again search to be performed.');
                    }
                }
            }
            this.autoIndexProperties.forEach( index => {
                if ( index.property in properties ) {
                    let literalValue:any = properties[index.property];
                    if ( ! index.values.find( valueDescriptor => valueDescriptor.value === literalValue ) ) {
                        let vd:AlCardstackValueDescriptor = {
                            property: index.property,
                            value: literalValue,
                            valueKey: `${index.property}-${index.values.length+1}`,
                            caption: index.property,
                            captionPlural: index.property
                        };
                        if ( this.decoratePropertyValue ) {
                            this.decoratePropertyValue( entity, index, vd );
                        }
                        index.values.push( vd );
                        discoveredValues = true;
                    }
                }
            } );
            return {
                properties,
                entity,
                id: properties.id,
                caption: properties.caption
            };
        });
        if ( discoveredValues ) {
            this.filtersChanged.again();
        }
        return results;
    }

    /**
     * This is the default filter evaluator.
     */
    protected defaultFilterCb( entity:EntityType, properties:PropertyType, filter:AlCardstackActiveFilter<EntityType,PropertyType>, data?:any ) {
        let value = filter.property.property in properties ? properties[filter.property.property] : null;
        return filter.values.find( vDescr => vDescr.value === value ) ? true : false;
    }

    /**
     *  Method to determine visibility of an individual card item based on the current set of active filters.
     */
    protected evaluateCardVisibilityByFilter( card:AlCardstackItem<EntityType,PropertyType> ):boolean {
        return this.activeFilters.every( filter => filter.callback( card.entity, card.properties, filter ) );
    }

    /**
     *  Method to determine visibility of an individual card item based on the current search text
     */
    protected evaluateCardVisibilityBySearch(
        card: AlCardstackItem<EntityType, PropertyType>,
        search: string | RegExp | null
    ): boolean {
        if (search === null || search === '') {
            return true;
        }

        // property search
        // prop=value
        if (typeof search === "string" && search.includes("=")) {
            const lsSource = search.split("=");
            const property = lsSource[0];
            const value = lsSource[1].toLowerCase();
            if (property === '' || value === '') {
                return false;
            }
            if (!card.properties.hasOwnProperty(property)) {
                return false;
            }
            const cardPropValue = (card.properties as any)[property].toLowerCase();
            return value.includes(cardPropValue);
        }


        if (!this.characteristics || !this.characteristics.searchableBy) {
            return false;
        }

        if (this.characteristics.searchableBy.length === 0) {
            return true;
        }

        return this.characteristics.searchableBy.some((property: string) => {
            if (!card.properties.hasOwnProperty(property) || !(card.properties as any)[property]) {
                return false;
            }

            let cardPropValue: unknown[] = (card.properties as any)[property];

            if (!Array.isArray(cardPropValue)) {
                // force everything to be an array, simplify the logic
                cardPropValue = [cardPropValue];
            }

            return cardPropValue.some((value: unknown) => {
                if (typeof value !== 'string') {
                    console.error('cardPropValue must be a string');
                    return false;
                }
                if (search instanceof RegExp) {
                    // regex can control its own case sensitivity
                    return search.test(value);
                }
                if (typeof search === "string") {
                    // everything is a string, toLowerCase for case insensitivity search, US116156
                    return value.toLowerCase().includes(search.toLowerCase());
                }
                console.error("Search should be a string or regex:", search);
                return false;
            });

        });
    }

    protected evaluateCardState( card:AlCardstackItem<EntityType,PropertyType> ) {
        // card.visible = this.evaluateCardVisibilityBySearch(card, this.textFilter) && this.evaluateCardVisibilityByFilter(card);

        if(this.characteristics.remoteSearch) { // if its remote search we dont need inline searching facility
            card.visible = this.evaluateCardVisibilityByFilter(card);
        } else {
            card.visible = this.evaluateCardVisibilityBySearch(card, this.textFilter) && this.evaluateCardVisibilityByFilter(card);
        }
        return card.visible;
    }

    /**
     *  Utility method to normalize and validate an input characteristics definitions, and then store it
     *  to the instance's `characteristics` property.
     */
    protected normalizeCharacteristics( characteristics:CharacteristicsType ) {
        try {
            characteristics.groupableBy         =   characteristics.groupableBy || [];
            characteristics.sortableBy          =   characteristics.sortableBy || [];
            characteristics.filterableBy        =   characteristics.filterableBy || [];
            characteristics.definitions         =   characteristics.definitions || {};
            characteristics.filterValueLimit    =   characteristics.filterValueLimit || 10;
            characteristics.filterValueIncrement=   characteristics.filterValueIncrement || 10;
            characteristics.hideEmptyFilterValues = characteristics.hideEmptyFilterValues || false;
            characteristics.localPagination     =   characteristics.localPagination || false;
            this.characteristics = characteristics;
            this.autoIndexProperties = [];
            let activeFilters:{[valueKey:string]:AlCardstackValueDescriptor} = {};
            const properties = [
                ...characteristics.sortableBy,
                ...characteristics.filterableBy,
                ...characteristics.groupableBy
            ];

            properties.forEach( descriptor => {
                const propDescriptor = this.resolveDescriptor( descriptor );
                if ( ! propDescriptor.values ) {
                    propDescriptor.values = [];
                }
                if ( propDescriptor.autoIndex ) {
                    this.autoIndexProperties.push( propDescriptor );
                }
                propDescriptor.values.forEach( valDescriptor => {
                    valDescriptor.property = propDescriptor.property;
                    if ( ! valDescriptor.hasOwnProperty( "valueKey" ) ) {
                        valDescriptor.valueKey = `${propDescriptor.property}-${valDescriptor.value.toString()}`;
                    }
                    if ( valDescriptor.default ) {
                        activeFilters[valDescriptor.valueKey] = valDescriptor;
                    }
                } );
            } );

        } catch( e ) {
            throw new Error(`Failed to normalize characteristics object: ${e.message}` );

        }
    }

    protected resolveDescriptor( descriptor:string|AlCardstackPropertyDescriptor ):AlCardstackPropertyDescriptor {
        if ( typeof( descriptor ) === 'string' ) {
            if ( this.characteristics && this.characteristics.definitions.hasOwnProperty( descriptor ) ) {
                return this.characteristics.definitions[descriptor];
            } else {
                throw new Error(`sort property descriptor '${descriptor}' not found in definitions dictionary.` );
            }
        } else {
            if ( this.characteristics && this.characteristics.definitions.hasOwnProperty( descriptor.property ) ) {
                throw new Error(`there are multiple descriptors for the property '${descriptor.property}'; these should be consolidated into the definitions dictionary.` );
            }
            if(this.characteristics){
                this.characteristics.definitions[descriptor.property] = descriptor;
            }
        }
        return descriptor;
    }

    protected getRemoteFilters():AlCardstackActiveFilter<EntityType,PropertyType>[] {
        return this.activeFilters.filter( filter => filter.property.remote );
    }


    /**
     * Fill the property name of the variable reduceFilter with filterable fields
     */
    private fillPropertiesReduceFilters(): void {
        this.characteristics.filterableBy.forEach((filter) => {
            if(typeof filter === 'string'){
                this.reduceFilters[filter] = [];
            }
        });
    }
}
