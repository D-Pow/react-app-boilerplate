const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

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
    // Or, simply find the root dir dynamically, as done here.
    try {
        pathMappings.ROOT.ABS = path.resolve(
            childProcess
                .execSync('npm prefix')
                .toString()
                .replace(/\n/g, ''),
        );
    } catch (couldntRunCommandDueToNpmNotInPathError) {
        /**
         * child_process defaults to using `/bin/sh` on Unix, but if the user's
         * default SHELL isn't `sh`, then `npm` won't be on `$PATH`. Thus, spawn a
         * process using the specified `$SHELL` env var and fallback to Bash if undefined.
         * Generally speaking, this will only ever happen if running in an IDE that
         * is started with a non-login shell and/or if node/npm are defined in .profile
         * instead of .bashrc (e.g. JetBrains IDEs background processes like ESLint).
         *
         * Likewise, ensure PATH has been inherited, which doesn't always happen by default.
         *
         * @see [PATH not inherited by `spawn`]{@link https://github.com/nodejs/node/issues/12986#issuecomment-300951831}
         * @see [`sh error: Executable not found` (node, npm, git, etc.)]{@link https://stackoverflow.com/questions/27876557/node-js-configuring-node-path-with-nvm}
         * @see [ENOENT issue with WebStorm]{@link https://youtrack.jetbrains.com/issue/WEB-25141}
         * @see [Debugging ENOENT]{@link https://stackoverflow.com/questions/27688804/how-do-i-debug-error-spawn-enoent-on-node-js}
         * @see [Related WebStorm issue with `git` not found]{@link https://youtrack.jetbrains.com/issue/WI-63428}
         * @see [Related WebStorm issue with `node` not found on WSL]{@link https://youtrack.jetbrains.com/issue/WEB-22794}
         * @see [WebStorm using wrong directory for ESLint]{@link https://youtrack.jetbrains.com/issue/WEB-47258}
         * @see [Related WebStorm ESLint issue for finding root directory]{@link https://youtrack.jetbrains.com/issue/WEB-45381#focus=Comments-27-4342029.0-0}
         */
        pathMappings.ROOT.ABS = path.dirname(childProcess
            .spawnSync('npm prefix', {
                shell: process.env.SHELL || '/bin/bash',
                cwd: __dirname,
                env: {
                    PATH: process.env.PATH,
                },
            })
            .stdout
            .toString()
            .replace(/\n/g, ''),
        );
    }

    function setAbsPaths(pathConfig, prevRelPath) {
        if (prevRelPath) {
            pathConfig.REL = `${prevRelPath}/${pathConfig.REL}`;
        }

        // Only set absolute path if not already defined
        if (!pathConfig.ABS) {
            pathConfig.ABS = path.resolve(pathMappings.ROOT.ABS, pathConfig.REL);
        }

        if (/\\/.test(pathConfig.ABS + pathConfig.REL)) {
            pathConfig.ABS = normalizePathWithForwardSlashes(pathConfig.ABS);
            pathConfig.REL = normalizePathWithForwardSlashes(pathConfig.REL);
        }

        // Recurse if nested path config present
        Object.values(pathConfig)
            .filter(configVal => configVal instanceof Object)
            .forEach(nestedPathConfig => setAbsPaths(nestedPathConfig, pathConfig.REL));
    }

    Object.values(pathMappings).forEach(pathConfig => setAbsPaths(pathConfig));

    pathMappings.normalize = normalizePathWithForwardSlashes;
    pathMappings.getFileAbsPath = (...pathSegments) => pathMappings.normalize(path.resolve(...pathSegments));
    pathMappings.getFileRelPath = (...pathSegments) => pathMappings.normalize(path.relative(...pathSegments));

    return pathMappings;
})();


const gitignoreFiles = getGitignorePaths();
const gitignoreFilesRegex = convertPathsToRegex(gitignoreFiles);
const gitignoreFilesGlobs = convertPathsToGlobs(gitignoreFiles);

const babelConfigPath = findFile('babel.config.js');
const tsconfigPath = findFile('tsconfig.main.json');
const tsconfigDevPath = findFile('tsconfig.json');

const cmdTsconfigExpand = `npx tsc --showConfig --project '${tsconfigPath}'`;
let tsconfig;

