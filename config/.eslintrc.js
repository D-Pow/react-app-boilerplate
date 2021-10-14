const fs = require('fs');
const findFile = require('./findFile');

// ESLint requires config to be either a JSON or CommonJS file, it doesn't support ESM.
// Node cannot `require()` .mjs files either, so we can't use our custom `Paths` object.
const babelConfigPath = findFile('babel.config.js');

// Extensions supported by ESLint (includes JavaScript, TypeScript, and their derivatives)
const extensions = process?.env?.npm_package_config_eslintExtensions?.split(',')
    // Added solely for IDE integration since env vars (like npm config fields) can't be parsed statically. See: https://youtrack.jetbrains.com/issue/WEB-43731
    || [ '.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs' ];

// Paths not to lint
const gitIgnoredPaths = fs.readFileSync(findFile('.gitignore'))
    .toString()
    .split('\n')
    .filter(ignoredPath => ignoredPath)
    .map(ignoredPath => ignoredPath.replace(/(?:^[^*])|(?:[^*]$)/g, (fullStrMatch, strIndex) => {
        // All strings matching the regex don't have either leading `**/`, trailing `/**`, or both.

        if (fullStrMatch === '/') {
            // Directory without leading/trailing `**`
            return strIndex === 0 ? '**/' : '/**';
        }

        if (strIndex === 0) {
            // File or directory without leading `/`
            return `**/${fullStrMatch}`;
        }

        // File
        return fullStrMatch;
    }));

/** @type {import('eslint').Linter.BaseConfig} */
module.exports = {
    env: {
        browser: true,
        es6: true,
        jest: true,
    },
    parser: '@babel/eslint-parser',
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
        babelOptions: {
            configFile: babelConfigPath,
        },
    },
    ignorePatterns: [
        '**/node_modules/**',
        ...gitIgnoredPaths,
    ],
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:import/recommended',
    ],
    plugins: [
        '@babel',
        '@typescript-eslint',
        'react',
        'react-hooks',
        'import',
    ],
    // Settings for specific plugins
    settings: {
        react: { // `eslint-plugin-react` docs: https://github.com/yannickcr/eslint-plugin-react#configuration
            version: 'detect', // Automatically detect React version
        },
        'import/extensions': extensions,
        'import/resolver': {
            node: {
                extensions,
            },
            alias: {
                extensions,
                map: [
                    [ '@', './src' ],
                    [ '/', './' ],
                ],
            },
        },
    },
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        require: 'readonly',
        process: 'writable',
        module: 'writable',
        __dirname: 'readonly',
        global: 'writable',
        Buffer: 'readonly',
    },
    rules: {
        indent: [ 'error', 4, { // Indent with 4 spaces, not tab or 2 spaces
            SwitchCase: 1, // Same for switch-case statements
            ignoredNodes: [ 'TemplateLiteral' ],
        }],
        eqeqeq: [ 'warn', 'always', {
            null: 'ignore', // Encourage using ===/!== except for `x != null` (`!= null` --> `!== null && !== undefined`)
        }],
        // Enforce spacing between square/curly braces except for nested arrays/objects
        'object-curly-spacing': [ 'error', 'always', {
            arraysInObjects: false,
            objectsInObjects: false,
        }],
        'array-bracket-spacing': [ 'error', 'always', {
            arraysInArrays: false,
            objectsInArrays: false,
        }],
        'key-spacing': [ 'error', { // Add spaces after object keys' colons, `{ key: val }` instead of `{ key:val }`
            beforeColon: false,
            afterColon: true,
        }],
        'brace-style': 'error', // Enforce all function/statement curly braces to be on same line as declaration; else(if) statements on same line as closing curly brace. Defaults to '1tbs' - one-true-brace-style. See: https://eslint.org/docs/rules/brace-style#1tbs
        'comma-dangle': [ 'error', 'always-multiline' ], // Enforce commas after array/object/import/export/function parameters, but only if they're on multiple lines
        'comma-spacing': [ 'error', { // Enforce spaces only after commas
            before: false,
            after: true,
        }],
        semi: [ 'error', 'always' ], // Enforce semicolon usage
        'no-unused-vars': [ 'warn', {
            /*
             * TODO Find or write a plugin to support the below, then change `warn` to `error`:
             *  - Error on unused vars unless they're functions (see: https://github.com/eslint/eslint/issues/15078).
             *    Starter regex (doesn't capture all functions): '(?<= )(\\w+)(?=( = )?\\([^\\)]*\\)( =>)? [\\(\\{])'
             *  - Don't error on unused vars from array spreading (`ignoreRestSiblings` doesn't apply to arrays).
             */
            // Ignore function arguments whose names match this regex
            varsIgnorePattern: 'React',
            // Ignore function arguments whose names match this regex
            argsIgnorePattern: 'props',
            // Ignore unused vars when they are part of rest spreads, e.g. `const { used, ...unused } = obj;`
            ignoreRestSiblings: true,
        }],
        'no-prototype-builtins': 'off', // Allow `myObj.hasOwnProperty()` instead of `Object.prototype.hasOwnProperty.call(myObj)`

        // TODO Find out how to force imports to use aliases (unless ./File import)
        //  I think we have to write our own plugin because none of the below work:
        //  eslint-plugin-import, eslint-import-resolver-alias, eslint-plugin-import-alias
        //  Starting point: https://stackoverflow.com/questions/66349222/how-to-enforce-a-rule-on-importing-path-using-alias-by-eslint

        'import/no-cycle': [ 'error', { commonjs: true, amd: true }],
        'import/no-unresolved': [ 'error', {
            // `no-unresolved` has a different set of rules for what files trigger errors (see: https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unresolved.md#ignore)
            // which means the `/` import alias isn't being honored by this rule.
            // Fix that by scanning through all files/directories in the project root and ignoring
            // unresolved-module errors only for those files.
            ignore: fs.readdirSync('.').map(fileOrDirInRoot => `^/${fileOrDirInRoot}.*`),
        }],

        'react/jsx-indent': [ 'error', 4, {
            checkAttributes: true,
            indentLogicalExpressions: true,
        }],
        'react/jsx-closing-bracket-location': [ 'error', {
            selfClosing: 'tag-aligned',
            nonEmpty: 'tag-aligned',
        }],
        'react/jsx-tag-spacing': [ 'error', {
            beforeSelfClosing: 'always', // force a space before self-closing attributes and />, e.g. `<MyComp />`
            beforeClosing: 'never', // never allow a space between closing > (that lacks a slash), e.g. `<MyComp ></MyComp >`
            afterOpening: 'never', // never allow a space between opening < and component name, e.g. `< MyComp>`
            closingSlash: 'never', // never allow a space between closing < and /, e.g. `< /MyComp>`
        }],
        'react/jsx-filename-extension': [ 'error', {
            // allow: 'as-needed', // Only allow .jsx for files with JSX in them
            extensions: [ '.jsx', '.tsx' ], // Allow both .jsx and .tsx for file extensions (default is only .jsx)
        }],
        'react/prop-types': 'warn',
        'react/display-name': 'off', // Don't error on arrow-function components
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
    },
    overrides: [
        {
            files: [ '*.ts?(x)' ],
            parser: '@typescript-eslint/parser',
        },
    ],
};
