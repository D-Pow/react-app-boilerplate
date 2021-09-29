/** @type {import('@babel/core/src/config/files').ConfigFile} */
module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                useBuiltIns: 'usage',
                corejs: {
                    version: '3.17',
                    proposals: true,
                },
                shippedProposals: true,
                targets: {
                    node: 'current',
                    browsers: '> 0.25%, not dead',
                },
            },
        ],
        '@babel/preset-react',
        '@babel/preset-typescript',
    ],
    plugins: [
        '@babel/plugin-transform-runtime',
        [
            '@babel/plugin-proposal-decorators',
            {
                ...(useLegacyDecorators =>
                    useLegacyDecorators
                        ? { legacy: true }
                        : { decoratorsBeforeExport: true } // Whether decorators should be placed before or after `export`
                )(false),
            },
        ],
        [
            'babel-plugin-module-resolver',
            {
                cwd: [ 'packagejson' ],
                alias: {
                    '@': './src/',
                    '/': './',
                },
            },
        ],
    ],
};
