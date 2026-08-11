import {
    useState,
    useEffect,
    useCallback,
    useReducer,
    useRef,
    useMemo,
    useSyncExternalStore,
    type Dispatch,
    type SetStateAction,
    type RefObject,
    type ReactNode,
} from 'react';

import { elementIsInClickPath, getClickPath, setDocumentScrolling } from '@/utils/Events';
import { getQueryParams, modifyQueryParams } from '@/utils/BrowserNavigation';
import { objEquals } from '@/utils/Objects';

import type {
    ClickPath,
    ElementProps,
} from '@/utils/Events';
import type {
    Indexable,
    JsonPrimitive,
    Nullable,
    Optional,
} from '@/types';


/**
 * The type of a hook's setState(value) function's {@code value} parameter.
 * Can either be the new state value or a function that takes in the previous
 * state's value and returns the new state value.
 */
export type HookSetStateParam<T> = T | ((prevState: T) => T);

/**
 * A hook's setState() function, which receives a {@link HookSetStateParam} that
 * is either the new state value or a function that returns the new state value.
 */
export type HookSetStateFunction<T> = (value: HookSetStateParam<T>) => void;

/**
 * Function that uses the value returned from `useMyHook()` to render children.
 */
export type HookedChildRenderer<HookReturn> = (hookReturnVal: HookReturn) => ReactNode;


export interface HookedProps<HookArgs, HookReturn> {
    /**
     * Hook to use within class component.
     */
    hook: (hookArgs: HookArgs) => HookReturn;
    /**
     * Arguments forwarded to `hook()`.
     */
    hookArgs: HookArgs;
    /**
     * Function that uses value from `hook()` to render children; passed as React.Component.props.
     */
    children: HookedChildRenderer<HookReturn>;
}

/**
 * Component used when class components want to use hooks.
 *
 * @param props - Props for returned React.Component
 * @returns Children rendered using the hook() return values
 */
export function Hooked<HookArgs, HookReturn>({ hook, hookArgs, children }: HookedProps<HookArgs, HookReturn>) {
    return children(hook(hookArgs));
}


export interface UsePreviousOptions {
    /**
     * Max number of times the variable's value will be updated.
     */
    maxRefreshes?: number;
    /**
     * If the returned previous value should equal the initial value on first call.
     */
    initializeWithFirstValue?: boolean;
    /**
     * If refreshes should be counted when the previous/current values are equal.
     */
    identicalValuesCountAsRefreshes?: boolean;
}

/**
 * Tracks the previous value of a variable before it was last updated.
 *
 * Useful for e.g. comparing previous state to current state in code existing
 * outside the `setState()` function itself.
 *
 * Note:
 * * `identicalValuesCountAsRefreshes` only takes effect if `maxRefreshes` is anything other than `Infinity`.
 * * If using `identicalValuesCountAsRefreshes: true`, it is highly recommended to also use `initializeWithFirstValue: true`
 *   to avoid "wasting" refreshes on initial component load (e.g. when other `useEffect` calls are present).
 *
 * @param value - Value to track.
 * @param [options]
 * @returns Previous value of the variable.
 */
export function usePrevious<T>(value: T, {
    maxRefreshes = Infinity,
    initializeWithFirstValue = false,
    identicalValuesCountAsRefreshes = false,
}: UsePreviousOptions = {}): Optional<T> {
    const ref = useRef<{ value: Optional<T>; numRefreshes: number }>({
        // Tracks previous values
        value: initializeWithFirstValue ? value : undefined,
        // Tracks how many times the previous value was refreshed (the first value counts as the first refresh)
        numRefreshes: 0,
    });

    const shouldRefreshForNewValue = ref.current.value !== value;
    // If identical values count as refreshes, then we need to force `useEffect()` to be called.
    // However, we don't want to do so using `ref` because that's always the same value,
    // nor `ref.current` because that value is always different so using it would interfere with `identicalValuesCountAsRefreshes = false`.
    const shouldRefreshForIdenticalValue = (
        identicalValuesCountAsRefreshes
        && ref.current.value === value
        && ref.current.numRefreshes !== 0 // `useEffect` will set the initial value after rendering for the first time, so don't refresh on first run
        && ref.current.value !== undefined // Avoid "wasting" refreshes when no value has been set; same as `numRefreshes !== 0` except will change before it
        && Math.random()
    );
    const shouldRefresh = (
        ref.current.numRefreshes < maxRefreshes
        && (
            shouldRefreshForNewValue || shouldRefreshForIdenticalValue
        )
    );

    useEffect(() => {
        if (shouldRefresh) {
            ref.current = {
                value,
                numRefreshes: ref.current.numRefreshes + 1,
            };
        }
    }, [ value, shouldRefresh ]);

    // Return previous value (`useEffect` is run after re-renders so `ref` will still hold the old value)
    return ref.current.value;
}


