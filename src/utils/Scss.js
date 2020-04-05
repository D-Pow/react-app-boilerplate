import { asNumber } from 'utils/Numbers';
import { themeColors, gridBreakpoints } from 'styles/Common.scss';

/**
 * Parses a map into a JS object. Every value for any key will be a string
 *
 * @param {string} scssMapStr - String imported from a .scss file
 * @returns {Object} - The parsed SCSS object
 */
export function parseScssMap(scssMapStr) {
    return JSON.parse(
        scssMapStr
            .replace('(', '{')
            .replace(')', '}')
            // JSON values: convert any collection of word characters followed by a comma or bracket to a string
            .replace(/: ?([^,}]+)([,}])/g, ': "$1"$2')
            // JSON keys: space/bracket/comma as first character, not already a string, anything not colon or
            // space (rules out JSON values), ended by colon
            .replace(/([\s{,])(?!")([^:\s]+)+:/g, '$1"$2":')
    );
}

export function getThemeColors() {
    return parseScssMap(themeColors);
}

export function getGridBreakpoints(parsePxStrToNum = true) {
    const mapWithPxInStr = parseScssMap(gridBreakpoints);

    if (parsePxStrToNum) {
        return Object.keys(mapWithPxInStr).reduce((valsAsNum, breakpointName) => {
            valsAsNum[breakpointName] = asNumber(mapWithPxInStr[breakpointName]);

            return valsAsNum;
        }, {});
    }

    return mapWithPxInStr;
}
