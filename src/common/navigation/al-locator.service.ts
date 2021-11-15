import { AlLocationDictionary } from './al-location.dictionary';
import { AlLocatorMatrix } from './al-locator.types';

/**
 * @public
 *
 * Global singleton instance of {@link AlLocatorMatrix}.
 */
/* tslint:disable:variable-name - stupid rule anyhow */
export const AlLocatorService = new AlLocatorMatrix( AlLocationDictionary );
