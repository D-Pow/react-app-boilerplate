const {
    parseCliArgs,
} = require('./parseCliArgs');

const {
    Paths,
    FileTypeRegexes,
    getMain,
    isMain,
    getOutputFileName,
    findFile,
    openWithDefaultApp,
    getGitignorePaths,
    convertPathsToRegex,
    convertPathsToGlobs,
    stripJsComments,
    gitignoreFiles,
    gitignoreFilesRegex,
    gitignoreFilesGlobs,
    babelConfigPath,
    tsconfigPath,
    tsconfigDevPath,
    tsconfig,
    ImportAliases,
} = require('./Files');

const {
    getOsHostnameAndLanIP,
    LocalLanHostIpAddresses,
    downloadFile,
} = require('./Network');


/*
 * Because this file is also imported by MJS files, if we want our MJS files to
 * be able to use named imports instead of only the default import, we have
 * to specify each field manually.
 * In other words, because MJS files are using named imports from this file,
 * `module.exports` has the same restrictions as named/default exports in ESM.
 * Note that if only CJS files were importing this file, then we could use the
 * spread operator (e.g. `...require('./MyFile')`
 */
module.exports = {
    parseCliArgs,
    Paths,
    FileTypeRegexes,
    getMain,
    isMain,
    getOutputFileName,
    findFile,
    openWithDefaultApp,
    getGitignorePaths,
    convertPathsToRegex,
    convertPathsToGlobs,
    stripJsComments,
    gitignoreFiles,
    gitignoreFilesRegex,
    gitignoreFilesGlobs,
    babelConfigPath,
    tsconfigPath,
    tsconfigDevPath,
    tsconfig,
    ImportAliases,
    getOsHostnameAndLanIP,
    LocalLanHostIpAddresses,
    downloadFile,
};
