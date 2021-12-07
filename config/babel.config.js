const path = require('path');

const { ImportAliases } = require('./utils');

/** @type {import('@babel/core/src/config/files').ConfigFile} */
module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                useBuiltIns: process?.env?.npm_package_config_supportIe ? 'entry' : 'usage',
                corejs: {
                    version: '3.18',
                    proposals: true,
                },
                shippedProposals: true,
                targets: {
                    node: 'current',
                    browsers: '> 0.25%, not dead',
                },
                bugfixes: true,
            },
        ],
        [
            '@babel/preset-react',
            {
                runtime: 'automatic', // Allows automatic configuration of options, e.g. `importSource: 'react'` which sets where React imports come from
            },
        ],
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
                )(true), // TODO Wait until TC39 passes an official decorator syntax: https://github.com/tc39/proposal-decorators#why-prioritize-the-features-of-legacy-decorators-like-classes-over-other-features-that-decorators-could-provide
            },
        ],
        [
            'babel-plugin-module-resolver',
            {
                cwd: [ 'packagejson' ],
                alias: ImportAliases.toCustomObject({
                    // Resolve any alias path matches to be relative from the root dir, then remove any double-slashes
                    // e.g. { '@': 'src', '/': '.' } => { '@': './src/', '/': './' }
                    pathMatchModifier: pathMatch => `./${path.relative('.', pathMatch)}/`.replace(/\/\//g, '/'),
                }),
            },
        ],
    ],
};
