import { getSearchUrl, kitsuTitleSearchUrl } from '@/services/Urls';

export async function fetchKitsuTitleSearch(searchText: string) {
    try {
        const response = await fetch(getSearchUrl(kitsuTitleSearchUrl, searchText));
        const json = await response.json() as {
            data: Array<{
                attributes: {
                    canonicalTitle: string;
                }
            }>;
        };

        return json.data.map(result => result.attributes.canonicalTitle);
    } catch (e) {
        console.error('Error in fetching Kitsu results: ' + e);

        throw e;
    }
}