try {
    const tsconfigExpandedValue = childProcess
        .execSync(cmdTsconfigExpand)
        .toString();

    tsconfig = JSON.parse(tsconfigExpandedValue);
} catch (execDidntWork) {
    try {
        const tsconfigExpandedValue = childProcess
            .spawnSync(cmdTsconfigExpand, {
                shell: process.env.SHELL || '/bin/bash',
                cwd: Paths.ROOT.ABS,
                env: {
                    PATH: process.env.PATH,
                },
            })
            .stdout
            .toString();

        tsconfig = JSON.parse(tsconfigExpandedValue);
    } catch (spawnDidntWork) {
        tsconfig = JSON.parse(stripJsComments(fs.readFileSync(tsconfigPath).toString()));
    }
}


/**
 * Normalizes a path, always using `/` instead of `\\` and removing any trailing slashes.
 *
 * Note: This is useful and safe because
 * - `/` is supported on both Posix and Windows (see: [path.sep]{@link https://nodejs.org/docs/latest-v16.x/api/path.html#pathsep}).
 * - Trailing slashes are preserved in the standard [path.normalize()]{@link https://nodejs.org/docs/latest-v16.x/api/path.html#pathnormalizepath} function.
 * - Passing paths with backslashes into the RegExp constructor causes one of the two slashes to be removed,
 *   i.e. `new RegExp('path\\to\\file') == /path\to\file/` instead of `/path\\to\\file/`,
 *   meaning we'd have to manually add an extra slash in any function using a path in its RegExp logic.
 *
 * @param {string} pathStr - Path string to normalize.
 * @returns {string} - Normalized path string.
 */
