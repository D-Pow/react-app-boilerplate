/**
 * Gets URL query parameter entries as key-value pairs in an object.
 *
 * @returns {Object} - All query param key-value pairs.
 */
export function getQueryParams() {
    return [...new URLSearchParams(window.location.search).entries()]
        .reduce((queryParams, nextQueryParam) => {
            const [ key, value ] = nextQueryParam;
            queryParams[key] = value;
            return queryParams;
        }, {});
}

/**
 * Gets URL query parameter entries as they would appear in the URL bar.
 *
 * @param {Object} [queryParams=getQueryParams()] - Optional query parameter key-value object.
 * @returns {string} - Query parameters as they would appear in the URL bar.
 */
export function getQueryParamsAsString(queryParams = getQueryParams()) {
    return Object.keys(queryParams).length > 0
        ? `?${
            [...Object.entries(queryParams)]
                .map(([ queryKey, queryValue ]) => `${encodeURIComponent(queryKey)}=${encodeURIComponent(queryValue)}`)
                .join('&')
        }`
        : '';
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

    const queryParamsString = getQueryParamsAsString(queryParams);
    const newUrl = origin + pathname + queryParamsString + hash;

    history.pushState(
        null,
        null,
        newUrl
    );
}
