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
 * 1) First, create the context with `ContextFactory(defaultStateValueToStart)`. e.g.
 *    const { Consumer, Provider, Context } = ContextFactory({ firstColor: 'blue', secondColor: 'red'});
 * 2) In a parent, next your component that uses the context inside the Provider
 *     <Provider>
 *         <MyComponent />
 *     </Provider>
 * 3) Access the Context based on standard React Context API access methods, e.g.
 *    a) Class components: set the returned {@code MyContext.Context} to the static {@code contextType} field:
 *        class MyComponent {
 *            static contextType = MyContext.Context;
 *
 *            render() {
 *                const { contextState, setContextState } = this.context;
 *
 *                return (
 *                    <MyChild color={contextState.firstColor} />
 *                    <MyChild color={contextState.secondColor} />
 *                    <button onClick={() => setContextState({ firstColor: 'red', secondColor: 'blue'})}>
 *                        Click to change context!
 *                    </button>
 *                );
 *            }
 *        }
 *    a.i) As described in the [React docs](https://reactjs.org/docs/context.html#consuming-multiple-contexts),
 *         using multiple contexts in class components requires using functions in the render function, which
 *         would be better off separating into a separate/intermediate component. e.g.
 *         <FirstContext.Consumer>
 *             {({ contextState: firstContextState, setContextState: setFistContextState }) => (
 *                 <SecondContext.Consumer>
 *                     {({ contextState: secondContextState, setContextState: setSecondContextState }) => (
 *                         <MyChild firstColor={firstContextState.color} secondColor={secondContextState.color} />
 *                     )}
 *                 </SecondContext.Consumer>
 *             )}
 *         </FirstContext.Consumer>
 *    b) Functional components: use the returned `Context` object inside a `useContext()` call:
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
 * 4) Use the returned {@code Context}'s {@code setContextState()} function as you would a hook, using
 *    the {@code prevState} function to set the new context. e.g. For a class component, use:
 *     this.context.setContextState(prevState => ({
 *         ...prevState,
 *         myContextStateKey: prevState.myContextStateKey + 1
 *     }));
 *
 * @param {*} defaultValue - Default value for the context
 * @param {string} displayName - Optional display name for the context
 * @returns {{Consumer: React.Component, Provider: React.Component, Context: Object }} - The newly-created Context-related objects
 */
export default function ContextFactory(defaultValue = null, displayName = '') {
    const Context = React.createContext();

    if (displayName && (typeof displayName === typeof '')) {
        Context.displayName = displayName;
    }

    const Provider = props => {
        const [ contextState, setContextState ] = useState(defaultValue);

        return (
            <Context.Provider value={{ contextState, setContextState }} {...props} />
        );
    };

    return { Consumer: Context.Consumer, Provider, Context };
}
