const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InterpolateHtmlPlugin = require('interpolate-html-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const packageJson = require('./package.json');

const indexHtmlTitle = 'React App Boilerplate';
const indexHtmlMetaTagData = {
    description: packageJson.description,
    keywords: packageJson.keywords.join(', '),
    'theme-color': '#3800FF'
};

const publicUrl = 'static'; // directory of build output files relative to index.html

const env = dotenv.config({
    path: './.env'
}).parsed;

process.env = {
    ...process.env,
    ...env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PUBLIC_URL: publicUrl,
    NODE_PATH: 'src/'
};

const publicEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NODE_PATH: process.env.NODE_PATH,
    PUBLIC_URL: process.env.PUBLIC_URL,
    MOCK: process.env.MOCK
};

// output path for webpack build on machine, not relative paths for index.html
const buildOutputPaths = {
    development: '',
    production: 'dist'
};
const buildOutputPath = process.env.NODE_ENV === 'production' ? buildOutputPaths.production : buildOutputPaths.development;

const jsRegex = /\.jsx?$/;
const tsRegex = /\.tsx?$/;
const scssRegex = /\.s?css$/;
const assetRegex = /\.(png|gif|jpe?g|svg|ico|pdf|tex)$/;

const hotReloading = false; // process.env.NODE_ENV === 'development';

const srcDir = path.resolve(__dirname, 'src');
const clientEntryFiles = [ '@babel/polyfill', srcDir + '/index.js' ];
const babelLoaderIncludeDirs = [ srcDir ];

if (process.env.MOCK === 'true') {
    var mockDir = path.resolve(__dirname, 'mocks');
    var mockEntryFiles = path.resolve(mockDir, 'MockConfig.js');

    // Update entry files and babel-loader's include directories
    clientEntryFiles.push(mockEntryFiles);
    babelLoaderIncludeDirs.push(mockDir);
    console.log('Network mocks activated by MockRequests\n');
}

module.exports = {
    module: {
        rules: [
            {
                test: jsRegex,
                exclude: /node_modules/,
                include: babelLoaderIncludeDirs,
                use: 'babel-loader'
            },
            {
                test: tsRegex,
                exclude: /node_modules/,
                include: /src/,
                use: [
                    'babel-loader',
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
                    'css-loader',
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
                test: assetRegex,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: `${publicUrl}/assets/[name]-[hash:8].[ext]`
                        }
                    }
                ]
            }
        ]
    },
    resolve: {
        extensions: ['*', '.js', '.jsx'],
        modules: [
            path.resolve(__dirname, 'src'),
            'node_modules'
        ]
    },
    entry: {
        client: clientEntryFiles,
        vendor: ['react', 'react-dom', 'react-router-dom', 'prop-types']
    },
    output: {
        path: path.resolve(__dirname, buildOutputPath),
        filename: `${publicUrl}/js/[name].[hash:8].bundle.js`,
        chunkFilename: `${publicUrl}/js/[name].[hash:8].chunk.js`
    },
    plugins: [
        // makes env available to src
        new webpack.DefinePlugin({ 'process.env': JSON.stringify(publicEnv) }),
        // injects tags like <script> into index.html
        new HtmlWebpackPlugin({
            title: indexHtmlTitle,
            template: './src/index.html',
            meta: indexHtmlMetaTagData
        }),
        // replaces %PUBLIC_URL% in index.html with env entry
        new InterpolateHtmlPlugin(publicEnv),
        // splits CSS out from the rest of the code
        new MiniCssExtractPlugin({
            filename: `${publicUrl}/css/[name].[contenthash:8].css`
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
            },
            {
                from: 'src/assets/favicon*',
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
