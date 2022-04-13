import { COLORS } from '@/utils/Constants';
import { asNumber, randomNumber } from '@/utils/Numbers';

import CommonStyles from '@/styles/Common.scss';


const { themeColors, gridBreakpoints } = CommonStyles;


/**
 * Parses an SCSS variable that was exported via `:export` block into the
 * respective JavaScript variable.
 *
 * SCSS exports are always strings, so we have to parse them into the correct
 * type ourselves. Parsing attempts are done in the order:
 *
 * 1. JSON.parse() - Works for everything that isn't a list or object/map.
 *    Will work for lists/maps if they are formatted to JSON strings within the
 *    SCSS file before being exported.
 * 2. Manual string parsing - Manually swap SCSS syntax for JS (e.g. `(|)` with `{|}` for maps).
 * 3. Original string value - Fallback in case the value cannot be parsed by the above attempts.
 *
 * @param {string} scssStr - Variable imported from a .scss file.
 * @returns {*} - The JavaScript representation of the variable.
 */
export function parseScssVar(scssStr) {
    if (!scssStr || (typeof scssStr !== typeof '')) {
        return scssStr;
    }

    // Lists and maps are surrounded by single quotes, e.g. "'[ \"string in list\", 5, \"5px\" ]'"
    // Remove them if they exist so they can be parsed correctly.
    let jsValue = scssStr.replace(/(^['"])|(['"]$)/g, '');

    try {
        // JSON-formatted string from within SCSS file
        return JSON.parse(jsValue);
    } catch (errorParsingJsonGeneratedInUtilScssFile) {
        try {
            // Value was likely an SCSS literal string; attempt parsing it manually.
            // Example: inspect($my-map) => '(num: 10, numWithUnits: 5px, str: hello, color: #fff, "keyAsStr": false, other: null)'
            return JSON.parse(
                scssStr
                    .replace('(', '{')
                    .replace(')', '}')
                    // JSON values: convert any collection of word characters followed by a comma or bracket to a string
                    .replace(/: ?([^,}]+)([,}])/g, ': "$1"$2')
                    // JSON keys: space/bracket/comma as first character, not already a string, anything not colon or
                    // space (rules out JSON values), ended by colon
                    .replace(/([\s{,])(?!")([^:\s]+)+:/g, '$1"$2":'),
            );
        } catch (errorParsingScssStringLiteral) {
            return jsValue;
        }
    }
}


export function getThemeColors() {
    return parseScssVar(themeColors);
}


export function getGridBreakpoints(parsePxStrToNum = true) {
    const mapWithPxInStr = parseScssVar(gridBreakpoints);

    if (parsePxStrToNum) {
        return Object.keys(mapWithPxInStr).reduce((valsAsNum, breakpointName) => {
            valsAsNum[breakpointName] = asNumber(mapWithPxInStr[breakpointName]);

            return valsAsNum;
        }, {});
    }

    return mapWithPxInStr;
}


/**
 * Returns a random color from the `colorList`.
 *
 * Default `colorList` is the ~148 color names supported across all browsers.
 *
 * @param {Object} [options]
 * @param {string[]} [options.colorList] - List from which to select a random color.
 * @param {boolean} [options.appendThemeColors] - Add any colors defined in the global `$theme-colors` SCSS variable to the `colorList`.
 * @param {string | string[]} [options.forbiddenColors] - Specific colors to exclude from the random color selection.
 * @returns {string} - A random color in the `colorList` (with/out theme colors) that isn't in the `forbiddenColors` list.
 *
 * @see [W3Schools color names, hex, color-mixer, and color-picker]{@link https://www.w3schools.com/colors/colors_names.asp}
 */
export function getRandomColor({
    colorList = Object.keys(COLORS),
    appendThemeColors = true,
    forbiddenColors = [],
} = {}) {
    if (typeof (forbiddenColors) === 'string') {
        forbiddenColors = [ forbiddenColors ];
    }

    const forbiddenColorsSet = new Set(forbiddenColors);

    const themeColorsObj = getThemeColors(); // e.g. { primary: '#ffffff', secondary: 'rgba(120, 200, 100, 0.75)' }
    const colorsObj = {
        ...themeColorsObj,
        ...COLORS,
    };
    const colorNames = Object.keys(colorsObj);
    const validColorNames = appendThemeColors ? colorList.concat(colorNames) : colorList;

    let chosenColor;

    do {
        chosenColor = validColorNames[Math.floor(randomNumber(validColorNames.length))];
    } while (
        forbiddenColorsSet.has(chosenColor) // Color names (from the `forbiddenColors` list)
        || forbiddenColorsSet.has(colorsObj[chosenColor]) // Color hex/rgb(a) values (from `themeColors`, `COLORS`, etc.)
    );

    // If chosenColor is a theme color, the returned value needs to be a valid CSS value (hex, rgb[a], etc.) so that it
    // can be used in any CSS field's value.
    // e.g. Return '#FFFFFF' instead of 'primary'.
    if (chosenColor in themeColorsObj) {
        chosenColor = themeColorsObj[chosenColor];
    }

    return chosenColor;
}
