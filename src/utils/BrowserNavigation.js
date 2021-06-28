/**
 * Gets URL query parameter entries as either key-value pairs in an object
 * or as a string formatted how they would appear in the URL bar (e.g. `?a=b&c=d`).
 *
 * Defaults to getting the query parameters from the current page's URL as an object.
 * If `fromObj` is specified, then `fromUrl` will be ignored and a string will be returned instead.
 *
 * @param {Object} input
 * @param {string} [input.fromUrl=window.location.search] - URL to get query parameters from; defaults to current page's URL.
 * @param {Object} [input.fromObj] - Object to convert to query parameter string.
 * @returns {Object} - All query param key-value pairs.
 */
export function getQueryParams({
    fromUrl = window.location.search,
    fromObj,
} = {}) {
    if (fromObj) {
        const queryParamEntries = Object.entries(fromObj);

        return queryParamEntries.length > 0
            ? `?${
                queryParamEntries
                    .map(([ queryKey, queryValue ]) => `${encodeURIComponent(queryKey)}=${encodeURIComponent(queryValue)}`)
                    .join('&')
            }`
            : '';
    }

    const urlSearchQuery = fromUrl.split('?')[1];

    return [...new URLSearchParams(urlSearchQuery).entries()]
        .reduce((queryParams, nextQueryParam) => {
            const [ key, value ] = nextQueryParam;
            queryParams[key] = value;
            return queryParams;
        }, {});
}

/**
 * Pushes a URL query parameter key-value pair to the URL bar.
 * Does not refresh the page, rather it just adds the new URL to the {@code history}.
 *
 * @param {(string|Object)} key - Query param key, or object of all key-value pairs to be in the URL bar.
 * @param {string} value - Query param value to be assigned to the key (if key is a string).
 */
export function pushQueryParamOnHistory(key, value) {
    const { origin, pathname, hash } = window.location;
    let queryParams = getQueryParams();

    if (typeof key === typeof {}) {
        queryParams = key;
    } else if (typeof key === typeof '') {
        if (value) {
            queryParams[key] = value;
        } else {
            delete queryParams[key];
        }
    }

    const queryParamsString = getQueryParams({ fromObj: queryParams });
    const newUrl = origin + pathname + queryParamsString + hash;

    history.pushState(
        null,
        null,
        newUrl
    );
}
