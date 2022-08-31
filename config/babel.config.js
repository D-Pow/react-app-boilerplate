const path = require('path');

const { ImportAliases } = require('./utils');

// TODO Check out SWC Rust compiler instead of Babel: https://swc.rs/

/**
 * @type {import('@types/babel__core').TransformOptions}
 *
 * Ordering goes last to first.
 *
 * @see [Babel config options]{@link https://babeljs.io/docs/en/options}
 * @see [Older yet more accurate `@types/babel__core` package]{@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/277df65eb7/types/babel__core/index.d.ts}
 * @see [Newer yet less accurate `@types/babel-core` package]{@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/babel-core/index.d.ts}
 */
module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                useBuiltIns: process?.env?.npm_package_config_supportIe ? 'entry' : 'usage',
                corejs: {
                    version: '3.21',
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
        '@babel/plugin-transform-runtime', // Defines Babel's injected helper functions globally instead of duplicating them in every file
        [
            '@babel/plugin-proposal-decorators',
            {
                /**
                 * TODO Wait until TC39 passes an official decorator syntax: https://github.com/tc39/proposal-decorators#why-prioritize-the-features-of-legacy-decorators-like-classes-over-other-features-that-decorators-could-provide
                 *
                 * Note: Alternative is to use a legacy-to-modern wrapper/processor like [decorators-compat]{@link https://babeljs.io/blog/2018/09/17/decorators#upgrading}
                 * to use modern decorator syntax in e.g. TypeScript.
                 * Upside: If using Webpack, we could simply use the util as an [entry point]{@link https://github.com/nicolo-ribaudo/legacy-decorators-migration-utility#decorators-compat}
                 * instead of re-/over-writing current code.
                 */
                ...(useLegacyDecorators =>
                    useLegacyDecorators
                        ? { legacy: true }
                        : { decoratorsBeforeExport: true } // Whether decorators should be placed before or after `export`
                )(true),
            },
        ],
        [
            'babel-plugin-module-resolver',
            {
                cwd: [ 'packagejson' ],
                alias: ImportAliases.toCustomObject({
                    // Resolve any alias path matches to be relative from the root dir, then remove any double-slashes
                    // e.g. { '@': 'src', '/': '.' } => { '@': './src/', '/': './' }
                    pathMatchModifier: (pathMatchRegexString, pathMatchesArray) => pathMatchesArray
                        .map(pathMatch => `./${path.relative('.', pathMatch)}/`
                            .replace(/\/\//g, '/'),
                        ),
                }),
            },
        ],
    ],
};
