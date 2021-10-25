import { render } from '@testing-library/react';

import Router, { appRoutes } from '@/components/Router';
import AppContext from '@/utils/AppContext';


const appRoutesWithoutRedirect = appRoutes.map(routeProps => {
    routeProps = { ...routeProps };

    if (routeProps.render?.toString().match(/\bRedirect[\s\S]*to[:=]\s*['"][^'"]+/)) {
        routeProps.render = () => <div />;
    }

    return routeProps;
});

function AppProviderWithRouter({ children }) {
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
 * Renders your component with the specified parent wrapper.
 * Useful for testing components using context from a provider, ReactRouter, etc.
 *
 * @param {import('react').ReactElement} component - Component to wrap with a parent.
 * @param {import('@testing-library/react').RenderOptions} [options]
 * @param {import('react').ReactElement} [options.wrapper=AppProviderWithRouter] - Component with which to wrap `component`.
 * @returns {import('@testing-library/react').RenderResult} - Rendered component with the provider as its parent.
 */
global.renderWithWrappingParent = (
    component,
    {
        wrapper = AppProviderWithRouter,
        ...renderOptions
    } = {},
) => {
    return render(component, {
        ...renderOptions,
        wrapper,
    });
};
