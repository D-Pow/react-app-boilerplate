import { MimeTypes } from '@/utils/Constants';


/**
 * Encodes a string with Base64.
 *
 * Optionally, creates a data URL if a `mimeType` is specified.
 *
 * @param {string} str - String to Base64-encode.
 * @param {Object} [options]
 * @param {string} [options.mimeType] - Mime type of the content; include this if you want a [Data URL]{@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs}.
 * @param {boolean} [options.urlEncode] - If the string should be Base64-URL-encoded instead of just Base64-encoded (e.g. for crypto).
 * @param {boolean} [options.nullOnFail] - If null should be returned instead of the original string upon failure.
 * @returns {string} - Base64-encoded string (or original string/null on failure).
 *
 * @see [Why `urlEncode` needs to be specified]{@link https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem}
 * @see [Base64 vs Base64-URL]{@link https://stackoverflow.com/questions/28100601/decode-url-safe-base64-in-javascript-browser-side}
 * @see [Verifying JWT which uses Base64-URL-encoded strings]{@link https://stackoverflow.com/questions/56357330/how-to-verify-an-es256-jwt-token-using-web-crypto-when-public-key-is-distributed}
 */
export function base64Encode(str, {
    mimeType = '',
    urlEncode = false,
    nullOnFail = false,
} = {}) {
    try {
        const base64String = urlEncode
            ? btoa(unescape(encodeURIComponent(str)))
            : btoa(str);

        if (mimeType) {
            return `data:${mimeType};base64,${base64String}`;
        }

        return base64String;
    } catch (couldNotEncodeError) {}

    return nullOnFail ? null : str;
}


/**
 * Decodes a Base64-encoded string.
 *
 * @param {string} str - String to Base64-decode.
 * @param {Object} options
 * @param {boolean} [options.urlDecode] - If the string was Base64-URL-encoded instead of just Base64-encoded (e.g. for crypto).
 * @param {boolean} [options.nullOnFail] - If null should be returned instead of the original string upon failure.
 * @returns {string} - Base64-decoded string (or original string/null on failure).
 */
export function base64Decode(str, {
    urlDecode = false,
    nullOnFail = false,
} = {}) {
    try {
        return urlDecode
            ? decodeURIComponent(escape(atob(str)))
            : atob(str);
    } catch (couldNotDecodeLikelyMalformedError) {}

    return nullOnFail ? null : str;
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

    return base64Decode(encodedContentString);
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
    } catch (e) {
        // Could not find match, likely a malformed data URL
    }

    return null;
}


/**
 * Converts a Blob's data to Base64.
 *
 * @param {Blob} blob - Blob whose data to convert.
 * @returns {Promise<string>} - Base64 string of the data.
 */
