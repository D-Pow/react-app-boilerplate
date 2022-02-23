import { base64Decode } from '@/utils/Text';

import type {
    Nullable,
    UppercaseOrLowercase,
} from '@/types/utils';


/**
 * Attributes cookies can have.
 *
 * @see [`Set-Cookie` header MDN docs]{@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie}
 */
export interface CookieAttributes {
    /**
     * Cookie key/name.
     */
    name: string;

    /**
     * Cookie value.
     */
    value: string;

    /**
     * Domain(s) where the cookie is available.
     *
     * Defaults to the domain of the page where the cookie was created.
     */
    domain: string;

    /**
     * Path where the cookie is available.
     *
     * Defaults to '/'.
     */
    path: string;

    /**
     * When the cookie will be removed.
     *
     * Numbers are either Unix Epoch timestamps (most common type) or days from time of creation (if using `Max-Age`).
     * Null means it's a session cookie.
     */
    expires: Nullable<number | Date, true>;

    /**
     * If the cookie can only be transmitted by a secure protocol (e.g. HTTPS).
     *
     * Defaults to false.
     */
    secure: boolean;

    /**
     * If a cookie can be sent with cross-origin requests.
     *
     * Helps protect against CSRF attacks.
     *
     * Lax (default) = Cookies aren't sent cross-origin unless navigating there (e.g. via hyperlink).
     * Strict = Cookies aren't sent in any cross-origin domain.
     * None = Cookies are sent in all domains; requires that `Secure` also be set.
     *
     * @see [MDN docs]{@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite}
     */
    sameSite: UppercaseOrLowercase<'Strict' | 'Lax' | 'None'>;

    /**
     * Any other arbitrary cookie fields.
     */
    [property: string]: any;
}

/**
 * `cookieStore` attributes lacking in TypeScript's DOM lib.
 *
 * Available from both `window`/`self` and only in secure contexts (i.e. HTTPS).
 *
 * @see [MDN docs]{@link https://developer.mozilla.org/en-US/docs/Web/API/CookieStore}
 */
export interface CookieStore {
    get(name: string): Promise<Nullable<CookieAttributes, true>>;
    get(options: { name: string, url: string }): Promise<Nullable<CookieAttributes, true>>;

    getAll(name?: string): Promise<Nullable<CookieAttributes[], true>>;
    getAll(options?: { name: string, url: string }): Promise<Nullable<CookieAttributes[], true>>;

    set(name: string, value: string): Promise<Nullable<CookieAttributes[], true>>;
    set(options: Pick<CookieAttributes, 'name' | 'value'> & Omit<Partial<CookieAttributes>, 'secure'>): Promise<Nullable<CookieAttributes[], true>>;

    delete(name: string): Promise<undefined>;
    delete(options: { name: string, url?: string, path?: string }): Promise<undefined>;
}


/**
 * Gets either the value of the specified key or all cookie key-value pairs as an object.
 * Cannot get `HttpOnly` cookies as they are inaccessible to JS.
 *
 * @param [options]
 * @param [options.name] - Specific cookie to extract.
 * @param [options.decodeBase64] - Attempt Base64-decoding cookie values.
 * @param [options.asList] - Return the cookies as a list instead of an object.
 * @param [options.cookie] - Cookie string to parse.
 * @returns Parsed cookie value/name-value entries.
 */
export function getCookie({
    name = '',
    decodeBase64 = true,
    asList = false,
    cookie = globalThis?.document?.cookie,
} = {}): Nullable<
    string
    | Record<string, string>
    | Array<Pick<CookieAttributes, 'name' | 'value'>>
> {
    const cookieObj = cookie?.split('; ').reduce((obj, entry) => {
        const keyVal = entry.split('=');
        const key = decodeURIComponent(keyVal[0]);
        let value = decodeURIComponent(keyVal.slice(1).join('='));

        if (decodeBase64) {
            value = base64Decode(value);
        }

        obj[key] = value;

        return obj;
    }, {} as Record<string, string>);

    return name
        ? cookieObj?.[name]
        : asList
            ? Object.entries(cookieObj).map(([ key, value ]) => ({ name: key, value }))
            : cookieObj;
}


export type GetCookieDetailsParams = {
    /**
     * Specific cookie to extract.
     */
    name?: string;
    /**
     * Attempt Base64-decoding cookie values.
     */
    decodeBase64?: boolean;
    /**
     * Return the cookies as a list instead of an object.
     */
    asList?: boolean;
};
/**
 * Gets all of either the specified cookie's or all cookies' attributes.
 * Cannot get `HttpOnly` cookies as they are inaccessible to JS.
 */
export async function getCookieDetails(): Promise<Nullable<Record<string, CookieAttributes>, true>>;
export async function getCookieDetails(options: { name: string } & GetCookieDetailsParams): Promise<Nullable<CookieAttributes, true>>;
export async function getCookieDetails(options: { asList: true } & GetCookieDetailsParams): Promise<Nullable<CookieAttributes[], true>>;
export async function getCookieDetails(options: GetCookieDetailsParams): Promise<Nullable<Record<string, CookieAttributes>, true>>;
export async function getCookieDetails({
    name,
    decodeBase64 = true,
    asList = false,
}: GetCookieDetailsParams = {}): Promise<Nullable<
    CookieAttributes
    | CookieAttributes[]
    | Record<string, CookieAttributes>
    | ReturnType<typeof getCookie>
>> {
    try {
        const cookieStore = ((self as any)?.cookieStore as CookieStore);

        if (name) {
            const cookieDetails = await cookieStore.get(name);

            if (!cookieDetails) {
                return null;
            }

            if (decodeBase64) {
                cookieDetails.value = base64Decode(cookieDetails.value);
            }

            return cookieDetails;
        }

        const cookieDetailsList = await cookieStore.getAll();

        if (!cookieDetailsList?.length) {
            return null;
        }

        if (decodeBase64) {
            cookieDetailsList.forEach(cookie => {
                cookie.value = base64Decode(cookie.value);
            });
        }

        if (asList) {
            return cookieDetailsList;
        }

        return cookieDetailsList.reduce((obj, cookie) => {
            obj[cookie?.name] = cookie;

            return obj;
        }, {} as Record<string, CookieAttributes>);
    } catch (e: unknown) {
        const error = e as Error;
        console.warn('Could not extract cookie from `cookieStore`! Ensure your browser supports the `CookieStore` interface and is served over HTTPS.', error.message);

        return getCookie({
            name,
            decodeBase64,
            asList,
        });
    }
}
