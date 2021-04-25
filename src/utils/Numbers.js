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
