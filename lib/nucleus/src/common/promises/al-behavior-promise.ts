/**
 *  Author: Big Red <knielsen@alertlogic.com>
 *  Copyright 2019 Alert Logic, Inc.
 */

/**
 * @public
 *
 *  AlBehaviorPromise is a simple extension of Promise that replicates the functionality provided by RxJS's BehaviorSubject.
 *  Promises already provide multicasting functionality, but it can be deucedly inconvenient to provide an inline
 *  executor, and rather obtuse to change the resolved value.
 *
 *  This class exposes the basic surface area of a Promise -- it is `then`able -- but allows the resolved value to change
 *  if necessary.
 */
export class AlBehaviorPromise<ResultType=any>
{
    protected promise:Promise<ResultType>;
    protected resolver?:{(result:ResultType):void};
    protected rejector?:{(error:any):void};
    protected fulfilled:boolean = false;
    protected value:ResultType|null = null;

    constructor( initialValue:ResultType|null = null ) {
        if ( initialValue ) {
            this.value = initialValue;
            this.fulfilled = true;
            this.promise = Promise.resolve( initialValue );
        } else {
            this.promise = new Promise<ResultType>( ( resolve, reject ) => {
                this.resolver = resolve;
                this.rejector = reject;
            } );
        }
    }

    /**
     * Attaches a resolve/reject listener to the underlying promise.
     */
    public then<TResult1 = ResultType, TResult2 = never>(callback?: ((value: ResultType) => TResult1 | PromiseLike<TResult1>) | undefined | null,
                                                         error?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): Promise<TResult1 | TResult2> {
        return this.promise.then( callback, error );
    }

    /**
     * Resolves the underlying promise with the given value.
     */
    public resolve( result:ResultType ) {
        this.value = result;
        if ( ! this.fulfilled ) {
            /* istanbul ignore else */
            if(this.resolver) {
                this.resolver( result );
            }
            this.fulfilled = true;
        }
        this.promise = Promise.resolve( result );       //  any further `then`s will be immediately fulfilled with the given value
    }

    /**
     * Rejects the underlying promise with the given reason.
     */
    public reject( reason:any ) {
        this.value = null;
        if ( ! this.fulfilled ) {
            /* istanbul ignore else */
            if(this.rejector){
                this.rejector( reason );
            }
            this.fulfilled = true;
        }
        this.promise = Promise.reject( reason );
    }

    /**
     * Resets the promise back into an unfulfilled state.
     */
    public rescind() {
        if ( this.fulfilled ) {
            this.value = null;
            this.fulfilled = false;
            this.promise = new Promise<ResultType>( ( resolve, reject ) => {
                this.resolver = resolve;
                this.rejector = reject;
            } );
        }
    }

    /**
     * Gets the last resolved value.
     */
    public getValue():ResultType|null {
        return this.value;
    }

    /**
     * Gets the fulfilled/pending state of the underlying promise.
     */
    public isFulfilled():boolean {
        return this.fulfilled;
    }
}
