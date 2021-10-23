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
        [
            '@babel/preset-typescript',
            {
                allowDeclareFields: true, // sets class fields with only types to `undefined`, e.g. `class X { val: string; }; {...new X()} => { val: undefined }`
                // onlyRemoveTypeImports: true, // removes all `import/export type {...}` lines. This is done by default in tsconfig, but if issues exist in Babel, uncomment this
            },
        ],
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
