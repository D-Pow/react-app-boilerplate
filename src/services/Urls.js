export function getSearchUrl(baseUrl, textToEncode) {
    return baseUrl + encodeURIComponent(textToEncode);
}

export const kitsuTitleSearchUrl = 'https://kitsu.io/api/edge/anime?filter[text]=';
