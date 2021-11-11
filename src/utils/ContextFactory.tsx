import { createContext, useState, useCallback, memo } from 'react';

import type { Nullable } from '@/utils/Types';

// Override `React.Context` interface to add `Context` field
export interface Context<T> {
    Context: Context<T>;
}

interface ContextFactoryOptions<ContextState> {
    defaultStateValue?: Nullable<ContextState>;
    displayName?: string;
}

export interface ContextValue<ContextState> {
    contextState: ContextState;
    setContextState: Function;
}

/**
 * Creates a new Context and returns the Consumer, Provider, and Context for component use.
 * A new Context is created each time this function is called so it may be helpful to call outside
 * your component declaration depending on your use case.
 *
 * The context created passes both a `contextState` field and `setContextState` function to the
 * created `Provider.props.value` so that consuming components can update the context's state.
 *
 * Usage:
 *
 * 1. First, create the context with `ContextFactory(defaultStateValueToStart)`.
 *     @example
 *     const { Consumer, Provider, Context } = ContextFactory({ firstColor: 'blue', secondColor: 'red' });
 *
 * 2. In a parent, nest your component that uses the context inside the Provider.
 *    @example
 *    <Provider>
 *        <MyComponent />
 *    </Provider>
 *
 * 3. Access the Context based on standard React Context API access methods.
 *      a. Class components - either:
 *          i. Set the returned `MyContext.Context` to the static `contextType` field.
 *             @example
 *             class MyComponent {
 *                 static contextType = MyContext.Context;
 *
 *                 render() {
 *                     const { contextState, setContextState } = this.context;
 *
 *                     return (
 *                         <MyChild color={contextState.firstColor} />
 *                         <MyChild color={contextState.secondColor} />
 *                         <button onClick={() => setContextState({ firstColor: 'red', secondColor: 'blue'})}>
 *                             Click to change context!
 *                         </button>
 *                     );
 *                 }
 *             }
 *
 *          ii. As described in the {@link https://reactjs.org/docs/context.html#consuming-multiple-contexts React docs},
 *              using multiple contexts in class components requires using functions in the render function, which
 *              would be better off separating into an intermediate component.
 *              If you must use multiple contexts within the render function, then do the following:
 *              @example
 *              <FirstContext.Consumer>
 *                  {({ contextState: firstContextState, setContextState: setFistContextState }) => (
 *                      <SecondContext.Consumer>
 *                          {({ contextState: secondContextState, setContextState: setSecondContextState }) => (
 *                              <MyChild firstColor={firstContextState.color} secondColor={secondContextState.color} />
 *                          )}
 *                      </SecondContext.Consumer>
 *                  )}
 *              </FirstContext.Consumer>
 *
 *     b. Functional components: use the returned `Context` object inside a `useContext()` call.
 *        @example
 *        function MyComponent() {
 *            const { contextState, setContextState } = useContext(MyContext.Context);
 *
 *            return (
 *                <div>
 *                    <MyChild color={contextState.firstColor} />
 *                    <MyChild color={contextState.secondColor} />
 *                    <button onClick={() => setContextState({ firstColor: 'red', secondColor: 'blue'})}>
 *                        Click to change context!
 *                    </button>
 *                </div>
 *            );
 *        }
 *
 * 4. Use the returned `Context.setContextState()` function as you would any other `setState()` method,
 *    including class component individual keys `setContextState({ certainKey: newVal })`
 *    or `setContextState(prevState => ...)`:
 *     @example
 *     this.context.setContextState(prevState => ({
 *         ...prevState,
 *         myFirstContextStateKey: prevState.myFirstContextStateKey + 1
 *     }));
 *     // or
 *     this.context.setContextState({
 *         mySecondContextStateKey: 'something'
 *     }); // preserves value of `myFirstContextStateKey`
 *
 * @param {Object} [options]
 * @param {any} [options.defaultStateValue] - Default value for the context state
 * @param {string} [options.displayName] - Optional display name for the context
 * @returns {{Consumer: React.Component, Provider: React.Component, Context: Object }} - The newly-created Context-related objects
 */
export default function ContextFactory<ContextState>({
    defaultStateValue = null,
    displayName = '',
}: ContextFactoryOptions<ContextState> = {}) {
    type ContextProviderValue = ContextValue<ContextState>;

    const defaultContextValue: ContextProviderValue = {
        // @ts-ignore - Possible for default value to be undefined by the parent
        contextState: defaultStateValue,
        setContextState: () => {},
    };

    // const Context = createContext<typeof defaultContextValue['contextState']>(defaultStateValue);
    const Context = createContext<ContextProviderValue>(defaultContextValue);
    Context.displayName = displayName;

    const Provider = (props: any) => {
        const [ contextState, setHookStateForContext ] = useState<
            ContextFactoryOptions<ContextState>['defaultStateValue']
        >(defaultStateValue);

        const setContextState = useCallback((args: any) => {
            if (!(args instanceof Object) || Array.isArray(args) || typeof args === typeof ContextFactory) {
                // State is either a simple JSON primitive, an array, or a function,
                // so setState can be called directly.
                setHookStateForContext(args);
            } else if (typeof args === typeof {}) {
                // State is an object. Make the `setState` API simple like `this.setState` in class components where
                // they can set the state with an individual key/val.
                // To do so in hooks, use a function to preserve previous state and overwrite old values with new ones.
                setHookStateForContext(prevState => ({
                    ...prevState,
                    ...args,
                }));
            }
        }, []);

        return (
            <Context.Provider {...props} value={{ contextState, setContextState }} />
        );
    };

    const memoizedProvider = memo(Provider);

    return {
        Provider: memoizedProvider,
        Consumer: Context.Consumer,
        Context,
    };
}
