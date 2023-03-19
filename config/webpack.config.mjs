import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import TerserJSPlugin from 'terser-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import MockRequestsWebpackPlugin from 'mock-requests/bin/MockRequestsWebpackPlugin.js';

import {
    publicEnv,
    broadcastChannel,
} from './env.js';
import AlterFilePostBuildPlugin from './webpack/AlterFilePostBuildPlugin.mjs';
import {
    Paths,
    tsconfigPath,
    FileTypeRegexes,
    getOutputFileName,
    ImportAliases,
    LocalLanHostIpAddresses,
} from './utils/index.js';
import babelConfig from './babel.config.js';

import packageJson from '../package.json' assert { type: 'json' };
import manifestJson from '../src/manifest.json' assert { type: 'json' };

// TODO Make import aliases available to npm scripts
//  Best option is likely through ts-node: https://www.npmjs.com/package/ts-node
//      Will it work with native npm scripts? See:
//          https://jonjam.medium.com/writing-npm-scripts-using-typescript-a09b8712dc6b
//          https://www.typescriptlang.org/tsconfig#module
//  Another options is through module-alias: https://www.npmjs.com/package/module-alias
//  See:
//      https://github.com/nodejs/node/pull/41552
//      https://github.com/nodejs/node/discussions/41711

const isProduction = process.env.NODE_ENV === 'production';
const allowAccessFromAllOrigins = Boolean(process.env.ALLOW_CORS_ACCESS);
const useHttps = false;
// If this app is a library to be consumed by other apps instead of a standalone website
// TODO Update output configs to consider this option
const isLibrary = false;
const sourceMap = !isProduction; // allows for passing `sourceMap` directly by name to loaders/plugins options

const indexHtmlTitle = manifestJson.short_name;
// TODO See if index.html <link> entries can be moved here
const indexHtmlMetaTagData = {
    description: packageJson.description,
    keywords: packageJson.keywords.join(', '),
    'theme-color': manifestJson.theme_color,
    viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no',
};

const fileUrlsNotToCacheInPwa = [];

const {
    JavaScript,
    TypeScript,
    JsAndTs,
    Styles,
    Svg,
    Binaries,
    Text,
    Fonts,
} = FileTypeRegexes;

const hotReloading = false; // process.env.NODE_ENV === 'development';

const svgDefaultExportReactComponent = false;


const javascriptLoaderConfig = {
    loader: 'babel-loader',
    options: babelConfig,
};
const typescriptLoaderConfig = {
    loader: 'ts-loader',
    options: {
        configFile: tsconfigPath,
        /** @type {import('typescript').CompilerOptions} */
        compilerOptions: {
            // Ensure tsconfig's `outDir` is unset when using Webpack (output is piped to babel-loader)
            outDir: null,
            // Deactivate declaration output if this isn't a library meant to be consumed, e.g. a website to be deployed
            ...(isLibrary ? {} : {
                declaration: isLibrary,
                declarationDir: isLibrary,
            }),
        },
    },
};


