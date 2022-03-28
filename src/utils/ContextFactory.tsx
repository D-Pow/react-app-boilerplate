import {
    createContext,
    useState,
    useCallback,
    useMemo,
    useContext,
    memo,
    type Component,
    type ReactElement,
    type ComponentType,
    type PropsWithChildren,
    type Context as ReactContext,
    type Provider as ReactProvider,
    type Dispatch,
    type SetStateAction,
} from 'react';

import { objEquals } from '@/utils/Objects';
import { getChildName } from '@/utils/ReactParsing';

import type {
    IndexSignature,
    PartialDeep,
} from '@/types';


// `Context.Provider` with `value` already populated
type ProviderWithPopulatedValue<ContextState> = Omit<ReactProvider<ContextState>, 'value' | 'propTypes' | '$$typeof'>;
// `Context.Provider` with optional object keys
type ProviderWithOptionalEntries<ContextState> = PartialDeep<ReactProvider<ContextState>>;
// `Context.Provider` as a React component (regardless of class or functional component)
type ProviderAsComponent<ContextState> = ComponentType<ProviderWithPopulatedValue<ContextState>>;


// `Context.Provider` combining all the above with the required essentials for `<MyContext.Provider>` and `useContext(MyContext)`
export type Provider<ContextState> = (ProviderAsComponent<ContextState> | ProviderWithOptionalEntries<ContextState>)
    & {
        (props?: object): ReactElement | null; // Expresses that the object typedef (in `MyType & { ... }`) is a function, which allows additional properties to be added to the function (e.g. `MyFuncComp.$$typeof`)
        $$typeof: symbol;
    };

// Overwrite `Context` to accept `Provider` as a React component.
// Cannot redeclare `Context` from import b/c it won't take effect throughout the whole app.
export interface Context<ContextState> extends Omit<ReactContext<ContextState>, 'Provider'> {
    Provider: Provider<ContextState>;
}

export type SetContextState<ContextState> = (
    Dispatch<SetStateAction<ContextState>>
    & Parameters<typeof Component.prototype.setState>[0]
);

export interface ContextValue<ContextState> {
    contextState: ContextState;
    setContextState: SetContextState<ContextState>;
}

export interface ContextFactoryOptions<ContextState> {
    initialState?: ContextState | (() => ContextState);
    displayName?: string;
}


