import path from 'node:path';

import JestCssModulesTransformer from 'jest-css-modules-transform';

import { FileTypeRegexes } from '../utils/index.js';


/** @type {import('@jest/transform/build/types').SyncTransformer} */
const jestAssetTransformer = {
    /**
     * Processes source file contents to be usable in jest tests.
     * Since jest can't parse/understand all file types even after setting certain config
     * values, this transformer file helps to transpile and/or reformat the code that will
     * be outputted to jest test suites/files.
     *
     * Note: Cannot use `export default`, must use `module.exports` since this is `process()`, not `processAsync()`.
     *
     * @param {string} srcFileContents - Contents of the original source file, whether as a string or bytes.
     * @param {string} srcAbsPath - Absolute path to the source file.
     * @param {Object} options
     * @param {Object} options.config - Jest configuration options from jest.config.json, package.json->jest, etc.
     * @param {Object} options.transformerConfig - Configuration options for this specific transformer, passed in jestConfig->transform.
     * @returns {import('@jest/types/build/Transform').TransformResult}
     */
    process(srcFileContents, srcAbsPath, options) {
        const srcText = JSON.stringify(srcFileContents);
        const srcFileName = JSON.stringify(path.basename(srcAbsPath));
        const {
            config: jestConfigs,
            transformerConfig: transformerConfigs,
        } = options;

        if (FileTypeRegexes.Text.test(srcAbsPath)) {
            /**
             * Text files are processed by webpack to import the file content directly as a string,
             * so reflect that in jest tests by exporting the stringified file contents.
             */
            return {
                code: `module.exports = ${srcText};`,
            };
        }

        if (FileTypeRegexes.Svg.test(srcAbsPath)) {
            if (/url$/.test(srcAbsPath)) {
                /**
                 * Mimic query (URL) export from `@svgr/webpack`.
                 */
                return {
                    code: `
                        module.exports = new String(${srcFileName});
                    `,
                };
            }

            /**
             * Mimic named and default exports from `@svgr/webpack`.
             *
             * Note that the String constructor must be used so that we can set new fields on it in order
             * to have both default/named exports because you can't set new fields on string primitives.
             * i.e. let str = 'Hi'; str.myField = 'Bye'; --> str.myField == null
             */
            return {
                code: `
                    const React = require('react');

                    const SvgUrl = new String(${srcFileName});

                    module.exports = SvgUrl;
                    module.exports.SvgUrl = SvgUrl;
                    module.exports.ReactComponent = React.memo(React.forwardRef((props, ref) => React.createElement('svg', { ref, ...props })));
                `,
            };
        }

        if (FileTypeRegexes.Styles.test(srcAbsPath)) {
            /**
             * `jest-css-modules-transform` has a bug where they [don't support jest@>=27]{@link https://github.com/Connormiha/jest-css-modules-transform/issues/39}.
             * So nest its call here to get the config option they are supposed to use until the bug is fixed.
             *
             * Another possible option: [postcss-modules-scope]{@link https://www.npmjs.com/package/postcss-modules-scope}
             */
            const allTranspiledCssCode = JestCssModulesTransformer.process(srcFileContents, srcAbsPath, jestConfigs);

            return {
                code: allTranspiledCssCode,
            };
        }

        /**
         * Binary files (images, fonts, etc.) are processed by webpack to use URLs instead of file content,
         * so reflect that in jest tests by exporting only the name to form a "pretend" URL.
         */
        return {
            code: `module.exports = ${srcFileName};`,
        };
    },
};

export default jestAssetTransformer;
