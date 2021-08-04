import * as os from 'os';
import * as path from 'path';
import { createRequire } from 'module';

const devServerPort = 3000;

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

/**
 * Attempt parsing value to a JavaScript variable.
 * i.e. Attempt parsing `'10'` to `10`.
 * Default to returning the original (string) value of the variable.
 *
 * @param {*} val - Variable to try to parse.
 * @returns {*} - Parsed variable or original string.
 */
function attemptParseJson(val) {
    try {
        return JSON.parse(val);
    } catch (e) {
        return val;
    }
}

/**
 * Parses CLI args and converts their values to the desired names.
 *
 * @param {Object} cliArgToVarNameMap - CLI string to desired variable name map.
 * @returns {Object} - Variable name to value map.
 */
function processArgs(cliArgToVarNameMap) {
    const { argv } = process;
    const argKeys = Object.keys(cliArgToVarNameMap);
    const argValues = Object.values(cliArgToVarNameMap);
    const argsToSearchFor = new Set(argKeys);
    const retVal = argValues.reduce((returnObj, argName) => {
        returnObj[argName] = false;

        return returnObj;
    }, {});

    argv.forEach(arg => {
        let [ cliKey, cliVal ] = arg.split('=');

        if (argsToSearchFor.has(cliKey)) {
            const returnObjKey = cliArgToVarNameMap[cliKey];
            cliVal = attemptParseJson(cliVal) || true;

            retVal[returnObjKey] = cliVal;
        }
    });

    return retVal;
}

function getOsHostnameAndLanIP(protocolVersion = 4) {
    const allNetworkInterfaces = os.networkInterfaces();
    const localLanIp = Object.entries(allNetworkInterfaces)
        .reduce((localLan, [ networkInterface, addresses ]) => {
            const ipv4Addresses = addresses.filter(({ family, address, internal }) => (
                family === `IPv${protocolVersion}`
                && address.indexOf('127') !== 0
                && !address.includes('/')
                && !internal
            ));

            // return ipv4Addresses?.[0]?.address || localLanIp;
            return localLan || (
                ipv4Addresses.length
                    ? ipv4Addresses[0].address
                    : ''
            );
        }, '');

    return localLanIp;
}

const LocalLanHostIpAddresses = {
    hostname: os.hostname(),
    port: devServerPort,
    IPv4: getOsHostnameAndLanIP(),
    IPv6: getOsHostnameAndLanIP(6),
    getPublicPath: (exposeOnLan, protocol = 'http://') => exposeOnLan
        ? `${protocol || ''}${LocalLanHostIpAddresses.IPv4}:${LocalLanHostIpAddresses.port}`
        : '',
};


const Paths = (() => {
    const ROOT = {
        REL: '..',
        ABS: null
    };
    const CONFIG = {
        REL: 'config',
        ABS: null
    };
    const SRC = {
        REL: 'src',
        ABS: null
    };
    const BUILD_ROOT = { // output path for webpack build on machine, holds entire app but isn't used by it
        REL: 'dist',
        ABS: null
    };
    const BUILD_OUTPUT = { // output path for app, used by index.html
        REL: 'static',
        ABS: null
    };
    const MOCKS = {
        REL: 'mocks',
        ABS: null
    };
    const TESTS = {
        REL: 'tests',
        ABS: null
    };

    // `__dirname` doesn't exist in Node ESM
    ROOT.ABS = path.resolve(process.cwd());

    [ CONFIG, SRC, BUILD_ROOT, BUILD_OUTPUT, MOCKS, TESTS ].forEach(pathConfig => {
        pathConfig.ABS = path.resolve(ROOT.ABS, pathConfig.REL);
    });

    const getFileAbsPath = (dirAbsPath, filename) => path.resolve(dirAbsPath, filename);

    return {
        ROOT,
        CONFIG,
        SRC,
        BUILD_ROOT,
        BUILD_OUTPUT,
        MOCKS,
        TESTS,
        getFileAbsPath,
    };
})();


