import { fireEvent } from '@testing-library/react';

import AnimeSearch from '@/components/AnimeSearch';

import { getElementMaybe, renderWithWrappingParent, waitForElementVisible } from '/tests';

import { narutoResponse } from '/mocks/StaticResponses';

describe('AnimeSearch', () => {
    it('should search for anime', async () => {
        const animeSearchComponent = renderWithWrappingParent(<AnimeSearch />);
        const inputElement = document.querySelector('input[type="search"]');

        const getSearchResultsTitle = getElementMaybe(() => animeSearchComponent.getByText('Results'));

        expect(await getSearchResultsTitle()).not.toBeDefined();

        fireEvent.change(inputElement, { target: { value: 'naruto' }});
        fireEvent.click(animeSearchComponent.getByText('Search'));

        await waitForElementVisible(animeSearchComponent, '.search-result');

        expect(await getSearchResultsTitle()).toBeDefined();
        expect(animeSearchComponent.container.querySelectorAll('.search-result').length).toEqual(narutoResponse.data.length);
    });
});
