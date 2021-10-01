import webpack from 'webpack';
import dotenv from 'dotenv';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import TerserJSPlugin from 'terser-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
const MockRequestsWebpackPlugin = (await import('mock-requests/bin/MockRequestsWebpackPlugin.js')).default;
import AlterFilePostBuildPlugin from './AlterFilePostBuildPlugin.mjs';
import {
    Paths,
    FileTypeRegexes,
    getOutputFileName,
    LocalLanHostIpAddresses,
    importNonEsmFile,
} from './utils.mjs';
const babelConfig = importNonEsmFile(Paths.getFileAbsPath(Paths.CONFIG.ABS, 'babel.config.js'));
const packageJson = importNonEsmFile(Paths.getFileAbsPath(Paths.ROOT.ABS, 'package.json'));
const manifestJson = importNonEsmFile(Paths.getFileAbsPath(Paths.SRC.ABS, 'manifest.json'));


const isProduction = process.env.NODE_ENV === 'production';
const allowAccessFromOtherDevicesOnLan = Boolean(process.env.ALLOW_LAN_ACCESS);
const useHttps = false;
const sourceMap = !isProduction; // allows for passing `sourceMap` directly by name to loaders/plugins options

const indexHtmlTitle = 'React App Boilerplate';
const indexHtmlMetaTagData = {
    description: packageJson.description,
    keywords: packageJson.keywords.join(', '),
    'theme-color': manifestJson.theme_color,
    viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no',
};

const broadcastChannel = packageJson.name;
const fileUrlsNotToCacheInPwa = [];

const env = dotenv.config({
    path: Paths.getFileAbsPath(Paths.ROOT.ABS, '.env'),
}).parsed;

process.env = {
    ...process.env,
    ...env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PUBLIC_URL: Paths.BUILD_OUTPUT.REL,
};

const publicEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PUBLIC_URL: process.env.PUBLIC_URL,
    BROADCAST_CHANNEL: broadcastChannel,
    MOCK: process.env.MOCK,
};

const {
    JavaScript,
    TypeScript,
    Styles,
    Svg,
    Binaries,
    Text,
    Fonts,
} = FileTypeRegexes;

const hotReloading = false; // process.env.NODE_ENV === 'development';

