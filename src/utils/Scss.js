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


/**
 * Gets a CSS rule or variable as a {@link CSSRule} rather than just a string.
 *
 * CSS variables (e.g. `:root { --my-var: 5px }`) can sometimes be obtained through normal means,
 * i.e. `getComputedStyle().getPropertyValue()` or `element.style.getPropertyValue()` or `element.style[key]`,
 * but it's relatively unreliable.
 *
 * Regardless, this searches through all `document.styleSheets` for the desired rule/variable rather than just one
 * element's rules.
 *
 * @param {(RegExp|string)} cssSelectorOrRuleNameRegex - Rule or variable search query.
 * @returns {(CSSRule|CSSRule[])} - Matching rule or rules.
 *
 * @see [CSSRule docs]{@link https://developer.mozilla.org/en-US/docs/Web/API/CSSRule}
 * @see [CSSKeyframesRule docs]{@link https://developer.mozilla.org/en-US/docs/Web/API/CSSKeyframesRule}
 * @see [SO post 1]{@link https://stackoverflow.com/questions/65258237/get-list-of-keyframes-available-using-javascript}
 * @see [SO post 2]{@link https://stackoverflow.com/questions/18481550/how-to-dynamically-create-keyframe-css-animations}
 */
export function getCssRule(cssSelectorOrRuleNameRegex) {
    const matchingCssRules = Object.values(document.styleSheets)
        .flatMap(styleSheet => Object.values(styleSheet.cssRules)
            .filter(cssRule => (cssRule?.name ?? cssRule?.selectorText)?.match?.(cssSelectorOrRuleNameRegex)),
        );

    if (matchingCssRules?.length === 1) {
        return matchingCssRules[0];
    }

    return matchingCssRules;
}


/**
 * Gets all CSS properties of an element (or root node if none specified).
 * Doesn't include CSS variables since those often have to be accessed by name.
 *
 * Note:
 *  - Use {@link getCssRule()} to get the full rule, not just the key-value string pairs.
 *  - Use either {@link getCssVar()} or {@link getCssRule()} for CSS variables.
 *
 * @param {Node} [element] - The element from which to extract all CSS properties.
 * @returns {Object} - All CSS properties in a more manageable format than the oddly-formatted {@link CSSStyleDeclaration} object.
 */
export function getAllCssProperties(element = document.documentElement) {
    /**
     * Oddly formed object of the shape: Object<number, string>
     * e.g. { 1: 'align-items' }
     * but accessing the CSS property uses a getter to get the actual property
     * e.g. cssStyleDeclaration['display'] // === 'block'
     *
     * Thus it requires iteration over the keys to get the values themselves.
     *
     * @type {CSSStyleDeclaration}
     */
    const cssStyleDeclaration = getComputedStyle(element);

    return Object.entries(cssStyleDeclaration).reduce((cssStyles, [ styleKey, styleEntry ]) => {
        // styleKey == number || camelCaseProperty
        // styleEntry == hyphen-case property (if key == number) || string (if key == camelCaseProperty)
        if (!isNaN(Number(styleKey))) {
            // Use hyphen-case property name if CSSStyleDeclaration key is a number (styleEntry == "real" property name in CSS)
            styleKey = styleEntry;
        }

        const styleValue = cssStyleDeclaration.getPropertyValue(styleKey) || cssStyleDeclaration[styleKey];

        if (styleValue) {
            // Style is definitely defined, so remove excess whitespace that so often appears and set it to the simplified object
            cssStyles[styleKey.trim()] = styleValue.trim();
        }

        return cssStyles;
    }, {});
}


export function getCssVariable(varName, {
    element = document.documentElement,
} = {}) {
    return getComputedStyle(element).getPropertyValue(varName);
}


/**
 * Sets a CSS property on an element (or root element if none specified).
 * Returns the resulting string.
 *
 * @param {string} key - Property key.
 * @param {string} val - Property value.
 * @param {Object} [options]
 * @param {HTMLElement} [options.element] - Element to modify (defaults to the root element).
 * @returns {string} - Resulting property value as told by `element.getPropertyValue()`.
 */
export function setCssProperty(key, val, {
    element = document.documentElement,
} = {}) {
    element.style.setProperty(key, val);

    return getCssVar(key, {
        element,
    });
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
