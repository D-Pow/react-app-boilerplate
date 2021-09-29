import * as fs from 'fs';
import { defaults } from 'jest-config';
import { Paths, FileTypeRegexes } from '../utils.mjs';

/*
 * Note: Add the `--no-cache` CLI option during development of jest transformers
 */

// const { collectCoverage } = parseCliArgs({
//     combineShortLongFlags: {
//         collectCoverage: [ 'coverage' ],
//     },
//     numArgs: {
//         collectCoverage: 0,
//     },
// });

const allAppDirectories = fs.readdirSync(Paths.ROOT.ABS, { withFileTypes: true })
    .filter(directoryEntry => directoryEntry.isDirectory())
    .map(directory => directory.name);
const allAppDirsFormattedForJest = allAppDirectories.map(dir => `<rootDir>/${dir}`);
const nonSrcJestDirs = allAppDirsFormattedForJest.filter(directory => !directory.includes(Paths.SRC.REL));

const scriptFiles = FileTypeRegexes.regexToString(FileTypeRegexes.JsAndTs);
const assetFiles = FileTypeRegexes.regexToString(FileTypeRegexes.combineRegexes(FileTypeRegexes.Assets, FileTypeRegexes.Styles));

/** @type {import('@jest/types').Config.InitialOptions} */
const jestConfig = {
    ...defaults,
    rootDir: Paths.ROOT.ABS,
    testEnvironment: 'jsdom',
    setupFiles: [
        Paths.getFileAbsPath(Paths.CONFIG.JEST.ABS, 'jestSetup.js'),
        Paths.getFileAbsPath(Paths.MOCKS.ABS, 'MockConfig.js'), // Mock network requests using default MockRequests configuration in mocks/MockConfig.js
    ],
    // Alternative to setting NODE_PATH (which defaults to `/`).
    // `moduleNameMapper` allows more fine-grained control, which is better
    // for our use case since we have multiple import aliases.
    // modulePaths: [
    //     Paths.SRC.ABS
    // ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^/(.*)$': '<rootDir>/$1',
    },
    modulePathIgnorePatterns: [
        Paths.BUILD_ROOT.ABS,
    ],
    transform: {
        [scriptFiles]: [
            'babel-jest',
            {
                configFile: Paths.getFileAbsPath(Paths.CONFIG.ABS, 'babel.config.js'),
            },
        ],
        [assetFiles]: Paths.getFileAbsPath(Paths.CONFIG.JEST.ABS, 'jestAssetTransformer.mjs'),
    },
    // collectCoverage,
    coveragePathIgnorePatterns: nonSrcJestDirs,
    // TODO Add custom CLI arg to activate showing coverage for all src files, not just those used in tests
    // collectCoverageFrom: [
    //     `${Paths.SRC.REL}/**/*.[jt]s?(x)`
    // ]
};

export default jestConfig;
