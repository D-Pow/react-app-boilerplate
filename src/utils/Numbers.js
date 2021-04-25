export function asNumber(str) {
    return Number(str.replace(/[^\d.]/g, ''));
}

export function randomNumber(min, max) {
    if (max == null) {
        max = min;
        min = 0;
    }

    min = Number(min);
    max = Number(max);
    if (isNaN(min) || isNaN(max)) {
        return Math.random();
    }

    return lerp(min, max, Math.random());
}

/**
 * Gets the value that is {@code factor} percent
 * between {@code start} and {@code end} via
 * linear interpolation.
 *
 * @param {number} start - Min value of range.
 * @param {number} end - Max value of range.
 * @param {number} factor - Value between 0 and 1 inclusive.
 * @returns {number} - Value that is {@code factor} percent between {@code start} and {@code end}.
 */
export function lerp(start, end, factor) {
    return start + (end - start)*factor;
}

/**
 * Gets the factor/percent that {@code value}
 * is between {@code start} and {@code end}.
 *
 * Inverse of `lerp()`
 *
 * @param {number} start - Min value of range.
 * @param {number} end - Max value of range.
 * @param {number} value - Number between {@code start} and {@code end}.
 * @returns {number} - Percentage that {@code value} is between {@code start} and {@code end}.
 */
export function normalize(start, end, value) {
    return (value - start) / (end - start);
}

/**
 * Converts {@code value} from the scale [{@code fromMin}, {@code fromMax}]
 * to the scale [{@code toMin}, {@code toMax}].
 *
 * @param {number} value - Value to convert between the two ranges.
 * @param {number} fromMin - Old scale's min value.
 * @param {number} fromMax - Old scale's max value.
 * @param {number} toMin - New scale's min value.
 * @param {number} toMax - New scale's max value.
 * @returns {number} - Converted {@code value} from previous scale to new scale.
 */
export function mapValueBetweenRanges(value, fromMin, fromMax, toMin, toMax) {
    const factor = normalize(fromMin, fromMax, value);

    return lerp(toMin, toMax, factor);
}

/**
 * Restricts the {@code value} to be in the range [{@code min}, {@code max}],
 * returning either the original {@code value} if it's within the range
 * or the {@code min}/{@code max} if it's outside the range.
 *
 * @param {number} min - Min value of range.
 * @param {number} max - Max value of range.
 * @param {number} value - Value that should be clamped to be within the range.
 * @returns {number} - A number within the specified range (either {@code value}, {@code min}, or {@code max}).
 */
export function clamp(min, max, value) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Gets a list of numbers that are distributed evenly by a single factor
 * between the range ({@code start}, {@code end}) exclusive.
 *
 * @param {number} start - Min value of range.
 * @param {number} end - Max value of range.
 * @param {number} numValues - Number of values to get within the specified range.
 * @returns {number[]} - Numbers distributed evenly between {@code start} and {@code end}.
 */
export function distributeValuesEvenlyBetween(start, end, numValues) {
    const factorToIncrementBy = 1 / (numValues + 1);

    return Array
        .from({ length: numValues })
        .map((nul, i) => {
            const distanceFactorOfEntry = (i + 1) * factorToIncrementBy;

            return lerp(start, end, distanceFactorOfEntry);
        });
}

/**
 * Calculates the factorial of a number, i.e. `num!`.
 *
 * 5! = 5 * 4 * 3 * 2 * 1
 *
 * @param {number} num - Number for which to get the factorial.
 * @returns {number} - Factorial of the number.
 */
export function factorial(num) {
    return Array.from({ length: num }).reduce((fact, nul, i) => fact*(i+1), 1);
}

/**
 * Gets the permutation (ORDER MATTERS) for the number of choices in the number
 * of items.
 *
 * Without replacement (default):
 * permutation(nItems, kChoices)  =  n! / (n - k)!
 *
 * With replacement:
 * permutation(nItems, kChoices)  =  n^k
 *
 * @param {number} nItems - Total number of items available.
 * @param {number} kChoices - Number of choices, i.e. "want" number.
 * @param {boolean} [withReplacement=false] - If replacement is allowed
 * @returns {number} - The permutation of items/choices.
 */
export function permutation(nItems, kChoices, withReplacement = false) {
    if (withReplacement) {
        return Math.pow(nItems, kChoices);
    }

    return factorial(nItems) / factorial(nItems - kChoices);
}

/**
 * Gets the combination (ORDER DOES NOT MATTER) for the number of choices in the number
 * of items.
 *
 * Without replacement (default):
 * combination(nItems, kChoices)  =  n! / (k! * (n - k)!)
 *
 * With replacement:
 * combination(nItems, kChoices)  =  (n + k - 1)! / (k! * ((n + k - 1) - k)!)
 * i.e.
 * combination(nItems, kChoices)  =  (n + k - 1)! / (k! * (n - 1)!)
 *
 * Note: These can be re-written using permutation (seen below).
 *
 * @param {number} nItems - Total number of items available.
 * @param {number} kChoices - Number of choices, i.e. "want" number.
 * @param {boolean} [withReplacement=false] - If replacement is allowed
 * @returns {number} - The combination of items/choices.
 */
export function combination(nItems, kChoices, withReplacement = false) {
    if (withReplacement) {
        return combination(nItems + kChoices - 1, kChoices, false);
    }

    return permutation(nItems, kChoices, false) / factorial(kChoices);
}
