import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
function requireFile(fileName, baseDir = '') {
    const require = createRequire(baseDir || import.meta.url);

    return require(fileName);
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
    const resolvedFilePath = path.resolve(baseDir, fileName);

    if (onlyFilePath) {
        return resolvedFilePath;
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
            return requireFile(import.meta.url);
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
