import { fetchAsBase64 } from '@/utils/Network';
import { MimeTypes } from '@/utils/Constants';
import { getMimeTypeFromDataUrl } from '@/utils/Text';

import type {
    Nullable,
    Optional,
} from '@/types';


/**
 * Asynchronously imports the specified binary asset from the 'assets/' folder.
 * Could be images, PDFs, videos, etc.
 *
 * Optionally returns the resolved asset data encoded with Base64.
 * Since this uses dynamic imports, results are cached, so multiple calls
 * for the same asset don't need to be memoized.
 *
 * @param assetRelPath - Relative path to the asset file under 'assets/'.
 * @param [base64=false] - Return Base64-encoded data instead of the `src` url.
 * @returns Path of the asset (base64=false) or Base64-encoded asset data (base64=true)
 */
export async function importAssetAsync(assetRelPath: string, base64 = false): Promise<string> {
    if (assetRelPath != null && assetRelPath !== '') {
        const pathIsFromAssetsDirRegex = new RegExp(`^${location.origin}/.*/?${process.env.PUBLIC_URL}/assets/`, 'i');

        if (pathIsFromAssetsDirRegex) {
            assetRelPath = assetRelPath.replace(pathIsFromAssetsDirRegex, '');
        }

        try {
            // Alternative: // const module = await import(/* webpackMode: 'lazy-once' */ `@/assets/${assetRelPath}`);
            // See:
            // - https://stackoverflow.com/questions/49121053/how-to-use-a-webpack-dynamic-import-with-a-variable-query-string/65298694#65298694
            // - https://webpack.js.org/api/module-methods/#magic-comments
            // - https://stackoverflow.com/questions/42908116/webpack-critical-dependency-the-request-of-a-dependency-is-an-expression
            // - Actual solution: https://webpack.js.org/plugins/context-replacement-plugin/
            const module = await import(`@/assets/${assetRelPath}`);
            const assetSrc: string = module.default;

            if (base64) {
                // `FileReader.result` is typed `string | ArrayBuffer | null`, but `readAsDataURL()`
                // (which `fetchAsBase64()` uses) always resolves to a string
                return await fetchAsBase64(assetSrc) as string;
            }

            return assetSrc;
        } catch (error) {
            const assetRelPathWithoutHash = assetRelPath.replace(/[.-]\w+(\.\w+)$/, '$1');

            if (assetRelPathWithoutHash !== assetRelPath) {
                // Attempt removing hashes injected to filenames since they only work with direct URL references but not imports.
                // Only attempt if the hash was found to prevent infinite loops.
                return await importAssetAsync(assetRelPathWithoutHash, base64);
            }

            // Default return below handles error case
        }
    }

    throw new Error(`${assetRelPath} was not found`);
}


/**
 * Any function that can be wrapped by {@link debounce}/{@link throttle}.
 */
export type AnyFunction<Args extends unknown[] = never[], Return = unknown> = (...args: Args) => Return;

/**
 * A {@link debounce}d/{@link throttle}d function; returns the wrapped function's value
 * only on the calls that actually invoke it.
 */
export type RateLimitedFunction<Args extends unknown[], Return> = (...args: Args) => Optional<Return>;

export interface DebounceOptions {
    /**
     * Allow `func` to be called on first debounced function call.
     */
    callOnFirstFuncCall?: boolean;
    /**
     * Binds the value of `this` to the specified value.
     */
    bindThis?: unknown;
}

/**
 * Higher-order function that restricts `func` calls to only fire once per `delay` milliseconds.
 * Optionally, bind the value of `this` to its value when `debounce()` is called.
 * Optionally, call `func` when its first called instead of waiting `delay` milliseconds before its first call;
 * will still debounce subsequent calls.
 *
 * @param func - Function to debounce
 * @param delay - Milliseconds to wait before calling `func`
 * @param [options] - Options for debounced function
 * @returns The debounced function.
 */
export function debounce<Args extends unknown[], Return>(
    func: AnyFunction<Args, Return>,
    delay: number,
    { callOnFirstFuncCall = false, bindThis }: DebounceOptions = {},
): RateLimitedFunction<Args, Return> {
    let timeout: Nullable<ReturnType<typeof setTimeout>>;
    let self: unknown;

    if (bindThis) {
        self = bindThis;
    }

    return (...args) => {
        if (!bindThis) {
            // Needs current reference to `this` for future calls
            // @ts-ignore - `this` will be the context this returned function is called in unless `bindThis = true`
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            self = this;
        }

        // timeout == null only when the func is called (either first call or when setTimeout fires)
        // so this is false on subsequent calls
        const isFirstCall = callOnFirstFuncCall && timeout == null;

        // `?? undefined` only normalizes the type; `clearTimeout()` no-ops on both `null` and `undefined`
        clearTimeout(timeout ?? undefined);

        timeout = setTimeout(() => {
            timeout = null;

            if (!isFirstCall) { // don't call func again if it was called on first run, only on subsequent runs
                return func.call(self, ...args);
            }
        }, delay);

        if (isFirstCall) {
            return func.call(self, ...args);
        }
    };
}