export async function blobToBase64(blob) {
    // FileReader uses callbacks, so we must use the basic Promise API
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
 * Converts an HTML `<img>` element's data to a Base64 string.
 *
 * @example <caption>Convert an SVG to a PNG</caption>
 * const img = document.querySelector('img[src*="svg"]');
 * downloadDataAsFile(imageToBase64(img), {
 *     fileName: 'my-file.png',
 * });
 *
 * @param {HTMLImageElement} img - Image whose data to convert.
 * @param {Object} [options]
 * @param {string} [options.mimeType] - Desired MIME type of the resulting Base64 string.
 * @param {number} [options.compressionQuality] - Compression quality for lossy image algorithms (e.g. JPEG or WEBP).
 * @returns {string} - Base64 string of the image.
 *
 * @see [StackOverflow post on common methods for conversion]{@link https://stackoverflow.com/questions/6150289/how-can-i-convert-an-image-into-base64-string-using-javascript/20285053#20285053}
 * @see [MDN docs on `canvas.toDataURL()`]{@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL}
 */
export function imageToBase64(img, {
    mimeType = MimeTypes.PNG,
    compressionQuality = 1,
} = {}) {
    // Since the element was never appended to the document, it doesn't require cleanup (garbage collection will handle it)
    // See: https://stackoverflow.com/questions/1847220/javascript-document-createelement-delete-domelement/1847289#1847289
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = img.width;
    canvas.height = img.height;

    ctx?.drawImage(img, 0, 0);

    return canvas.toDataURL(mimeType, compressionQuality);
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

    return xmlParser.parseFromString(xmlText, mimeType || MimeTypes.XML);
}


/**
 * Stringifies an {@link XMLDocument} since {@code .toString()} just returns {@code [object XMLDocument]}.
 *
 * @param {Document} xmlDoc - XML Document to stringify.
 * @param {Object} [options]
 * @param {boolean} [options.removeHtmlAndBodyTags] - Remove {@code <html><body>[content]</body></html>} tags automatically injected by JS API.
 * @returns {string} - Stringified XML document.
 */
export function xmlToString(xmlDoc, {
    removeHtmlAndBodyTags = true,
} = {}) {
    let xmlString = new XMLSerializer().serializeToString(xmlDoc)
        .replace(/xmlns=""( )?/g, '')  /* Remove superfluous empty namespace attributes */
        .replace(/(?<=[/?]>)(?=<\w+ )/g, '\n    ');  /* Add newlines and indentation between elements */

    if (removeHtmlAndBodyTags) {
        /* Remove HTML-specific tags since this is XML */
        xmlString = xmlString.replace(/<\/?(html|body)[^>]*>/g, '');
    }

    return xmlString;
}


/**
 * Converts an extension of `ArrayBuffer` (e.g. `Uint8Array`) to a hexadecimal string representation.
 *
 * @example <caption>Get the UTF-8 string of an emoji</caption>
 * const emoji = new TextEncoder().encode('some emoji');
 * byteArrayToHexString(emoji);
 * // Output: 'AABBCC'
 *
 * @example <caption>Add spaces between hex entries for easy reading</caption>
 * byteArrayToHexString(myData, { hexDelimiter: ' ' });
 * // Output: 'AA BB CC'
 *
 * @example <caption>Prepend hex entries with your preferred </caption>
 * byteArrayToHexString(myData, { hexPrefix: '0x', hexDelimiter: ' ' });
 * // Output: '0xAA 0xBB 0xCC'
 *
 * @param {ArrayBufferLike} uint8Array - Buffer to convert to a hex string.
 * @param {Object} [options]
 * @param {string} [options.hexPrefix] - Prefix to add to each hex entry (e.g. `0x`, `%00`, etc.).
 * @param {string} [options.hexDelimiter] - Delimiter to use when joining all hex entries as a string (is not prepended to the first hex entry).
 * @param {boolean} [options.asArray] - Return an array of hex strings instead of one joined string.
 * @returns {string} - The hex representation of the buffer.
 *
 * @see [StackOverflow post about encoding emojis/symbols to UTF-8 strings]{@link https://stackoverflow.com/questions/48419167/how-to-convert-one-emoji-character-to-unicode-codepoint-number-in-javascript}
 * @see [StackOverflow post about decoding UTF-8]{@link https://stackoverflow.com/questions/13356493/decode-utf-8-with-javascript}
 */
export function byteArrayToHexString(uint8Array, {
    hexPrefix = '',
    hexDelimiter = '',
    asArray = false,
} = {}) {
    // TODO Support types of ArrayBuffers other than Uint8Array
    // Convert buffer to bytes via spread - Yes, this needs to be cast to an array even though it has its own `.map()` function.
    // Then, convert bytes to readable hex string.
    const hexStrings = [ ...uint8Array ].map(byte => byte.toString(16).padStart(2, '0'));
    const hexStringsWithPrefixes = hexStrings.map(hexString => `${hexPrefix}${hexString}`);

    if (asArray) {
        return hexStringsWithPrefixes;
    }

    return hexStringsWithPrefixes.join(hexDelimiter);
}


/**
 * Converts a string of hexadecimal characters to a `Uint8Array` byte array.
 *
 * Every 2 characters is considered 1 array entry.
 *
 * @example <caption>Convert a hex string created from `byteArrayToHexString()` back to a Uint8Array</caption
 * const emoji = new TextEncoder().encode('some emoji');
 * const emojiHexString = byteArrayToHexString(emoji); // e.g. 'AABBCC'
 * const utf8Array = hexStringToByteArray(emojiHexString); // Uint8Array
 * new TextDecoder().decode(utf8Array);
 * // Output: Original 'some emoji' text
 *
 *
 * @param {string} hexString - String of hexadecimal characters to convert to a byte array.
 * @returns {Uint8Array} - Byte array containing the values in the specified hexadecimal string.
 *
 * @see [Hex to byte array StackOverflow post]{@link https://stackoverflow.com/questions/14603205/how-to-convert-hex-string-into-a-bytes-array-and-a-bytes-array-in-the-hex-strin/69980864#69980864}
 */
export function hexStringToByteArray(hexString) {
    if (hexString.length % 2 !== 0) {
        throw 'Must have an even number of hex digits to convert to bytes';
    }

    const numBytes = hexString.length / 2;

    const byteArray = Array.from({ length: numBytes }).reduce((uint8Array, byte, i) => {
        const bytesStr = hexString.substr(i * 2, 2);

        uint8Array[i] = parseInt(bytesStr, 16);

        return uint8Array;
    }, new Uint8Array(numBytes));

    return byteArray;
}


/**
 * Masks the first `numChars` characters of a string with the desired `maskChar` character.
 *
 * If no `maskChar` is an empty string, then this will just remove those characters from the string.
 *
 * @example <caption>Mask the beginning digits of a credit card</caption>
 * maskBeginningChars(creditCardNumber, 4, { maskChar: '*' });
 * // Output: '************1234'
 *
 * @param {(string|any)} str - String whose characters will be masked; non-strings will be cast to a string.
 * @param {number} numChars - Number of characters to mask.
 * @param {Object} [options]
 * @param {string} [options.maskChar] - Character with which to mask the string.
 * @return {string} - The masked string.
 *
 * @see [`padStart()` MDN docs]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart}
 */
export function maskBeginningChars(str, numChars, {
    maskChar = '',
} = {}) {
    str = `${str}`;

    const numEndingChars = -1 * Number(numChars); // For slicing backwards to get the end characters
    const endingChars = str.slice(numEndingChars);

    return endingChars.padStart(str.length, maskChar);
}


/**
 * Converts hyphen-case and snake_case to camelCase.
 *
 * @param {string} str - Hyphen/snake-case string to convert to camelCase.
 * @param {Object} [options]
 * @param {boolean} [options.pascalCase] - Uppercase the first letter to make it PascalCase instead of camelCase.
 * @returns {string} - camelCase version of the passed string.
 *
 * @see [String.replace(regex, func)]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_function_as_a_parameter}
 */
export function hyphenOrSnakeCaseToCamelCase(str, {
    pascalCase = false,
} = {}) {
    const camelCaseStr = str.replace(/[-_]+([^-_])/g, (fullStrMatch, matchGroup) => {
        // One match group: The letter after a hyphen/underscore.
        // Uppercase it and discard the hyphen/underscore.
        return matchGroup.toUpperCase();
    });

    if (pascalCase) {
        return capitalizeFirstLetters(camelCaseStr);
    }

    return camelCaseStr;
}


/**
 * Converts string from camelCase to hyphen-case or snake_case.
 *
 * @param {string} str - camelCase string to convert.
 * @param {Object} [options]
 * @param {boolean} [options.snakeCase] - Convert to snake_case instead of hyphen-case.
 * @returns {string} - Converted string.
 */
export function camelCaseToHyphenOrSnakeCase(str, {
    snakeCase = false,
} = {}) {
    return str.replace(/(?<=[a-z])([A-Z])/g, matchGroup => {
        return (snakeCase ? '_' : '-') + matchGroup.toLowerCase();
    });
}


/**
 * Capitalizes the first `numChars` characters of a string.
 *
 * @param {string} str - String to capitalize.
 * @param {Object} [options]
 * @param {number} [options.numChars] - Number of characters to capitalize.
 * @returns {string} - The string with the desired number of characters capitalized.
 */
export function capitalizeFirstLetters(str, {
    numChars = 1,
} = {}) {
    return str.replace(new RegExp(`^(.{0,${numChars}})`), (fullStrMatch, matchGroup) => {
        // One match group: The first `numChars` of the string.
        return matchGroup.toUpperCase();
    });
}


/**
 * Replaces the specified match group with the desired string.
 *
 * @example <caption>Change TypeScript file extensions to JavaScript</caption>
 * replaceStringsContent(
 *     [ 'a.ts', 'b.ts.ext', 'c.tsx', 'd.tsx.ext' ],
 *     /\.(t)s(?:$|x?|\.)/,
 *     'j',
 * )
 * // Results in a string array of the form `(.*).js(x)?(.ext)?`
 * // [ 'a.js', 'b.js.ext', 'c.jsx', 'd.jsx.ext' ]
 *
 * @param {(string|string[])} stringsToModify - Strings in which to execute the replacement.
 * @param {Parameters<string['replace']>[0]} toReplaceMatcher - Regex with match group to replace.
 * @param {Parameters<string['replace']>[1]} replacement - Text with which the match group should be replaced.
 * @returns {*}
 */
export function replaceStringsContent(stringsToModify, toReplaceMatcher, replacement) {
    const modifyString = str => str.replace(toReplaceMatcher, (fullMatch, matchGroupToReplace, matchGroupNumber, fullStr) =>
        fullMatch.replace(matchGroupToReplace, replacement),
    );

    if (typeof stringsToModify === typeof '') {
        return modifyString(stringsToModify);
    }

    return stringsToModify.map(modifyString);
}


/*
 * Useful description of RegExp flags: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#advanced_searching_with_flags
 * d - Generate indices for substring matches. (RegExp.prototype.hasIndices)
 * m - Multi-line search. (RegExp.prototype.multiline)
 * s - Allows . to match newline characters. (RegExp.prototype.dotAll)
 * g - Global search. (RegExp.prototype.global)
 * i - Case-insensitive search. (RegExp.prototype.ignoreCase)
 * u - "unicode"; treat a pattern as a sequence of unicode code points. (RegExp.prototype.unicode)
 * y - Perform a "sticky" search that matches starting at the current position in the target string. See [sticky]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky}.
 */

/**
 * Extracts all quoted strings nested within a single string.
 *
 * @param {string} str - String from which to extract quoted string content.
 * @returns {string[]} - All quoted strings.
 */
export function extractQuotedStrings(str) {
    /**
     * (quote)
     * (non-capturing group since we don't care about the inner content without the outer strings
     *   either:
     *     anything that is not a quote nor a backslash - NOTE cannot use capture groups in [] or [^]
     *     anything after a backslash (including quotes b/c escaping them keeps them in the string)
     *     any number of newlines (since strings can span multiple lines)
     * ) - any number of repetitions (allows empty and filled strings)
     * the same quote that began the string
     *
     * @type {RegExp}
     */
    const quotedStringRegex = /(['"])(?:(?!\1|\\).|\\.|\n*)*\1/g; // change \1 to \2 if nesting this whole regex inside another group of parentheses

    return str.match(quotedStringRegex);
}


/**
 * Gets all the letters of the english alphabet.
 *
 * @param [options]
 * @param {boolean} [options.lowercase=true] - If lowercase letters should be included.
 * @param {boolean} [options.uppercase=true] - If uppercase letters should be included.
 * @returns {string[]}
 */
export function getEnglishAlphabet({
    lowercase = true,
    uppercase = true,
} = {}) {
    const getUpperOrLowerCaseAlphabetFromA = startCharCode => Array.from({ length: 26 })
        .map((nul, index) => index + startCharCode)
        .map(charCode => String.fromCharCode(charCode));
    const alphabetLowercase = getUpperOrLowerCaseAlphabetFromA('a'.charCodeAt(0));
    const alphabetUppercase = getUpperOrLowerCaseAlphabetFromA('A'.charCodeAt(0));

    if (lowercase && uppercase) {
        return [ ...alphabetLowercase, ...alphabetUppercase ];
    }

    if (lowercase) {
        return alphabetLowercase;
    }

    if (uppercase) {
        return alphabetUppercase;
    }
}
