const fs = require('fs');
const path = require('path');

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
            // Replace '**', '*', and trailing '/' (for directories) with '.*'
            .replace(/((?<!\*)\*(?!\*))|(\*\*)|(\/$)/g, '.*'),
        )
        .map(fileOrPathRegexString => `(${fileOrPathRegexString})`)
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

module.exports = findFile;
