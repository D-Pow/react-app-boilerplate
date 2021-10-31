const os = require('os');

const devServerPort = process.env.PORT || 3000;


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


module.exports = {
    getOsHostnameAndLanIP,
    LocalLanHostIpAddresses,
};
