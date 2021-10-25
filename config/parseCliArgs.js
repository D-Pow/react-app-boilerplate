const YargsParser = require('yargs-parser');

/**
 * Parse arguments using yargs-parser (simpler and quicker to use than yargs).
 *
 * If calling a script from `npm run`, a double-hyphen is required,
 * e.g. `npm run myScript -- --opt1 val1 -b val2 positional args`
 *
 * Both hyphenated (`--my-flag`) and camelCase (`--myFlag`) forms are accepted.
 *
 * Single-letter flags can be combined into a single hyphen (`-a -b -c` === `-abc`).
 *
 * @param {Object} [options]
 * @param {string[]} [options.argv=process.argv] - Arg array to parse.
 * @param {boolean} [options.removeNodeAndScriptFromArgs=true] - Remove preceding `node myScript` from args; Set to `false` if not using `process.argv`.
 * @param {boolean} [options.sliceAfterFirstDoubleHyphen=false] - Begin arg parsing only after `--`; Use only if script will be called by another script, thus requiring `npm run script1 -- -- args-for-nested-script2`.
 * @param {boolean} [options.clearArgvAfterProcessing=true] - If `argv` should be emptied after arg parsing.
 * @param {boolean} [options.addPlaceholderKeysForUnspecifiedOptions=true] - Adds `myOpt: undefined` to the resulting parsed-options object if the flag wasn't passed by the user.
 * @param {boolean} [options.removeHyphenatedOptionsFromOutput=true] - If hyphenated version of options should be removed from the resulting parsed-options object (e.g. keep only `myOpt` key instead of both `myOpt` and `'my-opt'`).
 * @param {boolean} [options.removeOptionAliasesFromOutput=true] - Remove option flag aliases from resulting parsed-options object (e.g. keep only `myOpt` instead of both `myOpt` and `m`).
 * @param {Object<string, string[]>} [options.varNameToFlagAliases] - Mapping of one flag alias (typically the desired camelCase variable name used in your logic) to an array of other flag aliases; The key/val orders don't matter, all will be populated the same.
 * @param {Object} [options.numArgs] - Number of arguments the options take; Use if `-m|--my-arg` doesn't take any arguments and should be cast to a boolean instead of gobbling up subsequent non-arg entries.
 * @param {Object} [options.defaultValues] - Default value for each option (only one needs to be specified); If the flag is a boolean, DO NOT default it to `false`.
 * @returns {Object} - Parsed options with the format `key: (value|true)` and `_: [$@]`.
 */
function parseCliArgs(
    {
        argv = process.argv,
        removeNodeAndScriptFromArgs = true,
        sliceAfterFirstDoubleHyphen = false,
        clearArgvAfterProcessing = true,
        addPlaceholderKeysForUnspecifiedOptions = true,
        removeHyphenatedOptionsFromOutput = true,
        removeOptionAliasesFromOutput = true,
        varNameToFlagAliases,
        numArgs,
        defaultValues,
    } = {},
) {
    // argv = [ 'path/to/node', 'myScript', ...args ]
    let argvStartIndex = removeNodeAndScriptFromArgs ? 2 : 0;

    if (sliceAfterFirstDoubleHyphen) {
        argvStartIndex = argv.indexOf('--') + 1;

        if (argvStartIndex === 0) {
            argvStartIndex = argv.length;
        }
    }

    const customArgv = argv.slice(argvStartIndex);
    const customArgs = YargsParser(
        customArgv,
        {
            configuration: {
                'greedy-arrays': false, // Prevent flags from capturing more values than beyond their `numArgs` specifies
                'populate--': true, // Set any args after `--` to its own key (`script -a val b c -- d e` => `{ a: 'val', _: [ 'b', 'c' ], '--': [ 'd', 'e' ] }` instead of `_: [ 'b', 'c', 'd', 'e' ]`
                'set-placeholder-key': addPlaceholderKeysForUnspecifiedOptions, // Adds `optionKey: undefined` to the output object if it isn't specified by the user (shows that the option exists without changing return object functionality)
                'strip-dashed': removeHyphenatedOptionsFromOutput, // Remove hyphenated long option flags, leaving only the camelCase option flag values in the resulting object
                'strip-aliased': removeOptionAliasesFromOutput, // Remove flag aliases (`varNameToFlagAliases` value) if variable name (`varNameToFlagAliases` key) is specified
            },
            alias: varNameToFlagAliases,
            default: defaultValues,
            narg: numArgs,
        },
    );

    if (clearArgvAfterProcessing) {
        argv.splice(0, argv.length);
    }

    return customArgs;
}

module.exports = parseCliArgs;
