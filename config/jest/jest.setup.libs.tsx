/**
 * A collection of utility functions/variables for tests that aren't natively
 * included by `@testing-library/react`.
 *
 * Note: `getX()` query functions don't require `await` whereas `findX()` functions do.
 *
 * @see [API overview]{@link https://testing-library.com/docs/react-testing-library/api}
 * @see [Firing events]{@link https://testing-library.com/docs/dom-testing-library/api-events}
 * @see [General testing cheatsheet]{@link https://testing-library.com/docs/react-testing-library/cheatsheet}
 * @see [Custom queries]{@link https://testing-library.com/docs/dom-testing-library/api-custom-queries}
 * @see [Enzyme-to-RTL conversion examples]{@link https://testing-library.com/docs/react-testing-library/migrate-from-enzyme}
 * @see [React - native test utils]{@link https://reactjs.org/docs/test-utils.html}
 * @see [React - native testing examples]{@link https://reactjs.org/docs/testing-recipes.html}
 * @see [Blog post with IRL test example]{@link https://kentcdodds.com/blog/introducing-the-react-testing-library}
 *
 * @file
 */

import { render, act, waitFor, prettyDOM } from '@testing-library/react';

import Router, { appRoutes } from '@/components/Router';
import AppContext from '@/utils/AppContext';

import type {
    ReactElement,
    PropsWithChildren,
} from 'react';
import type {
    RenderResult as RenderedComponent,
    RenderOptions,
} from '@testing-library/react';
import type {
    Fiber,
} from 'react-reconciler';

import type {
    ComponentInstance,
} from '@/types';


