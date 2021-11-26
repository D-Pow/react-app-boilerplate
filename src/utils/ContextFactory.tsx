import {
    createContext,
    useState,
    useCallback,
    useMemo,
} from 'react';

import type {
    ReactElement,
    ComponentType,
    PropsWithChildren,
    Context as ReactContext,
    Provider as ReactProvider,
} from 'react';

import type { Nullable, PartialDeep } from '@/utils/Types';

// `Context.Provider` with `value` already populated
type ProviderWithPopulatedValue<ContextState> = Omit<ReactProvider<ContextState>, 'value' | 'propTypes' | '$$typeof'>;
// `Context.Provider` with optional object keys
type ProviderWithOptionalEntries<ContextState> = PartialDeep<ReactProvider<ContextState>>;
// `Context.Provider` as a React component (regardless of class or functional component)
type ProviderAsComponent<ContextState> = ComponentType<ProviderWithPopulatedValue<ContextState>>;
// `Context.Provider` combining all the above with the required essentials for `<MyContext.Provider>` and `useContext(MyContext)`
type Provider<ContextState> = (ProviderAsComponent<ContextState> | ProviderWithOptionalEntries<ContextState>)
    & {
        (props?: object): (ReactElement|null);
        $$typeof: symbol;
    };

// Overwrite `Context` to accept `Provider` as a React component.
// Cannot redeclare `Context` from import b/c it won't take effect throughout the whole app.
interface Context<ContextState> extends Omit<ReactContext<ContextState>, 'Provider'> {
    Provider: Provider<ContextState>;
}


export interface ContextValue<ContextState> {
    contextState: Nullable<ContextState>;
    setContextState: Function;
}

export interface ContextFactoryOptions<ContextState> {
    defaultStateValue?: Nullable<ContextState>;
    displayName?: string;
}

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
 * - Create the context with `ContextFactory({ defaultStateValue: initialStateValueToStart, displayName: 'CustomContextDisplayName'})`.
 * - Wrap your component(s) in the returned Provider. The Provider already has a memoized `contextState`/`setContextState` object as a value.
 * - Access the Context using the standard React Context API access methods.
 * - Use the `setContextState()` function as you would a class component's `setContextState()` function.
 *   This means you can set individual state keys without erasing other keys, e.g. `setContextState({ certainKey: newVal })`,
 *   or `setContextState(prevState => ...)`:
 *
 * @example <caption>Create the context with initial state and display name</caption>
 * const MyContext = ContextFactory({
 *     defaultStateValue: { firstColor: 'blue', secondColor: 'red' },
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
 * @param [options.defaultStateValue] - Default/initial value for the context state.
 * @param [options.displayName] - Display name for the context.
 * @returns The newly-created Context with a Provider prefilled with a memoized `contextState`/`setContextState` value.
 */
export default function ContextFactory<ContextState>({
    defaultStateValue = null,
    displayName = '',
}: ContextFactoryOptions<ContextState> = {}): Context<ContextValue<ContextState>> {
    const defaultContextValue: ContextValue<ContextState> = {
        contextState: defaultStateValue,
        setContextState: () => {},
    };

    const Context = createContext<ContextValue<ContextState>>(defaultContextValue);

    if (displayName) {
        Context.displayName = displayName;
    }

    const ProviderWithoutState = Context.Provider as ReactProvider<ContextValue<ContextState>>;

    function ProviderWithState(props: PropsWithChildren<any>) {
        const [ contextState, setStateForContext ] = useState<
            ContextFactoryOptions<ContextState>['defaultStateValue']
        >(defaultStateValue);

        const setContextState = useCallback((args: any) => {
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

    ProviderWithState['$$typeof'] = ProviderWithoutState['$$typeof'];

    Context.Provider = ProviderWithState as Provider<ContextState>;

    // @ts-ignore - Allow overriding of native `Context` with memoized, state-enhanced Provider
    return Context;
}
