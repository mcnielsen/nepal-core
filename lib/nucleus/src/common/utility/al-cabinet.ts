/**
 *  A (very) simple wrapper for localStorage and sessionStorage, written with expirable cachability in mind.
 *
 *  Author: McNielsen <knielsen@alertlogic.com>
 *  Copyright Alert Logic Inc., 2019.
 */

import { AlStopwatch } from './al-stopwatch';

/**
 * @public
 *
 * AlCabinet provides a simple, generic interface for caching arbitrary data.  It supports optional serialization to localStorage
 * and sessionStorage, where available, but will gracefully fallback to in-memory-cache mode in their absence.
 */
export class AlCabinet
{
    /**
     * The following three constants indicate which type of storage should be used for a given Cabinet.
     */
    public static LOCAL = 1;          //  Local: in memory only
    public static EPHEMERAL = 2;      //  Ephemeral: flushed to sessionStorage, limited to lifespan of browser process
    public static PERSISTENT = 3;     //  Persistent: flushed to localStorage, and will survive load/exit of browser

    static openCabinets: {[cabinetName:string]:AlCabinet} = {};

    public syncronizer?:AlStopwatch;

    public noStorage:boolean = false;

    constructor( public name:string,
                 public data:any = {},
                 public type:number = AlCabinet.LOCAL ) {
        if ( type !== AlCabinet.LOCAL ) {
            this.syncronizer = AlStopwatch.later( this.synchronize );
        }
        AlCabinet.openCabinets[name] = this;
    }

    /**
     *  Instantiates a persistent information cache (uses localStorage), deserializing data from the provided name if it exists.
     *
     *  @param rawName - The name of the data cluster.
     *
     *  @returns A cabinet instance that can be used to interrogate/update the data.
     */

    public static persistent( rawName:string ):AlCabinet {
        const name = `${rawName}_persistent`;
        if ( AlCabinet.openCabinets.hasOwnProperty( name ) ) {
            return AlCabinet.openCabinets[name];
        }
        let cabinet = new AlCabinet( name, {}, AlCabinet.PERSISTENT );
        try {
            if ( typeof( localStorage ) !== 'undefined' ) {
                let content = localStorage.getItem( name );
                if ( content ) {
                    cabinet.data = JSON.parse( content );
                }
            }
        } catch( e ) {
        }
        AlCabinet.openCabinets[name] = cabinet;
        return cabinet;
    }

    /**
     *  Instantiates a temporary information cache (uses sessionStorage), deserializing data from the provided name if it exists.
     *
     *  @param rawName - The name of the data cluster.
     *
     *  @returns A cabinet instance that can be used to interrogate/update the data.
     */

    public static ephemeral( rawName:string ):AlCabinet {
        const name = `${rawName}_ephemeral`;
        if ( AlCabinet.openCabinets.hasOwnProperty( name ) ) {
            return AlCabinet.openCabinets[name];
        }
        let cabinet = new AlCabinet( name, {}, AlCabinet.EPHEMERAL );
        try {
            if ( typeof( sessionStorage ) !== 'undefined' ) {
                let content = sessionStorage.getItem( name );
                if ( content ) {
                    cabinet.data = JSON.parse( content );
                }
            }
        } catch( e ) {
        }
        AlCabinet.openCabinets[name] = cabinet;
        return cabinet;
    }

    /**
     *  Instantiates a local cache (uses no storage or persistence).
     *
     *  @param name - The name of the data cluster
     *
     *  @returns A cabinet instance that can be used just to hold arbitrary data.
     */
    public static local( name:string ):AlCabinet {
        if ( AlCabinet.openCabinets.hasOwnProperty( name ) ) {
            return AlCabinet.openCabinets[name];
        }
        let cabinet = new AlCabinet( name, {}, AlCabinet.LOCAL );
        AlCabinet.openCabinets[name] = cabinet;
        return cabinet;
    }

    /**
     *  Retrieves a property from the cabinet.
     *
     *  @param property - The name of the property.
     *  @param defaultValue - The value to return if the property doesn't exist (defaults to `null`).
     *  @param disableExpiration - Indicates whether or not time-based expiration rules should be honored.
     *
     *  @returns The value of the property (or provided default)
     */

    public get( property:string, defaultValue:any = null, disableExpiration:boolean = false ):any {
        if ( ! this.data.hasOwnProperty( property ) ) {
            return defaultValue;
        }
        let currentTS = + new Date();
        if ( ! disableExpiration && ( this.data[property].expires > 0 && this.data[property].expires < currentTS ) ) {
            delete this.data[property];
            if ( this.syncronizer ) {
                this.syncronizer.again();
            }
            return defaultValue;
        }
        return this.data[property].value;
    }

