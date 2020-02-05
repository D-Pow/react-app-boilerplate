import { getSearchUrl, kitsuTitleSearchUrl } from 'services/Urls';

export async function fetchKitsuTitleSearch(searchText) {
    try {
        const response = await fetch(getSearchUrl(kitsuTitleSearchUrl, searchText));

        return await response.json();
    } catch (e) {
        console.log('Error in fetching Kitsu results: ' + e);

        throw {};
    }
}
