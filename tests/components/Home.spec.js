import React from 'react';
import { mount } from 'enzyme';
import Home from '@/components/Home';

describe('Home', () => {
    it('should render the word "Home"', () => {
        const home = mount(<Home />);
        const homeHtmlIncludesWordHome = home.html().includes('Home');

        expect(homeHtmlIncludesWordHome).toBe(true);
    });
});
