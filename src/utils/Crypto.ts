import {
    byteArrayToHexString,
    base64UrlEncode,
    base64UrlDecode,
} from '@/utils/Text';

import type {
    ValueOf,
    Indexable,
} from '@/types';


/**
 * Hashes a string using the specified algorithm.
 *
 * Defaults to SHA-256. Available algorithms exist in the `hash.ALGOS` object.
 *
 * @param str - String to hash.
 * @param [algo] - Algorithm to use.
 * @returns The hashed string.
 *
 * @see [Crypto.subtle hashing API]{@link https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string}
 */
export async function hash(str: string, {
    algo = hash.ALGOS.Sha256,
}: {
    algo?: ValueOf<typeof hash.ALGOS>,
} = {}) {
    const validAlgorithms = new Set(Object.values(hash.ALGOS));

    if (!validAlgorithms.has(algo)) {
        throw new TypeError(`Error: Hash algorithm "${algo}" not supported. Valid values are: [ ${[ ...validAlgorithms ].join(', ')} ].`);
    }

    // Encode to (UTF-8) Uint8Array
    const utf8IntArray = new TextEncoder().encode(str);
    // Hash the string
    const hashBuffer = await self?.crypto?.subtle?.digest?.(algo, utf8IntArray);
    // Get hex string from buffer/byte array
    const hashAsciiHex = byteArrayToHexString(new Uint8Array(hashBuffer));

    return hashAsciiHex;
}
hash.ALGOS = {
    Sha1: 'SHA-1',
    Sha256: 'SHA-256',
    Sha384: 'SHA-384',
    Sha512: 'SHA-512',
};


/**
 * Generates a random UUID.
 */
export function uuid() {
    return self?.crypto?.randomUUID?.();
}


export function decodeJwt(jwt: string, opts?: { header: false, payload: true, signature: false }): string | Indexable;
export function decodeJwt(jwt: string, opts?: { header: true, payload: false, signature: false }): string | Indexable;
export function decodeJwt(jwt: string, opts?: { header: false, payload: false, signature: true }): string | Indexable;
export function decodeJwt(jwt: string, opts?: Record<string, boolean>): Array<string | Indexable>;
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
 *
 * @see [Browser walkthrough]{@link https://stackoverflow.com/questions/47329132/how-to-get-hmac-with-crypto-web-api/47332317#47332317}
 */
export async function encodeJwt(text: string, secret: string, {
    alg = 'HS256',
    typ = 'JWT',
} = {}): Promise<string> {
    const encodedHeader = base64UrlEncode(JSON.stringify({ alg, typ }));
    const encodedPayload = base64UrlEncode(text);
    let algorithm = alg
        .replace(/^hs/i, 'sha')
        .replace(/^\D+/gi, match => match.toLowerCase());

    algorithm = algorithm.replace(/^sha/i, 'SHA-');
    const algoInfo = {
        name: 'HMAC',
        hash: algorithm,
    };

    const signingKey = await globalThis.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        algoInfo,
        false,
        [ 'sign', 'verify' ],
    );
    const signature = await globalThis.crypto.subtle.sign(
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

/**
 * Verifies a JWT token.
 * Note: This shouldn't be done client-side as it exposes the secret.
 */
export async function verifyJwt(jwt: string, signature: Parameters<Crypto['subtle']['verify']>[2], {
    alg = 'HS256',
    typ = 'JWT',
    secret = '',
} = {}) {
    const [ encodedHeader, encodedPayload, signatureStr ] = jwt.split('.');

    let algorithm = alg
        .replace(/^hs/i, 'sha')
        .replace(/^\D+/gi, match => match.toLowerCase());
    algorithm = algorithm.replace(/^sha/i, 'SHA-');
    const algoInfo = {
        name: 'HMAC',
        hash: algorithm,
    };

    const signingKey = await globalThis.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        algoInfo,
        false,
        [ 'verify' ],
    );

    return await globalThis.crypto.subtle.verify(
        'HMAC',
        signingKey,
        signature,
        new TextEncoder().encode(
            `${encodedHeader}.${encodedPayload}`,
        ),
    );
}