// TODO Add flag for useReducer instead of useState for more complex state.
//  See:
//  - https://reactjs.org/docs/hooks-reference.html#usereducer
//  - https://reactjs.org/docs/hooks-faq.html#how-to-avoid-passing-callbacks-down
// TODO Upgrade to React v18 for `useSyncExternalStore()`/`useMutableSource()`
//  - See JSDoc `@see` refs
/**
 * Creates a new Context with the respective Consumer and Provider for component use.
 * A new Context is created each time this function is called so call it outside your
 * component block.
 *
 * The context value creats an object containing both a `contextState` field and `setContextState()`
 * function so the consuming components can read and update the context's state and so that
 * `Provider.props.value` is already pre-populated for easier usage.
 *
 * Usage:
 *
 * - Create the context with `ContextFactory({ initialState: initialStateValueToStart, displayName: 'CustomContextDisplayName'})`.
 * - Wrap your component(s) in the returned Provider. The Provider already has a memoized `contextState`/`setContextState` object as a value.
 * - Access the Context using the standard React Context API access methods.
 * - Use the `setContextState()` function as you would a class component's `setContextState()` function.
 *   This means you can set individual state keys without erasing other keys, e.g. `setContextState({ certainKey: newVal })`,
 *   or `setContextState(prevState => ...)`:
 *
 * @example <caption>Create the context with initial state and display name</caption>
 * const MyContext = ContextFactory({
 *     initialState: { firstColor: 'blue', secondColor: 'red' },
 *     displayName: 'MyContext',
 * });
 *
 * export default function App() {
 *     return (
 *         <MyContext.Provider>
 *             <MyComponent />
 *         </MyContext.Provider>
 *     );
 * }
 *
 * @example <caption>Set the context to the static `contextType` field.</caption>
 * class MyComponent {
 *     static contextType = MyContext;
 *
 *     render() {
 *         const { contextState, setContextState } = this.context;
 *
 *         return (
 *             <MyChild color={contextState.firstColor} />
 *             <MyChild color={contextState.secondColor} />
 *             <button onClick={() => setContextState({ firstColor: 'red', secondColor: 'blue'})}>
 *                 Click to change context!
 *             </button>
 *         );
 *     }
 * }
 *
 * @example <caption>Use >= 1 contexts through [inline functions]{@link https://reactjs.org/docs/context.html#consuming-multiple-contexts}.</caption>
 * <FirstContext.Consumer>
 *     {({ contextState: firstContextState, setContextState: setFistContextState }) => (
 *         <SecondContext.Consumer>
 *             {({ contextState: secondContextState, setContextState: setSecondContextState }) => (
 *                 <MyChild firstColor={firstContextState.color} secondColor={secondContextState.color} />
 *             )}
 *         </SecondContext.Consumer>
 *     )}
 * </FirstContext.Consumer>
 *
 * @example <caption>Use `useContext()` in functional components.</caption>
 * function MyComponent() {
 *     const { contextState, setContextState } = useContext(MyContext);
 *
 *     return (
 *         <div>
 *             <MyChild color={contextState.firstColor} />
 *             <MyChild color={contextState.secondColor} />
 *             <button onClick={() => setContextState({ secondColor: 'green' })}>
 *                 Click to change context!
 *             </button>
 *         </div>
 *     );
 * }
 *
 * @example <caption>Use `setContextState()` as you would in class components even if in a functional component.</caption>
 * // Change only one key, keeping the other keys as-is (assuming state is an object).
 * this.context.setContextState({
 *     someStateKey: 'something'
 * });
 * // Or use a function - Requires spreading `prevState` if it's an object.
 * this.context.setContextState(prevState => ({
 *     ...prevState,
 *     someStateKey: prevState.someStateKey + 1
 * }));
 *
 * @param [options]
 * @param [options.initialState] - Default/initial value for the context state.
 * @param [options.displayName] - Display name for the context.
 * @returns The newly-created Context with a Provider prefilled with a memoized `contextState`/`setContextState` value.
 */
export default function ContextFactory<ContextState>({
    initialState,
    displayName = '',
}: ContextFactoryOptions<ContextState> = {}): Context<ContextValue<ContextState>> {
    const defaultContextValue: ContextValue<ContextState> = {
        contextState: initialState as ContextState,
        setContextState: () => {},
    };

    const Context = createContext<ContextValue<ContextState>>(defaultContextValue);

    if (displayName) {
        Context.displayName = displayName;
    }

    const ProviderWithoutState = Context.Provider as ReactProvider<ContextValue<ContextState>>;

    function ProviderWithState(props: PropsWithChildren<any>) {
        // @ts-ignore - Initial state value could be a function to generate state, but we don't want that function in the resulting `contextState` typedef
        const [ contextState, setStateForContext ] = useState<ContextState>(initialState);

        const setContextState = useCallback<SetContextState<ContextState>>((args: any) => {
            if (!(args instanceof Object) || Array.isArray(args) || typeof args === typeof ContextFactory) {
                // State is either a simple JSON primitive, an array, or a function,
                // so setState can be called directly.
                setStateForContext(args);
            } else if (typeof args === typeof {}) {
                // State is an object. Simplify the `setState` API to mimic `this.setState` in class components such
                // that they can set the state with an individual key/val.
                // To do so using hooks, use a function to preserve previous state and overwrite old values with new ones.
                setStateForContext(prevState => ({
                    ...prevState,
                    ...args,
                }));
            }
        }, []); // Don't ever need to redefine the value of `setContextState()`

        /*
         * Memoize the Provider's `value` object so a new object isn't created on every re-render.
         * However, don't memoize the Provider itself so that nested/parent providers' state changes cause
         * a re-render of this Provider's children.
         *
         * See:
         * - https://stackoverflow.com/questions/62230532/is-usememo-required-to-manage-state-via-the-context-api-in-reactjs
         * - https://blog.agney.dev/useMemo-inside-context/
         */
        const memoizedValue = useMemo<ContextValue<ContextState>>(() => ({
            contextState,
            setContextState,
        }), [ contextState, setContextState ]);

        return (
            <ProviderWithoutState {...props} value={memoizedValue} />
        );
    }

    if (displayName) {
        ProviderWithState.displayName = `${displayName}Provider`;
    }

    ProviderWithState.$$typeof = ProviderWithoutState.$$typeof;

    Context.Provider = ProviderWithState as Provider<ContextState>;

    // @ts-ignore - Allow overriding of native `Context` with memoized, state-enhanced Provider
    return Context;
}


