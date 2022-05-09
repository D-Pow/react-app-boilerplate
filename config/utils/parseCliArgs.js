const YargsParser = require('yargs-parser');

const { Paths } = require('./Files');


/**
 * Configuration for a single option flag coalescing all necessary fields for use
 * with [yargs-parser]{@link https://www.npmjs.com/package/yargs-parser}.
 *
 * @typedef {Object} CliOptionConfig
 * @property {string} [description] - Flag description to print if `--help` flag is passed.
 * @property {string} [type] - `typeof` the option's arg(s).
 * @property {number} [numArgs] - Number of arguments/values that can be passed to the option flag via CLI; Specify `0` to make the flag function as a boolean value.
 * @property {any} [defaultValue] - Default value for the option's arg(s); If the flag is a boolean, DO NOT default it to `false`.
 * @property {string[]} [aliases] - Flag aliases that can be used instead of the variable itself (e.g. single-/multi-letter or simplified flag versions).
 */
/**
 * Mapping of the primary, camelCase option flags (each of which will become the variables populated by
 * the parsed-args function) to their configurations for use with [yargs-parser]{@link https://www.npmjs.com/package/yargs-parser}.
 *
 * @typedef {Object<any, CliOptionConfig>} CliOptionsConfigs
 */


/**
 * Converts a camelCase string to hyphen-case.
 *
 * @param {string} str - String to convert.
 * @returns {string} - The string as hyphen-case.
 */
function camelCaseToHyphenCase(str) {
    return str.replace(/(?<=[a-z])([A-Z])/g, (fullStrMatch, matchGroup) => {
        // One match group: The capital letter after a lowercase letter.
        // Lowercase it and prepend a hyphen.
        return `-${matchGroup.toLowerCase()}`;
    });
}


/**
 * Normalizes the flag/options config object by:
 *
 * - Populating each unspecified config field with default values.
 * - Removing prohibited config values (e.g. a `defaultValue` of `null`, `undefined`, or `false`).
 *
 * @param {CliOptionsConfigs} cliOptionsConfigs - Config used by `yargs-parser`.
 */
function normalizeCliOptionsConfig(cliOptionsConfigs) {
    Object.entries(cliOptionsConfigs).forEach(([ primaryFlag, flagConfig ]) => {
        const {
            type = (
                flagConfig.type
                ||
                (flagConfig.numArgs > 1 && (
                    (flagConfig.defaultValue?.length > 0 && `${typeof flagConfig.defaultValue[0]}[]`)
                    ||
                    'array'
                ))
                ||
                (flagConfig.hasOwnProperty('defaultValue') && typeof flagConfig.defaultValue)
                ||
                'boolean'
            ),
            numArgs = 0,
            defaultValue,
            aliases = [],
            description = '',
        } = flagConfig;

        cliOptionsConfigs[primaryFlag] = {
            type,
            numArgs,
            defaultValue,
            aliases,
            description,
        };

        if (flagConfig.defaultValue == null || flagConfig.defaultValue === false) {
            // Only fill in the default value if it exists.
            // `false`, `undefined`, and `null` shouldn't be populated.
            delete cliOptionsConfigs[primaryFlag].defaultValue;
        }
    });
}


/**
 * Inverts the flag-config mappings such that each of the flag's config's inner fields
 * become top-level fields, each of which holding the values from each individual config.
 *
 * Necessary because `yargs-parser` reads the config objects separately rather than altogether.
 *
 * @param {CliOptionsConfigs} optionsConfigs - Flag-config mappings.
 * @returns {import('yargs-parser').yargsParser.Options} - Inverted CLI options config object.
 */