export interface ThrottleOptions {
    /**
     * Binds the value of `this` to the specified value.
     */
    bindThis?: unknown;
}

/**
 * Throttles a function to only be called once per time limit.
 *
 * @param func - Function to throttle.
 * @param timeLimit - Milliseconds to wait before allowing `func` to be called again.
 * @param [options]
 * @returns Decorated, throttled function.
 */
export function throttle<Args extends unknown[], Return>(
    func: AnyFunction<Args, Return>,
    timeLimit: number,
    { bindThis }: ThrottleOptions = {},
): RateLimitedFunction<Args, Return> {
    let wasCalled = false;
    let self: unknown;

    if (bindThis) {
        self = bindThis;
    }

    return (...args) => {
        if (!wasCalled) {
            wasCalled = true;

            if (!bindThis) {
                // Needs current reference to `this` for future calls
                // @ts-ignore - `this` will be the context this returned function is called in unless `bindThis = true`
                // eslint-disable-next-line @typescript-eslint/no-this-alias
                self = this;
            }

            const retVal = func.call(self, ...args);

            setTimeout(() => {
                wasCalled = false;
            }, timeLimit);

            return retVal;
        }
    };
}


/**
 * A single entry in a click path: an element, or the `document`/`window` roots appended to its end.
 */
export type ClickPathElement = HTMLElement | Document | Window;

/**
 * Path from a clicked element to the root, including `document` and `window`/`self`.
 */
export type ClickPath = ClickPathElement[];

/**
 * Gets the path from the clicked element to the root.
 *
 * @param [event] - Click Event, or an already-generated click path.
 * @returns Path from clicked element to the root, including `document` and `window`/`self`
 */
export function getClickPath(event?: Nullable<MouseEvent | ClickPath>): ClickPath {
    if (!event || (Array.isArray(event) && event.length === 0)) {
        return [];
    }

    /*
     * `Event.path` is a non-standard, Chromium-only alias of the standard `Event.composedPath()`.
     * It's absent from the DOM typedefs, and from arrays passed in place of an event, so read it defensively.
     */
    const { path, target } = event as Partial<{ path: ClickPath; target: Nullable<HTMLElement> }>;

    if (path) {
        return path;
    }

    // support for browsers without clickEvent.path
    const clickPath: ClickPath = [];
    let element = target;

    while (element) {
        clickPath.push(element);
        element = element.parentElement;
    }

    clickPath.push(document, self);

    return clickPath;
}


/**
 * HTML element properties object used in searching for an element.
 */
export interface ElementProps {
    /**
     * Attribute of HTML element to compare the value to.
     */
    attribute: string;
    /**
     * Value of the desired HTML element to search for.
     */
    value: string;
}

/**
 * Determines if a click-path generated by an onClick event contains a given element.
 *
 * @param elementProps - Attribute/value of the HTML element to search for
 * @param clickPath - onClick event's `path` value
 * @returns If the element described by `attribute` and `value` exists in the click-path
 */
export function elementIsInClickPath({ attribute, value }: ElementProps, clickPath: ClickPath): boolean {
    let elementIsInPath = false;

    for (const element of clickPath) {
        if (element instanceof HTMLElement) {
            const elemAttr = element.getAttribute(attribute);

            if (elemAttr && elemAttr.includes(value)) {
                elementIsInPath = true;
                break;
            }
        }
    }

    return elementIsInPath;
}


/**
 * An element's position and size.
 */
export interface ElementDimensions {
    x: number;
    width: number;
    y: number;
    height: number;
}

/**
 * The "real" file dimensions of elements supporting `natural(Width|Height)` (e.g. `<img/>`).
 */
export interface ElementIntrinsicDimensions {
    width: number;
    height: number;
}

/**
 * Both the displayed and actual dimensions of an element, plus its intrinsic
 * dimensions if the element supports them.
 */
export interface AllElementDimensions {
    displayed: ElementDimensions;
    actual: ElementDimensions;
    intrinsic?: ElementIntrinsicDimensions;
}

export interface GetElementDimensionsOptions {
    /**
     * Include the displayed dimensions of the element.
     */
    displayed?: boolean;
    /**
     * Include the actual dimensions of the element.
     */
    actual?: boolean;
    /**
     * Make inline elements with children larger than they are take the size of the children
     * (e.g. make anchors with images as children take the size of the image, `<a><img></a>`).
     */
    ensureElementSizeIncludesSizeOfChildren?: boolean;
}

