import * as fs from 'fs';
import { defaults } from 'jest-config';
import { Paths, processArgs, FileTypeRegexes } from './utils.mjs';

/*
 * Note: Add the `--no-cache` CLI option during development of jest transformers
 */

// const { collectCoverage } = processArgs({
//     '--coverage': 'collectCoverage',
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
    rootDir: Paths.ROOT.REL,
    testEnvironment: 'jsdom',
    setupFiles: [
        Paths.getFileAbsPath(Paths.CONFIG.ABS, 'jestSetup.js'),
        Paths.getFileAbsPath(Paths.MOCKS.ABS, 'MockConfig.js') // Mock network requests using default MockRequests configuration in mocks/MockConfig.js
    ],
    modulePaths: [
        Paths.SRC.ABS
    ],
    modulePathIgnorePatterns: [
        Paths.BUILD_ROOT.ABS
    ],
    transform: {
        [scriptFiles]: [
            'babel-jest',
            {
                configFile: Paths.getFileAbsPath(Paths.CONFIG.ABS, 'babel.config.json')
            }
        ],
        [assetFiles]: Paths.getFileAbsPath(Paths.CONFIG.ABS, 'jestAssetTransformer.mjs')
    },
    // collectCoverage,
    coveragePathIgnorePatterns: nonSrcJestDirs,
    // TODO Add custom CLI arg to activate showing coverage for all src files, not just those used in tests
    // collectCoverageFrom: [
    //     `${Paths.SRC.REL}/**/*.[jt]s?(x)`
    // ]
};

export default jestConfig;
