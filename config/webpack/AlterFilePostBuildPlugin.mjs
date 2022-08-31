import fs from 'node:fs';
import path from 'node:path';

const { NormalModule } = await import('webpack');


/** @typedef {import('webpack/types').WebpackPluginInstance} WebpackPluginInstance */
/** @typedef {import('webpack/types').Compiler} Compiler */


/**
 * @extends WebpackPluginInstance
 */
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

    /**
     * @param {Compiler} compiler
     */
    apply(compiler) {
        if (!this.run) {
            return;
        }

        compiler.hooks.afterEmit.tap(this.constructor.name, compilation => {
            const emittedFilesPaths = this.getEmittedFilesPaths(compiler, compilation);
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

    getEmittedFilesPaths(compiler, compilation) {
        const majorVersion = Number(compiler.webpack.version.match(/(^\d+)/)[1]);

        if (majorVersion < 5) {
            return Object.entries(compilation.assets)
                .filter(entry => entry[1].emitted)
                .map(entry => {
                    const [ relativePath, rawSourceObject ] = entry;
                    return {
                        relative: relativePath,
                        absolute: rawSourceObject.existsAt,
                    };
                });
        }

        return Object.keys(compilation.assets).map(relativeFilePath => ({
            relative: relativeFilePath,
            absolute: path.resolve(compiler.outputPath, relativeFilePath),
        }));
    }

    replaceTextInFile(fileAbsPath, oldText, newText) {
        try {
            const fileContents = fs.readFileSync(fileAbsPath).toString();
            const newFileContents = fileContents.replace(oldText, newText);

            fs.writeFileSync(fileAbsPath, newFileContents);
        } catch (e) {
            console.error(`Error replacing text in ${fileAbsPath}. Error:`, e);
        }
    }

    /**
     * To alter a file before building it, you'd have to add your own loader to it
     * since that's exactly what loaders do.
     *
     * Example: https://github.com/artemirq/modify-source-webpack-plugin/blob/master/src/ModifySourcePlugin.ts
     *
     * @param {Compiler} compiler
     * @param {string} srcFilePath - Source file to modify before transpilation/build.
     */
    modifySourceBeforeBuild(compiler, srcFilePath) {
        compiler.hooks.compilation.tap(this.constructor.name, compilation => {
            NormalModule.getCompilationHooks(compilation).beforeLoaders.tap(this.constructor.name, (loaderItems, normalModule, obj) => {
                const originalFileAbsPath = normalModule.userRequest;

                if (originalFileAbsPath.includes(srcFilePath)) {
                    console.log(originalFileAbsPath);
                    console.log(obj);
                }
            });
        });
    }
}

export default AlterFilePostBuildPlugin;
