import { fetchKitsuTitleSearch } from '@/services/KitsuAnimeSearchService';

import { kimiNoNaWaSearchQuery } from '~/mocks/UrlResponseMappings';

describe('KitsuAnimeSearchService', () => {
    it('should resolve JSON responses from Kitsu API', async () => {
        const kimiNoNaWaResponse = await fetchKitsuTitleSearch(kimiNoNaWaSearchQuery);

        expect(kimiNoNaWaResponse).toBeDefined();
        expect(kimiNoNaWaResponse.length).toBeGreaterThan(0);
    });
});
