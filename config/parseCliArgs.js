const YargsParser = require('yargs-parser');

/**
 * Parse arguments using yargs-parser (simpler and quicker to use than yargs).
 *
 * If calling a script from `npm run`, a double-hyphen is required,
 * e.g. `npm run myScript -- --arg1 val1 -b val2 arg array`
 *
 * @param {Object} options
 * @param {string[]} [options.argv=process.argv] - Arg array to parse.
 * @param {boolean} [options.removeNodeAndScriptFromArgs=true] - Remove preceding `node myScript` from args; Set to `false` if not using `process.argv`.
 * @param {boolean} [options.sliceAfterFirstDoubleHyphen=false] - Begin arg parsing only after `--`; Use only if script will be called by another script, thus requiring `npm run script1 -- -- args-for-nested-script2`.
 * @param {boolean} [options.clearArgvAfterProcessing=true] - If `argv` should be emptied after arg parsing.
 * @param {Object<string, string[]>} [options.combineShortLongFlags] - Mapping of variableName-shortLongFlagNames for joining short/long flags into one variable; If specified, pass the same key into `numArgs` as used here.
 * @param {Object} [options.numArgs] - Number of arguments the options take; Use if `-m|--my-arg` doesn't take any arguments and should be cast to a boolean instead of gobbling up subsequent non-arg entries.
 * @param {Object} [options.defaultValues] - Default values for args; Use option flag names (NOT variable names) if `combineShortLongFlags` is specified (only requires one flag name).
 * @returns {Object} - Parsed args with the format `key: (value|true)` and `_: [$@]`.
 */
function parseCliArgs(
    {
        argv = process.argv,
        removeNodeAndScriptFromArgs = true,
        sliceAfterFirstDoubleHyphen = false,
        clearArgvAfterProcessing = true,
        combineShortLongFlags,
        numArgs,
        defaultValues,
    } = {}
) {
    // argv = [ 'path/to/node', 'myScript', ...args ]
    let argvStartIndex = removeNodeAndScriptFromArgs ? 2 : 0;

    if (sliceAfterFirstDoubleHyphen) {
        argvStartIndex = argv.indexOf('--') + 1;

        if (argvStartIndex === 0) {
            argvStartIndex = argv.length;
        }
    }

    if (combineShortLongFlags) {
        numArgs = Object.entries(combineShortLongFlags).reduce((newNumArgs, [ varName, optionFlagAliases ]) => {
            const numArgsForFlag = numArgs[varName];

            optionFlagAliases.forEach(flagAliasName => {
                newNumArgs[flagAliasName] = numArgsForFlag;
            });

            return newNumArgs;
        }, {});
    }

    const customArgv = argv.slice(argvStartIndex);
    const customArgs = YargsParser(
        customArgv,
        {
            default: defaultValues,
            narg: numArgs,
        }
    );

    if (combineShortLongFlags) {
        Object.entries(combineShortLongFlags).forEach(([ varName, optionFlagAliases ]) => {
            optionFlagAliases.forEach(flagAliasName => {
                if (flagAliasName === varName) {
                    // Option flag name already matches desired variable name, so skip
                    return;
                }

                if (flagAliasName in customArgs) {
                    const desiredOptionValue = customArgs[varName];
                    const optionValue = customArgs[flagAliasName];

                    // Option flag doesn't match desired variable name, so cast
                    if (!(varName in customArgs)) {
                        // Desired variable doesn't yet exist, so create it
                        customArgs[varName] = optionValue;
                    } else if (desiredOptionValue === optionValue) {
                        // Stored value is same as new value, so ignore
                    } else if (Array.isArray(desiredOptionValue)) {
                        // Multiple values exist for the variable, so append to the resulting array
                        desiredOptionValue.push(optionValue);
                    } else {
                        // New value found for the variable, so convert existing/new values to an array
                        customArgs[varName] = [ desiredOptionValue, optionValue ];
                    }

                    // Delete undesired flag alias
                    delete customArgs[flagAliasName];
                }
            }, {});
        });
    }

    if (clearArgvAfterProcessing) {
        argv.splice(0, argv.length);
    }

    return customArgs;
}

module.exports = parseCliArgs;
