const fs = require('fs');
const path = require('path');

const Paths = (() => {
    const pathMappings = {
        ROOT: {
            REL: '..',
            ABS: null,
        },
        CONFIG: {
            REL: 'config',
            ABS: null,
            JEST: {
                REL: 'jest',
                ABS: null,
            },
        },
        SRC: {
            REL: 'src',
            ABS: null,
        },
        BUILD_ROOT: { // output path for webpack build on machine, holds entire app but isn't used by it
            REL: process?.env?.npm_package_config_buildOutputDir || 'dist',
            ABS: null,
        },
        BUILD_OUTPUT: { // output path for JS/CSS/binary files, used by index.html
            REL: 'static',
            ABS: null,
        },
        MOCKS: {
            REL: 'mocks',
            ABS: null,
        },
        TESTS: {
            REL: 'tests',
            ABS: null,
        },
    };

    // `__dirname` doesn't exist in Node ESM, so use `process.cwd()` instead.
    // Or, simply find the root dir from its package.json, as done here.
    pathMappings.ROOT.ABS = path.dirname(findFile('package.json'));

    function setAbsPaths(pathConfig, prevRelPath) {
        if (prevRelPath) {
            pathConfig.REL = `${prevRelPath}/${pathConfig.REL}`;
        }

        // Only set absolute path if not already defined
        if (!pathConfig.ABS) {
            pathConfig.ABS = path.resolve(pathMappings.ROOT.ABS, pathConfig.REL);
        }

        // Recurse if nested path config present
        Object.values(pathConfig)
            .filter(configVal => configVal instanceof Object)
            .forEach(nestedPathConfig => setAbsPaths(nestedPathConfig, pathConfig.REL));
    }

    Object.values(pathMappings).forEach(pathConfig => setAbsPaths(pathConfig));

    pathMappings.getFileAbsPath = (...pathSegments) => path.resolve(...pathSegments);
    pathMappings.getFileRelPath = (...pathSegments) => path.relative(...pathSegments);

    return pathMappings;
})();


const FileTypeRegexes = {
    JavaScript: /\.jsx?$/,
    TypeScript: /\.tsx?$/,
    JsAndTs: /\.[tj]sx?$/,
    MjsAndCjs: /\.[mc]js$/,
    Styles: /\.s?css$/,
    get SourceCode() {
        const codeFiles = [
            FileTypeRegexes.JsAndTs,
            FileTypeRegexes.MjsAndCjs,
        ];
        const codeFileRegexes = FileTypeRegexes.combineRegexes(...codeFiles);

        return codeFileRegexes;
    },
    get SourceCodeWithStyles() {
        const codeFiles = [
            FileTypeRegexes.JsAndTs,
            FileTypeRegexes.Styles,
            FileTypeRegexes.MjsAndCjs,
        ];
        const codeFileRegexes = FileTypeRegexes.combineRegexes(...codeFiles);

        return codeFileRegexes;
    },

    Svg: /\.svg$/,
    Binaries: /\.(png|gif|jpe?g|ico|pdf)$/,
    Text: /\.(txt|md|log|tex)$/,
    Fonts: /\.(ttf|woff2?|eot)$/,
    get Assets() {
        const assetFiles = [
            FileTypeRegexes.Svg,
            FileTypeRegexes.Binaries,
            FileTypeRegexes.Fonts,
            FileTypeRegexes.Text,
        ];
        const assetFileRegexes = FileTypeRegexes.combineRegexes(...assetFiles);

        return assetFileRegexes;
    },

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
 * @param {Object} [options]
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
        treatFileNameDotsAsExtension = true,
    } = {},
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
        ? fileNameFull.slice(fileNameFull.indexOf('.')) // babel.config.js  -->  .config.js
        : path.extname(fileNameFull); // babel.config.js  -->  .js
    const fileNameWithoutExtension = fileNameFull.replace(fileExtension, '');
    const filePath = path.dirname(filenameWithRelativePath);
    const filePathInsideSrc = filePath.replace(new RegExp(`\\/?${Paths.SRC.REL}\\/`), '');

    const outputFileName = [
        fileNameWithoutExtension,
        hashLength ? `-[contenthash:${hashLength}]` : '',
        fileExtension,
    ];
    const outputFilePath = [
        nestInFolder,
        maintainFolderStructure ? filePathInsideSrc : '',
        outputFileName.join(''),
    ];

    return path.join(...outputFilePath);
}