    /**
     *  Checks to see if a property is present in the cabinet.
     *
     *  @param property - The name of the property.
     *
     *  @returns `true` if the property exists, `false` otherwise.
     */
    public exists( property:string ):boolean {
        return this.data.hasOwnProperty( property );
    }

    /**
     *  Checks to see if a given property is expired.
     *
     *  @param property - The name of the property to check expiration for.
     *
     *  @returns `true` if the property either does not exist or has expired, `false` otherwise.
     */
    public expired( property:string ):boolean {
        if ( ! this.data.hasOwnProperty( property ) ) {
            return true;
        }
        const currentTS = + new Date();
        return this.data[property].expires > 0 && this.data[property].expires < currentTS;

    }

    /**
     *  Sets a property in the cabinet (and schedules synchronization)
     *
     *  @param property - The name of the property.
     *  @param value - The value to set it to.
     *  @param ttl - The number of seconds the data should be retained for.  Defaults to `0` (indefinite).
     *
     *  @returns A reference to the cabinet instance, so that calls to it may be chained.
     */
    public set( property:string, value:any, ttl:number = 0 ) {
        if ( value === null || value === undefined ) {
            return this.delete( property );
        }
        let expirationTS = ttl === 0 ? 0 : + new Date() + ( ttl * 1000 );
        this.data[property] = {
            expires:    expirationTS,
            value:      value
        };
        if ( this.syncronizer ) {
            this.syncronizer.again();
        }
        return this;
    }

    /**
     * Touches a property in the cabinet (and schedules synchronization), effectively extending the
     * cached item's TTL.
     *
     * @param property - The property to touch.
     * @param ttl Number of seconds the data should be retained for.
     */
    public touch( property:string, ttl:number = 0 ) {
        let expirationTS = ttl === 0 ? 0 : + new Date() + ( ttl * 1000 );
        if ( property in this.data ) {
            this.data[property].expires = expirationTS;
            if ( this.syncronizer ) {
                this.syncronizer.again();
            }
        }
    }

    /**
     *  Deletes a property in the cabinet (and schedules synchronization)
     *
     *  @param property - The property to be deleted.
     *
     *  @returns A reference to the cabinet instance, so that calls to it may be chained.
     */
    public delete( property:string ) {
        if ( this.data.hasOwnProperty( property ) ) {
            delete this.data[property];
            if ( this.syncronizer ) {
                this.syncronizer.again();
            }
        }
        return this;
    }

    /**
     *  Destroys the current cabinet, discarding any contents it may have.
     */
    public destroy() {
        this.data = {};
        try {
            if ( this.type === AlCabinet.PERSISTENT ) {
                localStorage.removeItem( this.name );
            } else if ( this.type === AlCabinet.EPHEMERAL ) {
                sessionStorage.removeItem( this.name );
            }
        } catch( e ) {
        }
    }

    /**
     *  Synchronizes data back into the storage facility after performing a garbage collection run.
     *
     *  @returns The class instance.
     */
    public synchronize = () => {
        if ( this.noStorage ) {
            return undefined;
        }
        /**
         *  Perform garbage collection on the dataset and purge any expired stuff
         */
        let currentTS = + new Date();
        for ( let property in this.data ) {
            if ( this.data.hasOwnProperty( property ) ) {
                if ( this.data[property].expires > 0 && this.data[property].expires < currentTS ) {
                    delete this.data[property];
                }
            }
        }

        /**
         *  Now, serialize the surviving data and put it into storage
         */
        try {
            if ( typeof( window ) !== 'undefined' && localStorage && sessionStorage ) {
                if ( this.type === AlCabinet.PERSISTENT ) {
                    localStorage.setItem( this.name, JSON.stringify( this.data ) );
                } else if ( this.type === AlCabinet.EPHEMERAL ) {
                    sessionStorage.setItem( this.name, JSON.stringify( this.data ) );
                }
            }
        } catch( e ) {
            //  Argh, snarfblatt!
            console.warn("An error occurred while trying to syncronize data to local or session storage. ", e.toString() );
            this.noStorage = true;
        }

        /**
         *  Last but not least, make sure no further executions of the synchronizer are scheduled.
         */
        if ( this.syncronizer ) {
            this.syncronizer.cancel();
        }
        return this;
    }
}
