const fs = require('fs');
const path = require('path');

/**
 * Finds a file in the project directory.
 *
 * If `startDirectory` isn't specified, then the search start location
 * is "root" - the directory where the first package.json file is found
 * (similar to babel.config's `rootMode: upward` option).
 *
 * Likewise, if `ignoredFiles` isn't specified, it defaults to `.git/` as
 * well as any files/directories listed in the `.gitignore` file in the
 * "root" directory as described above.
 *
 * @param {string} filename - File name to search for (basename, without the path).
 * @param {Object} [options]
 * @param {string} [options.startDirectory=rootDir] - Starting search directory (dirname, without file name).
 * @param {Set<string>} [options.ignoredFiles='.git'] - Files/directories to ignore when searching.
 * @returns {(string|undefined)} - Absolute path of the file if found.
 */
function findFile(
    filename,
    {
        startDirectory = '',
        ignoredFiles = new Set([ '.git' ]),
    } = {},
) {
    const packageJsonFileName = 'package.json';
    const gitIgnoreFileName = '.gitignore';
    let currentDir = path.resolve(startDirectory || __dirname);

    if (!startDirectory) {
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

module.exports = findFile;
module.exports.getGitignorePathsWithExtraGlobStars = getGitignorePathsWithExtraGlobStars;