/**
 * `useReducer()` with an async `reducer()` function.
 *
 * `initialValue` and `initialValueInit()` must still be synchronous.
 *
 * @param reducer - Async reducer for `useReducer(reducer)`.
 * @param [initialValue] - Initial value for `useReducer(reducer, initialValue)`.
 * @param [initialValueInit] - Initial value generator function for `useReducer(reducer, initialValue, initialValueInit)`.
 * @returns The `state` value/`dispatch()` function for `useReducer()`.
 *
 * @see [Related StackOverflow answer]{@link https://stackoverflow.com/questions/53146795/react-usereducer-async-data-fetch/62554888#62554888}
 */
export function useReducerAsync<State, Action>(
    reducer: (state: State, action: Action) => State | Promise<State>,
    initialValue?: State,
    initialValueInit?: (initialValue?: State) => State,
): [ State, (action: Action) => Promise<State> ] {
    const [ state, setState ] = useState<State>(() =>
        initialValueInit
            ? initialValueInit(initialValue)
            : initialValue as State,
    );
    const dispatch = useCallback(async (action: Action) => {
        const newState = await reducer(state, action);

        setState(newState);

        return newState;
    }, [ state, reducer ]);

    return [ state, dispatch ];
}


/**
 * The hook passed to {@link withGlobalState}, modified to also receive the global
 * state shared between all hook instances as well as the unique ID of the calling parent.
 */
export type HookModifiedForGlobalState<HookArgs extends unknown[], GlobalState, HookReturn> = (
    ...args: [ ...origHookParams: HookArgs, globalHookState: GlobalState, hookCallerId: number ]
) => HookReturn;

/**
 * {@code setState} function for the global state shared between all instances of a
 * hook wrapped by {@link withGlobalState}.
 */
export type SetGlobalStateForWrappedHook<GlobalState, HookReturn> = (
    globalHookState: GlobalState,
    setGlobalHookState: HookSetStateFunction<GlobalState>,
    hookReturnVal: HookReturn,
    hookCallerId: number,
) => void;

/**
 * Wraps a hook such that all hook instances can access a single global
 * state. Returns the original hook that accepts caller arguments
 * as well as global state arguments.
 *
 * @param hook - The hook to wrap.
 * @param setGlobalState - {@code setState} function for global state.
 * @param initialGlobalStateVal - Initial value for global state.
 * @returns The original hook wrapped with global state functionality.
 */
export function withGlobalState<HookArgs extends unknown[], GlobalState, HookReturn>(
    hook: HookModifiedForGlobalState<HookArgs, GlobalState, HookReturn>,
    setGlobalState: SetGlobalStateForWrappedHook<GlobalState, HookReturn>,
    initialGlobalStateVal: GlobalState,
): (...hookArgs: HookArgs) => HookReturn {
    /*
     * Mimic `useState` since this isn't a hook.
     * This will still cause React to re-render if `globalHookState` changes because the
     * passed `hook` is modified to read and react to its value.
     */
    let globalHookState = initialGlobalStateVal;

    function setGlobalHookState(newState: HookSetStateParam<GlobalState>) {
        if (typeof newState === typeof withGlobalState) {
            globalHookState = (newState as (prevState: GlobalState) => GlobalState)(globalHookState);
        } else {
            globalHookState = newState as GlobalState;
        }
    }

    return (...hookArgs: HookArgs) => {
        // Assign a unique ID to each hook caller in the event
        // that the wrapped hook needs to know which caller it is
        const [ hookCallerId ] = useState(Math.random());
        const hookReturnVal = hook(...hookArgs, globalHookState, hookCallerId);

        setGlobalState(
            globalHookState,
            setGlobalHookState,
            hookReturnVal,
            hookCallerId,
        );

        return hookReturnVal;
    };
}


