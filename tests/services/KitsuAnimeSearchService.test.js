import { fetchKitsuTitleSearch } from '@/services/KitsuAnimeSearchService';

import { kimiNoNaWaSearchQuery } from '~/mocks/UrlResponseMappings';

describe('KitsuAnimeSearchService', () => {
    it('should resolve JSON responses from Kitsu API', async () => {
        const kimiNoNaWaResponse = await fetchKitsuTitleSearch(kimiNoNaWaSearchQuery);

        expect(kimiNoNaWaResponse.data).toBeDefined();
        expect(kimiNoNaWaResponse.data.length).toBeGreaterThan(0);
    });
});