function invertCliOptionsConfigs(optionsConfigs) {
    return Object.entries(optionsConfigs)
        .reduce((invertedOptionsConfigs, [ primaryFlag, config ]) => {
            invertedOptionsConfigs.types[primaryFlag] = config.type;
            invertedOptionsConfigs.aliases[primaryFlag] = config.aliases;
            invertedOptionsConfigs.numArgs[primaryFlag] = config.numArgs;
            invertedOptionsConfigs.helpOptionDescriptions[primaryFlag] = config.description;

            if (config.hasOwnProperty('defaultValue')) {
                invertedOptionsConfigs.defaultValues[primaryFlag] = config.defaultValue;
            }

            if (config.type?.match(/array|\[\]/i)) {
                invertedOptionsConfigs.array.push(primaryFlag);
            } else if (config.type?.match(/path|normalize/i)) {
                invertedOptionsConfigs.normalize.push(primaryFlag);
            } else {
                invertedOptionsConfigs[config.type]?.push(primaryFlag);
            }

            return invertedOptionsConfigs;
        }, {
            types: {},
            aliases: {},
            defaultValues: {},
            numArgs: {},
            helpOptionDescriptions: {},
            array: [],
            boolean: [],
            normalize: [],
            number: [],
            string: [],
        });
}


/**
 * Parse arguments using yargs-parser (simpler and quicker to use than yargs).
 *
 * Both hyphenated (`--my-flag`) and camelCase (`--myFlag`) forms are accepted.
 * Single-letter flags can be combined into a single hyphen (`-a -b -c` === `-abc`).
 *
 * If calling a script from `npm run`, you'll need a double-hyphen to pass flags/args
 * to the underlying script. If using `yarn`, the double-hyphen is unnecessary.
 *
 * @param {Object} [options]
 * @param {string[]} [options.argv=process.argv] - Arg array to parse.
 * @param {CliOptionsConfigs} [options.optionsConfigs] - CLI flags/options and their args to parse.
 * @param {boolean} [options.removeNodeAndScriptFromArgs=true] - Remove preceding `node myScript` from args; Set to `false` if not using `process.argv`.
 * @param {boolean} [options.clearArgvAfterProcessing=true] - If `argv` should be emptied after arg parsing.
 * @param {boolean} [options.addPlaceholderKeysForUnspecifiedOptions=true] - Adds `myOpt: undefined` to the resulting parsed-options object if the flag wasn't passed by the user.
 * @param {boolean} [options.removeHyphenatedOptionsFromOutput=true] - If hyphenated version of options should be removed from the resulting parsed-options object (e.g. keep only `myOpt` key instead of both `myOpt` and `'my-opt'`).
 * @param {boolean} [options.removeOptionAliasesFromOutput=true] - Remove option flag aliases from resulting parsed-options object (e.g. keep only `myOpt` instead of both `myOpt` and `m`).
 * @param {string} [options.booleanFlagNegationPrefix='no-'] - Prefix to use for negating boolean flags (e.g. `--flag` => true,  `--no-flag` => false).
 * @param {string} [options.helpMessage] - Top-level description of the CLI script to print if `--help` flag is passed (excludes flag/option help descriptions).
 * @param {(number|null)} [options.helpExitCode=1] - Exit code to use if `--help` flag is passed (`null` == don't exit).
 * @returns {Object<string, any>} - Parsed options with the format `key: (value|true)` and `_: [$@]`.
 */
