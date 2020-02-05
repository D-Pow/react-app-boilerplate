import { kitsuTitleSearchUrl } from 'services/Urls';
import {
    kimiNoNaWaUrl,
    narutoUrl,
    bleachUrl,
    fullmetalUrl,
    attackOnTitanUrl
} from './Urls';
import {
    kimiNoNaWaResponse,
    narutoResponse,
    bleachResponse,
    fullmetalResponse,
    attackOnTitanResponse
} from './StaticResponses';
import { chooseMockBasedOnQuery } from './DynamicResponses';

export const searchMocksConfig = {
    [kimiNoNaWaUrl]: kimiNoNaWaResponse,
    [narutoUrl]: narutoResponse,
    [bleachUrl]: bleachResponse,
    [fullmetalUrl]: fullmetalResponse,
    [attackOnTitanUrl]: attackOnTitanResponse
};

export const dynamicSearchConfigFromQueries = {
    [kitsuTitleSearchUrl]: {
        dynamicResponseModFn: chooseMockBasedOnQuery,
        usePathnameForAllQueries: true
    }
};
