import { AlLocationDictionary } from './al-location.dictionary';
import { AlLocatorMatrix } from './al-locator.matrix';
import { AlGlobalizer } from '../utility/al-globalizer';

/**
 * @public
 *
 * Global singleton instance of {@link AlLocatorMatrix}.
 */
/* tslint:disable:variable-name - stupid rule anyhow */
export const AlLocatorService:AlLocatorMatrix = AlGlobalizer.instantiate( 'locator', () => new AlLocatorMatrix( AlLocationDictionary ) );
