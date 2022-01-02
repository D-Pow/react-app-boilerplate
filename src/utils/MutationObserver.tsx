import { useState, useEffect } from 'react';

import type { Optional } from '@/types';

// Could alternatively be done with /* globals MutationCallback MutationObserverInit */
// but this is a bit nicer.
type MutationCallback = globalThis.MutationCallback;
type MutationObserverInit = globalThis.MutationObserverInit;


/**
 * Creates a `MutationObserver` with the desired callback function
 * and immediately calls `observer.observe()` on the target DOM node
 * with the specified options.
 *
 * Options default to activating all fields available to a MutationRecord.
 *
 * Supported on IE 11 and all modern browsers.
 *
 * @see [MDN Docs]{@link https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver}
 */
export function createMutationObserver(
    targetNode: Parameters<MutationObserver['observe']>[0],
    mutationCallback: MutationCallback,
    observeOptions: MutationObserverInit = {},
): MutationObserver {
    const observer = new MutationObserver(mutationCallback);

    /**
     * Default all options for the `mutationObserver.observe()` function to include the
     * most permissive of information in `MutationRecord` array entries.
     *
     * Note: `xOldValue: true` toggles the current value to true as well,
     * e.g. `characterDataOldValue` automatically makes `characterData` true.
     *
     * @see [MDN docs for `observe()` options]{@link https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe#parameters}
     */
    observer.observe(targetNode, {
        subtree: true,
        childList: true,
        attributeOldValue: true,
        characterDataOldValue: true,
        ...observeOptions,
    });

    return observer;
}

/**
 * Creates a `MutationObserver` that is automatically disconnected after a component unmounts.
 *
 * @see [`createMutationObserver()`]{@link createMutationObserver}
 */
export function useMutationObserver(...args: Parameters<typeof createMutationObserver>): Optional<ReturnType<typeof createMutationObserver>> {
    /*
     * Note: We have to use state instead of a ref here to prevent the MutationObserver from continuing to
     * receive events even after it's been disconnected (i.e. `mutationObserverRef.current = undefined` doesn't remove it completely).
     *
     * Also, use a state-generation function to prevent `createMutationObserver()` from being called upon
     * every parent re-render.
     */
    const [ mutationObserver, setMutationObserver ] = useState<Optional<MutationObserver>>(() => createMutationObserver(...args));

    useEffect(() => {
        return () => {
            mutationObserver?.disconnect();
            setMutationObserver(undefined);
        };
    }, [ args.length ]); // `args.length` is > 0 when mounted and 0 when the component unmounts

    return mutationObserver;
}
