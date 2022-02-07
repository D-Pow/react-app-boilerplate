import { kitsuTitleSearchUrl, getSearchUrl } from '@/services/Urls';

import {
    kimiNoNaWaResponse,
    narutoResponse,
    bleachResponse,
    fullmetalResponse,
    attackOnTitanResponse,
} from '~/mocks/StaticResponses';

export function getKitsuTitleSearchUrl(searchText) {
    return getSearchUrl(kitsuTitleSearchUrl, searchText);
}

export const kimiNoNaWaSearchQuery = 'kimi no na wa';
export const narutoSearchQuery = 'naruto';
export const bleachSearchQuery = 'bleach';
export const fullmetalSearchQuery = 'fullmetal alchemist';
export const attackOnTitanSearchQuery = 'attack on titan';

export const kitsuSearchQueryParamKey = kitsuTitleSearchUrl.substring(kitsuTitleSearchUrl.indexOf('?') + 1, kitsuTitleSearchUrl.indexOf('='));

export const queryParamResponseMap = {
    [kimiNoNaWaSearchQuery]: kimiNoNaWaResponse,
    [narutoSearchQuery]: narutoResponse,
    [bleachSearchQuery]: bleachResponse,
    [fullmetalSearchQuery]: fullmetalResponse,
    [attackOnTitanSearchQuery]: attackOnTitanResponse,
};

export const staticUrlResponseConfig = Object.keys(queryParamResponseMap).reduce((fullUrlConfig, searchQuery) => {
    fullUrlConfig[getKitsuTitleSearchUrl(searchQuery)] = queryParamResponseMap[searchQuery];

    return fullUrlConfig;
}, {});