function normalizePathWithForwardSlashes(pathStr = '') {
    return path.normalize(pathStr).replace(/\\/g, '/').replace(/\/$/, '');
}


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
    Binaries: /\.(png|gif|jpe?g|ico|webp|mp3|mp4|pdf)$/,
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
     * Combines multiple RegExp entries to a collection of match groups, OR-ing each
     * match group.
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

    /**
     * Combines multiple RegExp entries to a single match group, OR-ing each
     * regex.
     *
     * e.g. `combineRegexes(/a/, /b/) --> /(a|b)/`
     *
     * @param {RegExp[]} regexes
     * @returns {RegExp}
     */
    combineRegexesInSingleMatchGroup(...regexes) {
        const regexStrings = regexes.map(FileTypeRegexes.regexToString);

        return new RegExp(`(${regexStrings.join('|')})`);
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
    filenameWithRelativePath = Paths.normalize(filenameWithRelativePath);

    let fileQuery = '';

    ([ filenameWithRelativePath, fileQuery ] = filenameWithRelativePath.split('?'));

    const fileNameFull = path.basename(filenameWithRelativePath);
    const fileExtension = treatFileNameDotsAsExtension
        ? fileNameFull.slice(fileNameFull.indexOf('.')) // babel.config.js  -->  .config.js
        : path.extname(fileNameFull); // babel.config.js  -->  .js
    const fileNameWithoutExtension = fileNameFull.replace(fileExtension, '');
    const filePath = path.dirname(filenameWithRelativePath);
    const filePathInsideSrc = filePath.replace(new RegExp(`.*${Paths.SRC.REL}/?`), '');

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
    if (!findFile.foundFiles) {
        findFile.foundFiles = new Map();
    }

    if (findFile.foundFiles.has(filename)) {
        return findFile.foundFiles.get(filename);
    }

    let currentDir = path.resolve(startDirectory || Paths.ROOT.ABS);
    let ignoredFilesRegex;

    // Short-circuit recursive calls by only checking if `ignoredFiles` is a list, not a Set.
    // If so, it's passed from an upper call,rather than a recursive call.
    if (ignoredFiles.length) {
        const combinedIgnoredFiles = getGitignorePaths(ignoredFiles);

        ignoredFiles = new Set(combinedIgnoredFiles);
        ignoredFilesRegex = convertPathsToRegex(combinedIgnoredFiles);
    } else if (ignoredFiles instanceof Set) {
        ignoredFilesRegex = convertPathsToRegex([ ...ignoredFiles ]);
    } else {
        ignoredFiles = new Set(gitignoreFiles);
        ignoredFilesRegex = gitignoreFilesRegex;
    }

    const dirsToSearch = [];

    // `stat()` follows symbolic links
    // `lstat()` doesn't
    // `fstat()` is the same as `stat()` except takes in a file descriptor instead of path
    for (let fileName of fs.readdirSync(currentDir)) {
        // fileName is basename, so get the absolute path to it from current directory
        const filePath = path.resolve(currentDir, fileName);
        const fileExists = fs.existsSync(filePath);
        const fileIsIgnored = ignoredFiles.has(fileName) || ignoredFiles.has(`${fileName}/`) || ignoredFilesRegex.test(filePath);

        if (!fileExists || fileIsIgnored) {
            continue;
        }

        findFile.foundFiles.set(path.basename(fileName), filePath);

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
 * Opens the given URI (file path, URL, etc.) with the OS' default app for that URI.
 *
 * @param {string} uri - Identifier to open.
 */
function openWithDefaultApp(uri) {
    const startTerminalCommand = process.platform === 'darwin'
        ? 'open'
        : process.platform === 'win32'
            ? 'start'
            : 'xdg-open';

    childProcess.execSync(`${startTerminalCommand} ${uri}`);
}


/**
 * Returns a list of paths (files and directories) that are ignored by git based on the `.gitignore` file
 * defined by `Paths.ROOT`.
 *
 * Likewise, all file paths are relative to `Paths.ROOT`.
 *
 * Optionally, can format the entries in a particular way or append paths to be ignored as well.
 *
 * @param {Object} [options]
 * @param {string[]} [options.ignoredFiles] - Files/directories to ignore when searching; always includes `.git/` and `.gitignore` contents.
 * @param {boolean} [options.asSet=false] - If paths should be returned as a Set instead of a list.
 * @param {boolean} [options.asRegex=false] - If paths should be returned as a RegExp instead of collection of paths (surrounds each entry by `\b` and `.*` to work at all nesting levels).
 * @param {boolean} [options.asGlobs=false] - If paths should be returned as a collection of globs instead of paths (prepends `**` to any dir/file and appends `/**` to dirs).
 * @returns {(string[]|Set<string>|RegExp)} - Resulting path-ignore content.
 */
function getGitignorePaths({
    ignoredFiles = [],
    asSet = false,
    asRegex = false,
    asGlobs = false,
} = {}) {
    const gitIgnoreFileName = '.gitignore';
    const gitIgnoreFilePath = path.resolve(Paths.ROOT.ABS, gitIgnoreFileName);

    if (!fs.existsSync(gitIgnoreFilePath)) {
        console.warn(`Warning: .gitignore file not found at path: ${gitIgnoreFilePath}`);
    }

    let gitIgnoredFiles = [];

    const setGitignoreFilesByProcess = () => {
        /**
         * Git Porcelain shows all files with a special char string for a status.
         * `!! <entry>` == ignored and `?? <entry>` == untracked, so filter out
         * those lines to serve as the git-ignored entries.
         * Even if .gitignore specifies `*.fileExt`, it will expand it during
         * this command to be `real/path/name.fileExt`.
         * This is fine b/c it means git already found all the ignored files, so we
         * don't have to.
         *
         * Git ls-files shows all files tracked, untracked, and ignored by git.
         * When paired with the `-o` and `--directory` flags, it becomes a more concise
         * version of `git status --porcelain`.
         *
         * Details:
         * - git ls-files -i -o --directory --exclude-from=/path/to/.gitignore
         *   Basically the same except more complex.
         *   `-i` = "ignored" - Files that currently exist in the repo (not necessary if `-o` is used).
         *   `-o` = "others" - Untracked (and ignored) files that currently exist.
         *   `--directory` = Show ignored/untracked directories instead of all the files contained within
         *   `--exclude-from` = Include all "ignore" entries from the specified file, regardless of whether or not they currently exist
         *
         * Alternatives:
         * - Reading content directly from the file and converting them all to
         *   regex manually, e.g. `.fileExt => ^*.fileExt`, `dir/ => dir/.*`, `dir/** => dir/.*`, etc.
         *   which is error-prone and unreliable.
         *
         * @see [git ls-files]{@link https://git-scm.com/docs/git-ls-files}
         * @see [git status --porcelain]{@link https://git-scm.com/docs/git-status#Documentation/git-status.txt---porcelainltversiongt}
         */
        gitIgnoredFiles = childProcess
            .execSync('git ls-files -o --directory')
            .toString()
            // Split entries by newline
            .split('\n')
            /* Only necessary if using `git status --porcelain --ignored`
             * // Filter out empty lines and all those that aren't ignored files (`!!`)
             * .filter(entry => onlyUntracked || /^(!!|\?\?) /.test(entry))
             * // Remove the ignored-file prefix and quoted strings (added by the terminal if the path contains spaces)
             * .map(ignoredFilePath => ignoredFilePath.replace(/(^.. )|"/g, ''))
             */
            // Remove blank lines
            .filter(Boolean);
    };
    const setGitignoreFilesByManualParsing = () => {
        /*
         * Ignore the error. It was probably caused by some sort of primitive/static parsers, e.g. an IDE trying to show
         * linting errors from ESLint configuration in real time.
         * These require the file to be read manually/directly.
         * Thus, in the event that a child-process isn't sufficient for them, allow
         * reading the .gitignore file manually.
         */
        gitIgnoredFiles = fs.readFileSync(gitIgnoreFilePath)
            .toString()
            // Split entries by newline
            .split('\n')
            // Remove blank lines
            .filter(Boolean);
    };

    try {
        setGitignoreFilesByProcess();
    } catch (gitCommandFailedError) {
        try {
            setGitignoreFilesByManualParsing();
        } catch (gitignoreFileDoesntExistError) {
            gitIgnoredFiles.push('node_modules');
        }
    }

    ignoredFiles = Array.from(new Set([
        ...ignoredFiles,
        '.git/',
        ...gitIgnoredFiles,
    ]));

    if (asRegex) {
        return convertPathsToRegex(ignoredFiles);
    }

    if (asGlobs) {
        ignoredFiles = convertPathsToGlobs(ignoredFiles);
    }

    return asSet ? new Set(ignoredFiles) : ignoredFiles;
}


/**
 * Converts all paths to a RegExp matching them at any level of nesting.
 *
 * @param {string[]} paths - Paths to convert to RegExp.
 * @param {string} [regexFlags='i'] - Flags for the RegExp.
 * @returns {RegExp} - Single RegExp instance with which to match paths.
 */
function convertPathsToRegex(paths, regexFlags = 'i') {
    const ignoredFilesRegexString = paths
        // Escape periods to keep them as period-strings instead of regex-dots
        .map(fileOrPathGlob => fileOrPathGlob.replace(/^\./g, '\\.'))
        // Remove asterisks since all .gitignore entries' regexes are pre-/appended with `.*`
        .map(fileOrPathGlob => fileOrPathGlob.replace(/\*/g, ''))
        // Prepend/append `.*/` to capture all leading/trailing directories (e.g. like git does normally)
        .map(fileOrPathRegexString => `(.*\\b${fileOrPathRegexString}\\b.*)`)
        .join('|');

    return new RegExp(ignoredFilesRegexString, regexFlags);
}


/**
 * Converts all path entries to globs that will match at any level of nesting.
 *
 * @param {string[]} paths - Paths to convert to globs.
 * @returns {string[]} - Array of path entries as globs.
 */
function convertPathsToGlobs(paths) {
    /*
     * Add `**` to anything that begins/ends with a `/` so the result is the
     * equivalent of `**\/dir/**` or `**\/file.ext`.
     *
     * Note that using the non-capturing look-(ahead|behind) means that we don't have
     * to use separate `.replace()` calls for each, and can instead just inject `**`
     * at the beginning/end of any path entry that contains slashes.
     *
     * Otherwise, if the entry has no slashes, then just prepend the `**\/` so the
     * file name/extension is matched at all directory levels.
     */
    return paths.map(path => path
        .replace(/(^(?=\/))|((?<=\/)$)/g, '**')
        .replace(/(^(?!\*))/g, '**/'),
    );
}


function stripJsComments(jsStr) {
    return jsStr
        .replace(/(?<!\S)\/\/[^\n]*/g, '') // Remove comments using `//`
        .replace(/(?<!\S)\/\*[\s\S]*?\*\//g, '') // Remove comments using `/*` and `/**`
        .replace(/[\s\n]+(?=\n)/g, ''); // Remove extra newlines and hanging space characters at the ends of lines that were introduced by comment deletion above
}


/**
 * Object containing a mapping of import aliases to their respective path matches,
 * as well as some util functions.
 *
 * Takes the form: `{ alias: pathMatch }`.
 *
 * Both aliases and path matches are normalized to strip leading/trailing path slashes, periods,
 * and glob stars so all files using the aliases can format them as needed (e.g. format to regex,
 * globs, or keep as strings) with no interference with how they were defined initially.
 *
 * Includes some utility functions for custom reformatting of the alias and/or path-match as the parent
 * sees fit, e.g. stripping a trailing path slash from the path match, finding the best import match for a file
 * path, etc.
 *
 * Util functions are non-enumerable so array/object spreads of the class will return only the
 * desired aliases/path matches.
 */
class ImportAliases {
    static {
        const normalizedAliasesFromTsconfig = Object.entries(tsconfig.compilerOptions.paths)
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

        Object.entries(normalizedAliasesFromTsconfig).forEach(([ alias, pathMatch ]) => {
            this[alias] = pathMatch;
        });
    }

    static toCustomObject({
        aliasModifier = alias => alias,
        pathMatchModifier = pathMatch => pathMatch,
    } = {}) {
        return Object.entries(this).reduce((modifiedAliases, [ alias, pathMatch ]) => {
            const modifiedAlias = aliasModifier(alias);
            const modifiedPathMatch = pathMatchModifier(pathMatch);

            modifiedAliases[modifiedAlias] = modifiedPathMatch;

            return modifiedAliases;
        }, {});
    }

    static stripTrailingSlash(alias) {
        return alias.replace(/\/$/, '');
    }

    static getBestImportAliasMatch(filePath) {
        const shortestAliasMatch = [ ...this ]
            .reduce((bestMatch, [ alias, aliasRelPath ]) => {
                // Let `filePath = /path/to/src/folder/file.js`

                // Get the relative path to the file from root first
                // e.g. `src/folder/file.js`
                const relPathFromRoot = Paths.getFileRelPath(Paths.ROOT.ABS, filePath);
                // Then from the alias
                // e.g. `folder/file.js` from the `src` alias
                const relPathFromAlias = Paths.getFileRelPath(aliasRelPath, filePath);
                // Now find the shortest path length respective to the alias; use the
                // alias length instead of root length so the aliases' respective-folder lengths
                // don't affect the outcome
                const relPathFromAliasLength = relPathFromAlias.length;
                // Fallback to root path
                const relPathFromRootLength = relPathFromRoot.length;

                if (relPathFromAliasLength < bestMatch.length) {
                    bestMatch = {
                        length: relPathFromAliasLength,
                        alias,
                        relPathFromRoot,
                        relPathFromAlias,
                    };
                } else if (relPathFromRootLength < bestMatch.length) {
                    bestMatch = {
                        length: relPathFromRootLength,
                        alias: '',
                        relPathFromRoot,
                        relPathFromAlias,
                    };
                }

                return bestMatch;
            }, {
                length: Infinity,
                alias: '',
                relPathFromRoot: '',
                relPathFromAlias: '',
            });

        const { alias, relPathFromAlias, relPathFromRoot } = shortestAliasMatch;

        if (!alias && relPathFromRoot.length > filePath.length) {
            return filePath;
        }

        if (!alias) {
            return relPathFromRoot;
        }

        // Remove repeating slashes. Only normalize the path instead of resolving it
        // since some alias characters aren't valid paths.
        return path.normalize(`${alias}/${relPathFromAlias}`);
    }

    static *[Symbol.iterator]() {
        // Note: If this were defined via `defineProperty()`, we'd have to use the anonymous function syntax,
        // `function*`, instead of the class-only syntax of `*[Symbol.iterator]`
        return yield* Object.entries(this);
    }
}


module.exports = {
    Paths,
    FileTypeRegexes,
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
};
