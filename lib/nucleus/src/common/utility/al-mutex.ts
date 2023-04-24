/**
 *  An extremely simple mutual-exclusion mechanism for asynconrous activities.
 *  Only one operation can execute at a given time; subsequent operations will be triggered when their predecessors resolve, reject, or error.
 *  Each invocation of `run` returns a promise that will resolve when that particular action has finished executing (unless an error is
 *  caught), and will pass through the return value of the inner function.
 *  Rejection will not cancel the execution sequence, as in traditional promise chains.
 */

export class AlMutex {
    protected queue:{
        action: {():Promise<any>},
        resolve: {(v:any):void},
        reject: {(e:any):void}
    }[] = [];
    protected running?:Promise<any>;

    /**
     * This is the only exposed method of a mutex instance.
     */
    public run<ReturnType=any>( action:{():Promise<ReturnType>} ):Promise<ReturnType> {
        return new Promise<ReturnType>( ( resolve, reject ) => {
            if ( this.running ) {
                this.queue.push( { action, resolve, reject } );
            } else {
                this.running = this.exec( action, resolve, reject );
            }
        } );
    }

    protected async exec( action:{():Promise<any>}, resolve:{(value:any):void}, reject:{(error:any):void} ) {
        action().then( r => resolve( r ), e => reject( e ) )
                .catch( e => console.warn( `Ignoring an unhandled error inside a mutex callback`, e ) )
                .finally( () => this.execNext() );
    }

    protected execNext() {
        if ( this.queue.length === 0 ) {
            this.running = undefined;
        } else {
            let { action, resolve, reject } = this.queue.shift();
            this.running = this.exec( action, resolve, reject );
        }
    }
}
