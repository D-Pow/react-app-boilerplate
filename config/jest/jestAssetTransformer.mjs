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
                 * Mimic the URL-only export from `*.svg?url` (webpack's asset/resource loader):
                 * a single default export of the file URL.
                 */
                return {
                    code: `
                        module.exports = ${srcFileName};
                    `,
                };
            }

            /**
             * Mimic the named and default exports from `@svgr/webpack`:
             *  - `default` and `SvgUrl` -> the file URL (a plain string)
             *  - `ReactComponent` -> the SVG rendered as a React component
             *
             * Emit a proper ES-module-interop shape (`__esModule` + `default`).
             */
            return {
                /*
                 * A Jest (sync) transformer's output is executed directly as CommonJS — it is NOT
                 * re-processed by Babel — so this MUST use `require`/`module.exports`, not ESM
                 * `import`/`export` (which would throw "Cannot use import statement outside a module").
                 * The `__esModule` + `default` shape lets Babel-compiled test code do
                 * `import SvgUrl from '...'` and receive the URL string itself.
                 */
                code: `
                    const React = require('react');

                    const SvgUrl = ${srcFileName};

                    module.exports = {
                        __esModule: true,
                        default: SvgUrl,
                        SvgUrl,
                        ReactComponent: React.memo(React.forwardRef((props, ref) => React.createElement('svg', { ref, ...props }))),
                    };
                `,
            };
        }

        if (FileTypeRegexes.Styles.test(srcAbsPath)) {
            /*
             * If you want to disable all imports (e.g. if calling `@use '~@dependency/sub-package'` is causing issues),
             * activate the code below.
             */
            // srcFileContents = srcFileContents.replace(/@(use|import)\s+[^\s;]+;?/g, '');

            /**
             * Transpile (S)CSS into a JS module so tests can `import` it. `jest-css-modules-transform`
             * outputs both the class-name map and any ICSS `:export { ... }` values, which covers:
             *  - `.module.(s)css` -> CSS-Modules: `import * as styles from './X.module.scss'` resolves
             *    `styles.myClass` (mirrors webpack's css-loader `mode: 'local'`).
             *  - global `.(s)css` -> exposes `:export` values, e.g. `import * as CommonStyles from '@/styles/Common.scss'`
             *    (mirrors webpack's `mode: 'icss'`); plain side-effect imports like `import '@/styles/index.scss'` also work.
             *
             * Note: `jest-css-modules-transform` has a bug where they [don't support jest@>=27]{@link https://github.com/Connormiha/jest-css-modules-transform/issues/39}.
             * Another possible option: [postcss-modules-scope]{@link https://www.npmjs.com/package/postcss-modules-scope}
             */
            const allTranspiledCssCode = JestCssModulesTransformer.process(srcFileContents, srcAbsPath, jestConfigs);

            return {
                // `process()` returns a `{ code }` object (jest@>=28 format); older versions returned a raw string.
                code: typeof allTranspiledCssCode === 'string'
                    ? allTranspiledCssCode
                    : allTranspiledCssCode.code,
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
