export function encodeToBase64(stringToEncode = '') {
    try {
        return btoa(stringToEncode);
    } catch(e) {
        // Could not encode
    }

    return null;
}

export function decodeBase64(base64 = '') {
    try {
        return atob(base64);
    } catch(e) {
        // Could not decode, likely a malformed Base64 string
    }

    return null;
}

/**
 * Extracts the content string from a Base64 data URL.
 * Optionally, decode the content string for direct usage.
 *
 * e.g. Either `'aGVsbG8gd29ybGQ='` (`decode == false`) or
 * `'hello world'` (`decode == true`) would be extracted
 * from `'data:text/plain;base64,aGVsbG8gd29ybGQ='`.
 *
 * @param {string} dataUrl - Base64 data URL, including the `data`/`base64` header content.
 * @param {boolean} [decode=false] - Decode the Base64 content string.
 * @returns {string} - The Base64 content from the data URL.
 */
export function getTextFromBase64DataUrl(dataUrl = '', decode = false) {
    const encodedContentString = dataUrl.replace(/(.*?base64,)/, '');

    if (!decode) {
        return encodedContentString;
    }

    return decodeBase64(encodedContentString);
}

/**
 * Extracts the mime type from a Base64 data URL.
 *
 * e.g. `image/svg+xml` would be extracted
 * from `data:image/svg+xml;base64,aGVsbG8gd29ybGQ=`.
 *
 * @param {string} dataUrl - Base64 data URL, including the `data`/`base64` header content.
 * @returns {string} - The mime type from the data URL.
 */
export function getMimeTypeFromDataUrl(dataUrl = '') {
    try {
        return dataUrl.match(/(?<=data:)[^;]+/)[0];
    } catch(e) {
        // Could not find match, likely a malformed data URL
    }

    return null;
}

/**
 * Gets a {@code Document} from the passed {@code dataUrl}.
 *
 * Data URLs formatting: `data:MIME_TYPE;base64,BASE_64_STRING`.
 *
 * e.g. `data:image/svg+xml;base64,aGVsbG8gd29ybGQ=`
 *
 * @param {string} dataUrl - Data URL to parse into XML.
 * @returns {Document} - Respective Document object generated from the retrieved XML.
 */
export function getXmlDocFromDataUrl(dataUrl) {
    const mimeType = getMimeTypeFromDataUrl(dataUrl);
    const xmlText = getTextFromBase64DataUrl(dataUrl, true);
    const xmlParser = new DOMParser();

    return xmlParser.parseFromString(xmlText, mimeType || 'text/xml');
}