export interface UseStorageOptions {
    /**
     * Initial value to use if storage lacks the passed key.
     */
    initialValue?: JsonPrimitive;
    /**
     * Type of window storage to use.
     */
    type?: 'local' | 'session';
}

/**
 * Reads and updates window's localStorage and sessionStorage while allowing
 * React components to re-render based on changes to the value of the stored
 * key.
 *
 * @param key - Key used in storage.
 * @param [options] - Options for storage handling.
 * @returns Parsed state value and setState function.
 */
export function useStorage(key: string, {
    initialValue = null,
    type = 'local',
}: UseStorageOptions = {}): [ JsonPrimitive, HookSetStateFunction<JsonPrimitive> ] {
    const storage = self[`${type}Storage`];

    const [ storedState, setStoredState ] = useState<JsonPrimitive>(() => {
        // use stored value in storage before using initial value
        const initialStoredState = storage.getItem(key);
        return initialStoredState ? JSON.parse(initialStoredState) : initialValue;
    });

    const setState: HookSetStateFunction<JsonPrimitive> = value => {
        let valueToStore = value as JsonPrimitive;

        try {
            if (typeof value === 'function') {
                // normal setState functionality if function is passed
                valueToStore = value(storedState);
            }

            setStoredState(valueToStore);

            storage.setItem(key, JSON.stringify(valueToStore));
        } catch (e) {
            console.error(`Could not store value (${value}) to ${type}Storage. Error =`, e);
        }
    };

    return [ storedState, setState ];
}


export interface SetQueryParamOptions {
    /**
     * Use replaceState instead of pushState so the change
     * does not create a new history entry.
     */
    replace?: boolean;
}

export type SetQueryParamFunc = (
    key: string,
    value?: string | string[] | null,
    options?: SetQueryParamOptions,
) => void;

/**
 * Listen to both navigation (for URL changes) and our own event (for
 * mutations caused by our own state changes). Only listening to navigation
 * isn't sufficient because the event fires before the URL change,
 * so `window.location` is the previous URL.
 */
const QUERY_CHANGE_EVENT = 'querychange';

/**
 * Reads and writes URL query params, staying in sync with browser
 * back / forward navigation.
 *
 * @returns `params`      The current {@link URLSearchParams} (read-only snapshot).
 * @returns `setParam`    Sets a param. An array appends one entry per value
 *                        (`?tag=a&tag=b`, read back with `params.getAll`);
 *                        a falsy or empty value removes the param; pass
 *                        `{ replace: true }` to avoid pushing a history entry.
 *                        Deletes a param if `value` is unspecified.
 */
export function useQueryParams(): {
    params: URLSearchParams;
    setParam: SetQueryParamFunc;
    } {
    const subscribe = useCallback((cb: () => void) => {
        window.addEventListener('popstate', cb);
        window.addEventListener(QUERY_CHANGE_EVENT, cb);

        return () => {
            window.removeEventListener('popstate', cb);
            window.removeEventListener(QUERY_CHANGE_EVENT, cb);
        };
    }, []);

    const search = useSyncExternalStore(
        subscribe,
        () => window.location.search,
        () => '',
    );

    const params = useMemo(() => new URLSearchParams(search), [ search ]);

    const setParam = useCallback(
        (
            key: string,
            value?: string | string[] | null,
            options?: SetQueryParamOptions,
        ) => {
            const url = new URL(window.location.href);
            const values = Array.isArray(value) ? value : [ value ];

            url.searchParams.delete(key);

            (values.filter(Boolean) as string[]).forEach((entry) => {
                url.searchParams.append(key, entry);
            });

            window.history[options?.replace ? 'replaceState' : 'pushState'](
                null,
                '',
                url,
            );
            window.dispatchEvent(new Event(QUERY_CHANGE_EVENT));
        },
        [],
    );

    return { params, setParam };
}

