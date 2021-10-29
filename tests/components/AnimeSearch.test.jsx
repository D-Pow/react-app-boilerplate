import { fireEvent } from '@testing-library/react';

import AnimeSearch from '@/components/AnimeSearch';

import { getElementMaybe, renderWithWrappingParent, waitForElementVisible } from '/tests';

import { narutoResponse } from '/mocks/StaticResponses';

describe('<AnimeSearch/>', () => {
    /**
     * Tests that the `<AnimeSearch/>` component renders blank at first and then sends a network request to populate
     * the search-results section.
     *
     * @param {function(): Promise<*>} fireEventToTriggerNetworkCall - Function to call to trigger the network call (e.g. `fireEvent.click()` or `fireEvent.keyDown()`).
     * @returns {Promise<void>} - Async function containing all the actual tests to be run when verifying network calls are successful.
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
    }

    it('should search for anime by search-button click', async () => {
        await testAnimeSearchWorksForNaruto(rootComponent => fireEvent.click(rootComponent.getByText('Search')));
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
