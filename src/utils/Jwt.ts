import { byteArrayToHexString } from '@/utils/Text';

import type {
    Indexable,
} from '@/types';


export function decodeJwt(jwt: string, { header = true, payload = false, signature = false }): string | Indexable;
export function decodeJwt(jwt: string, { header = false, payload = true, signature = false }): string | Indexable;
export function decodeJwt(jwt: string, { header = false, payload = false, signature = true }): string | Indexable;
export function decodeJwt(jwt: string, { header = true, payload = true, signature = false }): Array<string | Indexable>;
export function decodeJwt(jwt: string, { header = true, payload = false, signature = true }): Array<string | Indexable>;
export function decodeJwt(jwt: string, { header = false, payload = true, signature = true }): Array<string | Indexable>;
export function decodeJwt(jwt: string, { header = true, payload = true, signature = true }): Array<string | Indexable>;
/**
 * Decodes a JWT.
 *
 * @param jwt - JWT to decode;
 * @param [options]
 * @param [options.header] - If the header should be included in return output.
 * @param [options.payload] - If the payload should be included in return output.
 * @param [options.signature] - If the signature should be included in return output.
 *
 * @see [Inspiration code]{@link https://github.com/auth0/jwt-decode/blob/main/lib/index.ts}
 * @see [Related SO answer](https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library/38552302#38552302)
 * @see [JWT.io]{@link https://jwt.io}
 */
export function decodeJwt(jwt: string, {
    header = false,
    payload = true,
    signature = false,
} = {}): string | Indexable | (string | Indexable)[] {
    function base64UrlDecode(str: string) {
        let jwtWithValidChars = str
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        switch (jwtWithValidChars.length % 4 ) {
            case 0:
                break;
            case 2:
                jwtWithValidChars += '==';
                break;
            case 3:
                jwtWithValidChars += '=';
                break;
            default:
                break;
        }

        try {
            jwtWithValidChars = decodeURIComponent(atob(jwtWithValidChars).replace(/(.)/g, (fullStringMatch, matchGroup) => {
                let code = matchGroup.charCodeAt(0).toString(16);

                if (code.length < 2) {
                    code = '0' + code;
                }

                return '%' + code;
            }));
        } catch (decodeURIComponentError) {
            try {
                jwtWithValidChars = atob(jwtWithValidChars);
            } catch (atobError) {}
        }

        return jwtWithValidChars;
    }

    const jwtParsedList: string[] = jwt.split(/\./g)
        .map(str => {
            return base64UrlDecode(str);
        });

    const jwtParsedFilteredByDesiredParts = [ header, payload, signature ]
        .map((entrySelect, i) => {
            if (entrySelect) {
                let jwtPart = jwtParsedList[i];

                try {
                    jwtPart = JSON.parse(jwtPart);
                } catch (notJsonError) {}

                return jwtPart;
            }
        })
        .filter(Boolean) as string[];

    if (jwtParsedFilteredByDesiredParts.length === 1) {
        return <string> jwtParsedFilteredByDesiredParts[0];
    }

    return <string[]> jwtParsedFilteredByDesiredParts;
}


/**
 * Creates a JWT token.
 * Works with either NodeJS or modern browsers.
 *
 * @see [NodeJS walkthrough](https://stackoverflow.com/questions/67432096/generating-jwt-tokens/67432483#67432483)
 * @see [Browser walkthrough](https://stackoverflow.com/questions/47329132/how-to-get-hmac-with-crypto-web-api/47332317#47332317)
 */
export async function encodeJwt(text: string, {
    alg = 'HS256',
    typ = 'JWT',
    secret = '',
} = {}): Promise<string> {
    function base64UrlEncode(str: string) {
        return btoa(str)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+/g, '');
    }

    const encodedHeader = base64UrlEncode(JSON.stringify({ alg, typ }));
    const encodedPayload = base64UrlEncode(text);
    let algorithm = alg
        .replace(/^hs/i, 'sha')
        .replace(/^\D+/gi, match => match.toLowerCase());

    try {
        const crypto = await import('node:crypto');
        const hmacCipher = crypto.createHmac(algorithm, secret);

        hmacCipher.update(`${encodedHeader}.${encodedPayload}`);

        const hmacStr = hmacCipher.digest('base64url');
        const jwt = `${encodedHeader}.${encodedPayload}.${hmacStr}`;

        return jwt;
    } catch (notNodeJs) {
        // Attempt to use web crypto API below
    }

    algorithm = algorithm.replace(/^sha/i, 'SHA-');
    const algoInfo = {
        name: 'HMAC',
        hash: algorithm,
    };

    const signingKey = await self.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        algoInfo,
        false,
        [ 'sign', 'verify' ],
    );
    const signature = await self.crypto.subtle.sign(
        algoInfo.name,
        signingKey,
        new TextEncoder().encode(
            `${encodedHeader}.${encodedPayload}`,
        ),
    );
    /*
     * For some reason, `byteArrayToHexString()` doesn't work but a standard `fromCharCode()` does.
     * Likewise, these don't work either:
     *  - byteArrayToHexString(new Uint8Array(signature));
     *  - byteArrayToHexString(new Uint8Array(signature));
     *  - base64UrlEncode(byteArrayToHexString(new Uint8Array(signature)));
     * See:
     *  - https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string/11562550#11562550
     */
    const hmacStr = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

    const jwt = `${encodedHeader}.${encodedPayload}.${hmacStr}`;

    return jwt;
}