/**
 * Finds a file in the project directory.
 *
 * If `startDirectory` isn't specified, then the search start location
 * is "root" - the directory where the first package.json file is found
 * (similar to babel.config's `rootMode: upward` option).
 *
 * Likewise, regardless of whether or not `ignoredFiles` is specified, it includes the
 * root's `.git/` directory as well as any files/directories listed its `.gitignore` file.
 *
 * @param {string} filename - File name to search for (basename, without the path).
 * @param {Object} [options]
 * @param {string} [options.startDirectory=rootDir] - Starting search directory (dirname, without file name).
 * @param {string[]} [options.ignoredFiles] - Files/directories to ignore when searching; always includes `.git/`.
 * @param {boolean} [options.dfs=false] - If depth-first-search should be used instead of breadth-first-search.
 * @returns {(string|undefined)} - Absolute path of the file if found.
 */
function findFile(
    filename,
    {
        startDirectory = '',
        ignoredFiles = [],
        dfs = false,
    } = {},
) {
    const packageJsonFileName = 'package.json';
    const gitIgnoreFileName = '.gitignore';
    let currentDir = path.resolve(startDirectory || __dirname);

    if (!startDirectory) {
        // TODO Could also be done with `npm prefix` - https://docs.npmjs.com/cli/v8/commands/npm-prefix
        // We have no clue where to start, so go up to the root
        // so that we can then search downwards later
        while (!fs.readdirSync(currentDir).includes(packageJsonFileName)) {
            currentDir = path.resolve(currentDir, '..');
        }

        // Add any files from .gitignore to ignoredFiles
        const rootDir = currentDir;
        const gitIgnoreFilePath = path.resolve(rootDir, gitIgnoreFileName);

        if (fs.existsSync(gitIgnoreFilePath)) {
            const gitIgnoredFiles = fs.readFileSync(gitIgnoreFilePath)
                .toString()
                .split('\n')
                .filter(entryLine => entryLine);

            ignoredFiles = new Set([
                ...ignoredFiles,
                '.git',
                ...gitIgnoredFiles,
            ]);
        }
    }

    const ignoredFilesRegexString = [ ...ignoredFiles ]
        // Replace globs with regex
        .map(fileOrPathGlob => fileOrPathGlob
            // Escape periods
            .replace(/\./g, '\\.')
            // Replace directory globs (`**`) with regex (`.*`)
            // `**/` and `/` --> `.*/`
            .replace(/^(\*\*)?\//, '.*/?')
            // `/**` and `/` --> `/.*`
            .replace(/\/(\*\*)?$/, '/?.*'),
        )
        // Prepend an optional `.*/` to ignore all leading directories like git does normally
        .map(fileOrPathRegexString => `(^(.*/)?${fileOrPathRegexString}$)`)
        .join('|');
    const ignoredFilesRegex = new RegExp(ignoredFilesRegexString, 'i');

    const dirsToSearch = [];

    // `stat()` follows symbolic links
    // `lstat()` doesn't
    // `fstat()` is the same as `stat()` except takes in a file descriptor instead of path
    for (let fileName of fs.readdirSync(currentDir)) {
        // fileName is basename, so get the absolute path to it from current directory
        const filePath = path.resolve(currentDir, fileName);
        const fileExists = fs.existsSync(filePath);
        const fileIsIgnored = ignoredFiles.has(fileName) || ignoredFilesRegex.test(filePath);

        if (!fileExists || fileIsIgnored) {
            continue;
        }

        if (fileName === filename) {
            return filePath;
        }

        if (fs.lstatSync(filePath).isDirectory()) {
            if (!dfs) {
                dirsToSearch.push(filePath);
            } else {
                const filePathFound = findFile(
                    filename,
                    {
                        startDirectory: filePath,
                        ignoredFiles,
                    },
                );

                if (filePathFound) {
                    return filePathFound;
                }
            }
        }
    }

    for (const dir of dirsToSearch) {
        const filePathFound = findFile(
            filename,
            {
                startDirectory: dir,
                ignoredFiles,
            },
        );

        if (filePathFound) {
            return filePathFound;
        }
    }
}


/**
 * Prepends/appends `**` to leading/trailing `/` so the directories (and files if leading slash)
 * are ignored at every level.
 *
 * This isn't necessary for git, but might be for other glob-star interpreters.
 *
 * @returns {string[]} - Glob entries from `.gitignore` with additional double glob-stars (`**`) for files/directories.
 */
function getGitignorePathsWithExtraGlobStars() {
    return fs.readFileSync(findFile('.gitignore'))
        .toString()
        .split('\n')
        .filter(ignoredPath => ignoredPath)
        .map(ignoredPath => ignoredPath.replace(/(?:^[^*])|(?:[^*]$)/g, (fullStrMatch, strIndex) => {
            // All strings matching the regex don't have either leading `**/`, trailing `/**`, or both.

            if (fullStrMatch === '/') {
                // Directory without leading/trailing `**`
                return strIndex === 0 ? '**/' : '/**';
            }

            if (strIndex === 0) {
                // File or directory without leading `/`
                return `**/${fullStrMatch}`;
            }

            // File
            return fullStrMatch;
        }));
}


function stripJsComments(jsStr) {
    return jsStr
        .replace(/(?<!\S)\/\/[^\n]*/g, '') // Remove comments using `//`
        .replace(/(?<!\S)\/\*[\s\S]*?\*\//g, '') // Remove comments using `/*` and `/**`
        .replace(/[\s\n]+(?=\n)/g, ''); // Remove extra newlines and hanging space characters at the ends of lines that were introduced by comment deletion above
}


const tsconfig = JSON.parse(stripJsComments(fs.readFileSync(findFile('tsconfig.json')).toString()));

/**
 * Object containing normalized import aliases of the form `{ alias: pathMatch }`.
 *
 * Both aliases and path matches are normalized to strip leading/trailing path slashes, periods,
 * and glob stars so all files using the aliases can format them as needed.
 *
 * Includes some non-enumerable utility functions for individually reformatting the alias/path-match
 * and for stripping a single trailing path slash.
 *
 * @type {Object} - Mapping of aliases to their respective path matchers, as well as some util functions.
 */
const ImportAliases = Object.entries(tsconfig.compilerOptions.paths)
    .reduce((aliasesWithoutGlobs, [ aliasGlob, pathMatchesGlobArray ]) => {
        const { regexToString, combineRegexes } = FileTypeRegexes;
        const removeTrailingSlashAsterisk = globStr => globStr.replace(/\/\*$/, '').replace(/^$/, '/'); // add `/` back in if that was all that was in the alias
        const convertSingleAsteriskToDot = globStr => globStr.replace(/^\*$/, '.');
        const removeBackslashesEscapingSlashesInPaths = regexStr => regexStr.replace(/\\+/g, '');

        const aliasWithoutGlob = removeTrailingSlashAsterisk(aliasGlob);
        const pathMatchesWithoutGlobs = pathMatchesGlobArray.map(pathGlob => convertSingleAsteriskToDot(removeTrailingSlashAsterisk(pathGlob)));

        if (pathMatchesWithoutGlobs.length > 1) {
            const pathMatchesAsRegex = pathMatchesWithoutGlobs.map(pathStr => new RegExp(pathStr));
            const pathMatchesAsRegexString = removeBackslashesEscapingSlashesInPaths(regexToString(combineRegexes(...pathMatchesAsRegex)));

            aliasesWithoutGlobs[aliasWithoutGlob] = pathMatchesAsRegexString;
        } else {
            aliasesWithoutGlobs[aliasWithoutGlob] = pathMatchesWithoutGlobs[0];
        }

        return aliasesWithoutGlobs;
    }, {});
// Add utils for ImportAliases, but prevent them from being included in `Object.(keys|values|entries)` and object spreads
// so that the ImportAliases object can be used directly instead of having to filter out the utils
Object.defineProperties(ImportAliases, {
    toCustomObject: {
        configurable: false,
        enumerable: false,
        writable: false,
        value: ({
            aliasModifier = alias => alias,
            pathMatchModifier = pathMatch => pathMatch,
        } = {}) => Object.entries(ImportAliases).reduce((modifiedAliases, [ alias, pathMatch ]) => {
            const modifiedAlias = aliasModifier(alias);
            const modifiedPathMatch = pathMatchModifier(pathMatch);

            modifiedAliases[modifiedAlias] = modifiedPathMatch;

            return modifiedAliases;
        }, {}),
    },
    stripTrailingSlash: {
        configurable: false,
        enumerable: false,
        writable: false,
        value: alias => alias.replace(/\/$/, ''),
    },
});


module.exports = {
    Paths,
    FileTypeRegexes,
    getOutputFileName,
    findFile,
    getGitignorePathsWithExtraGlobStars,
    stripJsComments,
    tsconfig,
    ImportAliases,
};
