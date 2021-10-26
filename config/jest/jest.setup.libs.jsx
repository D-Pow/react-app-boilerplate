import { render, act, waitFor, prettyDOM } from '@testing-library/react';

import Router, { appRoutes } from '@/components/Router';
import AppContext from '@/utils/AppContext';


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
 * as well as readability when logging in a testing environment.
 *
 * TODO Move this to a util file.
 *
 * @param {string} str - String from which to remove colors.
 * @returns {string} - String with all unicode colors removed.
 */
export function stripColorsFromString(str) {
    return str?.replace?.(/\u001b[^m]*?m/gu, '');
}



/** @typedef {import('react').ReactElement} ReactElement */
/** @typedef {import('@testing-library/react').RenderResult} RenderedComponent */
/** @typedef {import('@testing-library/react').RenderOptions} RenderOptions */

/*
 * Note: `getX()` query functions don't require `await` whereas `findX()` functions do.
 * See: https://testing-library.com/docs/react-testing-library/cheatsheet/
 */


/**
 * Renders your component with the specified parent wrapper.
 * Useful for testing components using context from a provider, ReactRouter, etc.
 *
 * @param {ReactElement} component - Component to wrap with a parent.
 * @param {RenderOptions} [options]
 * @param {ReactElement} [options.wrapper=AppProviderWithRouter] - Component with which to wrap `component`.
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
 * Waits for the page to redirect before continuing onward.
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
 * @param {boolean} [options.fromParent=false] - If the HTML element/DOM string should be from the parent of the component instead of the component itself.
 * @returns {{element: (Element|Document), html: string}}
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
 * @param {import('@testing-library/react').RenderResult} component
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
