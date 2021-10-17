const fs = require('fs');
const path = require('path');

const findFile = require('./config/findFile');

// ESLint requires config to be either a JSON or CommonJS file, it doesn't support ESM.
// Node cannot `require()` .mjs files either, so we can't use our custom `Paths` object.
const babelConfigPath = findFile('babel.config.js');

const rootDir = path.dirname(findFile('package.json'));

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
        ecmaVersion: 2022,
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
        'import-alias',
    ],
    // Settings for specific plugins
    settings: {
        react: { // `eslint-plugin-react` docs: https://github.com/yannickcr/eslint-plugin-react#configuration
            version: 'detect', // Automatically detect React version
        },
        'import/extensions': extensions,
        'import/internal-regex': '^@?/', // Mark `@/...` and `/...` import strings as `internal` imports since they're our aliases
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
        __filename: 'readonly',
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


        // Ensure aliased imports are always used instead of relative paths for imports in the `src/` directory.
        'import-alias/import-alias': [ 'error', {
            relativeDepth: 0, // Only allow imports from same directory (e.g. `import './SubComponent'` as used in `index.js` or parent components)
            rootDir: path.relative(rootDir, '.'), // Ensure root directory is correct regardless of .eslintrc file location. Requires relative path so `eslint --fix` doesn't inject absolute path in imports.
            aliases: [
                {
                    alias: '@',
                    matcher: '^src',
                },
                {
                    alias: '/',
                    matcher: '^',
                },
            ],
        }],
        // Prevent different import lines from importing from the same file (e.g. `import { x } from 'file'; import { y } from 'file'`)
        'import/no-duplicates': [ 'error', {
            considerQueryString: true, // Allow import queries of different values to coexist (e.g. `import 'file?a'` works with `import 'file?b'`)
        }],
        // Sort imports by type with(out) newlines between them: https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md
        'import/order': [ 'error', {
            groups: [
                'builtin', // native
                'external', // third-party installed libs
                'internal', // source code (all types)
                'sibling', // source code (relative path, same or lower dir)
                'parent', // source code (relative path, higher dir) - Note: `import/no-relative-parent-imports` doesn't allow aliases so it can't be used
                'index', // index file of current directory (`'.'`)
                'object', // TypeScript "object" imports
                'type', // type imports (TypeScript)
                'unknown', // everything else
            ],
            pathGroups: [ // Ensure aliased imports come before other internal ones
                {
                    pattern: '@/**',
                    group: 'external', // Ensure `@` comes before all other internal imports
                    position: 'after',
                    patternOptions: {
                        dot: true, // Allow matching paths with preceding periods (e.g. `.git/` or `.gitignore`)
                    },
                },
                {
                    pattern: '/*',
                    group: 'internal', // Technically allows `/` before `@`, but that's better than after `./file`
                    position: 'before',
                    patternOptions: {
                        dot: true,
                    },
                },
            ],
            'newlines-between': 'always-and-inside-groups', // Force newlines between groups, allow them within groups
            warnOnUnassignedImports: true, // Warn if `import 'a'` is used before `import X from 'b'` but don't error in case `a` causes global changes (e.g. a polyfill)
        }],
        // Ensure there is at least one newline between imports and file logic
        'import/newline-after-import': [ 'error', {
            count: 1,
        }],
        // Ensure all imports resolve/exist
        'import/no-unresolved': [ 'error', {
            // `no-unresolved` has a different set of rules for what files trigger errors (see: https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unresolved.md#ignore)
            // which means the `/` import alias isn't being honored by this rule.
            // Fix that by scanning through all files/directories in the project root and ignoring
            // unresolved-module errors only for those files.
            ignore: fs.readdirSync('.').map(fileOrDirInRoot => `^/${fileOrDirInRoot}.*`),
        }],
        // Prevent circular dependencies
        'import/no-cycle': [ 'error', { commonjs: true, amd: true }],


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
        // Use specified parser for TypeScript files
        {
            files: [ '*.ts?(x)' ],
            parser: '@typescript-eslint/parser',
        },
        // Allow `config/` files to use relative imports (e.g. `import X from '../utils.mjs'`)
        {
            files: [ `./config/**` ],
            rules: {
                'import-alias/import-alias': 'off',
            },
        },
    ],
};
