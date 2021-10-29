import { fireEvent } from '@testing-library/react';

import Home from '@/components/Home';
import About from '@/components/About';

import { renderWithWrappingParent, waitForRedirect, getDomFromRender } from '/tests';

describe('<Home/>', () => {
    it('should render the word "Home"', () => {
        const homeComponent = renderWithWrappingParent(<Home />);
        const homeTextComponent = homeComponent.getByText('Home');

        expect(homeTextComponent).toBeDefined();
    });

    it('should redirect upon clicking a redirect button', async () => {
        const rootWithHomeComponent = renderWithWrappingParent(<Home />);
        const aboutButton = rootWithHomeComponent.getByText(/Go to About/i);
        const originalUrl = location.href;

        const newUrl = await waitForRedirect(() => {
            /*
             * `fireEvent` is already wrapped in `act()` internally, so no need to wrap it here.
             *
             * Realistically, we could use the simplified shorthand, `fireEvent.click(elem)`, which
             * would mean we wouldn't have to use the REQUIRED `bubbles: true` in the constructor.
             *
             * However, this version was left as-is to be an example for how to write `fireEvent` with
             * event constructors, which is helpful for custom events or those not covered by `fireEvent`,
             * e.g. `Broadcast`.
             */
            fireEvent(
                aboutButton,
                new MouseEvent('click', { bubbles: true }),
            );
        });

        const { element, html } = getDomFromRender(rootWithHomeComponent, { fromParent: true });

        expect(html.includes('Home')).toBe(false);
        expect(element.querySelector(`div.${About.defaultProps.className}`)).toBeDefined();
        expect(location.href).toEqual(newUrl);
        expect(location.href).not.toEqual(originalUrl);
        expect(location.pathname).toEqual('/about');
    });
});
