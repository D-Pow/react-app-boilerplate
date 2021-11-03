import { fireEvent, within } from '@testing-library/react';

import AnimeSearch from '@/components/AnimeSearch';

import {
    getDomFromRender,
    getElementMaybe,
    renderWithWrappingParent,
    waitForElementVisible,
} from '/tests';

import { narutoResponse } from '/mocks/StaticResponses';

describe('<AnimeSearch/>', () => {
    /**
     * Tests that the `<AnimeSearch/>` component renders blank at first and then sends a network request to populate
     * the search-results section.
     *
     * @param {function(): Promise<*>} fireEventToTriggerNetworkCall - Function to call to trigger the network call (e.g. `fireEvent.click()` or `fireEvent.keyDown()`).
     * @returns {Promise<import('../index.js').RenderedComponent>} - Async function containing all the actual tests to be run when verifying network calls are successful.
     */
    async function testAnimeSearchWorksForNaruto(fireEventToTriggerNetworkCall) {
        const animeSearchComponent = renderWithWrappingParent(<AnimeSearch />);
        const inputElement = document.querySelector('input[type="search"]');

        const getSearchResultsTitle = getElementMaybe(() => animeSearchComponent.getByText('Results'));

        expect(await getSearchResultsTitle()).not.toBeDefined();

        fireEvent.change(inputElement, { target: { value: 'naruto' }});
        await fireEventToTriggerNetworkCall(animeSearchComponent);

        await waitForElementVisible(animeSearchComponent, '.search-result');

        expect(await getSearchResultsTitle()).toBeDefined();
        expect(animeSearchComponent.container.querySelectorAll('.search-result').length).toEqual(narutoResponse.data.length);

        return animeSearchComponent;
    }

    it('should search for anime by search-button click', async () => {
        const animeSearchComponent = await testAnimeSearchWorksForNaruto(
            rootComponent => fireEvent.click(rootComponent.getByText('Search'))
        );

        // Two ways to get the `innerText` of a rendered element.
        //
        // 1. Use React-testing-library's `within()` to search for content by text within a particular component.
        //    Note: This also helps to select one element from many with the same text.
        expect(within(animeSearchComponent.getByRole('button')).getByText('Search')).toBeDefined();
        // 2. Get the underlying DOM element and get `textContent` since `innerText` isn't defined.
        expect(getDomFromRender(animeSearchComponent.getByRole('button')).element).toHaveProperty('textContent', 'Search'); // no innerText available
    });

    it('should search for anime by "Enter" key press', async () => {
        await testAnimeSearchWorksForNaruto(rootComponent => fireEvent.keyDown(
            rootComponent.getByText('Search'),
            {
                key: 'Enter',
            },
        ));
    });
});
