import { createRequire } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

import tsNode from 'ts-node';

import { Paths } from '../Files.js';


/**
 * There are a couple ways to import CJS files:
 *  - In NodeJS@>=14.8, you can import them directly.
 *  - For named exports: const { myFunc } = await import('myFunc.js');
 *  - For default exports: const MyCls = (await import('MyCls.js')).default
 *  - Using `module.createRequire()`, which allows importing `.[mc]?js` files as well as non-JS files (.json, .txt, etc.).
 *
 * This uses the latter to synchronously import files.
 *
 * Note: Since this goes through an extra layer of importing files, it also removes all JSDoc/autocompletion,
 * so using one of the other methods is preferred.
 *
 * @param {string} fileName - Path to the file desired to be imported.
 * @param {string} [baseDir]
 * @returns {any} - Content of that file. JS files will be treated as normal and JSON files will be objects.
 */
export function requireFile(fileName, baseDir = '') {
    const require = createRequire(baseDir || import.meta.url);

    return require(fileName);
}


/**
 * Imports a TypeScript file for use within JavaScript.
 * Specifically meant for non-source files (e.g. configs) since Webpack and its loaders
 * already allows JS to import TS in source code.
 *
 * @param {string} filePath - Path to file for importing (can be absolute or relative).
 * @param {Object} [options]
 * @param {boolean} [options.includeSourceMap] - Include inline source-map strings in output JS module.
 * @param {boolean} [options.transpileToCjs] - Transpile .ts down to .cjs rather than to .mjs (this is typically necessary).
 * @returns {Promise<Module>} - Imported module after transpiling from TS to JS.
 */
