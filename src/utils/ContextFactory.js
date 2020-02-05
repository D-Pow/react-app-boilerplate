import React, { useState } from 'react';

/**
 * Creates a new Context and returns both the Consumer, Provider, and Context for component use.
 * Creates a new Context each time this function is called so it may be helpful to call outside
 * your component declaration depending on your use case.
 *
 * The context created passes both a `contextState` field and `setContextState` function to the
 * created `Provider.props.value` so that consuming components can update the context's state.
 *
 * Usage:
 * 1) First, create the context with `ContextFactory(defaultStateValueToStart)`:
 *    const { Consumer, Provider, Context } = ContextFactory({ firstColor: 'blue', secondColor: 'red'});
 *
 * 2) Nest child components inside the Provider; use either Consumer or Context depending on
 *    if using class or functional components:
 *    1) Class components: use the returned `Consumer` component, which takes a function as children:
 *        <Provider>
 *            <Consumer>
 *                {({ contextState, setContextState }) => (
 *                    <MyChild color={contextState.firstColor} />
 *                    <MyChild color={contextState.secondColor} />
 *                    <button onClick={() => setContextState({ firstColor: 'red', secondColor: 'blue'})}>
 *                        Click to change context!
 *                    </button>
 *                )}
 *            </Consumer>
 *        </Provider>
 *    2) Functional components: use the returned `Context` object inside a `useContext()` call:
 *        function MyComponent() {
 *            const { contextState, setContextState } = useContext(Context);
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
 *        // Elsewhere, place your component inside the Provider
 *        <Provider>
 *            <MyComponent />
 *        </Provider>
 *
 * @param {*} defaultValue - Default value for the context
 * @returns {{Consumer: React.Component, Provider: React.Component, Context: Object }} - The newly-created Context-related objects
 */
export default function ContextFactory(defaultValue = null) {
    const Context = React.createContext();

    const Provider = props => {
        const [ contextState, setContextState ] = useState(defaultValue);

        return (
            <Context.Provider value={{ contextState, setContextState }} {...props} />
        );
    };

    return { Consumer: Context.Consumer, Provider, Context };
}
