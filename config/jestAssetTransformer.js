const path = require('path');
const JestCssModulesTransformer = require('jest-css-modules-transform');
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

        if (FileTypeRegexes.Svg.test(filePath)) {
            return {
                code: `
                    const React = require('react');

                    // Mimic default (URL) and named (React.Component) exports from @svgr.
                    // String constructor must be used so we can set new fields on it, which can't be done with string primitives,
                    // i.e. let str = 'Hi'; str.myField = 'Bye'; --> str.myField == null
                    module.exports = new String(${JSON.stringify(path.basename(filePath))});
                    module.exports.ReactComponent = React.forwardRef((props, ref) => React.createElement('svg', { ref, ...props }));
                `
            };
        }

        if (FileTypeRegexes.Styles.test(filePath)) {
            /**
             * `jest-css-modules-transform` has a bug where they [don't support jest@>=27]{@link https://github.com/Connormiha/jest-css-modules-transform/issues/39}.
             * So nest its call here to get the config option they are supposed to use until the bug is fixed.
             */
            const allTranspiledCssCode = JestCssModulesTransformer.process(fileContents, filePath, options.config);

            return {
                code: allTranspiledCssCode
            };
        }

        // Binary files (images, fonts, etc.) are processed by webpack to use URLs instead of file content,
        // so reflect that in jest tests by exporting only the name to form a "pretend" URL.
        return {
            code: `module.exports = ${JSON.stringify(path.basename(filePath))};`
        };
    }
};