/**
 * HOC that selects only a subset of the fields in `context` , re-rendering only if they have changed.
 * Sends the filtered context field(s) through props to the underlying component in the `props.contextState`
 * field.
 * When combined with the context produced by `ContextFactory()`, this also injects the `setContextState()`
 * function into `props`.
 *
 * If no `arePropsEqual()` function is specified, then a deep-comparison of the context fields is executed
 * rather than the default shallow-comparison done by React.
 *
 * This mitigates some of the major performance issues introduced when using Context instead of a
 * global-state-management library.
 *
 * Note: Use of React 18's new `useSyncExternalStore()`/`useMutableSource()` alternatives and/or a global state
 * management library should be prioritized over this. However, for small apps or apps with very little global state,
 * this hook will suffice.
 *
 * @see [Optimizing React Context usage]{@link https://saul-mirone.github.io/performance-optimization-in-react-context/}
 * @see [React 18's new `useSyncExternalStore()` and `useMutableSource()` alternatives to global state]{@link https://blog.saeloun.com/2021/12/30/react-18-usesyncexternalstore-api}
 * @see [Overview of how Redux works under the hood]{@link https://medium.com/@fknussel/redux-3cb5aac94a66}
 */
export function withContextSelector<ContextVal, ComponentProps = Record<string, unknown>>(
    Component: ComponentType,
    context: Context<ContextVal> | ReactContext<ContextVal>,
    selector: IndexSignature | ((ctxVal: ContextVal) => Partial<keyof ContextVal>),
    arePropsEqual?: Parameters<typeof memo>[1],
) {
    const componentName = getChildName(Component);
    const HocComponentName = `${withContextSelector.name}(${componentName})`;

    function propsAreEqual(prevProps: Record<string, unknown>, nextProps: Record<string, unknown>) {
        return arePropsEqual?.(prevProps, nextProps) ?? objEquals(prevProps, nextProps);
    }

    /*
     * First, create a new HOC that's memoized based on prop values.
     */

    const ComponentWithContextInjected = memo(
        props => (
            <Component {...props} />
        ),
        propsAreEqual,
    );

    ComponentWithContextInjected.displayName = componentName;

    /*
     * Next, read from Context and extract only the desired values.
     * The values are spread into props such that if they're equal, then the component doesn't re-render.
     */

    function ComponentWithContextSelector(props: ComponentProps) {
        const contextVal = useContext<ContextVal>(context);
        const has = Object.prototype.hasOwnProperty.bind(contextVal);
        const isCreatedFromContextFactory = (
            has('contextState')
            && has('setContextState')
            && Object.keys(contextVal).length === 2
        );
        let filteredContext: ContextVal | ContextValue<ContextVal> = contextVal;

        if (isCreatedFromContextFactory) {
            filteredContext = (contextVal as unknown as ContextValue<ContextVal>).contextState;
        }

        if (typeof selector === typeof withContextSelector) {
            filteredContext = (selector as Function)(filteredContext);
        } else {
            // @ts-ignore - Since the `contextVal` is unknown, it's possible it's undefined and can't be indexed
            filteredContext = filteredContext?.[(selector as IndexSignature)];
        }

        return (
            <ComponentWithContextInjected
                {...props}
                {...(isCreatedFromContextFactory
                    ? { ...contextVal, contextState: filteredContext }
                    : { contextState: filteredContext }
                )}
            />
        );
    }

    ComponentWithContextSelector.displayName = HocComponentName;

    return ComponentWithContextSelector;
}