/**
 * Gets an element's dimensions, either as displayed (e.g. what's shown with `overflow: hidden`) or the
 * true/actual dimensions (e.g. what's shown + not shown with `overflow: hidden`).
 *
 * Will attempt to add intrinsic (i.e. "real" file dimensions) of elements that support `natural(Width|Height)`,
 * namely `<img/>` elements and some others.
 *
 * @param element - Element for which dimensions should be obtained.
 * @param [options]
 * @returns The dimensions of the element (either displayed/actual or both).
 */
export function getElementDimensions(element: HTMLElement, {
    displayed = true,
    actual = true,
    ensureElementSizeIncludesSizeOfChildren = true,
}: GetElementDimensionsOptions = {}): AllElementDimensions | ElementDimensions {
    const cssStyles = getComputedStyle(element);
    const origDisplay = element.style.display;
    const actualDisplay = cssStyles.display;
    const elementDoesntAccuratelyReflectSizeOfChildren = actualDisplay === 'inline';
    const hackStylesToGetTrueSize = elementDoesntAccuratelyReflectSizeOfChildren && ensureElementSizeIncludesSizeOfChildren;

    if (hackStylesToGetTrueSize) {
        /*
         * `display: inline` doesn't make the element take the full width/height
         * of its children, so the max width/height calculations will be thrown off
         * by this.
         * To fix it, it must be anything other than inline (flex, block, etc.) but in
         * an attempt to make the forced-altered style as accurate as possible to the
         * original, make it `inline-block`
         */
        element.style.display = 'inline-block';
    }

    /*
     * `window.page_Offset` is how many pixels the current viewport is from (0,0),
     * i.e. how much the user has scrolled down/right.
     *
     * `element.getBoundingClientRect()` gets the pixels of each of its 4 corners (top-left, bottom-right, etc.)
     * as well as its width and height, but only for what is displayed/visible, not including overflow/scroll content.
     */
    const { x, y, width, height } = element.getBoundingClientRect();
    const absoluteXCoordinateOnPage = window.pageXOffset + x;
    const absoluteYCoordinateOnPage = window.pageYOffset + y;

    /*
     * "Real" dimensions of the element if supported (e.g. native dimensions of an image).
     *
     * `natural(Width|Height)` only exist on a few element types (e.g. `<img/>`), not on `HTMLElement`
     * as a whole, so read them off an optional-property view of the element.
     */
    const {
        naturalWidth: intrinsicWidth,
        naturalHeight: intrinsicHeight,
    } = element as HTMLElement & Partial<HTMLImageElement>;

    /*
     * "Real" width/height, including all content not visible due to overflow
     * and/or the max size allowed by the browser window viewport.
     *
     * Offset includes all the currently visible content, including scrollbars.
     * Scroll includes size of content not visible due to overflow (i.e. when you have to scroll inside the element to see all of it).
     *
     * If element content < screen size, then scroll > offset.
     * See: https://stackoverflow.com/questions/22675126/what-is-offsetheight-clientheight-scrollheight/22675563#22675563
     *
     * Add in display width/height as safety check for inline elements that have block children; if the `display: inline`
     * style is maintained, then both scroll/offset width/height will be 0.
     */
    const maxWidth = Math.max(element.scrollWidth, element.offsetWidth, width);
    const maxHeight = Math.max(element.scrollHeight, element.offsetHeight, height);

    if (hackStylesToGetTrueSize) {
        // Return element's display to its original value
        element.style.display = origDisplay;
    }

    const elementDimensions: AllElementDimensions = {
        actual: {
            x: absoluteXCoordinateOnPage,
            y: absoluteYCoordinateOnPage,
            width: maxWidth,
            height: maxHeight,
        },
        displayed: {
            x,
            y,
            width,
            height,
        },
    };

    if (intrinsicHeight && intrinsicWidth) {
        elementDimensions.intrinsic = {
            width: intrinsicWidth,
            height: intrinsicHeight,
        };
    }

    if (!actual && displayed) {
        return elementDimensions.displayed;
    }

    if (!displayed && actual) {
        return elementDimensions.actual;
    }

    return elementDimensions;
}


export interface IsElementVisibleOptions {
    /**
     * If the visibility check should be `false` when the element is obscured from the view by another one.
     */
    includeBehindOtherElements?: boolean;
}

/**
 * Determines whether or not an element is visible.
 *
 * The check is incomplete in that there are many things that could hide an element.
 * This only checks:
 * - If the `visibility` CSS property is not `hidden`.
 * - If the `display` CSS property is not `none`.
 * - If the `opacity` CSS property is not `0`.
 *
 * Optionally, and by default, also checks if the element is hidden behind another element,
 * e.g. a modal or underneath a nav-bar.
 *
 * @param element - Element to check.
 * @param [options]
 *
 * @see [Determining if an element is behind another]{@link https://stackoverflow.com/questions/49751396/determine-if-element-is-behind-another/49833666#49833666}
 */
