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
 *
 * e.g. `aGVsbG8gd29ybGQ=` would be extracted
 * from `data:image/svg+xml;base64,aGVsbG8gd29ybGQ=`.
 *
 * @param {string} dataUrl - Base64 data URL, including the `data`/`base64` header content.
 * @returns {string} - The Base64 content from the data URL.
 */
export function getBase64StringFromDataUrl(dataUrl = '') {
    return dataUrl.replace(/(.*?base64,)/, '');
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
 * Decodes the content string from a Base64 data URL for direct usage.
 *
 * e.g. `hello world` would be extracted
 * from `data:text/plain;base64,aGVsbG8gd29ybGQ=`.
 *
 * @param {string} dataUrl - Base64 data URL, including the `data`/`base64` header content.
 * @returns {string} - The decoded content string from the data URL.
 */
export function getDecodedTextFromDataUrl(dataUrl) {
    return decodeBase64(getBase64StringFromDataUrl(dataUrl));
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
    const xmlText = getDecodedTextFromDataUrl(dataUrl);
    const xmlParser = new DOMParser();

    return xmlParser.parseFromString(xmlText, mimeType || 'text/xml');
}
