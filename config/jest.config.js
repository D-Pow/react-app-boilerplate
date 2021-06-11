const fs = require('fs');
const path = require('path');
const { defaults } = require('jest-config');
const { Paths, FileTypeRegexes } = require('./utils');

const allAppDirectories = fs.readdirSync(Paths.ROOT_ABS, { withFileTypes: true })
    .filter(directoryEntry => directoryEntry.isDirectory())
    .map(directory => directory.name);
const allAppDirsFormattedForJest = allAppDirectories.map(dir => `<rootDir>/${dir}`);
const nonSrcJestDirs = allAppDirsFormattedForJest.filter(directory => !directory.includes(Paths.SRC));

const scriptFiles = FileTypeRegexes.regexToString(FileTypeRegexes.JsAndTs);
const assetFiles = FileTypeRegexes.regexToString(FileTypeRegexes.Assets);

/** @type {import('@jest/types').Config.InitialOptions} */
const jestConfig = {
    ...defaults,
    rootDir: '..',
    testEnvironment: 'jsdom',
    setupFiles: [
        '<rootDir>/config/jestSetup.js',
        '<rootDir>/mocks/MockConfig.js' // Mock network requests using default MockRequests configuration in mocks/MockConfig.js
    ],
    modulePaths: [
        '<rootDir>/src'
    ],
    modulePathIgnorePatterns: [
        '<rootDir>/dist'
    ],
    transform: {
        [scriptFiles]: [
            'babel-jest',
            {
                configFile: path.resolve(Paths.CONFIG_ABS, 'babel.config.json')
            }
        ],
        [assetFiles]: '<rootDir>/config/jestAssetTransformer.js'
    },
    collectCoverage: true,
    coveragePathIgnorePatterns: nonSrcJestDirs
    // TODO Add custom CLI arg to activate showing coverage for all src files, not just those used in tests
    // collectCoverageFrom: [
    //     'src/**/*.[jt]s?(x)'
    // ]
};

module.exports = jestConfig;
