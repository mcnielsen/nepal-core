/**
 * Simple type-guard to check if a given parameter is `PromiseLike`
 */
export function isPromiseLike( candidate:any ):candidate is PromiseLike<any> {
    return typeof( candidate.then ) === 'function';
}
