/**
 * This is used to generate your own self-signed certificate information
 * for local dev-servers using HTTPS.
 *
 * Does not remove the initial "This site is insecure. Proceed anyway?"
 * browser message on https://localhost:port, but caches the cert info afterwards
 * so it won't be seen on subsequent visits.
 *
 * To manually use your own self-signed HTTPS dev-server certificate instead
 * of this dynamic one, you can run the `npx mkcert create-X` commands
 * and install them on your OS.
 * Doing so has the benefit of removing the above message from your browser for all other
 * dev-servers, but requires you to execute this logic manually/redo it when the certs expire.
 *
 * @file
 */

import fs from 'node:fs';

import mkcert from 'mkcert';

import { Paths } from './Files';
import { LocalLanHostIpAddresses } from './Network';

import type { SecureContextOptions } from 'tls';


/**
 * Details needed to create the certificates/private keys for both Certificate Authority
 * and server in order to create a self-signed certificate for a local dev server.
 */
export interface SelfSignedCertOptions {
    /**
     * Number of days the cert is valid.
     */
    validityDays?: number;
    /**
     * URL Domains for which this cert is valid (first one is the "common name").
     */
    domains?: string[];
    /**
     * Organization name for the cert.
     */
    organization?: string;
    /**
     * State for the cert.
     */
    state?: string;
    /**
     * City for the cert.
     */
    locality?: string;
    /**
     * Abbreviated country representation.
     */
    countryCode?: string;
}
export type CertAuthorityOptions = Omit<SelfSignedCertOptions, 'domains'>;
export type ServerCertOptions = Pick<SelfSignedCertOptions, 'domains' | 'validityDays'> & Partial<CertAndKey>;

/**
 * The generated self-signed certificates/private keys for the Certificate Authority
 * and local dev server.
 */
export interface SelfSignedCertificatesAndKeys {
    cacert: string;
    cakey: string;
    cert: string;
    key: string;
}
export type CertAuthorityCertAndKey = Pick<SelfSignedCertificatesAndKeys, 'cacert' | 'cakey'>;
export type CertAndKey = Pick<SelfSignedCertificatesAndKeys, 'cert' | 'key'>;

/**
 * JSON file structure containing the Certificate Authority's and server's self-signed certificate
 * information.
 *
 * The file is Used to cache the certs' info so that the "This site is insecure. Proceed anyway?"
 * page/button doesn't have to be encountered upon every local HTTPS dev-server boot.
 */
export interface SelfSignedCertFileContents {
    created: string;
    validityDays: number;
    ca: string;
    key: string;
    cert: string;
}
export type DevServerSelfSignedCertSimple = Pick<SelfSignedCertFileContents, 'ca' | 'key' | 'cert'>;
export type DevServerSelfSignedCert = DevServerSelfSignedCertSimple | SecureContextOptions;


const defaultCertOptions: SelfSignedCertOptions = {
    validityDays: 1,
    organization: 'Localhost Org',
    state: 'New York',
    locality: 'New York City',
    countryCode: 'US',
    domains: [
        'localhost',
        LocalLanHostIpAddresses.IPv4,
        LocalLanHostIpAddresses.IPv6,
    ],
};
const defaultCaCertOptions = Object.entries(defaultCertOptions)
    .reduce<CertAuthorityOptions>((obj, [ key, value ]) => {
        if (key !== 'domains') {
            obj[key as keyof CertAuthorityOptions] = value;
        }

        return obj;
    }, {}) as Required<CertAuthorityOptions>;
const defaultServerCertOptions = Object.entries(defaultCertOptions)
    .reduce<ServerCertOptions>((obj, [ key, value ]) => {
        if (key === 'domains' || key === 'validityDays') {
            obj[key as keyof ServerCertOptions] = value;
        }

        return obj;
    }, {}) as Required<ServerCertOptions>;


/**
 * Generates a certificate authority's certificate/private key pair.
 * The key is the CA's private key, so we likely won't need to pass it
 * anywhere.
 *
 * @param caCertOptions - Details for the generated certificate.
 * @returns The corresponding certificate and private key.
 */
export async function createCertificateAuthority(caCertOptions: CertAuthorityOptions = {}): Promise<CertAndKey> {
    const caCertInfo = {
        ...defaultCaCertOptions,
        ...caCertOptions,
    };

    return await mkcert.createCA(caCertInfo);
}


/**
 * Generates the server's certificate/private key.
 * Both cert/key are needed to self-sign your own certificate, including the
 * private key since this is for the server.
 * This is usually safe since we're often on localhost, but localhost.com or
 * similar could technically be purchased by someone, so be cautious that
 * no one except ourselves will see this key.
 *
 * @param serverCertOptions - Details for the generated certificate.
 * @returns The server's certificate and private key.
 */
export async function createServerCertificate(serverCertOptions: ServerCertOptions = {}): Promise<CertAndKey> {
    const serverCertInfo: Required<ServerCertOptions> | mkcert.CertificateInfo = {
        ...defaultServerCertOptions,
        ...serverCertOptions,
    };

    if (!serverCertInfo.cert || !serverCertInfo.key) {
        const caCertAndKey = await createCertificateAuthority({
            validityDays: serverCertInfo.validityDays,
        });

        serverCertInfo.cert = caCertAndKey.cert;
        serverCertInfo.key = caCertAndKey.key;
    }

    const serverCertArg: mkcert.CertificateInfo = {
        domains: serverCertInfo.domains,
        validityDays: serverCertInfo.validityDays,
        caCert: serverCertInfo.cert,
        caKey: serverCertInfo.key,
    };

    return await mkcert.createCert(serverCertArg);
}


