const os = require('node:os');
const fs = require('node:fs/promises');

require('isomorphic-fetch');

const devServerPort = process.env.PORT || 3000;


function getLanIpAddress(protocolVersion = 4) {
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
    IPv4: getLanIpAddress(),
    IPv6: getLanIpAddress(6),
    getPublicPath: (exposeOnLan, protocol = 'http://') => exposeOnLan
        ? `${protocol || ''}${LocalLanHostIpAddresses.IPv4}:${LocalLanHostIpAddresses.port}`
        : '',
};


async function downloadFile(url, destPath) {
    const res = await fetch(url);
    const blob = await res.blob();
    const stream = await blob.stream();

    await fs.writeFile(destPath, stream);
    await fs.chmod(destPath, 0o777);
}


module.exports = {
    getLanIpAddress,
    LocalLanHostIpAddresses,
    downloadFile,
};
