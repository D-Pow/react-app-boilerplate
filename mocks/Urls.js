import { getSearchUrl, kitsuTitleSearchUrl } from 'services/Urls';

export const kimiNoNaWaSearchQuery = 'kimi no na wa';
export const narutoSearchQuery = 'naruto';
export const bleachSearchQuery = 'bleach';
export const fullmetalSearchQuery = 'fullmetal alchemist';
export const attackOnTitanSearchQuery = 'attack on titan';

export const kimiNoNaWaUrl = getSearchUrl(kitsuTitleSearchUrl, kimiNoNaWaSearchQuery);
export const narutoUrl = getSearchUrl(kitsuTitleSearchUrl, narutoSearchQuery);
export const bleachUrl = getSearchUrl(kitsuTitleSearchUrl, bleachSearchQuery);
export const fullmetalUrl = getSearchUrl(kitsuTitleSearchUrl, fullmetalSearchQuery);
export const attackOnTitanUrl = getSearchUrl(kitsuTitleSearchUrl, attackOnTitanSearchQuery);
