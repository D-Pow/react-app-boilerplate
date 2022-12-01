const dotenv = require('dotenv');
const { expand: dotenvExpand } = require('dotenv-expand');

const {
    Paths,
} = require('./utils');

const packageJson = require(`${Paths.ROOT.ABS}/package.json`);

const parsedDotenvFields = dotenv
    .config({
        // path: Paths.getFileAbsPath(Paths.ROOT.ABS, '.env'),
    })
    .parsed;
const envWithExpandedVariables = dotenvExpand({
    parsed: parsedDotenvFields,
}).parsed;
const env = envWithExpandedVariables;

process.env = {
    ...process.env,
    ...env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PUBLIC_URL: Paths.BUILD_OUTPUT.REL,
};

const broadcastChannel = packageJson.name;
const publicEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PUBLIC_URL: process.env.PUBLIC_URL,
    BROADCAST_CHANNEL: broadcastChannel,
    MOCK: process.env.MOCK,
    SUPPORT_IE: !!process?.env?.npm_package_config_supportIe,
};

module.exports = {
    env,
    publicEnv,
    broadcastChannel,
};
