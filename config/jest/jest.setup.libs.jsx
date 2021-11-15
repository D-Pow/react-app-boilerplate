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


// Prevent automatic redirection since tests will want to render their individual components without
// also rendering components from redirects.
// e.g. Prevent `/` from redirecting to `/home` so testing `<Home/>` doesn't render two Home components.
const appRoutesWithoutRedirect = appRoutes.map(routeProps => {
    routeProps = { ...routeProps };

    if (routeProps.render?.toString().match(/\bRedirect[\s\S]*to[:=]\s*['"][^'"]+/)) {
        routeProps.render = () => <div />;
    }

    return routeProps;
});

export function AppProviderWithRouter({ children }) {
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
 * @param {string} str - String from which to remove colors.
 * @returns {string} - String with all unicode colors removed.
 */
export function stripColorsFromString(str) {
    return str?.replace?.(/\u001b[^m]*?m/gu, '');
}



/** @typedef {(import('react').ComponentType|import('react').ReactElement|import('react').ElementType|Element)} ComponentInstance */
/** @typedef {(import('react').ComponentType|function: Element)} ComponentDeclaration */
/** @typedef {(ComponentInstance|ComponentDeclaration)} ReactComponent */
/** @typedef {import('@testing-library/react').RenderResult} RenderedComponent */
/** @typedef {import('@testing-library/react').RenderOptions} RenderOptions */


/**
 * Renders your component with the specified parent wrapper.
 * Useful for testing components using context from a provider, ReactRouter, etc.
 *
 * @param {ComponentInstance} component - Component to wrap with a parent.
 * @param {RenderOptions} [options]
 * @param {ComponentDeclaration} [options.wrapper=AppProviderWithRouter] - Component with which to wrap `component`.
 * @returns {RenderedComponent} - Rendered component with the provider as its parent.
 */
export function renderWithWrappingParent(
    component,
    {
        wrapper = AppProviderWithRouter,
        ...renderOptions
    } = {},
) {
    return render(component, {
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
 * @returns {Promise<void>}
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
 * @param {function} funcToGetElement - The callback get-element function, e.g. `() => render(<Comp/>).getByText('Hello')`.
 * @param {Object} [options]
 * @param {boolean} [options.callNow=false] - If the return value should be the function (false, default) or if it should be called immediately and return the resulting Promise(true).
 * @returns {((function(): Promise<*>)|Promise<*>)} - An async function to fire the get-element check, or its resulting Promise.
 */
export function getElementMaybe(funcToGetElement, { callNow = false } = {}) {
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
 * Waits for >= 1 elements as specified by the `querySelectorString` to be visible before proceeding with the test.
 * Essentially the opposite of `waitForElementToBeRemoved()`.
 *
 * Solves the issue that react-testing-library only allows searching by visible attributes and/or accessibility
 * attributes that screen readers parse. See more details in the [query priorities docs]{@link https://testing-library.com/docs/queries/about/#priority}.
 *
 * @param {RenderedComponent} component - Parent component/container from which to query for child elements.
 * @param {string} querySelectorString - Query selector for >= 1 element.
 * @param {Object} [options]
 * @param {boolean} [options.all=true] - If `querySelectorAll()` should be called instead of `querySelector()`.
 * @returns {Promise<(Node|NodeList|null)>} - A Promise that resolves after the element(s) are visible, returning the element(s).
 */
export async function waitForElementVisible(
    component,
    querySelectorString,
    {
        all = false,
    } = {},
) {
    const container = component.container || component;
    const querySelectorMethod = all ? 'querySelectorAll' : 'querySelector';
    const queryForElements = () => container[querySelectorMethod](querySelectorString);

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
 * @param {(function|Promise<*>)} fireEventThatRedirects - Function containing `fireEvent` call that will trigger the redirect.
 * @returns {Promise<string>} - The URL after redirection.
 */
export async function waitForRedirect(fireEventThatRedirects) {
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
 * @param {RenderedComponent} component - Component from which to get the underlying HTML element.
 * @param {Object} [options]
 * @param {boolean} [options.fromParent=false] - If the HTML element/DOM string should be from the parent container of the component instead of the component itself.
 * @returns {{element: (Element|Document), html: string}} - The DOM element and its associated HTML string.
 */
export function getDomFromRender(component, { fromParent = false } = {}) {
    const element = (
        fromParent
            ? (component?.baseElement ?? component?.container)
            : component?.container
    ) ?? component;
    const isDomElement = !!(element?.addEventListener ?? null);

    const html = stripColorsFromString(prettyDOM(element));
    const domNode = isDomElement ? element : (new DOMParser()).parseFromString(html, 'text/html');

    return {
        html,
        element: domNode,
    };
}


/**
 * Gets the React FiberNode from a rendered component.
 *
 * @param {RenderedComponent} component - Component for which to extract the underlying FiberNode.
 * @returns {{ fiberNode: import('react-reconciler').Fiber, fiberNodeProps: Object}} - React's internal `FiberNode` created by the `render()` function and the components props.
 */
export function getReactFiberNodeFromRender(component) {
    const exposedComponentKeys = Object.keys(component);
    const reactFiberNodeKey = exposedComponentKeys.find(key => key.match(/^__reactFiber/));
    const reactPropsKey = exposedComponentKeys.find(key => key.match(/^__reactProps/));

    return {
        fiberNode: component[reactFiberNodeKey],
        fiberNodeProps: component[reactPropsKey],
    };
}
