const path = require('path');

const {
    Paths,
    FileTypeRegexes,
    gitignoreFilesGlobs,
    babelConfigPath,
    tsconfigDevPath,
    ImportAliases,
} = require('./config/utils');

// ESLint requires config to be either a JSON or CommonJS file, it doesn't support ESM.
// Node cannot `require()` .mjs files either, so we can't use our custom `Paths` object.

const rootDir = Paths.ROOT.ABS;

// Extensions supported by ESLint (includes JavaScript, TypeScript, and their derivatives)
const extensions = process?.env?.npm_package_config_eslintExtensions?.split(',')
    // Added solely for IDE integration since env vars (like npm config fields) can't be parsed statically. See: https://youtrack.jetbrains.com/issue/WEB-43731
    || [ '.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs' ];


/** @type {import('eslint').Linter.BaseConfig} */
module.exports = {
    root: true, // This is the base ESLint config file, so don't search any higher
    env: {
        browser: true,
        es2021: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        /* ESLint root options - See: https://eslint.org/docs/user-guide/configuring/language-options#specifying-parser-options */
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },

        /* @typescript-eslint/parser options - See: https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/parser */
        tsconfigRootDir: rootDir, // Directory that all tsconfig files' paths are relative to in the `parserOptions.project` option
        project: tsconfigDevPath, // tsconfig file (or array of files) from which to extract - Requires JS/JSX overrides (see below)
        extraFileExtensions: extensions.filter(ext => !FileTypeRegexes.JsAndTs.test(ext)), // Extra extensions other than `.[tj]sx?` need to be defined explicitly
    },
    ignorePatterns: [
        '**/node_modules/**',
        ...gitignoreFilesGlobs,
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
        'unused-imports',
    ],
    // Settings for specific plugins
    settings: {
        react: { // `eslint-plugin-react` docs: https://github.com/yannickcr/eslint-plugin-react#configuration
            version: 'detect', // Automatically detect React version
        },
        'import/extensions': [ ...extensions, '.json' ],
        // Mark import aliases' keys as part of the internal-imports group for `import/order` since they're our code
        'import/internal-regex': `^(${Object.keys(ImportAliases).map(alias => `${ImportAliases.stripTrailingSlash(alias)}/`).filter(Boolean).join('|')})`,
        'import/resolver': {
            node: {
                extensions: [ ...extensions, '.json' ],
            },
            alias: {
                extensions: [ ...extensions, '.json' ],
                map: Object.entries(ImportAliases.toCustomObject({
                    // Make all aliases' path matchers relative to root (root = '.'), removing any trailing slashes/dots.
                    // e.g. { '@': 'src', '~/': '.' } => [ [ '@', './src' ], [ '~/', './' ] ]
                    pathMatchModifier: (pathMatchRegexString, pathMatchArray) => pathMatchArray.map(pathMatch => `./${path.relative('.', pathMatch)}`),
                }))
                    /*
                     * Result from above: [
                     *     [ '@', [
                     *         './src',
                     *         './tests'
                     *     ]],
                     *     [ '~', [
                     *         '.'
                     *     ],
                     * ]
                     * Result from flatMap: [
                     *     [ '@', './src' ],
                     *     [ '@', './tests' ],
                     *     [ '~', '.' ],
                     * ]
                     */
                    .flatMap(([ alias, pathMatches ]) =>
                        // Duplicate the alias for every path match, i.e. [ ['@', './src'], ['@', './tests'] ]
                        pathMatches.map(pathMatch => ([ alias, pathMatch ])),
                    ),
            },
        },
    },
    globals: {
        JSX: 'readable', // Mark the new `JSX` variable as a global (introduced by React v17 for ubiquitous transforms without needing to `import React`)
        process: 'writable', // `webpack.DefinePlugin` injects `process.env` object into `src/` files.
        module: 'writable', // TODO Only used for src/index.jsx hot reloading, but that block might not be needed anymore
    },
    rules: {
        /* Syntax, logic, and common error-causing rules */
        'linebreak-style': [ 'error', 'unix' ], // Enforce LF (\n) for newlines and prevent CRLF (\r\n)
        eqeqeq: [ 'warn', 'always', { // Enforce using triple equals, ===/!===
            null: 'ignore', // Exception for `x != null` since `!= null` means `!== null && !== undefined`
        }],
        camelcase: [ 'error', { // Enforce camelCase for all variables unless they're in ALL_CAPS
            properties: 'never', // Allow snake_case in object keys (e.g. for endpoint payload objects)
            // ignoreDestructuring: true, // Allows destructured object keys to be used without being renamed to camelCase (e.g. `const { a_b } = obj; doSomething(a_b);`)
            ignoreGlobals: true, // Allow using global variables written in snake_case
        }],
        semi: [ 'error', 'always' ], // Enforce semicolon usage
        'block-scoped-var': 'error', // Prevent relying on `var` hoisting to allow usage outside its scope, e.g. error: `if (foo) { var x = 'X'; } return x + 1;`
        'brace-style': 'error', // Enforce all function/statement curly braces to be on same line as declaration; else(if) statements on same line as closing curly brace. Defaults to '1tbs' - one-true-brace-style. See: https://eslint.org/docs/rules/brace-style#1tbs
        'comma-dangle': [ 'error', 'always-multiline' ], // Enforce commas after array/object/import/export/function parameters, but only if they're on multiple lines
        'comma-style': [ 'error', 'last' ], // Force commas to be at the ends of lines rather than the beginning
        'no-else-return': [ 'error', { // Prevent return statements in else-statements if a return exists in the if-statement, e.g. error: `if (x) { return 1; } else { return 2; }`
            allowElseIf: false, // Also prevent else-if, e.g. error: `if (x) { return 1; } else if (y) { return 2; }`
        }],
        'no-lonely-if': 'error', // Merge if-statements into the parent else-statement if it's the only one in the code block, e.g. `else { if (x) { return 3; } }` --> `else if (x) { return 3; }`
        'no-empty': [ 'error', { // Prevent empty blocks (default in `eslint:recommended`), e.g. error: `if (x) {}`
            allowEmptyCatch: true, // Exception: Allow empty catch-statements, e.g. `catch (e) {}`
        }],
        curly: 'error', // Enforce using curly braces around if/else/while/for/etc.
        'nonblock-statement-body-position': [ 'error', 'beside' ], // Enforce inline statements without braces to be on one line (shouldn't be needed due to `curly` above), e.g. `if (foo) bar();`
        'require-atomic-updates': 'error', // Prevent race conditions from mixing async functions and generators when, for example, both alter the same variable
        quotes: [ 'error', 'single', { // Enforce using single quotes instead of double quotes
            avoidEscape: true, // Allow double quotes if escaping would be necessary, e.g. x = "hello 'new' world"
            allowTemplateLiterals: true, // Allow back-tick quotes all the time regardless of escaping or not, e.g. x = `hello world`
        }],
        'quote-props': [ 'error', 'as-needed' ], // Prevent quotes around object keys except for when it's absolutely necessary (e.g. hyphens, language reserved keywords, etc.)
        'no-prototype-builtins': 'off', // Allow `myObj.hasOwnProperty()` instead of `Object.prototype.hasOwnProperty.call(myObj)`
        'no-control-regex': 'off', // Allow regexes with unicode strings and other control sequences (e.g. colors for console output: `\x1B[36mHELLO\x1B[39mWORLD`
        'prefer-const': [ 'error', { // Prefer `const` over `let` if the variables never change
            destructuring: 'all', // Allow using `let` if in an object/array destructuring assignment as long as one value changes
            ignoreReadBeforeAssign: true, // Allow splitting `let` declarations and assignments with functions that use those variables
        }],
        'prefer-regex-literals': 'error', // Force using `/regex/` instead of `new RegExp()` when possible
        'no-unused-vars': [ 'warn', {
            /*
             * TODO Find or write a plugin to support the below, then change `warn` to `error`:
             *  - Error on unused vars unless they're functions (see: https://github.com/eslint/eslint/issues/15078).
             *    Starter regex (doesn't capture all functions): '(?<= )(\\w+)(?=( = )?\\([^\\)]*\\)( =>)? [\\(\\{])'
             *  - Don't error on unused vars from array spreading (`ignoreRestSiblings` doesn't apply to arrays).
             */
            // Ignore function arguments whose names match this regex
            // varsIgnorePattern: 'React',
            // Ignore function arguments whose names match this regex
            argsIgnorePattern: 'props',
            // Ignore unused vars when they are part of rest spreads, e.g. `const { used, ...unused } = obj;`
            ignoreRestSiblings: true,
        }],
        'wrap-iife': [ 'error', 'inside', { // Force Immediately-Invoked-Function-Expressions to have parentheses around the declaration, e.g. `(function x() { ... })()`
            functionPrototypeMethods: true, // Also wrap in parentheses for Function.prototype methods, e.g. `(function x() { ... }).call(...)`
        }],
        'dot-notation': 'error', // Enforce using `.` when possible, e.g. `foo.bar` instead of `foo['bar']`. Computed properties are still allowed, e.g. `const bar = 'myField'; foo[bar];`
        'new-cap': [ 'error', { // Enforce PascalCase for any constructor-based function calls
            newIsCap: true, // Anything using `new` needs to be PascalCase (also means classes need to be PascalCase so that `new myClass()` fails)
            capIsNew: false, // Don't force `new` to be prepended to PascalCase functions since they aren't all necessarily constructors
        }],
        'func-style': [ 'error', 'declaration', { // Enforce function declarations instead of expressions, i.e. use `function foo() {...}` instead of `const foo = function () {...}`. Object fields are still allowed: `foo.bar = function () {...}`
            allowArrowFunctions: true, // Allow arrow functions, i.e. allow `const foo = () => {...}` but not `const foo = function () {...}`
        }],

        /* Spacing rules */
        indent: [ 'error', 4, { // Indent with 4 spaces, not tab or 2 spaces
            SwitchCase: 1, // Same for switch-case statements
            ignoredNodes: [ 'TemplateLiteral' ],
        }],
        'keyword-spacing': 'error', // Enforce spaces around language keywords, e.g. else would error in `if (foo) {...}else{...}`
        'semi-spacing': 'error', // Enforce spacing after semicolons but never before; exception: `for(;;)`, `;func()`, and similar
        'comma-spacing': [ 'error', { // Enforce spaces only after commas
            before: false, // prevent `[ 2 , 3 ]` and `[ 2 ,3 ]`
            after: true, // e.g. `[ 2, 3 ]` instead of `[ 2,3 ]`
        }],
        'space-unary-ops': [ 'error', {
            words: true, // Enforce spacing around keywords that accept parentheses, e.g. error: `typeof(obj)`
            nonwords: false, // Allow spaces around operators, e.g. `!foo` or `foo++`
        }],
        // TODO Find a rule that only affects equals operator, nothing else
        // 'space-infix-ops': 'error', // Enforce spaces between all infix operators (non-unary, non-ternary), e.g. `x = 1`, `1 + 2`, etc.
        'object-curly-spacing': [ 'error', 'always', { // Enforce spacing between curly braces except for nested objects
            arraysInObjects: false, // e.g. `x = { a: [ 3 ]}`
            objectsInObjects: false, // e.g. `x = { a: { b: 3 }}`
        }],
        'array-bracket-spacing': [ 'error', 'always', { // Enforce spacing between curly braces except for nested objects
            arraysInArrays: false, // e.g. `x = [ 2, [ 3 ]]`
            objectsInArrays: false, // e.g. `x = [ 2, { a: 3 }]`
        }],
        'key-spacing': [ 'error', { // Add spaces after object keys' colons
            beforeColon: false, // prevent `{ key : val }` and `{ key :val }`
            afterColon: true, // e.g. `{ key: val }` instead of `{ key:val }`
        }],
        'no-whitespace-before-property': 'error', // Prevent spaces between objects and their properties, e.g. `foo [bar]`, `foo. bar`, `foo .bar` (doesn't include chained methods)
        'space-before-function-paren': [ 'error', {
            named: 'never', // Prevent spacing between function name and parentheses, e.g. `function foo() {}` and `class Foo { bar() {} }`
            anonymous: 'ignore', // Allow spacing around anonymous "function" functions and parentheses, e.g. `function() {}` or `function () {}`
            asyncArrow: 'ignore', // Allow spacing around anonymous async arrow functions, e.g. `async() => {}` or `async () => {}`
        }],
        'func-call-spacing': 'error', // Prevent spacing between function name and parentheses when called, e.g. `func ()`
        'space-before-blocks': 'error', // Enforce spacing before inline function/class brackets, e.g. error: `func(){ return 3; }`
        'block-spacing': 'error', // Enforce spacing inside inline function brackets, e.g. error: `func() {return 3;}`
        'arrow-spacing': 'error', // Enforce spacing before/after `=>` in arrow functions
        'generator-star-spacing': [ 'error', {
            before: false, // Prevent generator * to be on function name, e.g. error: `function *gen() {}`
            after: true, // Enforce generator * to be on `function` keyword, e.g. `function* gen() {}`
            anonymous: 'after', // Enforce * after `function` keyword, e.g. `x = function* () {}`
            method: { // Opposite for classes (since they don't use the `function` keyword)
                before: true, // Enforce * before function name, e.g. `x = { *gen() {} }`
                after: false, // Prevent superfluous * after function name, e.g. `x = { * gen() {} }`
            },
        }],
        'yield-star-spacing': [ 'error', 'after' ], // Enforce `yield* generator()` instead of `yield *generator()` (only applicable for yielding generator calls, not values)
        'computed-property-spacing': 'error', // Prevent spaces in computed properties, e.g. error: the variable in `x = { [ variable ]: 'hi' }`
        'switch-colon-spacing': 'error', // Enforce spacing after `case X:` colon but not before
        'no-trailing-spaces': 'error', // Don't allow trailing spaces at the ends of lines
        'spaced-comment': [ 'error', 'always', { // Enforce at least one space after `//` or `/*`
            exceptions: [ '*', '-', '+', '#' ], // Exception for comments containing only these characters, e.g. block comments with makeshift sections: `/*****`
            markers: [ '/' ], // Exception for comments with single instances of these characters after the comment, e.g. TypeScript's `/// <reference>`
            block: {
                balanced: true, // If the comment is a block comment `/**/` instead of inline `//`, then enforce a space after the opening and before the closing
            },
        }],
        'eol-last': 'error', // Enforce newlines at the end of files
        'no-multiple-empty-lines': [ 'error', { // Prevent extra newlines above the `max` allowed number
            max: Infinity, // Allow any number of newlines in code
            maxEOF: 0, // Prevent more than 1 newline at the end of a file. Note: `eol-last` rule forces 1 newline at the end, so `0` here means 0 additional newlines after the single `eol-last` newline
        }],


        /* Import rules */
        // Ensure aliased imports are always used instead of relative paths for imports in the `src/` directory.
        'import-alias/import-alias': [ 'error', {
            relativeDepth: 0, // Only allow imports from same directory (e.g. `import './SubComponent'` as used in `index.js` or parent components)
            rootDir, // Ensure root directory is correct regardless of .eslintrc file location. Requires relative path so `eslint --fix` doesn't inject absolute path in imports.
            aliases: Object.entries(ImportAliases.toCustomObject({
                // Make all aliases' path matchers relative to root (root = '.'), removing any trailing slashes/dots, and
                // adding '^' to show that import strings must match the pattern only at the beginning
                pathMatchModifier: (pathMatchStr, pathMatchArray) => pathMatchArray.map(pathMatch => `^${path.relative('.', pathMatch)}`),
            })).flatMap(([ alias, pathMatches ]) => pathMatches.map(pathMatch => ({
                alias,
                matcher: pathMatch,
            }))),
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
            pathGroups: Object.entries(ImportAliases.toCustomObject({
                // Allow import order rule to understand all paths/files after each alias, e.g. '@' => '@/**'
                // Ensure aliases ending with a slash don't create double slashes, e.g. '/' => '/**' instead of '//**'
                aliasModifier: alias => `${ImportAliases.stripTrailingSlash(alias)}/**`,
            })).map(([ alias, pathMatch ]) => {
                pathMatch = `${pathMatch}`; // Ensure we use regex string instead of object if the alias corresponds to multiple paths

                const pathGroup = {
                    pattern: alias,
                    group: 'internal', // Make the rule understand that aliased imports are still internal imports
                    position: 'before', // Ensure aliased imports come before all other internal imports, e.g. `import ChildComponent from './ChildComponent'`
                    patternOptions: {
                        dot: true, // Allow matching paths with preceding periods (e.g. `.git/` or `.gitignore`)
                    },
                };

                if (pathMatch.match(/src/)) {
                    // Make any root-level alias for the `src` directory more important than all other internal imports and comes before them
                    pathGroup.group = 'external'; // Ensures it comes before all internal imports, including other aliases
                    pathGroup.position = 'after'; // Ensures it comes after all external imports
                }

                return pathGroup;
            }),
            'newlines-between': 'always-and-inside-groups', // Force newlines between groups, allow them within groups
            warnOnUnassignedImports: true, // Warn if `import 'a'` is used before `import X from 'b'` but don't error in case `a` causes global changes (e.g. a polyfill)
            pathGroupsExcludedImportTypes: [ 'builtin', 'external', 'type' ], // Don't apply `pathGroups` sorting to these types of imports; allows type-imports to be in any order (otherwise aliased are forced before `builtin`/`external`)
        }],
        // Ensure there is at least one newline between imports and file logic
        'import/newline-after-import': [ 'error', {
            count: 1,
        }],
        // Ensure all imports resolve/exist
        'import/no-unresolved': [ 'error', {
            // `no-unresolved` has a different set of rules for what files trigger errors (see: https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unresolved.md#ignore)
            // which means import aliases aren't being honored by this rule and need to be added in manually.
            ignore: Object.keys(ImportAliases).map(alias => `^${ImportAliases.stripTrailingSlash(alias)}/.*`),
        }],
        // Prevent circular dependencies
        'import/no-cycle': [ 'error', { commonjs: true, amd: true }],
        // Ensure imports are at the top of the file, not sprinkled throughout the body of the file
        'import/first': 'error',
        // Remove unused imports (since `no-unused-vars` is only `warn` for now)
        'unused-imports/no-unused-imports': 'error',


        /* React/JSX rules */
        'react/jsx-indent': [ 'error', 4, { // Enforce 4 extra spaces of indentation for nested children
            checkAttributes: true, // Indent for nested props, e.g. `<App someProp={\n[INDENT] () => 5 \n[DE-INDENT]} />`
            indentLogicalExpressions: true, // Indent components inside short-circuiting, e.g. `<App>\n {condition && (\n[INDENT] <Child/> \n[DE-INDENT] )} \n </App>`
        }],
        'react/jsx-closing-bracket-location': [ 'error', { // Enforce closing tag to be inline with opening tag if on a separate line
            selfClosing: 'tag-aligned', // Without children, uses `/>`
            nonEmpty: 'tag-aligned', // With children, uses `>`
        }],
        'react/jsx-tag-spacing': [ 'error', {
            beforeSelfClosing: 'always', // force a space before self-closing attributes and />, e.g. `<MyComp />`
            beforeClosing: 'never', // never allow a space between closing > (that lacks a slash), e.g. `<MyComp ></MyComp >`
            afterOpening: 'never', // never allow a space between opening < and component name, e.g. `< MyComp>`
            closingSlash: 'never', // never allow a space between closing < and /, e.g. `< /MyComp>`
        }],
        'react/jsx-equals-spacing': 'error', // Prevent spaces between JSX prop names and equals sign, e.g. `<MyComp prop = {value} />`
        'react/jsx-filename-extension': [ 'error', {
            // allow: 'as-needed', // Only allow .jsx for files with JSX in them
            extensions: [ '.jsx', '.tsx' ], // Allow both .jsx and .tsx for file extensions (default is only .jsx)
        }],
        'react/prop-types': 'warn', // Suggest using PropTypes for prop typedefs
        'react/display-name': 'off', // Don't error on arrow-function components
        'react-hooks/rules-of-hooks': 'error', // Enforce proper usage of hooks
        'react-hooks/exhaustive-deps': 'warn', // Suggest adding all fields within hook dependencies, e.g. `useEffect(func, [ dep1 ])` errors if `dep2` left out
        'react/no-unescaped-entities': 'warn', // Don't worry about potential accidents with unescaped `>`, `'`, etc. chars since if they're passed as children, it'll be intentional
        'react/jsx-uses-react': 'off', // Disable preventing `React` from being marked as unused in files with JSX (React v17 no longer requires React to be imported)
        'react/react-in-jsx-scope': 'off', // Don't error if `import React from 'react'` isn't in files with JSX (React v17 allows JSX without importing 'react')
    },
    overrides: [
        /**
         * ESLint's `files` uses globs.
         *
         * Note the following differences between globs and regex:
         *
         * - *(pattern) = Zero or more occurrences.
         * - ?(pattern) = Zero or one occurrence.
         * - +(pattern) = One or more occurrences.
         * - @(pattern) = One occurrence.
         * - !(pattern) = Anything except one of the given patterns.
         *
         * Examples:
         *
         * - +(*.) = Allow any number of sub-extensions but ensure it ends with a period (e.g. matches `file.test.` in `file.test.ts`)
         * - ?(.)* = Allow the file to begin with a period (e.g. matches `.eslint` in `.eslintrc.js`)
         * - ?([mc])[tj]s = Allow the file to begin with `m` or `c` but ensure it ends with `ts` or `js` (e.g. matches `mjs`, `mts`, `js`, and `ts`)
         *
         * @see [Bash pattern matching]{@link https://www.gnu.org/savannah-checkouts/gnu/bash/manual/bash.html#Pattern-Matching}
         * @see [Bash globs and regex]{@link https://tldp.org/LDP/abs/html/regexp.html}
         * @see [NextJS sample glob for test files]{@link https://github.com/vercel/next.js/blob/f16ee05f599de27e777ac2b736c3bf820a19bd7b/examples/with-jest/.eslintrc.json}
         */

        /**
         * JS files (both ESM and CJS).
         *
         * Requires using Babel parser so there's no conflict with the TypeScript parser for files that overlap
         * with the tsconfig file(s) specified in `parserOptions.project`, including:
         *
         * - Dotfiles (e.g. .eslintrc.js)
         * - Multi-extension files (e.g. *.test.js)
         * - Files that have duplicate names but different extensions (e.g. src/index.ts & src/index.js)
         *
         * @see [Docs]{@link https://github.com/babel/babel/tree/main/eslint/babel-eslint-parser}
         * @see [`@typescript-eslint/parser` issue with duplicate TS/JS filenames]{@link https://github.com/typescript-eslint/typescript-eslint/issues/955}
         * @see [Related `@typescript-eslint` type-aware linting docs]{@link https://typescript-eslint.io/docs/linting/type-linting}
         */
        {
            files: [ '**/?(.)+(*.)?([mc])js?(x)' ],
            parser: '@babel/eslint-parser',
            parserOptions: {
                babelOptions: {
                    configFile: babelConfigPath,
                    // Plugins solely for ESLint
                    plugins: [
                        /**
                         * Import assertions are required for NodeJS v16.14 and above.
                         * However, ESLint doesn't support the [`shippedProposals`]{@link https://babeljs.io/docs/en/babel-preset-env#shippedproposals}
                         * option in `@babel/preset-env`, so anything that isn't yet at TC39 stage 4
                         * [won't be supported]{@link https://github.com/eslint/eslint/blob/a675c89573836adaf108a932696b061946abf1e6/README.md#what-about-experimental-features}.
                         *
                         * Thus, add the required import-assertion Babel plugin here, but not in the actual/official
                         * Babel config file used by source code since it's [already included in `@babel/preset-env`]{@link https://babeljs.io/docs/en/babel-preset-env#shippedproposals}.
                         *
                         * @see [Related StackOverflow post]{@link https://stackoverflow.com/questions/71090960/is-there-a-way-to-make-eslint-understand-the-new-import-assertion-syntax-without/71128316#71128316}
                         * @see [Related bug]{@link https://github.com/storybookjs/storybook/issues/23063}
                         * @see [Babel plugin docs]{@link https://babeljs.io/docs/babel-plugin-syntax-import-attributes#deprecatedassertsyntax}
                         */
                        [ '@babel/plugin-syntax-import-attributes', {
                            deprecatedAssertSyntax: true,
                        }],
                    ],
                },
            },
        },
        /* TypeScript files */
        {
            files: [ '**/?(.)+(*.)ts?(x)' ],
            globals: {
                // `fetch()` API
                RequestInfo: 'readable',
                RequestInit: 'readable',
                Request: 'readable',
                Headers: 'readable',
                HeadersInit: 'readable',
                Response: 'readable',
            },
            extends: [
                'plugin:@typescript-eslint/recommended',
            ],
            rules: {
                /**
                 * Allow function overloads for different return types based on param instead of type by ignoring
                 * redeclared function signatures and their unused parameters.
                 *
                 * @see [Function overload docs]{@link https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads}
                 * @see [Conditional function return types]{@link https://www.typescriptlang.org/docs/handbook/2/conditional-types.html}
                 */
                'no-redeclare': 'off',
                'no-dupe-class-members': 'off',
                'no-unused-vars': [ 'warn', { // Allow unused variables in function definition typedefs
                    args: 'none',
                }],
                'space-before-function-paren': [ 'error', {
                    named: 'ignore', // Allow typedefs using functions, e.g. `<Func extends () => {}>`
                }],
                'import/export': 'off', // Allow exporting namespaces with the same name as functions for setting properties on the function

                // If using TypeScript with React <= v16, where you still need to use `import React from 'react'`
                // 'no-use-before-define': 'off', // Disable JS ESLint's checks for TS files since they fail to pick up on namespace imports
                // '@typescript-eslint/no-use-before-define': 'error', // Error if something is used before being referenced, allowing namespace imports

                // Rules: https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/README.md#supported-rules
                '@typescript-eslint/consistent-type-imports': [ 'error', { // Enforce type-import syntax using `import type { T }` and/or `import { type T }` instead of `import { T }`
                    disallowTypeAnnotations: false, // Allow type-imports when using dynamic imports
                }],
                '@typescript-eslint/type-annotation-spacing': 'error', // Enforce spaces after colons when typing variables and around fat-arrow (=>) in arrow functions/typedefs
                '@typescript-eslint/no-empty-function': 'off', // Allow empty functions, i.e. `() => {}`, so that default values can have placeholders (e.g. `defaultProps`)
                '@typescript-eslint/no-empty-interface': 'off', // Allow empty interfaces for ease of use via type/interface aliases
                '@typescript-eslint/no-namespace': 'off', // Allow declaring/exporting namespaces for e.g. allowing functions/any type to have custom properties
                '@typescript-eslint/no-explicit-any': 'warn', // Allow explicit `any` usage, but keep the recommendation to use a different type (e.g. `unknown` or `never`)
                '@typescript-eslint/ban-ts-comment': [ 'error', { // Ban `@ts-ignore` comments unless they have a description justifying their use
                    'ts-expect-error': 'allow-with-description',
                    'ts-ignore': 'allow-with-description',
                    'ts-nocheck': 'allow-with-description',
                    'ts-check': 'allow-with-description',
                }],
            },
        },
        /* Configs, scripts, etc. */
        {
            files: [ './*', './config/**', './scripts/**' ],
            env: {
                node: true, // Add the NodeJS environment for access to its special variables
            },
            rules: {
                'import-alias/import-alias': 'off', // Allow `config/` and `scripts/` files to use relative imports (e.g. `import X from '../utils.mjs'`)
            },
        },
        /* Tests */
        {
            files: [ '**/tests/**', '**/__tests__/**', './config/jest/**', '**/+(*.)@(test|spec).[tj]s?(x)' ],
            env: {
                jest: true, // Add jest environment for tests
                node: true,
            },
        },
    ],
};