function parseCliArgs({
    argv = process.argv,
    optionsConfigs = {},
    removeNodeAndScriptFromArgs = true,
    clearArgvAfterProcessing = true,
    addPlaceholderKeysForUnspecifiedOptions = true,
    removeHyphenatedOptionsFromOutput = true,
    removeOptionAliasesFromOutput = true,
    booleanFlagNegationPrefix = 'no-',
    helpMessage = '',
    helpExitCode = 1,
} = {}) {
    // argv = [ 'path/to/node', 'myScript', ...args ]
    let argvStartIndex = removeNodeAndScriptFromArgs ? 2 : 0;

    // Handle single/multiple layers of script nesting, e.g.
    // `npm run scriptThatCallsScript2 -- -- args-for-nested-script2`
    while (argv[argvStartIndex] === '--') {
        argvStartIndex++;
    }

    const filteredArgv = argv.slice(argvStartIndex);

    normalizeCliOptionsConfig(optionsConfigs);
    const {
        aliases: alias,
        defaultValues,
        numArgs: narg,
        ...otherConfigs
    } = invertCliOptionsConfigs(optionsConfigs);

    const parsedArgs = YargsParser(
        filteredArgv,
        {
            // See: https://github.com/yargs/yargs-parser#configuration
            configuration: {
                // Defaults
                'short-option-groups': true, // Treat single-hyphen flags with multiple letters as separate flags, e.g. `-abc` == `-a -b -c`.
                'halt-at-non-option': false, // Don't stop parsing args after encountering the first unknown flag.
                'nargs-eats-options': false, // Don't consume hyphen-prefixed args if placed after a flag with an unmet max `numArgs` value, e.g. if `nargs = { a: 2 }`, then`-a b -c` => `{ a: 'b', c: true }` instead of `{ a: [ 'b', '-c' ]}`.
                'unknown-options-as-args': false, // Parse unknown flags into the flag object rather than putting them in the positional args array.
                'camel-case-expansion': true, // Append camelCase keys to resulting object if hyphen-case was passed, e.g. `--my-flag` => `{ '--my-flag': val, myFlag: val }`.
                'dot-notation': true, // Parse dots in flags as objects, e.g. `--foo.bar 3` => `{ foo: { bar: 3 }}`.
                'parse-numbers': true, // Parse flag args containing numbers within quotes to numbers, e.g. `--foo '5'` => `{ foo: 5 }` instead of `{ foo: '5' }`.
                'parse-positional-numbers': true, // Same as `parse-numbers` but for positional args.
                'boolean-negation': true, // Allows `--no-my-flag` to be converted to `{ myFlag: false }` instead of `{ noMyFlag: true }`.
                'negation-prefix': booleanFlagNegationPrefix, // Sets the prefix used by `boolean-negation`.
                'greedy-arrays': true, // Allow arrays to capture multiple values; `numArgs`/`nargs` still takes affect, but any array args < `nargs` with following positional args without a preceding `--` will be consumed by the array;  e.g. for `nargs=3` and `--arr 1 2 3 4 (-d|--) 5` - greedy-arrays=true: `{ arr: [ 1, 2, 3, 4 ], (d|--): 5 _: []}`  vs  greedy-arrays=false: `{ arr: [ 1 ], (d|--): 5 (_ if not --): [ 2, 3, 4 ]}`.
                'duplicate-arguments-array': true, // Convert multiple flag usages into an array, e.g. `-a 1 -a 2` => `{ a: [ 1, 2 ]}`.
                'flatten-duplicate-arrays': true, // Like `duplicate-arguments-array`, except flattens multiple entries for the flag, e.g. `-a 1 2 -a 3 4` => `{ a: [ 1, 2, 3, 4 ]}`.

                // Customizations
                'populate--': true, // Set any args after `--` to its own key, e.g. `script -a val b c -- d e` => `{ a: 'val', _: [ 'b', 'c' ], '--': [ 'd', 'e' ] }` instead of `_: [ 'b', 'c', 'd', 'e' ]`.
                'combine-arrays': true, // Combine any `opts: { default: { settings: pathToJson }}` (defaults from a config file) with defaults defined programmatically here rather than the file overwriting them; See: https://github.com/yargs/yargs-parser/blob/217aa62906d0bbd40e06d675b8a23df8d49a5ad4/test/yargs-parser.mjs#L29-L59.
                'set-placeholder-key': addPlaceholderKeysForUnspecifiedOptions, // Adds `myFlag: undefined` to the output object if it isn't specified by the user; shows that the option exists without changing return object functionality.
                'strip-dashed': removeHyphenatedOptionsFromOutput, // Remove hyphenated long option flags, leaving only the camelCase option flag values in the resulting object.
                'strip-aliased': removeOptionAliasesFromOutput, // Remove flag aliases from the output object, leaving only the primary flag (key in the `alias` object) in the output object, e.g. `-n 3` => `{ num: 3 }` instead of `{ num: 3, n: 3 }`.
            },
            alias,
            narg,
            default: defaultValues,
            ...otherConfigs,
        },
    );


    if (parsedArgs?.help) {
        parsedArgs.helpMessageFormattedContent = printHelpMessageAndExit({
            filename: argv?.[1],
            helpMessage,
            helpExitCode,
            optionsConfigs,
            booleanFlagNegationPrefix,
        });
    }


    if (clearArgvAfterProcessing) {
        argv.splice(0, argv.length);
    }


    return parsedArgs;
}