/** @type {import('webpack/types').WebpackOptionsNormalized} */
const webpackConfig = {
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
                test: JavaScript,
                exclude: /node_modules/,
                include: new RegExp(Paths.SRC.REL),
                use: {
                    loader: 'babel-loader',
                    options: babelConfig,
                },
            },
            {
                test: TypeScript,
                exclude: /node_modules/,
                include: new RegExp(Paths.SRC.REL),
                use: [
                    {
                        loader: 'babel-loader',
                        options: babelConfig,
                    },
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: `${Paths.ROOT.ABS}/tsconfig.json`,
                        },
                    },
                ],
            },
            {
                test: Styles,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            // Prevent URL re-writing (e.g. `background: url('image.png')` -> `url('./image.png')`.
                            // Necessary so the Fonts.scss can access output files via relative paths.
                            url: false,
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
                                    'postcss-preset-env',
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
                use: [
                    {
                        loader: '@svgr/webpack',
                        options: {
                            // See: https://react-svgr.com/docs/options/
                            // outDir: `${Paths.BUILD_OUTPUT.REL}/assets`,
                            ref: true,
                        },
                    },
                    {
                        loader: 'file-loader',
                        options: {
                            name: absPath => getOutputFileName(absPath),
                        },
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
        alias: {
            '@': Paths.SRC.ABS,
            '/': Paths.ROOT.ABS,
        },
    },
    entry: {
        client: {
            import: Paths.getFileAbsPath(Paths.SRC.ABS, 'index.js'),
            dependOn: 'common',
        },
        common: [
            /*
             * Polyfills not covered with core-js include:
             * fetch, Proxy, BigInt, Intl, String.prototype.normalize
             * See: https://github.com/zloirock/core-js#missing-polyfills
             *
             * Only polyfill `fetch()` since it's the only one used for now.
             */
            'isomorphic-fetch',
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
        sourceMapFilename: '[base].map',
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
        // makes env available to src
        new webpack.DefinePlugin({ 'process.env': JSON.stringify(publicEnv) }),
        // injects tags like <script> into index.html
        new HtmlWebpackPlugin({
            title: indexHtmlTitle,
            template: Paths.getFileAbsPath(Paths.SRC.ABS, 'index.html'),
            meta: indexHtmlMetaTagData,
        }),
        new MockRequestsWebpackPlugin(
            Paths.MOCKS.REL,
            'MockConfig.js',
            process.env.MOCK === 'true',
        ),
        // splits CSS out from the rest of the code
        new MiniCssExtractPlugin({
            filename: `${Paths.BUILD_OUTPUT.REL}/css/[name].[contenthash:8].css`,
        }),
        // manually copies files from src to dest
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: `${Paths.SRC.REL}/manifest.json`,
                    to: '[name].[ext]',
                },
                {
                    from: `${Paths.SRC.REL}/ServiceWorker.js`,
                    to: '[name].[ext]',
                },
            ],
        }),
        new AlterFilePostBuildPlugin(
            'ServiceWorker.js',
            /urlsToCache ?= ?\[\]/g,
            relativeEmittedFilePaths => {
                const pathsWithoutServiceWorkerOrFonts = relativeEmittedFilePaths
                    .filter(path => !path.includes('ServiceWorker.js') && !path.includes('fonts'));
                const fileUrlsToCache = pathsWithoutServiceWorkerOrFonts.map(path => `"./${path}"`); // ServiceWorker exists at root level

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
                .map(url => url instanceof RegExp ? url : `"./${url}"` )
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
            cacheGroups: {
                vendor: { // split node_modules (as vendor) from src (as client)
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    chunks: 'all',
                },
                styles: {
                    test: Styles,
                    name: 'styles',
                    chunks: 'all',
                    enforce: true, // collect all CSS into a single file since the separated CSS files contained only duplicate code
                },
            },
        },
        runtimeChunk: {
            name: 'runtime',
        },
    },
    performance: {
        hints: false, // disable "entrypoint size limit" warning
    },
    stats: { modules: false, children: false }, // clean up npm output
    devtool: sourceMap ? 'source-map' : false,
    /** @type {import('@types/webpack-dev-server').Configuration} */
    devServer: {
        ...((exposeServerOnLan) => exposeServerOnLan
            // NOTE: You must allow webpack through your firewall for this to work.
            ? {
                // changes the domain from `localhost` to a specific name.
                // e.g.
                // * LAN IP to access dev server from other devices
                // * `localhost.example.com` to access CORS APIs for your website
                host: 'local-ipv4',

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
                 * To use your own self-signed HTTPS dev-server certificate instead
                 * of the one Webpack provides, `npm install -D mkcert` and then either
                 * 1. `npx mkcert create-X` to install on your OS (required to make "Not secure"
                 *    disappear from your browser).
                 * 2. Generate it on-the-fly (no better than Webpack's b/c "Not secure" won't
                 *    disappear).
                 *
                 * import mkcert from 'mkcert'
                 * const certificateAuthority = await mkcert.createCA({
                 *     validityDays: 1,
                 *     organization: 'Localhost Org',
                 *     state: 'New York',
                 *     locality: 'New York City',
                 *     countryCode: 'US',
                 * });
                 * const serverCertificate = await mkcert.createCert({
                 *     validityDays: 1,
                 *     domains: [ 'localhost', LocalLanHostIpAddresses.IPv4 ],
                 *     caKey: certificateAuthority.key,
                 *     caCert: certificateAuthority.cert,
                 * });
                 * https: {
                 *     cacert: certificateAuthority.cert, // Don't add CA's private key, otherwise anyone could be that CA
                 *     key: serverCertificate.key, // Do add server's key, but only since this is localhost
                 *     cert: serverCertificate.cert, // Like the CA, the server has to provide a cert as well
                 * }
                 */
            } : {})(allowAccessFromOtherDevicesOnLan),
        port: LocalLanHostIpAddresses.port,
        open: true, // open browser window upon build
        hot: hotReloading, // for `module.hot` hot-reloading block in index.js
        historyApiFallback: true, // Fall back to index.html upon 404
        /** @type {import('https').ServerOptions} */
        https: useHttps, // use HTTPS instead of HTTP
        devMiddleware: {
            stats: 'minimal', // silence superfluous webpack-dev-server "emitted" output
        },
        client: {
            overlay: true, // show full-screen display of compiler errors
            // progress: true, // show compilation progress in browser console when webpack is (re-)compiling
        },
        /*
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
         */
        // proxy: [{
        //     // domain to which you want to forward all URLs specified by `context` (instead of having them be made to `devServer.host`)
        //     // e.g. fetch('/api/getUser')
        //     //      Original URL: 'https://localhost/api/user'
        //     //      Proxied URL: 'https://test-env.example.com/api/user'
        //     target: 'https://test-env.example.com',
        //     context: [ '/**/*' ], // all URLs you want to be proxied to `target`. Here, we forward everything containing 2 slashes so that dev server's resource files are still served from `host`.
        //     secure: false, // allows using HTTPS without a valid certificate (which is the default case, unless you manually add a localhost cert yourself).
        //     changeOrigin: true // changes the origin of the request to be that of `target` (required for CORS).
        // }]
    },
};

export default webpackConfig;
