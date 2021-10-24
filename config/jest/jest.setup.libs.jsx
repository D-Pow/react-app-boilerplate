import { BrowserRouter as Router } from 'react-router-dom';
import { render } from '@testing-library/react';

import AppContext from '@/utils/AppContext';

function AppProviderWithRouter({ children }) {
    return (
        <>
            <AppContext.Provider>
                <Router>
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
 * @param {import('@testing-library/react').RenderOptions} options
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
