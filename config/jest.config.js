const fs = require('fs');
const path = require('path');
const { defaults } = require('jest-config');

// TODO improve listing and move to shared config file
const Paths = {
    ROOT: '..',
    SRC: 'src',
    TESTS: 'test',
    CONFIG: 'config'
};
Paths.APP_ROOT = path.resolve(__dirname, Paths.ROOT);

const allAppDirectories = fs.readdirSync(Paths.APP_ROOT, { withFileTypes: true })
    .filter(directoryEntry => directoryEntry.isDirectory())
    .map(directory => directory.name);
const allAppDirsFormattedForJest = allAppDirectories.map(dir => `<rootDir>/${dir}`);
const nonSrcJestDirs = allAppDirsFormattedForJest.filter(directory => !directory.includes(Paths.SRC));

/** @type {import('@jest/types').Config.InitialOptions} */
const jestConfig = {
    ...defaults,
    rootDir: '..',
    setupFiles: [
        '<rootDir>/config/jestSetup.js'
    ],
    modulePaths: [
        '<rootDir>/src'
    ],
    modulePathIgnorePatterns: [
        '<rootDir>/dist'
    ],
    moduleNameMapper: {
        '\\.(s?css|png|gif|jpe?g|svg|ico|pdf|tex)': '<rootDir>/config/jestFileMock.js'
    },
    transform: {
        '\\.[tj]sx?$': '<rootDir>/config/jestTransformer.js'
    },
    collectCoverage: true,
    coveragePathIgnorePatterns: nonSrcJestDirs
};

module.exports = jestConfig;
