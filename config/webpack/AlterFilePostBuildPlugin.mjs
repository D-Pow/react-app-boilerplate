import fs from 'node:fs';
import path from 'node:path';

import Webpack from 'webpack';

const { NormalModule } = await import('webpack');

// Must do this due to how Webpack is bundled and the resulting CJS/MJS conflicts
const { sources } = Webpack;


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

        this.alterFileBeforeEmit(compiler);
    }

    /**
     * @param {Compiler} compiler
     */
    alterFileBeforeEmit(compiler) {
        /**
         * In order to allow this plugin to work with both continuous (e.g. dev-server) and
         * one-and-done (e.g. build) Webpack processes, we need to:
         *
         *  1. Tap into `thisCompilation` in order to ignore child compilations, thus reducing
         *     repeated builds.
         *  2. Utilize the compilation's `processAssets` hook to fine-tune when we modify the
         *     asset's (i.e. output file) contents.
         *  3. Modify said asset *before* "emitting" it to disk/RAM.
         *
         * The key point to note here is that if we used a hook like `afterEmit` in combination
         * with `fs.writeFile()`, the logic would work fine *only* for one-and-done Webpack processes.
         * However, for continuous ones, Webpack is watching if files change, so manually modifying the
         * file after Webpack's "emit" lifecycle causes it to rebuild, resulting in infinite rebuild
         * cycles.
         *
         * @see [SO answer that revealed the difference between `processAssets` and `afterEmit`]{@link https://stackoverflow.com/questions/65515354/can-i-use-a-webpack-hook-to-modify-file-output-just-before-it-gets-saved/65529189#65529189}
         * @see [`processAssets` stages]{@link https://webpack.js.org/api/compilation-hooks/#list-of-asset-processing-stages}
         * @see [Compiler hooks]{@link https://webpack.js.org/api/compiler-hooks/#thiscompilation}
         * @see [Compilation hooks]{@link https://webpack.js.org/api/compilation-hooks/#processassets}
         * @see [`thisCompilation` vs `compilation` hook]{@link https://github.com/jantimon/html-webpack-plugin/issues/1495}
         * @see [Similar SO post, though less helpful]{@link https://stackoverflow.com/questions/72189011/how-to-inspect-files-compiled-by-webpack-before-they-are-emitted}
         * @see [Similar logic, except with chunks instead of assets]{@link https://stackoverflow.com/questions/72652370/webpack-4-to-5-custom-plugin-replacing-compilation-assets-mutation-with-compil}
         * @see [Somewhat similar file-watcher plugin]{@link https://stackoverflow.com/questions/43704994/webpack-manually-added-compilation-file-dependency-should-force-rebuild}
         * @see [CopyWebpackPlugin's `transform()` method enhancements from the community]{@link https://github.com/webpack-contrib/copy-webpack-plugin/issues/15}
         * @see [The original reason this plugin was made: `DefinePlugin` only works for files transpiled by Webpack]{@link https://webpack.js.org/plugins/define-plugin}
         * @see [Alternative: `serviceworker-webpack-plugin`]{@link https://github.com/oliviertassinari/serviceworker-webpack-plugin}
         * @see [Theoretically, we could use `entry`/`splitChunks` entries, but this can become problematic for shared code, which we really only would want for `DefinePlugin`]{@link https://stackoverflow.com/questions/72114876/webpack-transpiled-typescript-service-worker-code-doesnt-seem-to-work}
         * @see [Related: Webpack loading strategies within dynamic imports]{@link https://stackoverflow.com/questions/49121053/how-to-use-a-webpack-dynamic-import-with-a-variable-query-string}
         */
        compiler.hooks.thisCompilation.tap(this.constructor.name, compilation => {
            compilation.hooks.processAssets.tap({
                name: this.constructor.name,
                stage: compilation.constructor.PROCESS_ASSETS_STAGE_ANALYSE,
            }, () => {
                const emittedFilesPaths = this.getEmittedFilesPaths(compiler, compilation);
                let replaceWithText = this.replaceWith;

                if (typeof this.replaceWith === typeof this.getEmittedFilesPaths) {
                    replaceWithText = this.replaceWith(emittedFilesPaths.map(path => path.relative));
                }

                this.replaceTextInFileBeforeEmit(compilation, this.fileName, this.textToReplace, replaceWithText);
            });
        });
    }

    /**
     * @param {Compiler} compiler
     */
    alterFileAfterEmit(compiler) {
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

            let targetFilePath = emittedFilesPaths.find(path => path.relative.includes(this.fileName));

            if (!targetFilePath) {
                targetFilePath = compilation.getAsset(this.fileName);

                if (!targetFilePath) {
                    console.warn(`Could not find file ${this.fileName}`);
                    return;
                }
            }

            this.replaceTextInFileOnDisk(targetFilePath.absolute, this.textToReplace, replaceWithText);
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

    replaceTextInFileBeforeEmit(compilation, origSrcFileName, oldText, newText) {
        const fileToModify = compilation.getAsset(origSrcFileName);

        compilation.updateAsset(
            origSrcFileName,
            new sources.RawSource(fileToModify.source.source().replace(oldText, newText)),
        );
    }

    replaceTextInFileOnDisk(fileAbsPath, oldText, newText) {
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