/**
 * Hook to listen to query param changes using new "navigate" event.
 * Fires before the URL actually changes, so could lead to out-of-sync results
 * if another hook listens to "navigate" but blocks navigation via `.preventDefault()`.
 *
 * Not yet supported in testing environments as of 2026.
 *
 * @see [Navigate event]{@link https://developer.mozilla.org/en-US/docs/Web/API/Navigation/navigate_event}
 */
export function useQueryParamsNavigation() {
    const [ params, setParams ] = useState<URLSearchParams>(() => new URLSearchParams(self.location.search));

    // NavigateEvent isn't yet added to TypeScript's lib.dom
    const navigateListener = useCallback((event: Event & { destination: { url: string }}) => {
        const newUrl = new URL(event.destination.url);

        setParams(newUrl.searchParams);
    }, []);

    useEffect(() => {
        // Navigation isn't yet added to TypeScript's lib.dom
        const { navigation } = window as any;

        navigation?.addEventListener('navigate', navigateListener);

        return () => {
            navigation?.removeEventListener('navigate', navigateListener);
        };
    }, [ navigateListener ]);

    const setParam = useCallback(
        (
            key: string,
            value?: string | string[] | null,
            options?: SetQueryParamOptions,
        ) => {
            const url = new URL(self.location.href);
            const values = Array.isArray(value) ? value : [ value ];

            url.searchParams.delete(key);

            (values.filter(Boolean) as string[]).forEach((entry) => {
                url.searchParams.append(key, entry);
            });

            self.history[options?.replace ? 'replaceState' : 'pushState'](
                null,
                '',
                url,
            );
        },
        [],
    );

    return [ params, setParam ] as const;
}

/**
 * Hook to read URL query parameters and update a specific key-value pair.
 *
 * @returns Query param key-value map, and respective setState(key, value) function.
 */
export function useQueryParamsObj(): [ Indexable, (key: string | Indexable, value?: unknown) => void ] {
    const [ queryParamsObj, setQueryParamsObj ] = useState<Indexable>(() => getQueryParams());

    const setQueryParam = (key: string | Indexable, value?: unknown) => {
        let valueToStore = value;

        if (typeof value === 'function') {
            // normal setState functionality if function is passed
            valueToStore = value(queryParamsObj[key as string]);
        }

        const newQueryParamsObj = modifyQueryParams(key, valueToStore, {
            overwriteQueryParams: true,
            pushOnHistory: true,
        });

        setQueryParamsObj(newQueryParamsObj);
    };

    useEffect(() => {
        const updatedQueryParams = getQueryParams();

        if (!objEquals(queryParamsObj, updatedQueryParams)) {
            setQueryParam(updatedQueryParams);
        }
    }, [ self.location.search ]);

    return [ queryParamsObj, setQueryParam ];
}


/**
 * Custom state handler function for {@link useWindowEvent}.
 *
 * @param prevState - Previous state
 * @param setState - setState() React function
 * @param newEvent - New event from window
 */
export type HandleWindowEvent<EventState, NewEvent> = (
    prevState: EventState,
    setState: Dispatch<SetStateAction<EventState>>,
    newEvent: NewEvent,
) => void;

export interface UseWindowEventOptions<EventState, NewEvent> {
    /**
     * Nested event field to use as state instead of the event itself.
     */
    nestedEventField?: Nullable<string, true>;
    /**
     * Initial state to use in event listener.
     */
    initialEventState?: EventState;
    /**
     * Custom event handler to use instead of standard setEventState.
     */
    handleEvent?: Nullable<HandleWindowEvent<EventState, NewEvent>, true>;
    /**
     * useEffect optimization inputs: `useEffect(func, useEffectInputs)`.
     */
    useEffectInputs?: unknown[];
    /**
     * Options for `self.addEventListener()`.
     */
    addEventListenerOptions?: Parameters<typeof self.addEventListener>[2];
}

/**
 * Adds an event listener to the window and returns the associated eventState/setEventState fields.
 * Optional configurations include using a nested event field for state, setting the initial state,
 * and using a custom event handler instead of the standard setEventState(newEventState).
 *
 * @param eventType - Type of event, passed to `window.addEventListener(eventType, ...)`
 * @param [options]
 * @returns event state and respective setState function
 */