const FileTypeRegexes = {
    get Code() {
        const codeFiles = [
            FileTypeRegexes.JsAndTs,
            FileTypeRegexes.Styles
        ];
        const codeFileRegexes = FileTypeRegexes.combineRegexes(...codeFiles);

        return codeFileRegexes;
    },
    JavaScript: /\.jsx?$/,
    TypeScript: /\.tsx?$/,
    JsAndTs: /\.[tj]sx?$/,
    Styles: /\.s?css$/,

    get Assets() {
        const assetFiles = [
            FileTypeRegexes.Svg,
            FileTypeRegexes.Binaries,
            FileTypeRegexes.Fonts,
            FileTypeRegexes.Text
        ];
        const assetFileRegexes = FileTypeRegexes.combineRegexes(...assetFiles);

        return assetFileRegexes;
    },
    Svg: /\.svg$/,
    Binaries: /\.(png|gif|jpe?g|ico|pdf)$/,
    Text: /\.(txt|md|log|tex)$/,
    Fonts: /\.(ttf|woff2?|eot)$/,

    /**
     * Converts a RegExp to an accurate regex string representation.
     * Strips leading '/' characters from the beginning/end of the RegExp.
     *
     * @param {RegExp} regex
     * @returns {string}
     */
    regexToString(regex) {
        const regexStr = regex.toString();
        const regexStrWithoutSurroundingSlashes = regexStr.substring(1, regexStr.length-1);

        return regexStrWithoutSurroundingSlashes;
    },

    /**
     * Combines multiple RegExp entries to a single one, OR-ing each
     * entry.
     *
     * e.g. `combineRegexes(/a/, /b/) --> /(a)|(b)/`
     *
     * @param {RegExp[]} regexes
     * @returns {RegExp}
     */
    combineRegexes(...regexes) {
        const regexStrings = regexes.map(FileTypeRegexes.regexToString);

        return new RegExp(`(${regexStrings.join(')|(')})`);
    },
};


/**
 * Generates a custom output file name for a single file.
 * Similar to Webpack's TemplateStrings, except with a bit more customization.
 * Automatically removes `src/` from output file path.
 *
 * @param {string} filenameWithRelativePath - Relative path of original file from the app root (e.g. `src/components/App.js`).
 * @param {{}} options
 * @param {string} [options.nestInFolder=Paths.BUILD_OUTPUT.REL] - Folder inside which to nest the output file (including path).
 * @param {number} [options.hashLength=8] - Length of hash string to add to name; 0 if hash is undesired.
 * @param {boolean} [options.maintainFolderStructure=true] - If the directory structure inside `src/` should be maintained.
 * @param {boolean} [options.treatFileNameDotsAsExtension=true] - Keeps all dot-text as extension (e.g. `file.config-hash.js` vs `file-hash.config.js`).
 * @returns {string} - Output file name formatted with Webpack's TemplateStrings.
 *
 * @see [TemplateStrings]{@link https://webpack.js.org/configuration/output/#template-strings} for more information.
 */
function getOutputFileName(
    filenameWithRelativePath,
    {
        nestInFolder = Paths.BUILD_OUTPUT.REL,
        hashLength = 8,
        maintainFolderStructure = true,
        treatFileNameDotsAsExtension = true
    } = {}
) {
    /*
     * `[path]` == relative path from src folder.
     * `[name]` == file name without extension.
     * `[ext]` == file extension
     * `[base]` == `[name][ext]`
     * e.g. `src/assets/my-image.png` or `src/assets/images/my-image.png`.
     *
     * If the directory structure is to be maintained, then the path must be created manually since we want file
     * output paths to not include `src/`:
     * `(dist)/static/assets/optionalNestedDir/myFile`.
     *
     * Note: !(nestInFolder || hashLength || maintainFolderStructure) === '[base]'
     */
    // Remove absolute path up to the root directory, if they exist.
    // Depending on the loader/plugin options, the path may be relative or absolute,
    // so handle all cases to ensure consistent output.
    filenameWithRelativePath = filenameWithRelativePath.replace(new RegExp(Paths.ROOT.ABS + '/?'), '');

    const fileNameFull = path.basename(filenameWithRelativePath);
    const fileExtension = treatFileNameDotsAsExtension
        ? fileNameFull.slice(fileNameFull.indexOf('.')) // babel.config.json  -->  .config.json
        : path.extname(fileNameFull); // babel.config.json  -->  .json
    const fileNameWithoutExtension = fileNameFull.replace(fileExtension, '');
    const filePath = path.dirname(filenameWithRelativePath);
    const filePathInsideSrc = filePath.replace(new RegExp(`\\/?${Paths.SRC.REL}\\/`), '');

    const outputFileName = [
        fileNameWithoutExtension,
        hashLength ? `-[contenthash:${hashLength}]` : '',
        fileExtension
    ];
    const outputFilePath = [
        nestInFolder,
        maintainFolderStructure ? filePathInsideSrc : '',
        outputFileName.join('')
    ];

    return path.join(...outputFilePath);
}

export {
    Paths,
    processArgs,
    FileTypeRegexes,
    getOutputFileName,
    LocalLanHostIpAddresses,
    attemptParseJson,
    importNonEsmFile,
};