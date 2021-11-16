import {
    Component,
    useContext,
    PropsWithChildren,
} from 'react';
import { fireEvent } from '@testing-library/react';

import ContextFactory, { ContextValue } from '@/utils/ContextFactory';

import { renderWithWrappingParent, waitForElementVisible, waitForUpdate } from '/tests';

import type {
    RenderResult as RenderedComponent,
} from '@testing-library/react';


interface MyAppContextState {
    a: string;
    b: number;
}
interface MyAppContextValue extends ContextValue<MyAppContextState> {}
const initialContextState: MyAppContextState = {
    a: '',
    b: 3,
};
const MyAppContext = ContextFactory<MyAppContextState>({
    defaultStateValue: initialContextState,
    displayName: 'MyAppContext',
});

const letters = 'abcde';


function MyApp({ children }: PropsWithChildren<any>) {
    return (
        <MyAppContext.Provider>
            {children}
        </MyAppContext.Provider>
    );
}


function FunctionalComponent() {
    const { contextState, setContextState } = useContext(MyAppContext);
    const addLetter = () => {
        const nextLetterIndex = contextState?.a?.length ?? 0;

        setContextState({
            a: (contextState?.a ?? '') + letters.at(nextLetterIndex),
        });
    };

    return (
        <>
            <h3 id={'context-value'}>{JSON.stringify(contextState)}</h3>
            <button onClick={addLetter}>Add letter</button>
        </>
    );
}


class ClassComponent extends Component<{}, {}> {
    static contextType = MyAppContext;

    incrementVal = () => {
        this.context.setContextState({ b: this.context.contextState?.b + 1 });
    };

    render() {
        const { contextState } = this.context;

        return (
            <>
                <h3 id={'context-value'}>{JSON.stringify(contextState)}</h3>
                <button onClick={this.incrementVal}>Increment</button>
            </>
        );
    }
}


describe('ContextFactory util', () => {
    // Note: Marking `multiple?: false` makes it include `undefined`, thus making it the default signature.
    function getContextValueChangers(rootComponent: RenderedComponent, multiple?: false): Element;
    function getContextValueChangers(rootComponent: RenderedComponent, multiple: true): Element[];
    function getContextValueChangers(rootComponent: RenderedComponent, multiple: boolean = false): Element | Element[] {
        if (!multiple) {
            return rootComponent.getByRole('button');
        }

        return rootComponent.getAllByRole('button');
    }

    async function getContextValueElems(rootComponent: RenderedComponent, multiple?: false): Promise<Node>;
    async function getContextValueElems(rootComponent: RenderedComponent, multiple: true): Promise<NodeList>;
    async function getContextValueElems(rootComponent: RenderedComponent, multiple: boolean = false) {
        return await waitForElementVisible(rootComponent, '#context-value', { all: multiple });
    }

    it('should create a React.Context with state/setState', async () => {
        // @ts-ignore - Internal/read-only property from React Testing Library that holds the current value of the Context
        const receivedInitialState: MyAppContextValue = MyAppContext._currentValue;

        // Can't use `typeof` because TS is converted to JS so the expected/received will both be `[object Object]`.
        // Cant use `.toBeInstanceOf(class implements MyAppContextValue {...})` because, again, JS `typeof received` will be `[object Object]`.
        expect(receivedInitialState).toEqual(
            expect.objectContaining({
                contextState: initialContextState,
                setContextState: expect.any(Function),
            }),
        );
    });

    it('should work with functional components via `useContext()`', async () => {
        const rootWithFuncComp = renderWithWrappingParent(
            <FunctionalComponent />,
            {
                wrapper: MyApp,
            },
        );

        const elemContainingContextValue = await getContextValueElems(rootWithFuncComp);

        expect(elemContainingContextValue.textContent).toEqual(JSON.stringify(initialContextState));

        letters.split('').forEach((letter, i) => {
            fireEvent.click(getContextValueChangers(rootWithFuncComp));

            expect(elemContainingContextValue.textContent).toEqual(JSON.stringify({ ...initialContextState, a: letters.slice(0, i+1) }));
        });
    });

    it('should work with class components via `static contextType`', async () => {
        const rootWithClassComp = renderWithWrappingParent(
            <ClassComponent />,
            {
                wrapper: MyApp,
            },
        );

        const elemContainingContextValue = await getContextValueElems(rootWithClassComp);

        expect(elemContainingContextValue.textContent).toEqual(JSON.stringify(initialContextState));

        Array.from({ length: 5 }).forEach((nul, i) => {
            fireEvent.click(getContextValueChangers(rootWithClassComp));

            expect(elemContainingContextValue.textContent).toEqual(JSON.stringify({ ...initialContextState, b: initialContextState.b + (i+1) }));
        });
    });

    it('should permeate state changes amongst multiple components', async () => {
        const rootWithBothFuncAndClassComps = renderWithWrappingParent(
            (
                <>
                    <FunctionalComponent />
                    <ClassComponent />
                </>
            ),
            {
                wrapper: MyApp,
            },
        );

        const elemsContainingContextValue = await getContextValueElems(rootWithBothFuncAndClassComps, true);
        const elemsChangingContextValue = getContextValueChangers(rootWithBothFuncAndClassComps, true);

        elemsContainingContextValue.forEach((elem: Node) => {
            expect(elem.textContent).toEqual(JSON.stringify(initialContextState));
        });

        /**
         * Use for-loop instead of forEach to ensure sequential execution of context state updates, i.e.
         * prevent running all tests via `Promise.all(letters.split('').map(async (letter, i) => { ...test }))` since
         * that will run the beginning of each test immediately, so test-1's iteration results will be impacted by test-4's actions.
         *
         * Alternatively, to force await-ing them sequentially using the above logic:
         * @example
         * // `for await ()` forces mapped-promises to be run sequentially, but the empty block is less readable than for-loop
         * const allActionPromises = myList.map(async (...) => {...});
         * for await (const actionPromise of allActionPromises) {}
         */
        for (let i = 0; i < letters.length; i++) {
            elemsChangingContextValue.forEach(elem => {
                fireEvent.click(elem);
            });

            await waitForUpdate();

            elemsContainingContextValue.forEach((elem: Node) => {
                expect(elem.textContent).toEqual(JSON.stringify({
                    ...initialContextState,
                    a: letters.slice(0, i+1),
                    b: initialContextState.b + (i+1),
                }));
            });
        }
    });
});
