/**
 * Gets URL query parameter entries as either key-value pairs in an object
 * or as a string formatted how they would appear in the URL bar (e.g. `?a=b&c=d`).
 *
 * Defaults to getting the query parameters from the current page's URL as an object.
 * If `fromObj` is specified, then `fromUrl` will be ignored and a string will be returned instead.
 *
 * @param {(string|Object)} [input=location.search+location.hash] - URL search/hash string to convert to an object, or
 *                                                                  an object to convert to a search+hash string.
 * @returns {(Object|string)} - All query param and hash key-value pairs (if input is a string) or URL search+hash string (if input is an object).
 */
export function getQueryParams(input = self.location.search + self.location.hash) {
    // TODO Allow setting the separator for Object --> String conversion (e.g. comma instead of multiple `key=val` entries)
    let fromUrl;
    let fromObj;

    if (typeof input === typeof '') {
        fromUrl = input;
    } else if (typeof input === typeof {}) {
        fromObj = input;
    } else {
        throw new TypeError(`Type "${typeof input}" is not supported. Please use a string or object.`);
    }

    if (fromObj) {
        fromObj = { ...fromObj };

        const hash = fromObj['#'] || '';

        delete fromObj['#'];

        const getEncodedKeyValStr = (key, val) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`;

        const queryParamEntries = Object.entries(fromObj);
        const queryString = queryParamEntries.length > 0
            ? `?${
                queryParamEntries
                    .map(([ queryKey, queryValue ]) => {
                        if (Array.isArray(queryValue)) {
                            return queryValue
                                .map(val => getEncodedKeyValStr(queryKey, val))
                                .join('&');
                        }

                        return getEncodedKeyValStr(queryKey, queryValue);
                    })
                    .join('&')
            }`
            : '';

        return queryString + (hash ? `#${hash}` : '');
    }

    // TODO Should full URLs be supported or only search/hash? Even `URLSearchParams` only supports search (not even hash).
    const queryParamHashString = fromUrl.replace(/^\?/, '');
    const [ urlSearchQuery, hash ] = queryParamHashString.split('#');

    const queryParamsObj = {};

    if (hash) {
        queryParamsObj['#'] = hash;
    }

    return [ ...new URLSearchParams(urlSearchQuery).entries() ]
        .reduce((queryParams, nextQueryParam) => {
            const [ key, value ] = nextQueryParam;

            if (key in queryParams) {
                if (Array.isArray(queryParams[key])) {
                    queryParams[key].push(value);
                } else {
                    queryParams[key] = [ queryParams[key], value ];
                }
            } else {
                queryParams[key] = value;
            }

            return queryParams;
        }, queryParamsObj);
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
    const { origin, pathname, hash } = self.location;
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

    const queryParamsString = getQueryParams(queryParams);
    const newUrl = origin + pathname + queryParamsString + hash;

    history.pushState(
        null,
        null,
        newUrl,
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
 *      queryParamMap: Object<string, string>,
 *      hash: string
 * }} - URL segments.
 */
