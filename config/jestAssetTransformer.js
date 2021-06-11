const path = require('path');
const { FileTypeRegexes } = require('./utils');


/** @type {import('@jest/core/node_modules/@jest/transform/build/types').SyncTransformer} */
module.exports = {
    /**
     * @param {string} fileContents
     * @param {string} filePath
     * @param {Object} options
     * @returns {import('@jest/types/build/Transform').TransformResult}
     */
    process(fileContents, filePath, options) {
        // Note: Cannot use `export default`, must use `module.exports` since this is `process()`, not `processAsync()`

        // Text files are processed by webpack to import the file content directly as a string,
        // so reflect that in jest tests by exporting the stringified file contents.
        if (FileTypeRegexes.Text.test(filePath)) {
            return {
                code: `module.exports = ${JSON.stringify(fileContents)};`
            };
        }

        // Binary files (images, fonts, etc.) are processed by webpack to use URLs instead of file content,
        // so reflect that in jest tests by exporting only the name to form a "pretend" URL.
        return {
            code: `module.exports = ${JSON.stringify(path.basename(filePath))};`
        };
    }
};
