import {
    Component,
    useContext,
    PropsWithChildren,
} from 'react';
import { fireEvent } from '@testing-library/react';

import ContextFactory, { ContextValue } from '@/utils/ContextFactory';

import { renderWithWrappingParent, waitForElementVisible } from '/tests';


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
    function getContextValueChanger(rootComponent: any) {
        return rootComponent.getByRole('button');
    }

    async function getContextValueElem(rootComponent: any): Promise<Node> {
        return (await waitForElementVisible(rootComponent, '#context-value')) as Node;
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

        const elemContainingContextValue = await getContextValueElem(rootWithFuncComp);

        expect(elemContainingContextValue.textContent).toEqual(JSON.stringify(initialContextState));

        letters.split('').forEach((letter, i) => {
            fireEvent.click(getContextValueChanger(rootWithFuncComp));

            expect(elemContainingContextValue.textContent).toEqual(JSON.stringify({ ...initialContextState, a: letters.slice(0, i+1) }));
        });
    });

    it('should work with class components via `static contextType`', async () => {
        const rootWithFuncComp = renderWithWrappingParent(
            <ClassComponent />,
            {
                wrapper: MyApp,
            },
        );

        const elemContainingContextValue = await getContextValueElem(rootWithFuncComp);

        expect(elemContainingContextValue.textContent).toEqual(JSON.stringify(initialContextState));

        Array.from({ length: 5 }).forEach((nul, i) => {
            fireEvent.click(getContextValueChanger(rootWithFuncComp));

            expect(elemContainingContextValue.textContent).toEqual(JSON.stringify({ ...initialContextState, b: initialContextState.b + (i+1) }));
        });
    });
});
