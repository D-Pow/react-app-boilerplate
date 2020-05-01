const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InterpolateHtmlPlugin = require('interpolate-html-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const resolveMocks = require('mock-requests/bin/resolve-mocks');
const packageJson = require('../package.json');
const babelConfig = require('./babel.config.json');

const paths = { // resolved relative to root dir since that's where the initial npm script is run
    root: path.resolve('./')
};

const indexHtmlTitle = 'React App Boilerplate';
const indexHtmlMetaTagData = {
    description: packageJson.description,
    keywords: packageJson.keywords.join(', '),
    'theme-color': '#3800FF'
};

// output path for webpack build on machine, not relative paths for index.html
const relativeBuildOutputPaths = {
    development: '',
    production: 'dist'
};
const relativeBuildOutputPath = process.env.NODE_ENV === 'production' ? relativeBuildOutputPaths.production : relativeBuildOutputPaths.development;
const absoluteBuildOutputPath = path.resolve(paths.root, relativeBuildOutputPath);
const transpiledSrcOutputPath = 'static'; // directory of build output files relative to index.html

const env = dotenv.config({
    path: paths.root + '/.env'
}).parsed;

process.env = {
    ...process.env,
    ...env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PUBLIC_URL: transpiledSrcOutputPath,
    NODE_PATH: 'src/'
};

const publicEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NODE_PATH: process.env.NODE_PATH,
    PUBLIC_URL: process.env.PUBLIC_URL,
    MOCK: process.env.MOCK
};

const jsRegex = /\.jsx?$/;
const tsRegex = /\.tsx?$/;
const scssRegex = /\.s?css$/;
const assetRegex = /\.(png|gif|jpe?g|svg|ico|pdf|tex)$/;
const fontRegex = /\.(ttf|woff2?|eot)$/;

const hotReloading = false; // process.env.NODE_ENV === 'development';

const resolvedMocks = resolveMocks('mocks', 'mocks/MockConfig.js', process.env.MOCK === 'true');

module.exports = {
    module: {
        rules: [
            {
                test: jsRegex,
                exclude: /node_modules/,
                include: [ /src/, ...resolvedMocks.include ],
                use: {
                    loader: 'babel-loader',
                    options: babelConfig
                }
            },
            {
                test: tsRegex,
                exclude: /node_modules/,
                include: /src/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: babelConfig
                    },
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'config/tsconfig.json'
                        }
                    }
                ]
            },
            {
                test: scssRegex,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            hmr: hotReloading,
                        }
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            url: false
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            plugins: () => require('postcss-preset-env')
                        }
                    },
                    'sass-loader'
                ]
            },
            {
                test: [ assetRegex, fontRegex ],
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: absolutePathToAsset => {
                                const assetName = absolutePathToAsset.slice(absolutePathToAsset.lastIndexOf('/') + 1);

                                if (assetName.includes('favicon')) {
                                    /**
                                     * `[path]` == relative path from src folder,
                                     * e.g. `src/assets/my-image.png` or `src/assets/images/my-image.png`.
                                     *
                                     * Don't append `[path]` for favicon files since they
                                     * need to be in the output root directory.
                                     *
                                     * This, mixed with the removal of `static/` in the
                                     * `outputPath` function results in outputting favicon
                                     * files in output root directory.
                                     */
                                    return `[name].[ext]`;
                                }

                                if (fontRegex.test(assetName)) {
                                    // Don't append hash to font file outputs
                                    // so that the SCSS mixin can work with the direct file name
                                    return '[path][name].[ext]';
                                }

                                return '[path][name]-[hash:8].[ext]';
                            },
                            outputPath: outputFromNameFunction => {
                                /**
                                 * Samples:
                                 * '[path][name]-[hash:8].[ext]'   ->   `src/assets/MyImage-991ec5ea.png`
                                 * '[name].[ext]'   ->   `MyImage.png`
                                 */
                                const indexForPathRelativeToSrc = outputFromNameFunction.indexOf('/') + 1;
                                const pathRelativeToSrc = outputFromNameFunction.slice(indexForPathRelativeToSrc);

                                if (pathRelativeToSrc.includes('favicon')) {
                                    // Don't add `static/` to favicon images.
                                    // Results in outputting them to output root directory.
                                    return pathRelativeToSrc;
                                }

                                return `${transpiledSrcOutputPath}/${pathRelativeToSrc}`;
                            }
                        }
                    }
                ]
            }
        ]
    },
    resolve: {
        extensions: ['*', '.js', '.jsx'],
        modules: [
            paths.root + '/src',
            'node_modules'
        ]
    },
    entry: {
        client: [ 'core-js', 'isomorphic-fetch', paths.root + '/src/index.js', ...resolvedMocks.entry ],
        vendor: ['react', 'react-dom', 'react-router-dom', 'prop-types']
    },
    output: {
        path: absoluteBuildOutputPath, // output path for webpack build on machine, not relative paths for index.html
        filename: `${transpiledSrcOutputPath}/js/[name].[hash:8].bundle.js`,
        chunkFilename: `${transpiledSrcOutputPath}/js/[name].[hash:8].chunk.js`
    },
    plugins: [
        // makes env available to src
        new webpack.DefinePlugin({ 'process.env': JSON.stringify(publicEnv) }),
        // injects tags like <script> into index.html
        new HtmlWebpackPlugin({
            title: indexHtmlTitle,
            template: paths.root + '/src/index.html',
            meta: indexHtmlMetaTagData
        }),
        // replaces %PUBLIC_URL% in index.html with env entry
        new InterpolateHtmlPlugin(publicEnv),
        // splits CSS out from the rest of the code
        new MiniCssExtractPlugin({
            filename: `${transpiledSrcOutputPath}/css/[name].[contenthash:8].css`
        }),
        // manually copies files from src to dest
        new CopyWebpackPlugin([
            {
                from: 'src/manifest.json',
                to: '[name].[ext]'
            },
            {
                from: 'src/ServiceWorker.js',
                to: '[name].[ext]'
            }
        ])
    ],
    optimization: {
        minimizer: [ new TerserJSPlugin(), new OptimizeCSSAssetsPlugin() ],
        splitChunks: {
            cacheGroups: {
                vendor: { // split node_modules (as vendor) from src (as client)
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    chunks: 'all'
                },
                styles: {
                    test: scssRegex,
                    name: 'styles',
                    chunks: 'all',
                    enforce: true // collect all CSS into a single file since the separated CSS files contained only duplicate code
                }
            }
        }
    },
    performance: {
        hints: false // disable "entrypoint size limit" warning
    },
    stats: { modules: false, children: false }, // clean up npm output
    devServer: {
        port: 3000,
        stats: 'minimal',  // silence superfluous webpack-dev-server "emitted" output
        open: true, // open browser window upon build
        hot: hotReloading, // for `module.hot` hot-reloading block in index.js
        historyApiFallback: true // For React Router
    }
};