export function useWindowEvent<EventState = Nullable<Event, true>, NewEvent = Event>(
    eventType: string,
    {
        nestedEventField = null,
        initialEventState = null as EventState,
        handleEvent = null,
        useEffectInputs = [],
        addEventListenerOptions,
    }: UseWindowEventOptions<EventState, NewEvent> = {},
): [ EventState, Dispatch<SetStateAction<EventState>> ] {
    const [ eventState, setEventState ] = useState<EventState>(initialEventState);

    const prevEventListenerOptionsRef = useRef(addEventListenerOptions);
    // `addEventListener()` options may be a boolean, so cast to an indexable type for key-diffing.
    // Spreading a boolean is a no-op at runtime (`{ ...true }` === `{}`), matching the original behavior.
    const prevEventListenerOptions = prevEventListenerOptionsRef.current as Optional<Indexable>;
    const nextEventListenerOptions = addEventListenerOptions as Optional<Indexable>;
    const eventListenerOptionsChanged = Object.keys({ ...prevEventListenerOptions, ...nextEventListenerOptions })
        .reduce((didChange, key) => (
            didChange
            || (prevEventListenerOptions?.[key] !== nextEventListenerOptions?.[key])
        ), false);

    const isUsingOwnEventHandler = typeof handleEvent === 'function';

    useEffect(() => {
        function eventListener(event: Event) {
            const newEventState = (
                nestedEventField
                    ? (event as unknown as Indexable)[nestedEventField]
                    : event
            ) as NewEvent;

            if (isUsingOwnEventHandler) {
                handleEvent?.(eventState, setEventState, newEventState);
            } else {
                setEventState(newEventState as unknown as EventState);
            }
        }

        self.addEventListener(eventType, eventListener, addEventListenerOptions);

        return () => {
            self.removeEventListener(eventType, eventListener);
        };
    }, [
        eventType,
        nestedEventField,
        eventListenerOptionsChanged,
        isUsingOwnEventHandler,
        ...useEffectInputs,
    ]);

    return [ eventState, setEventState ];
}


/**
 * Gets the `key` string value from a keyboard event.
 *
 * Defaults to the `keydown` event since it works for keys that don't produce output (e.g. `Enter`, `Escape`, etc.)
 * and because `keypress` has been [deprecated]{@link https://developer.mozilla.org/en-US/docs/Web/API/Document/keypress_event}.
 *
 * @param type - Type of key event (e.g. `down`, `up`, or `press`).
 * @returns The string representing the key interacted with and its respective `setKeyState()` function.
 * @see [`keydown` MDN docs]{@link https://developer.mozilla.org/en-US/docs/Web/API/Document/keydown_event}
 * @see [`KeyboardEvent.key` MDN docs]{@link https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key}
 */
export function useKeyboardEvent(type: 'down' | 'up' | 'press' = 'down') {
    return useWindowEvent<Nullable<string, true>, KeyboardEvent['key']>(`key${type}`, { nestedEventField: 'key' });
}


/**
 * State held by {@link useClickPath}: either the raw click event or a click path
 * (the latter allowing the returned setter to reset the path directly, e.g. `setClickPath([])`).
 */
export type ClickPathEventState = Nullable<MouseEvent | ClickPath, true>;

/**
 * Get a hook state array containing the path from the clicked element to the root.
 *
 * @returns The click path and setter function for said path
 */
export function useClickPath(): [ ClickPath, Dispatch<SetStateAction<ClickPathEventState>> ] {
    const [ event, setEvent ] = useWindowEvent<ClickPathEventState, MouseEvent>('click');
    const clickPath: ClickPath = getClickPath(event);

    return [ clickPath, setEvent ]; // setEvent will be used as setClickPath
}


/**
 * A root-close hook that triggers closing an element based on if the user clicks outside the bounds
 * of the acceptable element or if they press the "Escape" key
 *
 * @param acceptableElement - Element that marks the bounds of what is acceptable to click on
 * @param closeElement - Element that marks the bounds of what should trigger the root close
 * @returns If the user triggered the root close and the function to reset the trigger
 */