export function isElementVisible(element: HTMLElement, {
    includeBehindOtherElements = true,
}: IsElementVisibleOptions = {}): boolean {
    function isElementVisibleByStyles(element: HTMLElement) {
        const styles = window.getComputedStyle(element);

        return (
            styles.visibility !== 'hidden'
            && styles.display !== 'none'
            && styles.opacity !== '0'
        );
    }

    function isBehindOtherElement(element: HTMLElement) {
        // We can use `getBoundingClientRect()` directly since `elementFromPoint()`
        // returns null if not in the viewport
        const boundingRect = element.getBoundingClientRect();

        /*
         * Shrink coordinates to represent the inside of the element.
         * Otherwise, it's possible the element is hidden but its
         * border aligns with the element covering it, resulting in
         * a false positive.
         *
         * Note: `DOMRect`'s `left`/`right`/`top`/`bottom` are read-only getters, so the
         * shrunken values are held in local variables rather than mutating the rect in place.
         */
        const left = boundingRect.left + 1;
        const right = boundingRect.right - 1;
        const top = boundingRect.top + 1;
        const bottom = boundingRect.bottom - 1;

        return (
            document.elementFromPoint(left, top) !== element
            && document.elementFromPoint(right, top) !== element
            && document.elementFromPoint(left, bottom) !== element
            && document.elementFromPoint(right, bottom) !== element
        );
    }

    const elementIsStyledVisibly = isElementVisibleByStyles(element);
    const elementIsVisibleOnScreen = includeBehindOtherElements
        ? !isBehindOtherElement(element)
        : true;

    return elementIsStyledVisibly && elementIsVisibleOnScreen;
}


/**
 * Resets the window scroll location to the top of the screen
 */
export function scrollWindowToTop(): void {
    // scrollTo() is supported on all browsers
    self.scrollTo(0, 0);
}


/**
 * Sets the scrolling ability of the whole `document.body`.
 * Useful for controlling the app's ability to scroll from any
 * component.
 *
 * Since `document.body` is outside of the control of React,
 * set the style manually. Default value is ''.
 *
 * @param allowScrolling
 */
export function setDocumentScrolling(allowScrolling = true): void {
    document.body.style.overflow = allowScrolling ? 'auto' : 'hidden';
}


/**
 * `Navigator` including the non-standard, IE/Edge-only blob-saving API, which is
 * absent from the standard DOM typedefs.
 *
 * @see [`msSaveOrOpenBlob` MDN docs]{@link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/msSaveOrOpenBlob}
 */
interface NavigatorWithMsSaveOrOpenBlob extends Navigator {
    msSaveOrOpenBlob?: (blob: Blob | string, defaultName?: string) => boolean;
}

export interface DownloadDataAsFileOptions {
    /**
     * Filename for the download.
     */
    fileName?: string;
    /**
     * MIME type of the download content.
     */
    mimeType?: string;
}

/**
 * Downloads the specified data with the desired filename and MIME type.
 *
 * @param data - Data to download.
 * @param [options]
 */
export function downloadDataAsFile(data: string | Blob, {
    fileName = 'download',
    // Returns null for non-string data (e.g. a `Blob`), in which case the default MIME type is used
    mimeType = getMimeTypeFromDataUrl(data as string) || MimeTypes.TEXT,
}: DownloadDataAsFileOptions = {}): void {
    let downloadData = data as string;
    const isBase64Data = (data as string)?.match?.(/^data(:[^;]*);base64/i);

    if (!isBase64Data) {
        const dataBlob = new Blob([ data ], { type: mimeType });
        const dataBlobUrl = URL?.createObjectURL?.(dataBlob);

        downloadData = dataBlobUrl;
    }

    // IE & Edge
    const navigatorWithMsSaveOrOpenBlob = navigator as NavigatorWithMsSaveOrOpenBlob;

    if (self.navigator && navigatorWithMsSaveOrOpenBlob.msSaveOrOpenBlob) {
        // Download prompt allows for saving or opening the file
        // navigator.msSaveBlob(dataBlob, fileName) only downloads it
        navigatorWithMsSaveOrOpenBlob.msSaveOrOpenBlob(downloadData, fileName);

        return;
    }

    const anchor = document.createElement('a');

    anchor.style.display = 'none';
    anchor.download = fileName;
    anchor.href = downloadData;

    document.body.appendChild(anchor); // Required for Firefox
    anchor.click();
    document.body.removeChild(anchor);
}
