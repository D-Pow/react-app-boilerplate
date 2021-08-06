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
 * Gets all cookie key-value pairs as an object.
 * Cannot get `HttpOnly` cookies as they are inaccessible to JS.
 *
 * @param {string} [cookie=document.cookie] - Cookie to parse.
 * @param {boolean} [decodeBase64=true] - Toggle to attempt Base64-decoding cookie values.
 * @returns {Object} - Parsed cookie key-value entries.
 */
export function getCookie({ cookie = document.cookie, decodeBase64 = true } = {}) {
    return cookie.split('; ').reduce((cookieObj, entry) => {
        const keyVal = entry.split('=');
        const key = decodeURIComponent(keyVal[0]);
        let value = decodeURIComponent(keyVal.slice(1).join('='));

        if (decodeBase64) {
            try {
                value = atob(value);
            } catch (e) {
                // Not a Base64-encoded string
            }
        }

        // Keys can only ever be assigned one value; old values are overwritten
        cookieObj[key] = value;

        return cookieObj;
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

/**
 * Parses a URL's segments and reformats query parameters/hash into an object.
 * Also normalizes resulting strings to never contain a trailing slash.
 *
 * @param {string} url - URL to parse for query parameters
 * @returns {{
 *      fullUrl: string,
 *      protocol: string,
 *      domain: string,
 *      port: string,
 *      origin: string,
 *      pathname: string,
 *      queryParamHashString: string,
 *      queryParamMap: Object<string, string>
 *      hash: string
 * }} - URL segments.
 */
export function getUrlSegments(url = '') {
    /*
     * All regex strings use `*` to mark them as optional when capturing
     * so they're always the same location in the resulting array.
     *
     * URL segment markers must each ignore all special characters used by
     * those after it to avoid capturing the next segment's content.
     */
    const protocolRegex = '([^:/?#]*://)?'; // include `://` for `origin` creation below
    const domainRegex = '([^:/?#]*)'; // capture everything after the protocol but before the port, pathname, query-params, or hash
    const portRegex = '(?::)?(\\d*)'; // colon followed by digits; non-capture must be outside capture group so it isn't included in output
    const pathnameRegex = '([^?#]*)'; // everything after the origin (starts with `/`) but before query-params or hash
    const queryParamRegex = '([^#]*)'; // everything before the hash (starts with `?`)
    const hashRegex = '(.*)'; // anything leftover after the above capture groups have done their job (starts with `#`)
    const urlPiecesRegex = new RegExp(`^${protocolRegex}${domainRegex}${portRegex}${pathnameRegex}${queryParamRegex}${hashRegex}$`);
    let [
        fullUrl,
        protocol,
        domain,
        port,
        pathname,
        queryString,
        hash
    ] = urlPiecesRegex.exec(url);
    let origin = protocol + domain + (port ? `:${port}` : '');
    const queryParamHashString = queryString + hash;

    // protocol can be `undefined` due to having to nest the entire thing in `()?`
    protocol = (protocol || '').replace('://', '');

    // normalize strings: remove trailing slashes and leading ? or #
    fullUrl = fullUrl.replace(/\/$/, '');
    origin = origin.replace(/\/$/, '');
    pathname = pathname.replace(/\/$/, '');
    queryString = queryString.substring(1);
    hash = hash.substring(1);

    const queryParamMap = queryString.length === 0 ? {} : queryString.split('&').reduce((queryParamObj, query) => {
        let [ key, ...vals ] = query.split('=');

        // decode to make strings easier to use in the rest of the app
        key = decodeURIComponent(key);
        const val = decodeURIComponent(vals.join('='));

        queryParamObj[key] = val;

        return queryParamObj;
    }, {});

    return {
        fullUrl,
        protocol,
        domain,
        port,
        origin,
        pathname,
        queryParamHashString,
        queryParamMap,
        hash,
    };
}

/**
 * Determines if a URL is an IP address vs a domain name.
 *
 * Optionally, determines whether or not the IP address in the URL is associated with `localhost`.
 *
 * @param {string} url - URL to test.
 * @param {boolean} [onlyLocalHost=false] - If only localhost IP addresses should be checked.
 * @returns {boolean} - If the URL is an IP address (and if it's an IP address for localhost if desired).
 */
export function isIpAddress(url, onlyLocalHost = false) {
    if (onlyLocalHost) {
        const { domain } = getUrlSegments(url);

        // TODO IPv6
        // see: https://en.wikipedia.org/wiki/Reserved_IP_addresses
        return !!domain.match(/^((127|19[28]|1?0)\.)|(172\.(1[6-9]|2|31))/);
    }

    return !!url.match(/^([^/]*:\/\/)?(\d{1,3}\.){3}(\d{1,3}(?!\.))/);
}