export function useRootClose(acceptableElement: ElementProps, closeElement: ElementProps): [ boolean, () => void ] {
    const [ keyDown, setKeyDown ] = useKeyboardEvent();
    const [ clickPath, setClickPath ] = useClickPath();

    const pressedEscape = keyDown === 'Escape';
    const clickedOnElementWithinBounds = elementIsInClickPath(acceptableElement, clickPath);
    const clickedOnElementOutsideBounds = elementIsInClickPath(closeElement, clickPath);
    const rootWasClosed = pressedEscape || (clickedOnElementOutsideBounds && !clickedOnElementWithinBounds);

    const resetRootClosed = () => {
        setKeyDown(null);
        setClickPath([]);
    };

    return [ rootWasClosed, resetRootClosed ];
}


export interface WindowSizeState {
    wasResized: boolean;
    width: number;
    height: number;
    widthIgnoringScrollbar: number;
    heightIgnoringScrollbar: number;
}

export interface UseWindowResizeReturn {
    windowSizeState: WindowSizeState;
    setWindowSizeState: Dispatch<SetStateAction<WindowSizeState>>;
    resetWasResized: () => void;
}

/**
 * Hook to get the size of the window after the user has resized it.
 *
 * Use the `(width|height)IgnoringScrollbar` to ignore the presence/absence of a
 * scrollbar for cases when the scrollbar (dis-)appears depending on if the user is
 * scrolling, e.g. scrollbars often hide after a period of time of not scrolling on
 * mobile devices, Safari, etc.
 *
 * Call `resetWasSized()` to set `windowSizeState.wasResized` to false for logic that
 * needs to check if the window was resized since the component was last rendered.
 */
export function useWindowResize(): UseWindowResizeReturn {
    const initialState: WindowSizeState = {
        wasResized: false,
        width: self.innerWidth,
        height: self.innerHeight,
        /**
         * Use `clientWidth` instead of `innerWidth` to exclude/ignore window size differences
         * depending on if a scrollbar is present.
         * This helps avoid issues when the scrollbar (dis-)appears at different times.
         *
         * @see [clientWidth MDN docs]{@link https://developer.mozilla.org/en-US/docs/Web/API/Element/clientWidth}
         */
        widthIgnoringScrollbar: document.documentElement.clientWidth,
        heightIgnoringScrollbar: document.documentElement.clientHeight,
    };

    const handleResize: HandleWindowEvent<WindowSizeState, UIEvent> = (prevState, setState) => {
        setState({
            wasResized: true,
            width: self.innerWidth,
            height: self.innerHeight,
            widthIgnoringScrollbar: document.documentElement.clientWidth,
            heightIgnoringScrollbar: document.documentElement.clientHeight,
        });
    };

    const [ windowSizeState, setWindowSizeState ] = useWindowEvent<WindowSizeState, UIEvent>('resize', {
        initialEventState: initialState,
        handleEvent: handleResize,
        addEventListenerOptions: {
            passive: true, // Disallows `event.preventDefault()` but improves performance due to the event not being cancellable, so renders aren't blocked. Only needed for IE and the new IE (Safari). See: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#improving_scrolling_performance_with_passive_listeners
        },
    });

    const resetWasResized = useCallback(() => {
        setWindowSizeState(prevState => ({
            ...prevState,
            wasResized: false,
        }));
    }, [ setWindowSizeState ]);

    return { windowSizeState, setWindowSizeState, resetWasResized };
}


/**
 * Determines if the mouse is hovering over an element using JavaScript.
 * Useful for the times where JavaScript calculations need to be done,
 * where CSS `:hover` classes aren't enough.
 *
 * Optionally, `overrideBoundingClientRect` will allow the use of a different
 * `getBoundingClientRect()` object instead of the one from the returned React.ref.
 * This field will generally only be useful if you need to know if an element inside
 * an SVG is hovered over because `svgElement.getBoundingClientRect()` will return
 * a rect relative to the SVG, not the window. In this case, manual bounding-rect
 * calculations will need to be done on the SVG element to convert it from the SVG's
 * viewport to the window's.
 *
 * @param [overrideBoundingClientRect] - Optional `getBoundingClientRect()` result to use instead of the returned ref
 * @returns The ref to attach to the element watching for a hover and the respective `isHovered` value
 */
