import {
    AlCardstackAggregations,
    AlCardstackCharacteristics,
    AlCardstackItem,
    AlCardstackItemProperties,
    AlCardstackPropertyDescriptor,
    AlCardstackValueDescriptor,
} from './types';

/**
 *  Manages a cardstack view state
 */
export abstract class AlCardstackView< EntityType=any,
                                       PropertyType extends AlCardstackItemProperties=any,
                                       CharacteristicsType extends AlCardstackCharacteristics = AlCardstackCharacteristics>
{
    public characteristics?:CharacteristicsType                                 =   undefined;  //  Characteristics of the view: fields, types, behaviors, etc.

    public loading:boolean                                                      =   false;      //  Indicates whether or not the view is currently loading
    public verbose:boolean                                                      =   false;      //  Print (maybe) useful console output for debugging purposes

    // pagination common values
    public itemsPerPage:number                                                  =  50;           // items per page default value

    // pagination remote values
    public continuation: string| undefined                                      = undefined;    // continuation for remote pagination

    // pagination values
    public loadedPages:number                                                   =   0;          //  Number of pages currently retrieved
    public remainingPages:number                                                =   1;          //  Number of pages of data remaining (or 1, if unknown); 0 when load is complete/EOS
    public localPagination: boolean                                             =  false;        // If we are going to use local pagination the remainingPages and loadedPages are going to be reseted in every filter or search
    public rawCards:AlCardstackItem<EntityType>[] = [];         //  All cards loaded,is going to be used to make local pagination
    public filteredCards:AlCardstackItem<EntityType>[] = [];

    public cards:AlCardstackItem<EntityType>[]                                  =   [];         //  All cards loaded, both visible and invisible, in current sort order
    public visibleCards:number                                                  =   0;          //  Number of cards currently visible in view

    public textFilter:      string|RegExp|null                                         =   null;       //  Regular expression to filter results with (deprecated?)
    public groupingBy:      AlCardstackPropertyDescriptor|null                  =   null;       //  Grouping property
    public sortingBy:       AlCardstackPropertyDescriptor|null                  =   null;       //  Sortation property
    public sortOrder:       'asc'|'desc'                                        =   "asc";      //  Sortation direction, either "asc" or "desc".  Yes, "sortation" is a real word ;-)
    public dateRange:       Date[]                                              =   [];
    public checked: boolean = false;
    //  Defines which filters are currently "active"
    public activeFilters:   {[property:string]:{[valueKey:string]:AlCardstackValueDescriptor}} = {};

    //  If defined, indicates the view has failed to load and optionally provides description and details of error
    public error?:string|Error;

    //  Aggregation data
    public aggregations:AlCardstackAggregations = {
        properties: {}
    };

    /**
     * Allows you to set the filters to be displayed, the property is the name of the filter that is obtained
     * from the "filterableBy" property of the characteristics object.
     * The value is an array with the values (ids) that you want to display.
     */
    public reduceFilters: {[property:string]:string[]} = {};

    constructor( characteristics?:CharacteristicsType ) {
        if ( characteristics ) {
            this.normalizeCharacteristics( characteristics );
        }
    }

    /**
     * Starts loading the view and digesting data
     */
    public async start() {
        this.loading = true;
        try {
            if ( ! this.characteristics ) {
                if ( ! this.generateCharacteristics ) {
                    throw new Error("Usage error: AlCardstackView extensions must either be constructed with characteristics or provide a `generateCharacteristics` method." );
                }
                const characteristics = await this.generateCharacteristics();
                this.normalizeCharacteristics( characteristics );
                if (this.localPagination) {
                    this.fillPropertiesReduceFilters();
                }
            }
            let entities = await this.fetchData( true );

            this.rawCards = [];
            this.filteredCards = [];
            this.cards = [];

            let ingestedCards = this.ingest( entities );
            this.rawCards = ingestedCards;
            this.filteredCards = ingestedCards;

            // if we have pagination enable just load a section of data
            if( this.localPagination ) {
                if(this.sortingBy && this.sortOrder) {
                    this.applySortBy(this.sortingBy,  this.sortOrder );
                } else {
                    this.applyFiltersAndSearch();
                }
            } else {
                // if we dont have pagination enable load all data
                this.addNextSection(ingestedCards);
            }

            if ( this.verbose ) {
                console.log( `After start: ${this.describeFilters()} (${this.visibleCards} visible)` );
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

            if (this.localPagination) {
                cardsSection = this.filteredCards.slice(this.cards.length,  this.cards.length + this.itemsPerPage);
                this.loadedPages++;
                this.remainingPages--;
            } else {
                entities = await this.fetchData( false );
                cardsSection = this.ingest( entities );
            }

            this.addNextSection(cardsSection);

            if ( this.verbose ) {
                console.log( `After continue: ${this.describeFilters()} (${this.visibleCards} visible), with ${this.remainingPages} page(s) of data remaining.` );
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
        const valueDescriptor = propDescriptor.values.find( v => v.value === value || v.valueKey === value );
        if ( ! valueDescriptor ) {
            throw new Error(`The property '${propertyId}' does not have a discrete value '${value.toString()}'` );
        }
        return valueDescriptor;
    }

    public applyFiltersAndSearch(){
        this.filteredCards = this.rawCards.map( c => this.evaluateCardState( c ) ).filter((c) => c.visible);
        this.visibleCards = this.filteredCards.length;

        if(this.localPagination){
            this.startPagination(this.filteredCards);
            this.resetPagination(this.filteredCards.length);
        } else{
            this.cards = this.filteredCards;
        }
        if ( this.verbose ) {
            console.log('filteredCards', this.filteredCards);
            console.log( `After filter applied: ${this.describeFilters()} (${this.visibleCards} visible)` );
        }
        if(this.onCardsChanged){
            this.onCardsChanged();
        }
    }
    /**
     *  Applies a textual search filter to all properties/entities in the current list, or clears the current filter if `filterPattern` is null.
     *  This should cause the `visibleItem` count to be recalculated, possibly triggering a load of further pages of data.
     */
    public applyTextFilter( filterPattern:string|RegExp|null ):boolean {
        this.textFilter = filterPattern;
        this.applyFiltersAndSearch();
        return true;
    }

    /**
     *  Applies grouping logic to the current view, or clears grouping if `property` is null.
     */
    public applyGroupingBy( descriptor:AlCardstackPropertyDescriptor|null ):boolean {
        if ( this.verbose ) {
            console.log("Placeholder", descriptor );
        }
        return true;
    }

    /**
     *  Applies sorting logic to the current view, or restores default if `property` is null.
     *  This is the default implementation, which can be called if the deriving class doesn't implement OR wants to call into the super class.
     *  Returning `true` indicates that the current list of items needs to be flushed and data retrieval should start from scratch.
     */
    public applySortBy( descriptor:AlCardstackPropertyDescriptor, order:string = "desc" ):boolean {
        this.sortingBy = descriptor;
        this.sortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

        this.rawCards = this.rawCards.sort( ( a, b ) => {
            let pa = a.properties[descriptor.property];
            let pb = b.properties[descriptor.property];
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
        return false;
    }

    /**
     *  Applies a filter to the current view.
     *  Returning `true` indicates that the current list of items needs to be flushed and data retrieval should start from scratch.
     */
    public applyFilterBy( descriptor:AlCardstackValueDescriptor ):boolean {
        const propertyName = descriptor.property;
        if ( ! this.activeFilters.hasOwnProperty( propertyName ) ) {
            this.activeFilters[propertyName] = {};
        }
        this.activeFilters[propertyName][descriptor.valueKey] = descriptor;
        this.continuation = undefined;

        return false;
    }

    /**
     *  Removes a filter from the current view.
     *  Returning `true` indicates that the current list of items needs to be flushed and data retrieval should start from scratch.
     */
    public removeFilterBy( descriptor:AlCardstackValueDescriptor ):boolean {
        const propertyName = descriptor.property;
        if ( ! this.activeFilters.hasOwnProperty( propertyName ) ) {
            return false;
        }
        delete this.activeFilters[propertyName][descriptor.valueKey];
        if ( Object.keys( this.activeFilters[propertyName] ).length === 0 ) {
            delete this.activeFilters[propertyName];
        }
        this.continuation = undefined;

        return false;
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
     */
    public abstract async fetchData( initialLoad:boolean ):Promise<EntityType[]>;

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
     *  Optional method to generate characteristics asynchronously, after constructor has executed.
     */
    public async generateCharacteristics?():Promise<CharacteristicsType>;

    protected addNextSection(newData: {
            properties: PropertyType;
            entity: EntityType;
            id: string;
            caption: string;
        }[]) {
        this.cards.push( ...newData );
        this.cards = this.cards.map( c => this.evaluateCardState( c ) );
        this.visibleCards = this.cards.reduce( ( count, card ) => count + ( card.visible ? 1 : 0 ), 0 );

        if (this.localPagination && this.checked && newData.length > 0) {
            this.markCardsAsCheck();
        }
    }
    protected ingest( entities:EntityType[] ): {
        properties: PropertyType;
        entity: EntityType;
        id: string;
        caption: string;
    }[]{
        return entities.map(entity => {
            const properties = this.deriveEntityProperties(entity);
            return {
                properties,
                entity,
                id: properties.id,
                caption: properties.caption
            };
        });
    }

    /**
     *  Method to determine visibility of an individual card item based on the current set of active filters.
     */
    protected evaluateCardVisibilityByFilter( card:AlCardstackItem<EntityType,PropertyType> ):boolean {
        const filterProperties = Object.keys( this.activeFilters );
        if ( filterProperties.length === 0 ) {
            return true;
        }
        return ! filterProperties.some( property => {
            if ( ! card.properties.hasOwnProperty( property ) || typeof( ( card.properties as any)[property] ) === 'undefined' ) {
                // visible = false;
                return true; //  terminate iteration
            }
            const cardPropValue = ( card.properties as any )[property];
            const matched = Object.values( this.activeFilters[property] ).find( valDescriptor => {
                if (cardPropValue instanceof Array) {
                    return cardPropValue.includes(valDescriptor.value);
                }
                return valDescriptor.value === cardPropValue;
            } );
            return !matched;
        } );
    }

    /**
     *  Method to determine visibility of an individual card item based on the current search text
     */
    protected evaluateCardVisibilityBySearch(
        card: AlCardstackItem<EntityType, PropertyType>,
        search: string | RegExp | null
    ): boolean {
        if (search === null) {
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

    protected evaluateCardState( card:AlCardstackItem<EntityType,PropertyType> ):AlCardstackItem<EntityType,PropertyType> {
            card.visible = this.evaluateCardVisibilityBySearch(card, this.textFilter)
            && this.evaluateCardVisibilityByFilter(card);

            return card;
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
            this.characteristics = characteristics;
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

    protected describeFilters():string {
        let properties = Object.keys( this.activeFilters );
        let description = '';
        if ( properties.length === 0 ) {
            return "no filter applied";
        }
        properties.forEach( propKey => {
            const propDescriptor = this.getProperty( propKey );
            let values = Object.values( this.activeFilters[propKey] );
            description += `${description.length===0?"":" AND "}`;
            if ( values.length === 1 ) {
                description += `${propDescriptor.caption} == "${values[0].caption}"`;
            } else {
                description += `${description}${description.length===0?"":" AND "}${propDescriptor.caption} == "${values[0].caption}"`;
            }
        } );
        return description;
    }

    /**
     * Fill the property name of the variable reduceFilter with filterable fields
     */
    private fillPropertiesReduceFilters(): void {
        if(!this.characteristics){
            throw new Error("characteristics must be defined");
        }
        this.characteristics.filterableBy.forEach((filter) => {
            if(typeof filter === 'string'){
                this.reduceFilters[filter] = [];
            }
        });
    }
}
