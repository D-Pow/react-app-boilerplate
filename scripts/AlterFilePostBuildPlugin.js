const fs = require('fs');

class AlterFilePostBuildPlugin {
    /**
     * @callback replaceTextCallback
     * @param {string[]} fileNames - Relative paths of all emitted files.
     * @returns {string} - New text to replace old text.
     */
    /**
     * Replaces a string in a file with a different string.
     *
     * @param {string} fileName - Name of the file emitted by webpack; absolute path not necessary.
     * @param {(string|RegExp)} textToReplace - Text to be found and replaced within the file.
     * @param {(string|replaceTextCallback)} replaceWith - Text to replace {@code textToReplace} or function accepting file names that returns a string.
     * @param {boolean} [run=true] - Optional flag to enable/disable plugin. Recommended to enable only for production builds.
     */
    constructor(fileName, textToReplace, replaceWith, run = true) {
        this.fileName = fileName;
        this.textToReplace = textToReplace;
        this.replaceWith = replaceWith;
        this.run = run;
    }

    apply(compiler) {
        if (!this.run) {
            return;
        }

        compiler.hooks.afterEmit.tap(this.constructor.name, compilation => {
            const emittedFilesPaths = this.getEmittedFilesPaths(compilation);
            const targetFilePaths = emittedFilesPaths.find(path => path.relative.includes(this.fileName));
            let replaceWithText = this.replaceWith;

            if (!targetFilePaths) {
                console.error(`Could not find file ${this.fileName}`);
                return;
            }

            if (typeof this.replaceWith === typeof this.getEmittedFilesPaths) {
                replaceWithText = this.replaceWith(emittedFilesPaths.map(path => path.relative));
            }

            this.replaceTextInFile(targetFilePaths.absolute, this.textToReplace, replaceWithText);
        });
    }

    getEmittedFilesPaths(compilation) {
        return Object.entries(compilation.assets)
            .filter(entry => entry[1].emitted)
            .map(entry => {
                const [ relativePath, rawSourceObject ] = entry;
                return {
                    relative: relativePath,
                    absolute: rawSourceObject.existsAt
                };
            });
    }

    replaceTextInFile(fileAbsPath, oldText, newText) {
        try {
            const fileContents = fs.readFileSync(fileAbsPath).toString();
            const newFileContents = fileContents.replace(oldText, newText);

            fs.writeFileSync(fileAbsPath, newFileContents);
        } catch(e) {
            console.error(`Error replacing text in ${fileAbsPath}. Error:`, e)
        }
    }
}

module.exports = AlterFilePostBuildPlugin;