export function getUrlSegments(url = '') {
    let fullUrl = url;
    let protocol = '';
    let domain = '';
    let port = '';
    let origin = '';
    let pathname = '';
    let queryString = '';
    let queryParamHashString = '';
    let hash = '';

    try {
        // Variables are already declared above. Setting the spread in parentheses like
        // this sets them just like `const { a, b } = obj` would without requiring `const`
        ({
            href: fullUrl, // full URL, normalized to resolve `/path/../path/` => `/path/` and adds a '/' at the end of the pathname
            origin, // protocol + '//' + hostname + ':' + port
            protocol, // protocol + ':'
            // host, // hostname + ':' + port
            hostname: domain, // i.e. domain
            port, // port (without ':')
            pathname, // includes '/' even if not specified, unless query params/hash present
            search: queryString, // empty string or '?...' excluding the hash portion at the end
            // searchParams, // new URLSearchParams(`search`)
            hash, // empty string or '#...'
            // username, // empty string or <something>
            // password, // empty string or <something>
        } = new URL(url));
    } catch (e) {
        /*
         * Either `URL` isn't defined or some other error, so try to parse it manually.
         *
         * All regex strings use `*` to mark them as optional when capturing so that
         * they're always the same location in the resulting array, regardless of whether
         * or not they exist.
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

        [
            fullUrl,
            protocol,
            domain,
            port,
            pathname,
            queryString,
            hash,
        ] = urlPiecesRegex.exec(url);
        origin = protocol + domain + (port ? `:${port}` : '');
    }

    queryParamHashString = queryString + hash;
    // protocol can be `undefined` due to having to nest the entire thing in `()?`
    protocol = (protocol || '').replace(/:\/?\/?/, '');

    // normalize strings: remove trailing slashes and leading ? or #
    fullUrl = fullUrl.replace(/\/+(?=\?|#|$)/, ''); // fullUrl could have `/` followed by query params, hash, or end of string
    origin = origin.replace(/\/+$/, '');
    pathname = pathname.replace(/\/+$/, '');
    queryString = queryString.substring(1);
    hash = hash.substring(1);

    const queryParamMap = queryString.length === 0 ? {} : queryString.split('&').reduce((queryParamObj, query) => {
        let [ key, ...vals ] = query.split('=');

        // decode to make strings easier to use in the rest of the app
        key = decodeURIComponent(key);
        const val = decodeURIComponent(vals.join('='));

        if (key in queryParamObj) {
            if (Array.isArray(queryParamObj[key])) {
                queryParamObj[key].push(val);
            } else {
                queryParamObj[key] = [ queryParamObj[key], val ];
            }
        } else {
            queryParamObj[key] = val;
        }

        return queryParamObj;
    }, {});

    if (hash) {
        queryParamMap['#'] = hash;
    }

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
 * @param {Object} [options]
 * @param {boolean} [options.onlyLocalhost=false] - If only localhost IP addresses should be checked.
 * @param {boolean} [options.includeLocalhostDomain=true] - If `https?://localhost` should be included in `onlyLocalhost` check.
 * @returns {boolean} - If the URL is an IP address (and if it's an IP address for localhost if desired).
 */
export function isIpAddress(url, { onlyLocalhost = false, includeLocalhostDomain = true } = {}) {
    if (onlyLocalhost) {
        const { domain } = getUrlSegments(url);

        // TODO IPv6
        // see: https://en.wikipedia.org/wiki/Reserved_IP_addresses
        return !!(
            domain.match(/^((127|19[28]|1?0)\.)|(172\.(1[6-9]|2|31))/)
            || (
                includeLocalhostDomain &&
                domain.match(/localhost/)
            )
        );
    }

    return !!url.match(/^([^/]*:\/\/)?(\d{1,3}\.){3}(\d{1,3}(?!\.))/);
}

/**
 * Determines if the passed URL string is a valid URL.
 *
 * @param {string} url - URL to test.
 * @param {Object} [options]
 * @param {boolean} [options.allowOnlyPathname=true] - If a relative pathname-based URL will be considered as valid.
 * @returns {boolean} - If the URL is valid.
 */
export function isUrl(url, { allowOnlyPathname = true } = {}) {
    try {
        new URL(url);
        return true;
    } catch (notValidUrl) {
        if (allowOnlyPathname) {
            return !!url.match(/^\.*\/.+/);
        }
    }

    return false;
}

/**
 * Extracts the final pathname segment from a URL, indicated by everything between
 * the last slash and query params/hash entry.
 *
 * Useful for getting file names, last REST argument, or API endpoint name.
 *
 * Will return an empty string if the URL ends with a slash
 *
 * @param {string} url - URL string from which to extract the final pathname segment.
 * @returns {string} - The final pathname segment or empty string.
 */
export function extractFinalPathnameSegmentFromUrl(url = '') {
    return url.replace(/.*\/([^/?#]*)(?:$|\?|#).*/, '$1');
}
