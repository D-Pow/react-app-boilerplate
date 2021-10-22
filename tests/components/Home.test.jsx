import React from 'react';

import Home from '@/components/Home';

describe('Home', () => {
    it('should render the word "Home"', () => {
        const home = global.renderWithWrappingParent(<Home />);
        const homeHtmlIncludesWordHome = home.html().includes('Home');

        expect(homeHtmlIncludesWordHome).toBe(true);
    });
});
