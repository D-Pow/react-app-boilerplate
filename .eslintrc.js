const path = require('path');

const {
    findFile,
    getGitignorePathsWithExtraGlobStars,
    parseCliArgs,
    ImportAliases,
} = require('./config/utils');

// ESLint requires config to be either a JSON or CommonJS file, it doesn't support ESM.
// Node cannot `require()` .mjs files either, so we can't use our custom `Paths` object.
const babelConfigPath = findFile('babel.config.js');

const rootDir = path.dirname(findFile('package.json'));

// Extensions supported by ESLint (includes JavaScript, TypeScript, and their derivatives)
const extensions = process?.env?.npm_package_config_eslintExtensions?.split(',')
    // Added solely for IDE integration since env vars (like npm config fields) can't be parsed statically. See: https://youtrack.jetbrains.com/issue/WEB-43731
    || [ '.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs' ];

const gitIgnorePaths = parseCliArgs().ignorePath === '.gitignore'
    ? [] // `--ignore-path .gitignore` already specified
    : getGitignorePathsWithExtraGlobStars(); // `--ignore-path someOtherFile` specified, so append .gitignore contents to ignored patterns

/** @type {import('eslint').Linter.BaseConfig} */
module.exports = {
    root: true, // This is the base ESLint config file, so don't search any higher
    env: {
        browser: true,
        es2021: true,
    },
    parser: '@babel/eslint-parser',
    parserOptions: {
        ecmaVersion: 'latest',
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
        ...gitIgnorePaths,
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
                map: [
                    Object.entries(ImportAliases.toCustomObject({
                        // Make all aliases' path matchers relative to root (root = '.'), removing any trailing slashes/dots.
                        // e.g. { '@': 'src', '/': '.' } => [ [ '@', './src' ], [ '/', './' ] ]
                        pathMatchModifier: pathMatch => `./${path.relative('.', pathMatch)}`,
                    })),
                ],
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
            rootDir: path.relative(rootDir, '.'), // Ensure root directory is correct regardless of .eslintrc file location. Requires relative path so `eslint --fix` doesn't inject absolute path in imports.
            aliases: Object.entries(ImportAliases.toCustomObject({
                // Make all aliases' path matchers relative to root (root = '.'), removing any trailing slashes/dots, and
                // adding '^' to show that import strings must match the pattern only at the beginning
                pathMatchModifier: pathMatch => `^${path.relative('.', pathMatch)}`,
            })).map(([ alias, pathMatch ]) => ({
                alias,
                matcher: pathMatch,
            })),
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
                const pathGroup = {
                    pattern: alias,
                    group: 'internal', // Make the rule understand that aliased imports are still internal imports
                    position: 'before', // Ensure aliased imports come before all other internal imports, e.g. `import ChildComponent from './ChildComponent'`
                    patternOptions: {
                        dot: true, // Allow matching paths with preceding periods (e.g. `.git/` or `.gitignore`)
                    },
                };

                if (pathMatch === 'src') {
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
            ignore: Object.entries(ImportAliases).flatMap(([ alias ]) => `^${ImportAliases.stripTrailingSlash(alias)}/.*`),
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
        'react/jsx-uses-react': 'off', // Disable preventing `React` from being marked as unused in files with JSX (React v17 no longer requires React to be imported)
        'react/react-in-jsx-scope': 'off', // Don't error if `import React from 'react'` isn't in files with JSX (React v17 allows JSX without importing 'react')
    },
    overrides: [
        // Use specified parser for TypeScript files
        {
            files: [ '*.ts?(x)' ],
            parser: '@typescript-eslint/parser',
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
                'no-unused-vars': [ 'warn', {
                    args: 'none',
                }],
                'space-before-function-paren': [ 'error', {
                    named: 'ignore', // Allow typedefs using functions, e.g. `<Func extends () => {}>`
                }],
            },
        },
        // Allow `config/` and `scripts/` files to use relative imports (e.g. `import X from '../utils.mjs'`).
        // Add the NodeJS environment for autocompletion/allowing its defined variables.
        {
            files: [ './*', './config/**', './scripts/**' ],
            env: {
                node: true,
            },
            rules: {
                'import-alias/import-alias': 'off',
            },
        },
        // Add jest environment for tests
        {
            files: [ './tests/**', './config/jest/**' ],
            env: {
                jest: true,
                node: true,
            },
        },
    ],
};
