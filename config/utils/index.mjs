import * as os from 'os';
import { createRequire } from 'module';

const devServerPort = 3000;

/**
 * There are a couple ways to import CJS files:
 *  - const { myFunc } = await import('myFunc.js');
 *  - const MyCls = (await import('MyCls.js')).default  // Note the `.default` is needed for `module.exports = MyCls;`
 *  - Using `module.createRequire()`.
 *
 * This uses `module.createRequire()` because it allows importing both JS and non-JS files,
 * so .json, .txt, etc. can also be imported.
 *
 * @param {string} filePath - Path to the file desired to be imported.
 * @returns {*} - Content of that file. JS files will be treated as normal and JSON files will be objects.
 */
function importNonEsmFile(filePath) {
    const require = createRequire(import.meta.url);

    return require(filePath);
}


const parseCliArgs = importNonEsmFile('./parseCliArgs');
const {
    Paths,
    FileTypeRegexes,
    getOutputFileName,
    findFile,
    getGitignorePathsWithExtraGlobStars,
} = importNonEsmFile('./Files');


function getOsHostnameAndLanIP(protocolVersion = 4) {
    const allNetworkInterfaces = os.networkInterfaces();
    const localLanIp = Object.entries(allNetworkInterfaces)
        .reduce((localLan, [ networkInterface, addresses ]) => {
            const ipv4Addresses = addresses.filter(({ family, address, internal }) => (
                family === `IPv${protocolVersion}`
                && address.indexOf('127') !== 0
                && !address.includes('/')
                && !internal
            ));

            // return ipv4Addresses?.[0]?.address || localLanIp;
            return localLan || (
                ipv4Addresses.length
                    ? ipv4Addresses[0].address
                    : ''
            );
        }, '');

    return localLanIp;
}

const LocalLanHostIpAddresses = {
    hostname: os.hostname(),
    port: devServerPort,
    IPv4: getOsHostnameAndLanIP(),
    IPv6: getOsHostnameAndLanIP(6),
    getPublicPath: (exposeOnLan, protocol = 'http://') => exposeOnLan
        ? `${protocol || ''}${LocalLanHostIpAddresses.IPv4}:${LocalLanHostIpAddresses.port}`
        : '',
};


export {
    Paths,
    findFile,
    parseCliArgs,
    FileTypeRegexes,
    getOutputFileName,
    LocalLanHostIpAddresses,
    importNonEsmFile,
    getGitignorePathsWithExtraGlobStars,
};
