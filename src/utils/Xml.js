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

export function getBase64StringFromDataUrl(dataUrl = '') {
    return dataUrl.replace(/(.*?base64,)/, '');
}

export function getMimeTypeFromDataUrl(dataUrl = '') {
    try {
        return dataUrl.match(/(?<=data:)[^;]+/)[0];
    } catch(e) {
        // Could not find match, likely a malformed data URL
    }

    return null;
}

export function getTextFromDataUrl(dataUrl) {
    return decodeBase64(getBase64StringFromDataUrl(dataUrl));
}

/**
 * Gets a {@code Document} from the passed {@code dataUrl}.
 *
 * Data URLs formatting: data:MIME_TYPE;base64,BASE_64_STRING
 * e.g. data:image/svg+xml;base64,PD94bWwgdm...
 *
 * @param {string} dataUrl - Data URL to parse into XML.
 * @returns {Document} - Respective Document object generated from the retrieved XML.
 */
export function getXmlDocFromDataUrl(dataUrl) {
    const mimeType = getMimeTypeFromDataUrl(dataUrl);
    const xmlText = getTextFromDataUrl(dataUrl);
    const xmlParser = new DOMParser();

    return xmlParser.parseFromString(xmlText, mimeType || 'text/xml');
}
