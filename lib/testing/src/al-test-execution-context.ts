import { 
    AIMSSessionDescriptor,
    AlExecutionContext, 
    ConfigOption,
    AlNetworkRequestDescriptor, 
    AlNetworkResponse,
    AlEntitlementCollection,
} from '@al/core';

interface MockSessionState {
    accountId:string;
    entitlements?:string[];
    primaryEntitlements?:string[];
    actingAccountId?:string;
    userId?:string;
    userName?:string;
    accessibleLocationIds?:string[];
    locationId?:string;
    environment?:string;
    residency?:string;
}

export class AlTestExecutionContext extends AlExecutionContext {
    public openRequests:{
        request: AlNetworkRequestDescriptor,
        resolve: Function,
        reject: Function
    }[] = [];

    constructor() {
        super();
        this.setOption( ConfigOption.DisableEndpointsResolution, true );
        this.setOption( ConfigOption.ResolveAccountMetadata, false );
        this.setOption( ConfigOption.LocalManagedContent, true );
    }

    public base64Encode( data:string ):string {
        return data;
    }

    public base64Decode( data:string ):string {
        return data;
    }

    public handleRequest<T = any>( request:AlNetworkRequestDescriptor ):Promise<AlNetworkResponse<T>> {
        /*
        return new Promise<AlNetworkResponse<T>>( ( resolve, reject ) => {
            this.openRequests.push( {
                request: request,
                resolve: resolve,
                reject: reject
            } );
        } );
        */
       return Promise.resolve( {
           request: request,
           data: {} as T,
           status: 200,
           statusText: "OK",
           headers: {}
       } );
    }

    public static clearAuthState() {
        AlExecutionContext.session.deactivateSession();
        return null;
    }

    public static async setAuthState( state:MockSessionState|string|null, actingAccountId:string = "default", userId:string = '1001-ABCDEF00-10105060-1234' ) {
        if ( ! state ) {
            return AlTestExecutionContext.clearAuthState();
        }
        if ( typeof( state ) === 'string' ) {
            state = {
                accountId: state
            } as MockSessionState;
        }
        const nowTS = Date.now() / 1000;
        const sessionData:AIMSSessionDescriptor = {
            authentication: {
                user: {
                    id: state.userId || '1001-ABCDEF00-10105060-1234',
                    name: state.userName || 'Mister McNielsen',
                    email: 'mcnielsen@alertlogic.com',
                    active: true,
                    locked: false,
                    version: 1002,
                    linked_users: [],
                    created: {
                        at: 123456789,
                        by: 'McNielsen',
                    },
                    modified: {
                        at: 123456790,
                        by: 'Warsaw',
                    }
                },
                account: {
                    id: state.accountId,
                    name: "Kevin's Fast Company",
                    active: true,
                    accessible_locations: state.accessibleLocationIds || [
                        "defender-us-denver",
                        "insight-us-virginia"
                    ],
                    default_location: state.locationId || 'defender-us-denver',
                    created: {
                        at: 123456789,
                        by: 'McNielsen',
                    },
                    modified: {
                        at: 123456790,
                        by: 'Warsaw',
                    }
                },
                token: 'BigFatFakeToken',
                token_expiration: nowTS + 86400,
            }
        };

        if ( state.actingAccountId && state.actingAccountId !== 'default' && state.actingAccountId !== state.accountId ) {
            sessionData.acting = Object.assign( {}, sessionData.authentication.account );
            sessionData.acting.id = state.actingAccountId;
            sessionData.acting.name = "Kevin's Slow Company";
        }

        AlExecutionContext.setOption( ConfigOption.ResolveAccountMetadata, false );

        let resolved = await AlExecutionContext.session.setAuthentication( sessionData );

        if ( state.entitlements ) {
            AlExecutionContext.session.setEffectiveEntitlements( AlTestExecutionContext.createEntitlementSet( state.entitlements ) );
        }
        if ( state.primaryEntitlements ) {
            AlExecutionContext.session.setPrimaryEntitlements( AlTestExecutionContext.createEntitlementSet( state.primaryEntitlements ) );
        }

        return resolved;
    }



    public static createEntitlementSet( entitlements:string[] = [] ) {
        return new AlEntitlementCollection( entitlements.map( entitlementId => {
            const date = new Date();
            date.setDate( date.getDate() + 1 );
            return {
                productId: entitlementId,
                active: true,
                expires: date
            };
        } ) );
    }
}
