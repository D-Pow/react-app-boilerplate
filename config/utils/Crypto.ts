import {
    createHash,
    type BinaryLike,
    type BinaryToTextEncoding,
} from 'node:crypto';

import type {
    UppercaseOrLowercase,
} from '@/types';


export type HashAlgos = UppercaseOrLowercase<
    'BLAKE2b512'
    | 'BLAKE2s256'
    | 'MD4'
    | 'MD5'
    | 'MD5-SHA1'
    | 'MDC2'
    | 'RIPEMD160'
    | 'SHA1'
    | 'SHA224'
    | 'SHA256'
    | 'SHA3-224'
    | 'SHA3-256'
    | 'SHA3-384'
    | 'SHA3-512'
    | 'SHA384'
    | 'SHA512'
    | 'SHA512-224'
    | 'SHA512-256'
    | 'SHAKE128'
    | 'SHAKE256'
    | 'SM3'
    | 'whirlpool'
>;

export interface HashOptions {
    algo?: HashAlgos;
    outputFormat?: BinaryToTextEncoding | 'buffer';
}


/**
 * @see [NodeJS docs]{@link https://nodejs.org/api/crypto.html#:~:text=Example%3A%20Using%20the%20hash.update()%20and%20hash.digest()%20methods}
 */
export function hash(input: BinaryLike, {
    algo = 'SHA256',
    outputFormat = 'hex',
}: HashOptions = {}) {
    const cipher = createHash(algo);

    cipher.update(input);

    if (outputFormat == null || outputFormat?.match(/buffer/i)) {
        return cipher.digest();
    }

    return cipher.digest(outputFormat as BinaryToTextEncoding);
}
