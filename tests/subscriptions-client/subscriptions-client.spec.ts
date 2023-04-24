import { 
  AlExecutionContext,
  AlLocation,
  ConfigOption,
  client,
  Subscriptions,
  AlNetworkResponse
} from "@al/core";

const serviceName = 'subscriptions';
const accountId = '12345';
const queryParams = { foo: 'bar' };
const serviceVersion = "v1";

describe('Subscriptions Client Test Suite:', () => {
  let stub:any;
  let subscriptionsClient = client(Subscriptions);
  let apiBaseURL = AlExecutionContext.resolveURL( AlLocation.InsightAPI );
  let globalBaseURL = AlExecutionContext.resolveURL( AlLocation.GlobalAPI );

  beforeEach( () => {
    AlExecutionContext.reset();
    AlExecutionContext.target("integration");
    AlExecutionContext.setOption( ConfigOption.DisableEndpointsResolution, true );
    stub = jest.spyOn( AlExecutionContext.default, 'handleRequest' ).mockResolvedValue( { status: 200, data: 'Some result' } as AlNetworkResponse );
  } );
  afterEach( () => {
    jest.clearAllMocks();
  } );
  describe('when creating an AWS subscription', () => {
    it('should call post() on the AlDefaultClient instance to the /subscription/aws endpoint with the subscription data', async() => {
      const subscription = {
        product_code:'ebbgj0o0g5cwo4**********',
        aws_customer_identifier:'7vBT7cnzEYf',
        status:'subscribe-success',
      };
      await subscriptionsClient.createAWSSubscription(accountId, subscription);
      expect(stub.mock.calls.length).toEqual(1);
      expect(stub.mock.calls[0][0].url ).toEqual( `${globalBaseURL}/subscriptions/v1/${accountId}/subscription/aws` );
      expect( stub.mock.calls[0][0].data ).toEqual( subscription );
    });
  });
  describe('when creating a full subscription', () => {
    afterEach( () => {
        jest.clearAllMocks();
    } );
    it('should call post() on the AlDefaultClient instance to the /subscription endpoint using the supplied entitements in the subscription data sent', async() => {
      const entitlements = [{
        product_family_code:'log_manager',
        status:'active',
      }];
      const subscriptionData = {
        entitlements,
        active: true,
        type: 'manual',
      };
      await subscriptionsClient.createFullSubscription(accountId, entitlements);
      expect( stub.mock.calls.length ).toEqual(1);
      expect( stub.mock.calls[0][0].url ).toEqual( `${globalBaseURL}/subscriptions/v1/${accountId}/subscription` );
      expect( stub.mock.calls[0][0].data ).toEqual( subscriptionData );
    });
  });
  describe('when creating a standard subscription', () => {
    it('should call post() on the AlDefaultClient instance to the standard subscription endpoint', async() => {
      await subscriptionsClient.createStandardSubscription(accountId);
      expect(stub.mock.calls.length).toEqual(1);
      expect( stub.mock.calls[0][0].url ).toEqual( `${globalBaseURL}/subscriptions/v1/${accountId}/subscription/sync/standard` );
    });
  });
  describe('when retrieving a single subscription', () => {
    it('should call get() on the AlDefaultClient instance to the subscription endpoint for the supplied subscription ID', async() => {
      const subscriptionId = '123-ABC=-?!';
      await subscriptionsClient.getSubscription(accountId, subscriptionId);
      expect(stub.mock.calls.length).toEqual(1);
      expect( stub.mock.calls[0][0].url ).toEqual( `${globalBaseURL}/subscriptions/v1/${accountId}/subscription/${subscriptionId}` );
    });
  });
  describe('when retrieving all subscriptions', () => {
    it('should call get() on the AlDefaultClient instance to the subscriptions endpoint for the supplied subscription ID', async() => {
      await subscriptionsClient.getSubscriptions(accountId);
      expect(stub.mock.calls.length).toEqual(1);
      expect( stub.mock.calls[0][0].url ).toEqual( `${globalBaseURL}/subscriptions/v1/${accountId}/subscriptions` );
    });
  });
  describe('when retrieving all subscriptions', () => {
    it('should call put() on the AlDefaultClient instance to the subscription/aws endpoint with the supplied subscription data', async() => {
      const subscription = {
        product_code:'ebbgj0o0g5cwo4**********',
        status:'unsubscribe-success',
      };
      await subscriptionsClient.updateAWSSubscription(accountId, subscription);
      expect(stub.mock.calls.length).toEqual(1);
      expect( stub.mock.calls[0][0].url ).toEqual( `${globalBaseURL}/subscriptions/v1/${accountId}/subscription/aws` );
      expect( stub.mock.calls[0][0].data ).toEqual( subscription );
    });
  });
});
