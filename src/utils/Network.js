export const HttpMethods = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS',
    PATCH: 'PATCH',
    CONNECT: 'CONNECT',
    TRACE: 'TRACE',
};


/**
 * Fetches a resource and returns the Base64-encoded result.
 *
 * @param {string} url - URL to which the network request will be made.
 * @param {RequestInit} fetchOptions - Options to pass to the underlying `fetch()` function.
 * @returns {Promise<unknown>} - The result from the [`FileReader`]{@link https://developer.mozilla.org/en-US/docs/Web/API/FileReader}.
 */
export async function fetchAsBase64(url, fetchOptions = {}) {
    const res = await fetch(url, fetchOptions);
    const blob = await res.blob();

    // FileReader uses old API
    // Thus, we must use old Promise API
    return await new Promise((res, rej) => {
        const reader = new FileReader();

        reader.onload = () => {
            res(reader.result);
        };
        reader.onerror = e => {
            rej(e);
        };

        reader.readAsDataURL(blob);
    });
}


/**
 * Creates an `XMLHttpRequest` instance and fires off the network request with the specified parameters.
 *
 * Promise will resolve/reject with a value of the resulting `XMLHttpRequest` instance.
 * To access internal event objects, pass in the handler function you wish to use.
 *
 * The Promise will resolve within the [`onload` handler]{@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/load_event}
 * which fires when a successful network response has been received, whereas the Promise will reject within the [`onerror` handler]{@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/error_event}
 * which fires when a failure occurs (e.g. `xhr.abort()` is called).
 *
 * Note: The [`readystatechange` event]{@link https://developer.mozilla.org/en-US/docs/Web/API/Document/readystatechange_event} as well
 * as other handlers/properties can be passed to the `XMLHttpRequest` instance through the `options` object as-is and they will automatically be
 * set on the `XMLHttpRequest` instance.
 *
 * @param {(string|URL)} url - URL to which the network request will be made.
 * @param {XMLHttpRequest} [options] - Additional functions/properties to assign to the `XMLHttpRequest` instance; Accepts properties not specified in this function's signature as well.
 * @param {string} [options.method='GET'] - HttpMethod to use.
 * @param {any} [options.payload] - Body of the network request.
 * @param {function} [options.onload] - Function to call after the request has fully resolved successfully.
 * @param {function} [options.onerror] - Function to call if any error occurs, including `abort()`.
 * @param {boolean} [options.addHeaderAsObj=true] - If the resulting HTTP headers should be mapped into an object assigned on the returned `XMLHttpRequest` instance.
 * @param {boolean} [options.returnXhrImmediately=false] - If the `XMLHttpRequest` instance should be returned before calling `.send(payload)`; `.send()` will still be called within this function regardless.
 * @returns {Promise<XMLHttpRequest>}
 * @see [`XMLHttpRequest`]{@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest}
 */
export async function doXhr(url, {
    method = HttpMethods.GET,
    payload,
    onload = () => {},
    onerror = () => {},
    addHeaderAsObj = true,
    returnXhrImmediately = false,
    ...properties
} = {}) {
    const xhr = new XMLHttpRequest();
    let resolved = false;

    xhr.open(method, url);

    const customProperties = {
        // Tracks if the Promise below has resolved
        resolved: {
            configurable: false,
            enumerable: true,
            get() {
                return resolved;
            },
        },
        ...(addHeaderAsObj
            ? {
                // Adds a new field for easier parsing of XHR `headers`
                headers: {
                    configurable: false,
                    enumerable: true,
                    get() {
                        return xhr.getAllResponseHeaders()
                            .split(/\r?\n/)
                            .filter(Boolean)
                            .reduce((headerMap, headerStr) => {
                                const [ headerKey, ...headerValues ] = headerStr.split(':');

                                headerMap[headerKey] = headerValues.join(':').trim();

                                return headerMap;
                            }, {});
                    },
                },
            }
            : {}
        ),
    };

    // Must be defined via PropertyDescriptor so custom getters/setters work
    Object.defineProperties(xhr, customProperties);
    // Cannot be assigned via `Object.defineProperties()` because XHR has custom getters/setters for its built-in functions/properties
    Object.entries({ ...properties }) // Cast null/undefined to object via rest spread
        .forEach(([ key, value ]) => {
            xhr[key] = value;
        });

    const responsePromise = new Promise((res, rej) => {
        xhr.onload = loadendEvent => {
            onload(loadendEvent);
            resolved = true;
            res(xhr);
        };
        xhr.onerror = progressEvent => {
            onerror(progressEvent);
            resolved = true;
            rej(xhr);
        };

        xhr.send(payload);
    });

    if (returnXhrImmediately) {
        return xhr;
    }

    return await responsePromise;
}
