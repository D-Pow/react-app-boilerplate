import { MOBILE_BROWSER_REGEX, MOBILE_OR_TABLET_REGEX } from '@/utils/Constants';
import { getGridBreakpoints } from '@/utils/Scss';


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
    const isMobileBrowser = regex.test(navigator.userAgent || navigator.vendor || self.opera);

    if (onlyXsScreenSizes) {
        const screenIsSmallerThanSmBreakpoint = self.innerWidth < getGridBreakpoints().sm;

        return isMobileBrowser && screenIsSmallerThanSmBreakpoint;
    }

    return isMobileBrowser;
}


export function isSafariBrowser() {
    return self.safari != null || navigator.vendor.toLocaleLowerCase().includes('apple');
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
        'msie',     // IE < 11
    ];

    if (includeEdge) {
        userAgents.push('edge');
    }

    const browserRegex = `(${userAgents.join('|')})`;

    return Boolean(navigator.userAgent.toLowerCase().match(new RegExp(browserRegex, 'i')));
}


export function isChromeBrowser() {
    return Boolean(self.chrome);
}


export function isFirefoxBrowser() {
    return navigator.userAgent.toLowerCase().includes('firefox');
}


/**
 * Determines if a PWA is running from "installed" mode instead of from the browser.
 *
 * @returns {boolean} - If the website is running from PWA "installed" mode.
 */
export function isInStandaloneMode() {
    return !!self?.matchMedia?.('(display-mode: standalone)')?.matches;
}


/**
 * Gets the user's preferred language.
 *
 * Attempts to read from the browser's chosen language, falling back to the installed browser language,
 * OS' chosen language, and OS' default language.
 *
 * @returns {string}
 *
 * @see [`navigator.language`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language}
 * @see [`navigator.languages`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/languages}
 * @see [StackOverflow post]{@link https://stackoverflow.com/questions/673905/how-to-determine-users-locale-within-browser}
 */
export function getLanguage() {
    const { navigator } = self;

    return (
        (self.Intl && new Intl.DateTimeFormat()).resolvedOptions?.()?.locale // (en-US) Most accurate b/c it accounts for the user's chosen language, not just the browser's or OS' default one. See SO answer: /57529410#57529410
        || navigator.language // (en-US) - Most widely supported (in all semi-modern browsers) and still descriptive. See SO answers: /673938#5771107, /674570#5771107
        || navigator.languages?.[0] // ([ en-US, en ]) - Holds all installed browser languages in decreasing order of priority (languages[0] == language == Intl.locale).
        || navigator.userLanguage // Browser's selected language; older version of `languages[0]`
        || navigator.browserLanguage // Browser's selected language; even older version of `languages[0]`
        || navigator.systemLanguage // OS default language
        || 'en' // Final fallback
    );
}