/**
 * Prints a help message if `--help` or its aliases are specified on the CLI.
 * Optionally, exits with the specified exit code.
 *
 * @param {Object} [options]
 * @param {string} [options.filename] - Script file name/absolute path given from `process.argv[1]`.
 * @param {string} [options.helpMessage] - Description to print if `--help` flag is passed.
 * @param {(number|null)} [options.helpExitCode=1] - Exit code to use if `--help` flag is passed (`null` == don't exit).
 * @param {CliOptionsConfigs} [options.optionsConfigs] - CLI flags/options and their args to parse.
 * @param {string} [options.booleanFlagNegationPrefix] - Prefix used to negate boolean flags.
 * @returns {{
 *     finalString: string,
 *     overviewString: string,
 *     optionsHelpMap: Object,
 * }} - The help message content that would be printed as well as its subsections.
 */
function printHelpMessageAndExit({
    filename = '',
    helpMessage,
    helpExitCode,
    optionsConfigs,
    booleanFlagNegationPrefix,
} = {}) {
    const wasRunUsingYarn = !!process.env.npm_execpath?.match(/yarn/i);
    const scriptFilePath = Paths.getFileRelPath(Paths.ROOT.ABS, filename);
    const scriptUsageHeader = `Usage: ${scriptFilePath} [options]... [args]...`;
    const scriptOverviewHelpMessage = [
        wasRunUsingYarn ? '\n' : '', // yarn doesn't add extra newlines between npm script name/command-to-run STDOUT lines and command output lines like npm/node do, so add it manually here
        scriptUsageHeader,
        '\n',
        '\n',
        helpMessage,
        '\n',
        '\n',
        'Options:',
        '\n',
        `\tNote: Boolean flags can be negated by appending \`--${booleanFlagNegationPrefix}\` as a prefix (e.g. \`--flag\` => true,  \`--${booleanFlagNegationPrefix}flag\` => false).`,
        '\n',
    ].join('');

    const optionsHelpMessagesMap = Object.entries(optionsConfigs)
        .reduce((map, [ flag, config ]) => {
            const allFlagAliases = [ ...config.aliases, flag ]
                .map(camelCaseToHyphenCase)
                .map(alias => alias.length === 1
                    ? `-${alias}`
                    : `--${alias}`,
                )
                .join(', ');

            map[allFlagAliases] = {
                Type: config.type,
                'Num Args': config.numArgs,
                'Default Value': config.hasOwnProperty('defaultValue') ? config.defaultValue : null,
                Description: config.description || '',
            };

            return map;
        }, {});


    if (helpExitCode != null) {
        console.log(scriptOverviewHelpMessage);
        console.table(optionsHelpMessagesMap);
        process.exit(helpExitCode);
    }


    const optionsHelpMessagesFormatter = Object.entries(optionsHelpMessagesMap)
        .reduce((formatterObj, [ allFlagAliases, config ], i) => {
            const flagConfigValues = Object.entries(config)
                .map(([ configKey, configValue ]) => {
                    if (i === 0) {
                        // If discovering the flags-help-message config field for the first time,
                        // add the title for the config field to the returned headers.
                        formatterObj.headers.push(configKey);
                    }

                    return configValue;
                });

            const allFlagAliasesWithConfigsString = [
                allFlagAliases,
                ...flagConfigValues,
            ].join('\t');

            formatterObj.body.push(allFlagAliasesWithConfigsString);

            return formatterObj;
        }, {
            headers: [ 'Flag(s)' ],
            body: [],
        });

    const optionsHelpMessagesString = [
        optionsHelpMessagesFormatter.headers.join('\t'),
        ...optionsHelpMessagesFormatter.body,
    ].join('\n');
    const scriptCompleteHelpMessage = [
        scriptOverviewHelpMessage,
        optionsHelpMessagesString,
    ].join('\n');


    return {
        finalString: scriptCompleteHelpMessage,
        overviewString: scriptOverviewHelpMessage,
        optionsHelpMap: optionsHelpMessagesMap,
    };
}


module.exports = {
    parseCliArgs,
};
