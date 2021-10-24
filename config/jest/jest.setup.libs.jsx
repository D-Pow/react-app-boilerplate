import { BrowserRouter as Router } from 'react-router-dom';
import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import AppContext from '@/utils/AppContext';

Enzyme.configure({ adapter: new Adapter() });

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
 * @param {(import('enzyme').MountRendererProps|import('enzyme').ShallowRendererProps)} options
 * @param {('mount'|'shallow')} [options.renderMethod=mount] - Enzyme's `mount` or `shallow` method name.
 * @param {import('react').ReactElement} [options.wrappingComponent=AppProviderWithRouter] - Component with which to wrap `component`.
 * @returns {ReactWrapper<["props"], ["state"]>} - Rendered component with the provider as its parent.
 */
global.renderWithWrappingParent = (
    component,
    {
        renderMethod = 'mount',
        wrappingComponent = AppProviderWithRouter,
        ...enzymeOptions
    } = {},
) => {
    const enzymeRenderMethod = Enzyme[renderMethod];

    return enzymeRenderMethod(component, {
        ...enzymeOptions,
        wrappingComponent,
    });
};