export function useHover<E extends Element = HTMLElement>(
    overrideBoundingClientRect?: Nullable<DOMRect, true>,
): [ RefObject<E | null>, boolean ] {
    // Populated by React once the returned ref is attached to an element.
    // `overrideBoundingClientRect` takes precedence over the ref's rect when both are present.
    const ref = useRef<E>(null);

    function handleMouseMove(
        prevIsHovered: boolean,
        setIsHovered: Dispatch<SetStateAction<boolean>>,
        newEvent: MouseEvent,
    ) {
        const { pageX, pageY } = newEvent;

        if (ref.current) {
            const { pageXOffset, pageYOffset } = self;
            let { top, bottom, left, right } = overrideBoundingClientRect || ref.current.getBoundingClientRect();

            top = top + pageYOffset;
            bottom = bottom + pageYOffset;
            left = left + pageXOffset;
            right = right + pageXOffset;

            if (pageX <= right && pageX >= left && pageY <= bottom && pageY >= top) {
                setIsHovered(true);
            } else {
                setIsHovered(false);
            }
        }
    }

    const [ isHovered ] = useWindowEvent<boolean, MouseEvent>('mousemove', {
        initialEventState: false,
        handleEvent: handleMouseMove,
        useEffectInputs: [ ref.current ],
    });

    return [ ref, isHovered ];
}


/**
 * Entry tracking whether a single {@link useBlockDocumentScrolling} instance is blocking scrolling.
 */
export interface BlockDocumentScrollingEntry {
    id: number;
    isBlockingScrolling: boolean;
}

/**
 * Determines if scrolling should be disabled for a single {@link useBlockDocumentScrolling} instance.
 */
export type ShouldBlockScrolling = () => boolean;

/**
 * Blocks the `document.body` from being scrollable as long as the
 * `shouldBlockScrolling` function returns true.
 *
 * Keeps track of all other `useBlockDocumentScrolling()` instances such
 * that even if one instance returns false, the `document.body` is still not
 * scrollable if another returns true.
 *
 * @param shouldBlockScrolling - Function to determine if scrolling should be disabled.
 */
export const useBlockDocumentScrolling = (function useBlockDocumentScrollingFactory() {
    function useBlockDocumentScrollingHook(
        shouldBlockScrolling: ShouldBlockScrolling,
        allHooksBlockingScrollingGlobalState: BlockDocumentScrollingEntry[],
        id: number,
    ) {
        /**
         * Don't return a cleanup function to handle activating scrolling.
         *
         * React calls cleanup functions upon both component unmount
         * and component re-render.
         *
         * If re-activating scrolling were returned in the cleanup function,
         * then anytime the component re-rendered, document scrolling
         * would be re-activated, even if the `shouldBlockScrolling()` returned true.
         *
         * Thus, handle the cleanup manually in else-block.
         */
        const blockScrolling = shouldBlockScrolling();
        const otherHooksBlockingScrolling = allHooksBlockingScrollingGlobalState
            .filter(entry => entry.id !== id)
            .some(entry => entry.isBlockingScrolling);

        useEffect(() => {
            if (blockScrolling) {
                setDocumentScrolling(false);
            } else if (!otherHooksBlockingScrolling) {
                setDocumentScrolling();
            }
        }, [ blockScrolling, otherHooksBlockingScrolling ]);

        return blockScrolling;
    }

    function setTrackAllHookCallsState(
        prevGlobalState: BlockDocumentScrollingEntry[],
        setGlobalState: HookSetStateFunction<BlockDocumentScrollingEntry[]>,
        hookReturnVal: boolean,
        id: number,
    ) {
        prevGlobalState = [ ...prevGlobalState ];
        const thisHookEntry = prevGlobalState.find(entries => entries.id === id);

        if (thisHookEntry == null) {
            prevGlobalState.push({ id, isBlockingScrolling: hookReturnVal });
            setGlobalState(prevGlobalState);
        } else if (thisHookEntry.isBlockingScrolling !== hookReturnVal) {
            thisHookEntry.isBlockingScrolling = hookReturnVal;
            setGlobalState(prevGlobalState);
        }
    }

    return withGlobalState<[ shouldBlockScrolling: ShouldBlockScrolling ], BlockDocumentScrollingEntry[], boolean>(
        useBlockDocumentScrollingHook,
        setTrackAllHookCallsState,
        [],
    );
})();