export async function importTsFileInJs(filePath, {
    includeSourceMap = false,
    transpileToCjs = true,
} = {}) {
    filePath = Paths.getFileAbsPath(filePath);

    const tsFileContents = fs.readFileSync(filePath).toString();
    /**
     * @see [ts-node `create()` compiler docs]{@link https://typestrong.org/ts-node/api/index.html#create}
     * @see [ts-node `create()` compiler source code]{@link https://github.com/TypeStrong/ts-node/blob/7af5c48864b60576e471da03c064f325ce37d850/src/index.ts#L569}
     * @type {import('ts-node').Service}
     */
    const tsNodeCompiler = tsNode.create({
        /* Regardless of sourceMap settings, ts-node will always add inline source maps */
        // compilerOptions: {
        //     sourceMap: false,
        //     inlineSourceMap: false,
        // },
        ...(transpileToCjs || ({
            esm: true,
            moduleTypes: {
                '**/*.ts': 'esm',
            },
        })),
    });

    const jsTempFilePath = filePath.replace(/\.ts$/, transpileToCjs ? '.js' : '.mjs');

    // Specifying the original file's path as a second arg + adding `moduleTypes['.ts'] = 'esm`
    // maintains original use of `import`/`export` rather than converting it to CommonJS `require`/`exports`
    let jsTranspiledCode = tsNodeCompiler.compile(tsFileContents, transpileToCjs ? '' : filePath);

    if (!includeSourceMap) {
        jsTranspiledCode = jsTranspiledCode.replace(/\/\/# sourceMapping\S+($|\n)/g, '\n');
    }

    /**
     * None of the acclaimed methods below worked, either because of trying to load non-ESM within the
     * context of this ESM file, URIs for `import()` must be of the `file://` schema.
     * This means we can't import code in a String variable nor Base64 `data:` URIs, regardless of if
     * the code was only URL-escaped, Base64-encoded, or both),
     * Plus, apparently loading `Blob` objects works in the browser but not NodeJS.
     *
     * Thus, write the transpiled TS (now JS) code to a temp file, then import it like normal, and
     * delete it after the module is loaded.
     *
     * @example Getting Base64 string for `import()`
     * // btoa(str) === Buffer.from(jsTranspiledCode).toString('base64') !== Buffer.from(jsTranspiledCode).toString('base64url')
     * const jsTranspiledCodeBase64WithMimeType = `data:application/javascript;base64,${Buffer.from(parseStringTemplate`${jsTranspiledCode}`).toString('base64url')}`;
     * await import(jsTranspiledCodeBase64WithMimeType);
     *
     * @example Plain JS code.
     * const jsTranspiledCodeUri = `data:application/javascript;charset=utf-8,${jsTranspiledCode}`;
     * await import(jsTranspiledCodeUri);
     *
     * @example Using NodeJS `Module` object.
     * return new Module()._compile(jsTranspiledCode, filePath).exports;
     *
     * @example Creating Object URL instead of manual string creation from previous examples.
     * const objUrl = URL.createObjectURL(new Blob([ jsTranspiledCodeBase64WithMimeType ], { type: 'application/javascript' }));
     * // or
     * const objUrl = URL.createObjectURL(Buffer.from(jsTranspiledCode).buffer);
     * await import(objUrl);
     *
     * @see [Evaluating code via `import(dataUri)`]{@link https://2ality.com/2019/10/eval-via-import.html#evaluating-simple-code-via-import()}
     * @see [Creating `new Module()` from source code string]{@link https://miyauchi.dev/posts/module-from-string}
     * @see [Attempting with `eval()` (fails if src code calls `import` or if calling `require()` from .mjs file]{@link https://stackoverflow.com/questions/47978809/how-to-dynamically-execute-eval-javascript-code-that-contains-an-es6-module-re}
     * @see [Error: 'exports is not defined' when attempting `import()`]{@link https://stackoverflow.com/questions/43042889/typescript-referenceerror-exports-is-not-defined}
     * @see [Base64-encoding in NodeJS]{@link https://stackoverflow.com/questions/6182315/how-can-i-do-base64-encoding-in-node-js/6182519#6182519}
     * @see [NodeJS `File` class/API]{@link https://github.com/nodejs/node/pull/47153}
     */

    fs.writeFileSync(jsTempFilePath, jsTranspiledCode);

    const jsModule = await import(jsTempFilePath);

    fs.rmSync(jsTempFilePath);

    return jsModule;
}


/**
 * Either:
 *  - Imports a file.
 *  - Gets its absolute path.
 *  - Gets its file URL.
 *
 * @param {string} fileName - File to import (with extension)
 * @param {Object} [options]
 * @param {string} [options.baseDir] - Base directory, from which the file is relative (e.g. `'../utils' + 'File.js' = '../utils/File.js'`).
 * @param {boolean} [options.sync=true] - If the import should be synchronous or imported via dynamic import.
 * @param {boolean} [options.onlyFilePath=false] - Return only the absolute path for the resolved file.
 * @param {boolean} [options.onlyFileUrl=false] - Return only a Promise containing the `file://` URL string for the resolved file.
 * @returns {(string|any|Promise<string|any>)} - The imported file or it's resolved path/URL.
 */
export function importFile(fileName, {
    baseDir = '',
    sync = true,
    onlyFilePath = false,
    onlyFileUrl = false,
} = {}) {
    const resolvedFilePath = Paths.getFileAbsPath(baseDir, fileName);

    if (onlyFilePath) {
        return resolvedFilePath;
    }

    if (resolvedFilePath.match(/\.ts\w*$/i)) {
        return importTsFileInJs(resolvedFilePath);
    }

    if (sync) {
        if (onlyFileUrl) {
            // Synchronous version of `import.meta.resolve`.
            // Encode all browser-URL special characters except '/'
            const fileUrlSafeEscapedPath = encodeURIComponent(`${baseDir || '.'}/${fileName}`)
                .replaceAll(encodeURIComponent('/'), '/');

            return new URL(fileUrlSafeEscapedPath, 'file:');
        }

        try {
            return requireFile(baseDir);
        } catch (e) {
            try {
                return requireFile(import.meta.url);
            } catch (e2) {
                // Either the file can't be imported via `require()` or `import.meta.url` isn't defined
            }
        }
    }

    if (import.meta.resolve) {
        // `import.meta.resolve()` requires a relative path for the resolved file
        const relativeFilePath = fileName.charAt(0) === '.' ? fileName : `./${fileName}`;
        const baseUrl = baseDir
            /**
             * Same as `new URL(baseDir + `/${fileName}`, 'file:')` except it escapes special characters
             * allowed in URLs (#, %, etc.) so they can be used in NodeJS imports.
             * @see [NodeJS Docs]{@link https://nodejs.org/api/url.html#urlpathtofileurlpath}
             */
            ? pathToFileURL(resolvedFilePath)
            /**
             * If undefined, `import.meta.resolve(fileName, parentPath)` defaults `parent` to `import.meta.url`.
             * @see [NodeJS Docs]{@link https://nodejs.org/docs/latest-v16.x/api/esm.html#importmetaresolvespecifier-parent}
             */
            : undefined;

        /*
         * For imports, this is generally same as `import(path.resolve(...))`.
         * However, since it generates a URL string (i.e. `file:// + /path/to/file` instead of `/path/to/file`),
         * this means it can be used in other contexts, like dynamic imports, opening the file in the browser, etc.
         */
        const resolvedFileUrlPromise = import.meta.resolve(relativeFilePath, baseUrl);

        if (onlyFileUrl) {
            return resolvedFileUrlPromise;
        }

        return (async () => {
            const resolvedFileUrl = await resolvedFileUrlPromise;

            return await import(resolvedFileUrl);
        })();
    }

    return import(resolvedFilePath);
}
