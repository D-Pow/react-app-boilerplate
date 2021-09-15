/** @type {import('eslint').Linter.BaseConfig} */
module.exports = {
    env: {
        browser: true,
        es6: true,
        jest: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
    ],
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        require: 'readonly',
        process: 'writable',
        module: 'writable',
        __dirname: 'readonly',
        global: 'writable',
    },
    parser: 'babel-eslint',
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    plugins: [
        'react',
        'react-hooks'
    ],
    rules: {
        indent: [ 'error', 4, { // Indent with 4 spaces, not tab or 2 spaces
            SwitchCase: 1, // Same for switch-case statements
            ignoredNodes: [ 'TemplateLiteral' ]
        }],
        eqeqeq: [ 'warn', 'always', {
            null: 'ignore' // Encourage using ===/!== except for `x != null` (`!= null` --> `!== null && !== undefined`)
        }],
        'react/jsx-indent': [ 'error', 4, {
            checkAttributes: true,
            indentLogicalExpressions: true
        }],
        'react/jsx-closing-bracket-location': [ 'error', {
            selfClosing: 'tag-aligned',
            nonEmpty: 'tag-aligned'
        }],
        'react/prop-types': 'warn',
        'react/display-name': 'off', // Don't error on arrow-function components
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
    },
};