// Prevent automatic redirection since tests will want to render their individual components without
// also rendering components from redirects.
// e.g. Prevent `/` from redirecting to `/home` so testing `<Home/>` doesn't render two Home components.
export const appRoutesWithoutRedirect = appRoutes.map(routeProps => {
    routeProps = { ...routeProps };

    if (routeProps.render?.toString().match(/\bRedirect[\s\S]*to[:=]\s*['"][^'"]+/)) {
        routeProps.render = () => <div />;
    }

    return routeProps;
});

export function AppProviderWithRouter({ children }: PropsWithChildren<any>) {
    return (
        <>
            <AppContext.Provider>
                <Router
                    routes={appRoutesWithoutRedirect}
                    wrapperProps={{ className: 'app text-center' }}
                >
                    {children}
                </Router>
            </AppContext.Provider>
        </>
    );
}



/**
 * Removes unicode color text from the specified string.
 *
 * Colors are often added for console output, but they impede the ability to parse the strings
 * as JSON/HTML/etc. within JS code as well as readability when logging in a testing environment.
 *
 * TODO Move this to a util file.
 *
 * @param str - String from which to remove colors.
 * @returns String with all unicode colors removed.
 */
export function stripColorsFromString(str: string): string {
    return str?.replace?.(/\u001b[^m]*?m/gu, '');
}



export function renderWithWrappingParent(...args: Parameters<typeof render>): ReturnType<typeof render>;
/**
 * Renders your component with the specified parent wrapper.
 * Useful for testing components using context from a provider, ReactRouter, etc.
 *
 * @param component - Component to wrap with a parent.
 * @param [options]
 * @param [options.wrapper=AppProviderWithRouter] - Component with which to wrap `component`.
 * @returns - Rendered component with the provider as its parent.
 */
export function renderWithWrappingParent(
    component: ComponentInstance,
    {
        wrapper = AppProviderWithRouter,
        ...renderOptions
    }: RenderOptions = {},
) {
    return render(component as ReactElement, {
        ...renderOptions,
        wrapper,
    });
}


/**
 * Ensures all async promises in the JS event loop resolve before continuing.
 *
 * Since this simply puts a new promise in the event loop queue, it only works for
 * promises that don't use real event timers. For those that do, you'll have to use
 * a combination of `jest.runAllTimers()` followed by this function.
 *
 * @see [Apollo docs on React testing]{@link https://www.apollographql.com/docs/react/development-testing/testing/#testing-the-success-state}
 */
export async function waitForUpdate() {
    await act(async () => await new Promise(res => setTimeout(res, 0)));
}


/**
 * Wrapper around `(component|container).(get|find|query)ByX` that allows extracting your get-element call to
 * a separate, custom `funcToGetElement()` that can be passed to `expect()` without throwing errors.
 *
 * As it stands now, `expect(component.getByText('hello')).not.toBeDefined()` works, but extracting the query to a separate
 * function and then calling `expect(funcToGetElement()).not.toBeDefined()` will throw errors saying that "Element cannot
 * be found" which defeats the whole purpose of the `.not.toBeDefined()` code.
 *
 * This fixes that bug by allowing you to extract your get-element logic to a separate function without throwing errors.
 *
 * Returns either:
 *  - An async function you can call to trigger the get-element check (default mode).
 *  - A Promise containing that async function's result (`callNow = true`).
 *
 * @example
 * const component = render(<MyComp />);
 * const funcToGetElement = () => component.getByText('hello');
 * expect(funcToGetElement()).not.toBeDefined();
 * fireEvent.click(someButton);
 * expect(funcToGetElement()).toBeDefined();
 *
 * @param funcToGetElement - The callback get-element function, e.g. `() => render(<Comp/>).getByText('Hello')`.
 * @param [options]
 * @param [options.callNow] - If the return value should be the function (false, default) or if it should be called immediately and return the resulting Promise(true).
 * @returns An async function to fire the get-element check, or its resulting Promise.
 */
export function getElementMaybe(funcToGetElement: Function, { callNow = false } = {}): (() => Promise<any>) | Promise<any> {
    const getElementMaybeAsync = async () => {
        try {
            return await funcToGetElement();
        } catch (reactTestingLibraryNotFoundError) {}
    };

    if (callNow) {
        return getElementMaybeAsync();
    }

    return getElementMaybeAsync;
}

/**
 * Regarding the type check: Other attempts at checking the type of the defaulted `options` object, `O`, were made in the `O extends () ?` return
 * type-check block, but none worked. Attempts include but aren't limited to:
 * - Omit<O, 'all'>
 * - { [K in keyof O]?: never }
 *
 * Nothing worked except defaulting it to either:
 * - `never` or `Record<string, never>` AND including `null` in the check.
 * - `Record<string, undefined>`
 *
 * Doing so forces the type of `O` to be of the specified type unless it's actually passed by the parent.
 * However, it is always passed, so `undefined` has to be included in the check.
 * Similarly, using `never` or `Record<string, never>` requires `never` to be in the check (as well as `Record` if that's used instead)
 * since it's a helper type that doesn't actually exist in JS.
 * Thus, simplify all of it by defaulting the value of `O` to `Record<string, undefined>`.
 * See the note about `Record` in `src/types` for more details.
 *
 * Alternatively, we could split the declarations up into three separate declarations, but then the default value for the `options` object
 * gets lost and the parent calling the function has to manually cast it to one of the types itself. Declarations are as follows:
 * @example Split declarations.
 * export async function waitForElementVisible(component: RenderedComponent, querySelectorString: string, options: { all: false }): Promise<Node>;
 * export async function waitForElementVisible(component: RenderedComponent, querySelectorString: string, options: { all: true }): Promise<NodeList>;
 * export async function waitForElementVisible(component: RenderedComponent, querySelectorString: string, options?: { all: boolean }): Promise<Node | NodeList | null>;
 *
 * In either case, the code is duplicated substantially. We should probably extract it to an interface, but this is still
 * helpful for learning experience.
 *
 * @see [Overloading functions for different return values]{@link https://stackoverflow.com/questions/54165536/typescript-function-return-type-based-on-input-parameter/54165564}
 * @see [Docs for overloading function]{@link https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads}
 * @see [Overloading: 'boolean' isn't assignable to type 'false']{@link https://stackoverflow.com/questions/50932591/typescript-overloading-type-boolean-is-not-assignable-to-type-false/50932701#50932701}
 * @see [Custom 'ReturnTypeWithArgs<FUNC,ARGS>' type util]{@link https://stackoverflow.com/questions/52760509/typescript-returntype-of-overloaded-function/60822641#60822641}
 * @see [Generic type as field in another generic type (1)]{@link https://stackoverflow.com/questions/66586780/typescript-how-to-infer-the-type-of-one-generic-based-on-another-generic}
 * @see [Generic type as field in another generic type (2)]{@link https://stackoverflow.com/questions/52856496/typescript-object-keys-return-string/52856805#52856805}
 * @see [Extending functions]{@link https://stackoverflow.com/questions/42840466/is-it-possible-to-implement-a-function-interface-in-typescript}
 */
/**
 * Companion to `waitForElementToBeRemoved()` except the opposite:
 * Waits for >= 1 element(s) -- as specified by the `querySelectorString` -- to be visible before proceeding with the test.
 *
 * Solves the issue that react-testing-library only allows searching by visible attributes and/or accessibility
 * attributes that screen readers parse.
 *
 * @param component - Parent component/container from which to query for child elements.
 * @param querySelectorString - Query selector for >= 1 element.
 * @param [options]
 * @param [options.all] - If `querySelectorAll()` should be called instead of `querySelector()`.
 * @returns A Promise that resolves after the element(s) are visible, returning the element(s).
 * @see [React testing library's "query priorities" docs]{@link https://testing-library.com/docs/queries/about/#priority}
 */
export async function waitForElementVisible<
    T extends O['all'],
    O extends (Partial<{ all: boolean }>) = Record<string, undefined>
>(component: RenderedComponent, querySelectorString: string, options?: O): Promise<
    null
    |
    O extends (Record<string, undefined>)
        ? Node
        : T extends true
            ? NodeList
            : Node
>;
export async function waitForElementVisible(
    component: RenderedComponent,
    querySelectorString: string,
    {
        all = false,
    } = {},
): Promise<Node | NodeList | null> {
    const container = component.container || component;
    const queryForElements = () => all ? container.querySelectorAll(querySelectorString) : container.querySelector(querySelectorString);

    await waitFor(async () => {
        expect(queryForElements()).toBeDefined();
    });

    return queryForElements();
}


/**
 * Waits for the page to redirect before continuing onward.
 *
 * The `fireEvent` function must be passed here and not called outside this function
 * so that this function can track the original/new URLs in order to ensure redirection
 * occurred.
 *
 * @param fireEventThatRedirects - Function containing `fireEvent` call that will trigger the redirect.
 * @returns The URL after redirection.
 */
export async function waitForRedirect(fireEventThatRedirects: () => (any | Promise<any>)) {
    const currentUrl = location.href;

    await fireEventThatRedirects();

    await waitFor(() => {
        /**
         * `waitFor(callback, options)` runs the callback until it doesn't throw an error.
         * As such, the return value doesn't matter.
         *
         * For this particular case, we could rewrite this like the example below, but since Jest `expect()` already
         * throws errors, using it directly is simpler.
         *
         * @example
         * if (location.href === currentUrl) {
         *     throw 'some error';
         * }
         * return;
         *
         * @see [`waitFor()` docs]{@link https://testing-library.com/docs/dom-testing-library/api-async/#waitfor}
         */
        expect(location.href).not.toEqual(currentUrl);
    });

    return location.href;
}


/**
 * Gets the HTML element and its associated DOM string from a render.
 *
 * @param component - Component from which to get the underlying HTML element.
 * @param [options]
 * @param [options.fromParent] - If the HTML element/DOM string should be from the parent container of the component instead of the component itself.
 * @returns The DOM element and its associated HTML string.
 */
export function getDomFromRender(
    component: RenderedComponent,
    {
        fromParent = false,
    } = {},
): { element: Element | Document, html: string } {
    const element = (
        fromParent
            ? (component?.baseElement ?? component?.container)
            : component?.container
    ) ?? component;
    const isDomElement = !!(element?.addEventListener ?? null);

    const html = stripColorsFromString(prettyDOM(element) || '');
    const domNode = isDomElement ? element : (new DOMParser()).parseFromString(html, 'text/html');

    return {
        html,
        element: domNode,
    };
}


/**
 * Gets the React FiberNode from a rendered component.
 *
 * @param component - Component for which to extract the underlying FiberNode.
 * @returns React's internal `FiberNode` created by the `render()` function and the components props.
 */
export function getReactFiberNodeFromRender(component: RenderedComponent): { fiberNode: Fiber | null, fiberNodeProps: object | null } {
    const exposedComponentKeys = Object.keys(component) as Array<keyof RenderedComponent>;
    const reactFiberNodeKey = exposedComponentKeys.find(key => key.match(/^__reactFiber/));
    const reactPropsKey = exposedComponentKeys.find(key => key.match(/^__reactProps/));

    return {
        fiberNode: reactFiberNodeKey != null ? component[reactFiberNodeKey] as unknown as Fiber : null,
        fiberNodeProps: reactPropsKey != null ? component[reactPropsKey] : null,
    };
}
