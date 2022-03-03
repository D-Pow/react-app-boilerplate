import { byteArrayToHexString } from '@/utils/Text';

import type {
    ValueOf,
} from '@/types';


export type HashAlgos = ValueOf<typeof hash.ALGOS>;


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
    algo?: HashAlgos,
} = {}) {
    const validAlgorithms = new Set(Object.values(hash.ALGOS));

    if (!validAlgorithms.has(algo)) {
        throw new TypeError(`Error: Hash algorithm "${algo}" not supported. Valid values are: [ ${[ ...validAlgorithms ].join(', ')} ].`);
    }

    // Encode to (UTF-8) Uint8Array
    const utf8IntArray = new TextEncoder().encode(str);
    // Hash the string
    const hashBuffer = await self.crypto.subtle.digest(algo, utf8IntArray);
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
export namespace hash { // Define custom field on function
    export let ALGOS: Record<string, string>;
}