// noinspection WebpackConfigHighlighting
/** @returns {import('webpack/types').WebpackOptionsNormalized} */
function getWebpackConfig(webpackArgs) {
    return {
        mode: isProduction ? 'production' : 'development',
        module: {
            /**
             * Webpack uses template strings when generating output files.
             *
             * Examples:
             * '[path][name]-[contenthash:8].[ext]'   ->   `src/assets/MyImage-991ec5ea.png`
             * '[name][ext]' or '[base]'   ->   `MyImage.png`
             * Even though [ext] is supposed to contain the preceding '.', it seems [name].[ext] and [name][ext] are the same
             *
             * @see [TemplateStrings]{@link https://webpack.js.org/configuration/output/#template-strings} for more information.
             */
            /**
             * Quick note on loaders:
             *
             * Webpack@<5   |  Webpack@>=5     |  result
             * file-loader  |  asset/resource  |  outputs the file; gives a URL reference to usages in src
             * url-loader   |  asset/inline    |  no file output; converts usage in src files to Base64 data URI string
             * raw-loader   |  asset/source    |  no file output; simply injects the file contents as a string to usages in src (not duplicated with multiple imports, though)
             *
             * @see {@link https://v4.webpack.js.org/loaders/file-loader/} and related loader URLs for more information.
             */
            rules: [
                {
                    test: JsAndTs,
                    exclude: /node_modules/,
                    include: new RegExp(Paths.SRC.REL),
                    use: [
                        javascriptLoaderConfig,
                        typescriptLoaderConfig,
                    ],
                },
                {
                    test: Styles,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                modules: {
                                    // Don't default to CSS-Modules; parse as normal CSS
                                    compileType: 'icss',
                                },
                                importLoaders: 2,
                                sourceMap,
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: [
                                        [ 'postcss-preset-env', {
                                            stage: 0,
                                            browsers: babelConfig.presets
                                                .find(preset => preset[0]?.match(/babel\/preset-env/i))?.[1]
                                                .targets
                                                .browsers,
                                        }],
                                    ],
                                },
                                sourceMap,
                            },
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap,
                            },
                        },
                    ],
                },

                /**
                 * Use [Asset Modules]{@link https://webpack.js.org/guides/asset-modules/}
                 * instead of (file|url|raw)-loader since those are being deprecated and
                 * Asset Modules are built-in with webpack@5
                 */

                {
                    test: Svg,
                    oneOf: [
                        {
                            // Non-JS files, e.g. CSS
                            issuer: {
                                not: JsAndTs,
                            },
                            type: 'asset/resource',
                        },
                        {
                            // JS files specifically requesting the SVG file's URL
                            resourceQuery: /url/,
                            type: 'asset/resource',
                        },
                        {
                            // JS files wanting to use the SVG as a React component and/or URL
                            issuer: JsAndTs,
                            resourceQuery: {
                                // Only output React component if not querying for the URL, i.e. *.svg?url
                                not: [ /url/ ],
                            },
                            use: [
                                // Parse resulting React components using our Babel config, not theirs, for better code-splitting/bundling
                                // Note: This has to be done here instead of in `SVGR.options.jsx.babelConfig` because that option disables calling the `template()` function
                                // Note: Don't add `javascriptLoaderConfig`, `babel: false`, or `jsxRuntime` if using NextJS.
                                javascriptLoaderConfig,
                                {
                                    loader: '@svgr/webpack',
                                    /**
                                     * @type {import('@svgr/core/dist').Config}
                                     *
                                     * @see [SVGR options]{@link https://react-svgr.com/docs/options}
                                     * @see [Source code]{@link https://github.com/gregberge/svgr}
                                     */
                                    options: {
                                        // TODO: Investigate options used in CRA: https://github.com/facebook/create-react-app/blob/67b48688081d8ee3562b8ac1bf6ae6d44112745a/packages/react-scripts/config/webpack.config.js#L391-L398
                                        babel: false, // Use our own (more optimized) Babel config instead of theirs
                                        jsxRuntime: 'automatic', // React >= v17 doesn't need `import React from 'react'` so don't inject it
                                        exportType: 'named', // `export const ReactComponent` instead of `export default ReactComponent`
                                        ref: true,
                                        memo: true,
                                        prettier: false, // No need to minify the React output
                                        svgo: false, // Don't force-remove SVG fields we care about (see below)
                                        /**
                                         * @type {import('@svgr/core/dist').Config.svgoConfig}
                                         *
                                         * @see [SVGO config options]{@link https://github.com/svg/svgo#built-in-plugins}
                                         */
                                        svgoConfig: {
                                            // removeDoctype: false, // <DOCTYPE>
                                            // removeXMLProcInst: false, // <?xml version="1.0" encoding="utf-8"?>
                                            // removeComments: false,
                                            removeXMLNS: false, // `xmlns` prop
                                            removeMetadata: false, // <metadata>
                                            removeTitle: false, // <title>
                                            removeDesc: false, // <desc>
                                            removeUselessDefs: false, // <defs> that don't contain an `id` prop
                                            removeEditorsNSData: false,
                                            removeEmptyAttrs: false,
                                            removeHiddenElems: false,
                                            removeEmptyText: false,
                                            removeEmptyContainers: false,
                                            removeViewBox: false,
                                        },
                                        /**
                                         * Template string for generating React component source code output.
                                         *
                                         * Customizing it here allows us to avoid having to use `resourceQuery: /url/` in our Webpack config,
                                         * meaning that source code won't have to specify `file.svg` to import the React component or `file.svg?url`
                                         * to import the file's URL. Now, both can be imported in the same statement just like `@svgr/webpack` v5 did.
                                         *
                                         * @type {import('@svgr/babel-plugin-transform-svg-component/dist').Template}
                                         *
                                         * @see [Default template source code]{@link https://github.com/gregberge/svgr/blob/755bd68f80436130ed65a491c101cf0441d9ac5e/packages/babel-plugin-transform-svg-component/src/defaultTemplate.ts}
                                         * @see [Working with TypeScript]{@link https://github.com/gregberge/svgr/issues/354}
                                         */
                                        template(componentInfo, svgrConfig) {
                                            const { tpl: babelTemplateBuilder } = svgrConfig;

                                            const svgSrcFilePath = svgrConfig.options.state.filePath;
                                            const svgSrcImportAliasPath = ImportAliases.getBestImportAliasMatch(svgSrcFilePath);

                                            /**
                                             * SVGR does its own AST parsing before giving the user access to it. This means:
                                             *
                                             * - The `componentInfo` entries are AST objects.
                                             * - We cannot call the template-builder as a function (with parentheses), it must use
                                             *   the template-string syntax (template`myTemplate`).
                                             * - We cannot add imports or exports because SVGR does a validation comparison with its own AST
                                             *   (technically we could but then we'd be manually editing AST objects, which is always a bad idea).
                                             *
                                             * Thus, use a simple, logic-only template string so that it coincides with the AST within SVGR,
                                             * and then append our own changes to the generated AST array afterwards so that our changes are
                                             * still parsed and injected into the resulting code.
                                             *
                                             * @see [Source code]{@link https://github.com/gregberge/svgr/blob/755bd68f80436130ed65a491c101cf0441d9ac5e/packages/babel-plugin-transform-svg-component/src/index.ts#L30}
                                             */

                                            /*
                                             * Add the ability to pass `children` through to the generated React component.
                                             * `@svgr/webpack` doesn't allow this by default, so we must add it ourselves.
                                             * However, since it uses a JSX AST tree, we can't just add it as a normal string
                                             * like we did for the double export of both asset URL and React component after
                                             * the SVG component's AST tree generation.
                                             *
                                             * After many attempts, I've found:
                                             *  - Babel will add a semicolon to the end of this specific expression no matter
                                             *    what. This is fine if done *outside* the generated code string injected
                                             *    because SVG DOM elements won't render it.
                                             *  - We can't pass in '{props.children}' as a plain string, otherwise the
                                             *    semicolon is added inside the curly braces, creating invalid JSX syntax.
                                             *  - We can't use `{componentInfo.props.children}` because that AST content is
                                             *    generated from the .svg file itself, so it won't read dynamically added
                                             *    children from usage in src code.
                                             *  - We can't use Babel's standard `%%foo%%` substitution pattern because
                                             *    `@svgr/webpack` disables it and can't process it even with using our own
                                             *    Babel AST template builder.
                                             *  - We possibly might be able to use a function but that's no better than
                                             *    this plain string.
                                             *  - The rules above apply to `<>{my-code}</>` as well. We choose not to use
                                             *    React.Fragment since it isn't required and for simpler usage in parent
                                             *    component logic that uses SVG React components from this loader.
                                             */
                                            componentInfo.jsx.children.push(babelTemplateBuilder`
                                                ${'{props.children}'}
                                            `);

                                            // Logic only AST template that uses the React component info content from SVGR.
                                            const astArray = babelTemplateBuilder`
                                                ${componentInfo.imports};

                                                ${componentInfo.interfaces};

                                                function ${componentInfo.componentName}(${componentInfo.props}) {
                                                    return (
                                                        ${componentInfo.jsx}
                                                    );
                                                }

                                                ${componentInfo.componentName}.displayName = '${componentInfo.componentName}';

                                                ${componentInfo.exports};
                                                `;

                                            // Our own logic containing custom imports/exports
                                            const customAstArray = babelTemplateBuilder(`
                                                import SvgAssetUrl from '${svgSrcImportAliasPath}?url';

                                                // URL of the actual SVG file
                                                export const SvgUrl = SvgAssetUrl;

                                                // Add default export for ease of use
                                                export default ${svgDefaultExportReactComponent ? componentInfo.componentName : 'SvgUrl'};
                                            `);

                                            astArray.push(...customAstArray);

                                            return astArray;
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
                {
                    test: Binaries,
                    type: 'asset/resource',
                    /** @type {import('webpack/types').AssetResourceGeneratorOptions} */
                    generator: {
                        // Webpack docs don't include all these fields in any of its GeneratorOptionsByModuleTypeKnown
                        // entries so specify them manually in case they're needed in future use
                        filename: ({
                            /** @type {import('webpack/types').NormalModule} */
                            module,
                            /** @type {string} */
                            runtime,
                            /** @type {string} */
                            filename,
                            /** @type {import('webpack/lib/ChunkGraph.js').ChunkGraphChunk} */
                            chunkGraph,
                            /** @type {string} */
                            contentHash,
                        }) => {
                            /*
                             * Maintain nested directory structure when generating output file names while
                             * also removing the beginning `src/` from the output path.
                             *
                             * Exception: Favicon files, which should be in the root of the output directory
                             * and should not contain hashes.
                             * TODO Dynamically generate manifest.json's favicon entries from webpack hash so
                             *  that new favicon versions are served rather than the old/cached version.
                             */
                            const faviconFileNames = [ 'favicon', 'apple-touch-icon' ];
                            const faviconRegex = new RegExp(`(${faviconFileNames.join('|')})`);

                            if (faviconRegex.test(filename)) {
                                return getOutputFileName(filename, {
                                    hashLength: 0,
                                    maintainFolderStructure: false,
                                    nestInFolder: '',
                                });
                            }

                            return getOutputFileName(filename);
                        },
                    },
                },
                {
                    test: Fonts,
                    type: 'asset/resource',
                    generator: {
                        filename: ({ filename }) => {
                            /*
                             * Don't append hash to font file outputs so that the SCSS
                             * mixin can work with the direct file name.
                             */
                            return getOutputFileName(filename, { hashLength: 0 });
                        },
                    },
                },
                {
                    test: Text,
                    type: 'asset/source',
                },
            ],
        },
        resolve: {
            extensions: [ '.ts', '.tsx', '.js', '.jsx', '*' ],
            modules: [
                // Paths.SRC.ABS, // allows treating src/* dirs/files as modules, i.e. `import X from 'dirUnderSrc/nested/File.ext';`. Unnecessary since src/* has been aliased to `/` and `@/`.
                'node_modules',
            ],
            alias: ImportAliases.toCustomObject({
                pathMatchModifier: (pathMatchRegexString, pathMatchArray) => pathMatchArray
                    .map(pathMatch => Paths.getFileAbsPath(Paths.ROOT.ABS, pathMatch)),
            }),
        },
        entry: {
            client: {
                import: [
                    // If supporting IE, ensure `core-js` polyfills are loaded before source/vendor code
                    ...(process?.env?.npm_package_config_supportIe ? [ 'core-js' ] : []),
                    Paths.getFileAbsPath(Paths.SRC.ABS, 'index.jsx'),
                ],
                dependOn: 'common',
            },
            common: [
                /*
                 * Polyfills not covered with core-js include:
                 * fetch, Proxy, BigInt, Intl, String.prototype.normalize, among others
                 * See: https://github.com/zloirock/core-js#missing-polyfills
                 */
                'isomorphic-fetch',
                'reflect-metadata',
                'proxy-polyfill',
            ],
        },
        output: {
            path: Paths.BUILD_ROOT.ABS, // output path for webpack build on machine, not relative paths for index.html
            filename: `${Paths.BUILD_OUTPUT.REL}/js/[name].[contenthash:8].bundle.js`,
            chunkFilename: `${Paths.BUILD_OUTPUT.REL}/js/[name].[contenthash:8].chunk.js`,
            /**
             * Default output name for [Asset Modules]{@link https://webpack.js.org/guides/asset-modules/}.
             * Will be overridden by any `module.rule` that specifies `generator.filename`.
             *
             * @see [output.assetModuleFilename]{@link https://webpack.js.org/configuration/output/#outputassetmodulefilename}
             */
            assetModuleFilename: `${Paths.BUILD_OUTPUT.REL}/assets/[name].[contenthash:8][ext]`,
            sourceMapFilename: '[file].map',
            environment: {
                // toggle options for output JS target browsers; to target ES5, set all to false
                arrowFunction: false,
                bigIntLiteral: false, // BigInt as literal (123n)
                const: false, // const/let
                destructuring: false, // var { a, b } = obj;
                dynamicImport: false, // import()
                forOf: false,
                module: false, // import X from 'X';
            },
        },
        plugins: [
            // Makes environment variables available to source code through the specified key.
            // Use `webpack.DefinePlugin.runtimeValue()` to force re-compilation on file change, which
            // can be very useful for back-end file changes that aren't already in the compilation file-watch
            // list like source code is; See: https://webpack.js.org/plugins/define-plugin/#runtime-values-via-runtimevalue
            new webpack.DefinePlugin({ 'process.env': JSON.stringify(publicEnv) }),
            // injects tags like <script> into index.html
            new HtmlWebpackPlugin({
                title: indexHtmlTitle,
                template: Paths.getFileAbsPath(Paths.SRC.ABS, 'index.html'),
                meta: indexHtmlMetaTagData,
            }),
            // Adds specific matcher regex(es) for dynamic imports to tell them where to look when string
            // variables, template strings, and related non-static strings are used as args for dynamic imports.
            // In this case, allows the `src/assets/` directory to be searched for dynamic imports passed by
            // filename instead of import path.
            new webpack.ContextReplacementPlugin(
                /([./\\]*)|(.*\/src)|(@)\/assets\/.*/i,
                true,
            ),
            // Adds `mock-requests` as an entry file for automatic network mocks from CLI and in tests
            new MockRequestsWebpackPlugin(
                Paths.MOCKS.REL,
                'MockConfig.js',
                process.env.MOCK === 'true',
            ),
            // splits CSS out from the rest of the code
            new MiniCssExtractPlugin({
                filename: `${Paths.BUILD_OUTPUT.REL}/css/[name].[contenthash:8].css`,
                chunkFilename: `${Paths.BUILD_OUTPUT.REL}/css/[name].[contenthash:8].chunk.css`,
            }),
            // manually copies files from src to dest
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: `${Paths.ROOT.ABS}/package.json`,
                        to: '[name].[ext]',
                    },
                    {
                        from: `${Paths.SRC.REL}/manifest.json`,
                        to: '[name].[ext]',
                    },
                    {
                        from: `${Paths.SRC.REL}/ServiceWorker.js`,
                        to: '[name].[ext]',
                    },
                    {
                        // Ensures CNAME is copied to the build-output dir for gh-pages and similar deployments
                        // CopyWebpackPlugin uses globs, so make CNAME optional via `?(filename)`
                        from: `${Paths.ROOT.ABS}/CNAME`,
                        to: '[name].[ext]',
                        noErrorOnMissing: true,
                    },
                ],
            }),
            new AlterFilePostBuildPlugin(
                'ServiceWorker.js',
                /urlsToCache ?= ?\[\]/g,
                relativeEmittedFilePaths => {
                    const pathsWithoutServiceWorkerOrFonts = relativeEmittedFilePaths
                        .filter(path => !path.includes('ServiceWorker.js') && !path.includes('fonts'));
                    // CNAME (and similar files) aren't accessible via URL, and `cache.addAll(urls)` will fail if any
                    // of the URLs isn't available, so remove them from the build output file list
                    const pathsWithoutConfigOrLicenseFiles = pathsWithoutServiceWorkerOrFonts
                        .filter(url => !url.match(/CNAME|LICENSE/));
                    const fileUrlsToCache = pathsWithoutConfigOrLicenseFiles.map(path => `"./${path}"`); // ServiceWorker exists at root level

                    // `/` isn't a file but is routed to /index.html automatically.
                    // Add it manually so the URL can be mapped to a file.
                    fileUrlsToCache.push('"./"');

                    return `urlsToCache=[${fileUrlsToCache.join(',')}]`;
                },
                isProduction,
            ),
            new AlterFilePostBuildPlugin(
                'ServiceWorker.js',
                /urlsNotToCache ?= ?\[\]/g,
                `urlsNotToCache=[${fileUrlsNotToCacheInPwa
                    .map(url => url instanceof RegExp ? url : `"./${url}"`)
                    .join(',')
                }]`,
                isProduction,
            ),
            new AlterFilePostBuildPlugin(
                'ServiceWorker.js',
                'VERSION',
                packageJson.version,
                isProduction,
            ),
            new AlterFilePostBuildPlugin(
                'ServiceWorker.js',
                'BRD_CHANNEL',
                broadcastChannel,
                isProduction,
            ),
        ],
        optimization: {
            moduleIds: 'deterministic', // Prevent arbitrary moduleId incrementing, i.e. if the content hasn't changed, don't change the file's hash due to moduleId++. See: https://webpack.js.org/guides/caching/#module-identifiers
            minimize: isProduction,
            minimizer: [
                new TerserJSPlugin(),
                new CssMinimizerPlugin({
                    minimizerOptions: {
                        preset: 'default', // discards non-important comments, removes duplicates, etc.
                        discardComments: {
                            // removeAll: true // also remove /*! comments
                        },
                    },
                }),
            ],
            splitChunks: {
                chunks: 'all',
                // maxSize: 700000,  // Max file size of any chunk unless overridden below -- NOTE: Test multiple values since sometimes setting this can ironically bloat the output file sizes
                cacheGroups: {
                    /*
                     * Splits node_modules packages (as 'vendor') from src (as 'client').
                     * Without `splitChunks[cacheGroups[i]]?.maxSize`, this would merge all dependency packages into one
                     * single `vendor.js` file. `maxSize` keeps the file from getting too big.
                     *
                     * See:
                     *  - https://stackoverflow.com/questions/65858859/how-to-code-split-webpacks-vendor-chunk/70627948#70627948
                     */
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendor',
                        chunks: 'all',
                        // Set smaller max file size for dependencies since they change less frequently.
                        // This way, upon change to >= 1, the unchanged ones are more likely to be served from cache rather
                        // than being re-built.
                        maxSize: 200000,
                    },
                    // Split up stylesheets
                    styles: {
                        test: Styles,
                        type: 'css/mini-extract', // Suggested by the docs, though `type` technically only has value within individual plugins' use of the string. See: https://github.com/webpack-contrib/mini-css-extract-plugin#extracting-css-based-on-entry
                        name: 'styles',
                        chunks: 'all',
                        // Collect all CSS into a single file since the separated CSS files contained only duplicate code.
                        // This is either a bug or was originally caused by the old format of using `@import` in SCSS files
                        // instead of `@use`, where the latter supposedly prevents output CSS from being copy-pasted into
                        // each file that uses it.
                        // Requires more testing to find out.
                        // See bug: https://github.com/webpack-contrib/mini-css-extract-plugin/issues/52
                        enforce: true,
                    },
                },
            },
            runtimeChunk: {
                name: 'runtime',
            },
        },
        /**
         * @see [Cache]{@link https://webpack.js.org/configuration/cache/}
         */
        cache: {
            type: 'filesystem',
            compression: 'gzip',
        },
        performance: {
            hints: false, // disable "entrypoint size limit" warning
        },
        stats: {
            // Clean up npm output
            modules: false,
            children: false,
            // Allow SCSS debugging output
            loggingDebug: [ 'sass-loader' ],
        },
        devtool: sourceMap ? 'source-map' : false,
        /** @type {import('@types/webpack-dev-server').Configuration} */
        devServer: {
            /*
             * NOTE: You must allow incoming traffic and/or Webpack through your firewall to access the dev-server
             * from other devices on LAN.
             */
            ...((exposeServerOnLan) => exposeServerOnLan
                ? {
                    allowedHosts: 'all',
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST',
                        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
                    },
                    /**
                     * Technically, it isn't required anymore to explicitly define the IP address for accessing the
                     * dev-server on local LAN since Webpack v5 allows LAN IPs even without setting the host.
                     * Leaving it blank means `open` goes to `localhost` but the LAN IP is still accessible.
                     *
                     * Changes the domain from `localhost` to a specific name.
                     * e.g.
                     * - LAN IP to access dev server from other devices
                     * - `localhost.example.com` to access CORS APIs for your website
                     */
                    // host: 'local-ipv4',

                    // other possibly useful fields:
                    // contentBase: absoluteBuildOutputPath,
                    // inline: true,
                    // allowedHosts: [ '.example.com', 'localhost.other-service' ] || 'all',

                    /**
                     * If you want to log every attempt to connect to '/' and/or '/index.html'.
                     *
                     * @param {import('express')} app
                     * @param {import('webpack-dev-server/lib/Server.js').Server} server
                     * @param compiler
                     */
                    // before: (app, server, compiler) => {
                    //     app.all('*', (req, res, next) => {
                    //         if (req.url === '/' || req.url.includes('index.html')) {
                    //             console.log({ ...req.headers, url: req.url });
                    //         }
                    //         next();
                    //     });
                    // }

                    /*
                     * To use your own self-signed cert, use the Certs.ts util.
                     */
                } : {})(allowAccessFromAllOrigins),
            port: LocalLanHostIpAddresses.port,
            open: true, // open browser window upon build
            hot: hotReloading, // for `module.hot` hot-reloading block in index.js
            historyApiFallback: true, // Fall back to index.html upon 404
            /** @type {import('https').ServerOptions} */
            server: { // HTTPS configs if not using HTTP
                type: useHttps ? 'https' : 'http',
            },
            devMiddleware: {
                stats: 'minimal', // silence superfluous webpack-dev-server "emitted" output
            },
            client: {
                overlay: true, // show full-screen display of compiler errors
                // progress: true, // show compilation progress in browser console when webpack is (re-)compiling
            },
            /**
             * For forwarding the specified URLs made to `devServer.host` to a different domain.
             *
             * Useful for:
             *   - Hitting another local server's endpoints if developing new APIs locally.
             *   - Accessing CORS resources. This requires `host` to be the same domain as the website, which might require `https` as well.
             *
             * Can have multiple of these objects for routing to different domains.
             * e.g.
             *   `/api` --> `api.example.com`
             *   `/auth` --> `third-party-auth.com`
             *   `/api/newEndpoint` --> `localhost:8080`  for a new endpoint being created locally
             *
             * Can also use an object instead of array if `context.length === 1`:
             * proxy: {
             *     '/api': { ...everythingExceptContext },
             *     '/auth': { ...everythingExceptContext }
             * }
             *
             * @see [Webpack `devServer.proxy` docs]{@link https://webpack.js.org/configuration/dev-server/#devserverproxy}
             * @see [All `http-proxy-middleware` options available to `devServer.proxy`]{@link https://github.com/chimurai/http-proxy-middleware#http-proxy-options}
             */
            // proxy: [{
            //     ...(() => {
            //         // domain to which you want to forward all URLs specified by `context` (instead of having them be made to `devServer.host`)
            //         // e.g. fetch('/api/getUser')
            //         //      Original URL: 'https://localhost/api/user'
            //         //      Proxied URL: 'https://test-env.example.com/api/user'
            //         const corsProxyDestination = 'https://test-env.example.com';
            //         const corsProxyUrl = new URL(corsProxyDestination);
            //
            //         return {
            //             target: corsProxyDestination,
            //             context: [ '/**/*' ], // All URLs you want to be proxied to `target`. Here, we forward everything containing 2 slashes so that dev server's resource files are still served from `host`.
            //             secure: false, // Allows using HTTPS without a valid certificate (which is the default case, unless you manually add a localhost cert yourself).
            //             changeOrigin: true, // Changes the origin of the request to be that of `target` (required for CORS).
            //             followRedirects: true, // Follow redirects (301, 302, 307, 308, etc.).
            //             headers: { // Specific headers to pass to the proxied request.
            //                 // Origin is overridden by `changeOrigin`, but `referer` and `host` aren't.
            //                 // Since some servers check these headers, set all of them to the CORS proxy's destination.
            //                 origin: corsProxyUrl.origin,
            //                 referer: corsProxyUrl.origin,
            //                 host: corsProxyUrl.host,
            //             },
            //             // cookieDomainRewrite: corsProxyUrl.host, // Override Set-Cookie `Domain` configs - Could be a single string or object of old-to-new mappings.
            //         };
            //     })(),
            // }],
        },
    };
}

export default getWebpackConfig;
