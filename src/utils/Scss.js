import { COLORS } from '@/utils/Constants';
import { asNumber, randomNumber } from '@/utils/Numbers';
import { camelCaseToHyphenOrSnakeCase } from '@/utils/Text';

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
    const jsValue = scssStr.replace(/(^['"])|(['"]$)/g, '');

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


/**
 * Gets a vanilla CSS variable or property of the element.
 *
 * Defaults to the root element (`document.documentElement`, i.e. `html`) since most
 * CSS variables are set on that element.
 *
 * @param {string} cssVar - Variable or property to get.
 * @param {Object} [options]
 * @param {HTMLElement} [options.element] - Element from which to get the property.
 * @returns {(string|number)} - The property value (empty string if non-existent).
 */
export function getCssVar(cssVar, {
    element = document.documentElement,
    castNumbers = false,
} = {}) {
    // Must use `getComputedStyle()` instead of `.styles` since the latter doesn't include CSS variables
    const elementStyles = getComputedStyle(element);

    const cssVal = (
        elementStyles.getPropertyValue(cssVar)
        || elementStyles.getPropertyValue(camelCaseToHyphenOrSnakeCase(cssVar))
        || elementStyles.getPropertyValue(`--${cssVar}`)
        || elementStyles.getPropertyValue(`--${camelCaseToHyphenOrSnakeCase(cssVar)}`)
    ).trim(); // Resulting value often has a leading space, so remove it

    if (castNumbers && cssVal) {
        return Number(cssVal.replace(/\D/g, ''));
    }

    return cssVal;
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
 * Gets the animation duration time in milliseconds from the CSS className string
 * containing the `classNamePrefix` followed by the time.
 *
 * `classNamePrefix` should be followed by numbers where the number of digits represents the
 * number of seconds and each decimal place following it, e.g.
 * - `.duration-5` = 5 seconds.
 * - `.duration-56` = 5.6 seconds.
 * - `.duration-567` = 5.67 seconds.
 * - `.duration-5678` = 5.678 seconds.
 * - `.duration-0123` = 0.123 seconds.
 *
 * @param {string} className - CSS className string to search for the animation-duration class.
 * @param {Object} [options]
 * @param {string} [options.classNamePrefix] - Class prefix for animation durations.
 * @returns {number} - The duration time in ms or null if animation duration not found in `className`.
 */
export function getDurationTimeMsFromClassName(className, {
    classNamePrefix = 'duration-',
} = {}) {
    const durationTimeCssClass = new RegExp(`(${classNamePrefix})(\\d+)`);
    const durationTimeMatch = className.match(durationTimeCssClass);

    if (durationTimeMatch) {
        const durationTimeString = durationTimeMatch[2];
        // `.duration-XX` is (XX * 0.1 seconds) so the milliseconds value is XX/10*1000
        return Number(durationTimeString) / Math.pow(10, durationTimeString.length - 1) * 1000;
    }

    return null;
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
