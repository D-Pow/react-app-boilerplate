const { defaults } = require('jest-config');

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
    coveragePathIgnorePatterns: [
        '<rootDir>/config'
    ]
};

module.exports = jestConfig;
