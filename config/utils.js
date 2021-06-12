const os = require('os');
const path = require('path');

const devServerPort = 3000;

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
            return ipv4Addresses.length ? ipv4Addresses[0].address : localLan;
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
}

const Paths = {
    ROOT: '..',
    get ROOT_ABS() {
        return path.resolve(__dirname, Paths.ROOT);
    },
    SRC: 'src',
    TESTS: 'test',
    CONFIG: 'config',
    get CONFIG_ABS() {
        return path.resolve(Paths.ROOT_ABS, Paths.CONFIG);
    }
};


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
 * @param {string} [options.nestInFolder=''] - Folder inside which to nest the output file (including path).
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
        nestInFolder = '',
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
    filenameWithRelativePath = filenameWithRelativePath.replace(new RegExp(Paths.ROOT_ABS + '/?'), '');

    const fileNameFull = path.basename(filenameWithRelativePath);
    const fileExtension = treatFileNameDotsAsExtension
        ? fileNameFull.slice(fileNameFull.indexOf('.')) // babel.config.json  -->  .config.json
        : path.extname(fileNameFull); // babel.config.json  -->  .json
    const fileNameWithoutExtension = fileNameFull.replace(fileExtension, '');
    const filePath = path.dirname(filenameWithRelativePath);
    const filePathInsideSrc = filePath.replace(/\/?src\//, '');

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

module.exports = {
    Paths,
    FileTypeRegexes,
    getOutputFileName,
    LocalLanHostIpAddresses,
};
