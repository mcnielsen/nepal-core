import { expect } from 'chai';
import { describe } from 'mocha';
import xhrMock from 'xhr-mock';
import { AlRequestDescriptor } from '../src/index';

beforeEach(() => xhrMock.setup());
afterEach(() => xhrMock.teardown());

describe('when using request descriptor', () => {
  it('should apply all attributes as expected', () => {
      const voidExec = ( config ) => {
          expect( config.method ).to.equal( 'GET' );
          expect( config.headers.hasOwnProperty('X-AIMS-Session-Token' ) ).to.equal( true );
          expect( config.headers['X-AIMS-Session-Token'] ).to.equal( 'Fake-Session-Token' );
          expect( config.params.hasOwnProperty( 'kevin' ) ).to.equal( true );
          expect( config.params.hasOwnProperty( 'retry' ) ).to.equal( true );
          expect( config.params.hasOwnProperty( 'count' ) ).to.equal( false );
          expect( config.withCredentials ).to.equal( true );
          return Promise.reject( "Sorry, buckwheat!" );
      };
      let descriptor = new AlRequestDescriptor<boolean>( voidExec, 'GET' );
      const enabledValue = true;
      const disabledValue = false;
      descriptor.withData( { account_id: 2 } )
                .withHeader( 'X-AIMS-Session-Token', 'Fake-Session-Token' )
                .withParam( 'kevin', "true" )
                .withParamIf( enabledValue, "retry", "true" )
                .withParamIf( disabledValue, "count", 0 )
                .withCredentials( true )
                .enableCache( 1, 120 )
                .enableAutoRetry( 5 )
                .execute();
  });
});

