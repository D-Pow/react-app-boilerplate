import { createRequire } from 'module';


/**
 * There are a couple ways to import CJS files:
 *  - const { myFunc } = await import('myFunc.js');
 *  - const MyCls = (await import('MyCls.js')).default  // Note the `.default` is needed for `module.exports = MyCls;`
 *  - Using `module.createRequire()`.
 *
 * This uses `module.createRequire()` because it allows importing both JS and non-JS files,
 * so .json, .txt, etc. can also be imported.
 *
 * @param {string} filePath - Path to the file desired to be imported.
 * @returns {*} - Content of that file. JS files will be treated as normal and JSON files will be objects.
 */
function importNonEsmFile(filePath) {
    const require = createRequire(import.meta.url);

    return require(filePath);
}


const parseCliArgs = importNonEsmFile('./parseCliArgs');
const {
    Paths,
    findFile,
    FileTypeRegexes,
    getOutputFileName,
    getGitignorePathsWithExtraGlobStars,
    stripJsComments,
    tsconfig,
} = importNonEsmFile('./Files');
const {
    getOsHostnameAndLanIP,
    LocalLanHostIpAddresses,
} = importNonEsmFile('./Network');


export {
    importNonEsmFile,
    parseCliArgs,
    Paths,
    findFile,
    FileTypeRegexes,
    getOutputFileName,
    getGitignorePathsWithExtraGlobStars,
    stripJsComments,
    tsconfig,
    getOsHostnameAndLanIP,
    LocalLanHostIpAddresses,
};
