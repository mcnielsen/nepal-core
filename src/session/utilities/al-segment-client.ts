/**
 *  This is a simple prototype of the functionality on the segment analytics object
 *  that we actually use.
 *
 *  Based on the API defined here: https://segment.com/docs/sources/server/http/
 */
/**
 *  A simple model of the data sent to the segment IO 'track' method
 */
import { AlGlobalizer } from '../../common/utility';

export class AlSegmentClient
{

    /**
     *  Tracks a single event.
     *
     *  @param eventName The name of the event.  Please review SegmentIO's recommended
     *                  event naming conventions, they're worth considering.
     *  @param properties A map of properties to pass along with the event.
     *  @param options A map of options to pass along to segment.
     */
    public trackEvent ( eventName:string, properties?:{[propName:string]:any}, options?:{[optName:string]:any} ):void {
    }

    /**
     *  Tracks a identify event.
     *
     *  @param id  Unique identifier
     *  @param properties A map of properties to pass along with the event.
     */
    public identifyEvent ( id:string, properties:Object = {} ):void {
    }

    /**
     *  Tracks a group event.
     *
     *  @param id  Unique identifier
     *  @param properties A map of properties to pass along with the event.
     */
    public groupEvent ( id:string, properties:Object = {} ):void {
    }

}

/* tslint:disable:variable-name */
export const AlSegmentService:AlSegmentClient = AlGlobalizer.instantiate( "AlSegmentService", () => new AlSegmentClient() );
