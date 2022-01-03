/**
 * Gets the parent/calling function's name.
 *
 * Normally, you'd want to use `arguments?.callee` to get the function name, but in strict mode (activated by
 * default in tsconfig.json), `callee`, `caller`, etc. are blocked.
 *
 * This function gets around that by generating an error stacktrace and then parsing out the function names from it.
 *
 * @see [MDN docs on `arguments.callee` deprecation]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments/callee}
 * @see [StackOverflow inspiration]{@link https://stackoverflow.com/questions/29572466/how-do-you-find-out-the-caller-function-in-javascript-when-use-strict-is-enabled}
 * @see [StackOverflow discussion on strict mode]{@link https://stackoverflow.com/questions/31921189/caller-and-arguments-are-restricted-function-properties-and-cannot-be-access}
 */
export function getFunctionName() {
    try {
        return arguments?.callee?.caller?.name;
    } catch (errorStrictModeEnabled) {
        // strict mode enabled, proceed to extract parent function name manually
    }

    /*
     * Extract function names from a stacktrace.
     * Match either `at <funcName> (details)` or `<funcName>@<details>`, i.e.
     * - Chrome: `Error\n    at <funcName> (<location>:row:col)\n    at ...`
     * - Firefox: `<funcName>@<location>:row:col\n<funcName>...`
     */
    const firstFunctionNameInStackTraceRegex = /(?<=(\sat\s)?)(\S+)(?=@| \()/g;
    const firstFunctionNameMatches = (new Error().stack)?.match(firstFunctionNameInStackTraceRegex);

    /*
     * Ignore first match (index 0) since it will be this function's name,
     * i.e. the parent function calling this one should be at index 1.
     * Add a fallback of returning index 2 if index 1 doesn't exist (e.g. if anonymous function).
     */
    const parentFunctionName = firstFunctionNameMatches?.[1] || firstFunctionNameMatches?.[2] || '';

    return parentFunctionName;
}
