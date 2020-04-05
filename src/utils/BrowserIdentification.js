import { MOBILE_BROWSER_REGEX, MOBILE_OR_TABLET_REGEX } from 'utils/Constants';
import { getGridBreakpoints } from 'utils/Scss';

/**
 * Determines if the host browser is a mobile device.
 * Optionally, include the following in the check:
 * 1) Tablets
 * 2) If the browser is on a mobile device _and_ the screen is smaller than
 *    Bootstrap's small screen breakpoint. This handles the case where the
 *    browser is a mobile browser but it's set in landscape mode: if `true`,
 *    then will only return `true` if both mobile device and small screen, whereas
 *    if `false`, then will return `true` regardless of screen size.
 *
 * @param {Object} includeOptions - Optional toggling of factors to include
 * @param {boolean} [includeOptions.includeTablets=false] - If tablets should be included in the check
 * @param {boolean} [includeOptions.onlyXsScreenSizes=false] - If screen widths greater than Bootstrap's `sm` should be excluded
 * @returns {boolean} - If the mobile browser is on a mobile device after applying the chosen options
 */
export function isMobileBrowser({ includeTablets = false, onlyXsScreenSizes = false } = {}) {
    const regex = includeTablets ? MOBILE_OR_TABLET_REGEX : MOBILE_BROWSER_REGEX;
    const isMobileBrowser = regex.test(navigator.userAgent || navigator.vendor || window.opera);

    if (onlyXsScreenSizes) {
        const screenIsSmallerThanSmBreakpoint = window.innerWidth < getGridBreakpoints().sm;

        return isMobileBrowser && screenIsSmallerThanSmBreakpoint;
    }

    return isMobileBrowser;
}

export function isSafariBrowser() {
    return window.safari != null || navigator.vendor.toLocaleLowerCase().includes('apple');
}

/**
 * Determines if the browser is made from Microsoft. Automatically includes IE but selectively includes Edge.
 *
 * @param {boolean} includeEdge - If Edge should be included in the calculation
 * @returns {boolean} - If the browser is IE (or optionally Edge)
 */
export function isMicrosoftBrowser(includeEdge = true) {
    const userAgents = [
        'trident',  // IE 11
        'msie'      // IE < 11
    ];

    if (includeEdge) {
        userAgents.push('edge');
    }

    const browserRegex = `(${userAgents.join('|')})`;

    return Boolean(navigator.userAgent.toLowerCase().match(new RegExp(browserRegex)));
}