/**
 * Returns an array of false booleans that will toggle to true one after another
 * according to the specified `intervalTimeMs`.
 * Optionally allows toggling back from true -> false
 *
 * @param arrayLength - How many entries should be in the toggle array
 * @param intervalTimeMs - How much time should pass before toggling the next entry
 * @param [allowBackwardsToggle=false] - Allow array toggle to be able to trigger in both directions, false <-> true
 * @returns An array of booleans to toggle and a function to initiate array toggling
 */
export function useTimedArrayToggle(
    arrayLength: number,
    intervalTimeMs: number,
    allowBackwardsToggle = false,
): [ boolean[], () => void ] {
    const toggleArrayEntryReducer = useCallback((prevArray: boolean[], index: number) => {
        const toggledEntries = [ ...prevArray ];
        toggledEntries[index] = !toggledEntries[index];
        return toggledEntries;
    }, []);

    const origState = Array.from({ length: arrayLength }, () => false);

    const [ toggledEntries, dispatchToggleEntry ] = useReducer(toggleArrayEntryReducer, origState);
    const [ shouldToggleEntries, setShouldToggleEntries ] = useState(false);
    const [ timeoutTriggered, setTimeoutTriggered ] = useState(false);

    const resetTimeoutTrigger = () => {
        if (allowBackwardsToggle) {
            setTimeout(() => {
                setShouldToggleEntries(false);
                setTimeoutTriggered(false);
            }, arrayLength * intervalTimeMs);
        }
    };

    if (shouldToggleEntries && !timeoutTriggered) {
        setTimeoutTriggered(true);

        for (let i = 0; i < arrayLength; i++) {
            const timeToShow = intervalTimeMs * i;

            setTimeout(() => {
                dispatchToggleEntry(i);
            }, timeToShow);
        }

        resetTimeoutTrigger();
    }

    const triggerArrayToggle = () => {
        setShouldToggleEntries(true);
    };

    return [ toggledEntries, triggerArrayToggle ];
}


/**
 * 'message' event listener added to a {@link BroadcastChannel}.
 */
export type BroadcastChannelMessageListener = (
    messageEvent: Parameters<NonNullable<BroadcastChannel['onmessage']>>[0],
) => void;

export interface UseServiceWorkerBroadcastChannelOptions {
    /**
     * Name of BroadcastChannel.
     */
    channelName?: string;
}

/**
 * Creates a new {@code BroadcastChannel} with the given name and attaches the
 * passed event listener to the channel's 'message' event.
 *
 * @param messageEventListener - 'message' event listener added to BroadcastChannel.
 * @param [options]
 * @returns A new BroadcastChannel with the respective event listener and channel name.
 */
export function useServiceWorkerBroadcastChannel(messageEventListener: BroadcastChannelMessageListener, {
    // Injected as a string literal at build time by webpack's `DefinePlugin`
    channelName = process.env.BROADCAST_CHANNEL as string,
}: UseServiceWorkerBroadcastChannelOptions = {}): Optional<BroadcastChannel> {
    const eventName = 'message';
    let broadcastChannel: Optional<BroadcastChannel>;

    try {
        broadcastChannel = new BroadcastChannel(channelName);
    } catch (e) {
        // BroadcastChannel not defined, likely because client is using Safari or IE
    }

    useEffect(() => {
        if (broadcastChannel == null) {
            return;
        }

        if (messageEventListener != null) {
            broadcastChannel.addEventListener(eventName, messageEventListener);
        }

        return () => {
            broadcastChannel.removeEventListener(eventName, messageEventListener);
            // Close the channel so its underlying MessagePort is released. Without this, the
            // channel keeps the event loop alive (and Jest won't exit) and leaks across renders.
            broadcastChannel.close();
        };
    }, [ channelName, broadcastChannel, messageEventListener ]);

    return broadcastChannel;
}