/**
 * Generates both a Certificate Authority's and a server's certificates/private keys
 * for self-signing your local server's certificate.
 *
 * Returns the CA's cert (who the CA is; public knowledge), the server's cert (who the
 * server is; public knowledge), and the server's private key (so the server can sign
 * its network traffic; private knowledge), each of which is required for self-signing
 * your own cert.
 *
 * @param certOptions - Details for the generated certificate.
 * @returns The CA's cert, server's cert, and server's private key.
 */
export async function createServerHttpsCredentials(certOptions: SelfSignedCertOptions = {}): Promise<DevServerSelfSignedCert> {
    const certificateAuthorityCreds = await createCertificateAuthority(certOptions);
    const serverCreds = await createServerCertificate({
        ...certOptions,
        ...{
            caCert: certificateAuthorityCreds.cert,
            caKey: certificateAuthorityCreds.key,
        },
    });

    return {
        // Note: You shouldn't need to use CA's private key; that would mean anyone could be that CA.
        // cakey: certificateAuthorityCreds.key,
        // Add CA cert to let the browser know the server's creds have been signed by someone.
        ca: certificateAuthorityCreds.cert,
        // Do add server's key, but only since this is localhost; AKA localhost-key.pem.
        key: serverCreds.key,
        // Like the CA, the server has to provide a cert as well; AKA localhost.pem.
        cert: serverCreds.cert,
    };
}



const certFile = `${Paths.ROOT.ABS}/.env.cert.json`;
/**
 * Local process' cache of the certificate file's content to prevent
 * reading the file multiple times for its lifetime.
 *
 * Allows multiple get-cert-info calls to be made without I/O
 * becoming a bottleneck.
 */
let certFileInfo: SelfSignedCertFileContents | null;


/**
 * Reads certificate information from local disk.
 *
 * @returns The info from the cert file as an object or null if it doesn't exist.
 */
function getCachedCert(): typeof certFileInfo {
    if (typeof certFileInfo !== typeof undefined) {
        return certFileInfo;
    }

    if (!fs.existsSync(certFile)) {
        certFileInfo = null;

        return certFileInfo;
    }

    const certFileContents = fs.readFileSync(certFile).toString();

    certFileInfo = JSON.parse(certFileContents);

    return certFileInfo;
}

/**
 * Saves certificate information to local disk.
 *
 * @param certInfo - Certificate to save.
 */
function setCachedCert(certInfo: Omit<SelfSignedCertFileContents, 'created'>): void {
    const today = new Date();
    const created = today.toLocaleString();
    const certCache = {
        ...certInfo,
        created,
    };

    fs.writeFileSync(certFile, JSON.stringify(certCache, undefined, 4));

    console.log(
        `Saved local dev-server HTTPS certificate to "${certFile}".`,
        `\nIt will be valid for ${certCache.validityDays} days unless deleted.`,
    );
}

/**
 * Checks if the local cached certificate information is still valid
 * based on when it was created and how many days it was to remain valid.
 */
function isCachedCertValid(): boolean {
    const certInfo = getCachedCert();

    if (!certInfo) {
        return false;
    }

    const {
        created,
        validityDays,
    } = certInfo;

    const today = new Date();
    const dayLastGenerated = new Date(created);
    const daysInMilliseconds = 1000 * 60 * 60 * 24;
    /**
     * `Date` - `Date` works due to number type coercion in JavaScript,
     * but we must be explicit about it in TypeScript.
     *
     * This could be done via
     * - Unary operator: +(new Date())
     * - Specific `Date` function: (new Date()).getTime()
     * - Generic, overridden `Object.prototype` function that returns the primitive form of the object in question: (new Date()).valueOf()
     *
     * @see [Object.prototype.valueOf()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf#return_value}
     * @see [Unary plus operator]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Unary_plus}
     * @see [Unary operators]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators#unary_operators}
     */
    // To keep things simple, just use the unary operator to coerce `Date` into a number, leaving it upto the `Date` class to decide how to do so.
    const timePassedMillis = (+today) - (+dayLastGenerated);
    const daysPassed = timePassedMillis / daysInMilliseconds;
    const isCertStillValid = validityDays > daysPassed;

    return isCertStillValid;
}


/**
 * Returns both the Certificate Authority's and server's certificates/private keys
 * for self-signing your local HTTPS dev-server's certificate.
 *
 * Attempts reading certificate info from a local cache first, re-generating/caching
 * them if they don't exist or have expired.
 *
 * Note: This is done instead of using checking for an existing cert so devs don't have to
 * manually (re-)install the cert themselves. This helps keep the front-end code base
 * self-contained, self-sustaining, easy to use, and DRY.
 *
 * @returns The CA's cert, server's cert, and server's private key.
 */
export async function getServerHttpsCredentials({
    /**
     * Details for the generated certificate.
     */
    certOptions = {},
    /**
     * Force creating/caching a new cert even if the cached one is still valid.
     */
    force = false,
}: {
    certOptions?: SelfSignedCertOptions;
    force?: boolean;
} = {}): Promise<DevServerSelfSignedCert> {
    if (isCachedCertValid() && !force) {
        const certInfo = getCachedCert()!;

        return {
            ca: certInfo.ca,
            key: certInfo.key,
            cert: certInfo.cert,
        };
    }

    const certInfo = await createServerHttpsCredentials(certOptions) as DevServerSelfSignedCertSimple;

    setCachedCert({
        ...certInfo,
        validityDays: certOptions.validityDays!,
    });

    return certInfo;
}
