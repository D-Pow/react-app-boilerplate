/**
 * Checks if all fields passed into the function exist nested
 * inside each other. This does not check if multiple
 * fields exist in a given level inside the object, only that fields
 * exist inside other fields.
 * If a field exists, but is null or undefined, then this will
 * return false.
 *
 * @param {Object} obj - Object to check validity of nested fields, e.g. network response or ref
 * @param {...string} nestedFields - Spread of nested fields to check in order
 * @returns {boolean} If the obj contains all given nested fields and they are not null/undefined
 */
export function validateObjNestedFields(obj, ...nestedFields) {
    const fieldsArray = (nestedFields[0] instanceof Array) ? nestedFields[0] : nestedFields;
    const responseExists = obj != null;

    if (fieldsArray.length === 0) {
        return responseExists;
    }

    const nextField = fieldsArray[0];

    return (
        responseExists
        && obj.hasOwnProperty(nextField)
        && validateObjNestedFields(obj[nextField], fieldsArray.slice(1))
    );
}

/**
 * Attempts to parse an object into a vanilla JavaScript object literal.
 *
 * @param {*} obj - Any type of object
 * @returns {(Object|*)} - Vanilla JavaScript object literal or original object on failure
 */
export function attemptParseObjLiteral(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch {
        return obj;
    }
}

/**
 * Deep-copies an object. Prevents pointers from being reused/changes being shared
 * between the passed object and returned obj.
 *
 * @param {Object} obj - Object to copy
 * @returns {Object} - Deep-copied object
 */
export function deepCopyObj(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Determines if two objects are equal.
 * Objects can only contain primitive values, i.e. those that are acceptable
 * in standard JSON format (booleans, strings, numbers, objects, arrays, and null).
 *
 * Optionally, ignore if values from objects are stringified or not,
 * e.g. if { key: 25 } should equal { key: "25" } or not.
 *
 * @param {Object} obj1 - 1 of 2 objects to be compared
 * @param {Object} obj2 - 2 of 2 objects to be compared
 * @param {boolean} castStrings - If stringified values should equal non-stringified values
 * @returns {boolean} - If the stringified version of obj1 equals that of obj2
 */
export function objEquals(obj1, obj2, castStrings = true) {
    const serializeObjPrimitive = obj => {
        let asString = JSON.stringify(obj);

        if (castStrings) {
            asString = asString.replace(/\\*"/g, '');
        }

        return asString
            .split('')
            .sort()
            .join('');
    };

    const serializedObj1 = serializeObjPrimitive(obj1);
    const serializedObj2 = serializeObjPrimitive(obj2);

    return serializedObj1 === serializedObj2;
}

/**
 * Determines if a given variable is an object.
 *
 * @param {*} variable - Variable to check if it's an object
 * @param {{}} options - What to include in is-object check
 * @param {boolean} [options.includeNativeClasses=true] - If native JavaScript class instances should return true.
 * @param {boolean} [options.includeCustomClasses=true] - If custom JavaScript class instances should return true.
 * @param {boolean} [options.includeArrays=false] - If arrays should return true.
 *                                                  If this is true, classes will be included.
 * @param {boolean} [options.includeFunctions=false] - If functions should return true.
 *                                                     If this is true, classes will be included.
 * @param {boolean} [options.includeNull=false] - If null should return true.
 * @returns {boolean} - If the variable is an object as described by the passed options.
 */
export function isObject(variable, {
    includeNativeClasses = true,
    includeCustomClasses = true,
    includeArrays = false,
    includeFunctions = false,
    includeNull = false
} = {}) {
    /**
     * JS variable breakdown:
     *
     *   Variable      |  typeof     |  obj.toString.call()  |  JSON.stringify  |  instanceof Object
     *   --------------|-------------|-----------------------|------------------|-------------------
     *   string        |  string     |  [object String]      |  variable        |  false
     *   number        |  number     |  [object Number]      |  variable        |  false
     *   boolean       |  boolean    |  [object Boolean]     |  variable        |  false
     *   null          |  object     |  [object Null]        |  variable        |  false
     *   undefined     |  undefined  |  [object Undefined]   |  variable        |  false
     *   symbol        |  symbol     |  [object Symbol]      |  undefined       |  false
     *   object        |  object     |  [object Object]      |  variable        |  true
     *   array         |  object     |  [object Array]       |  variable        |  true
     *   function      |  function   |  [object Function]    |  undefined       |  true
     *   native class  |  object     |  [object ClassName]   |  {varies}        |  true
     *   custom class  |  object     |  [object Object]      |  {varies}        |  true
     */
    if (variable == null) {
        return (includeNull && variable !== undefined);
    }

    const toObjectString = type => Object.prototype.toString.call(type);
    const isObjectLike = variable instanceof Object;
    const isObjectLiteral = Object.getPrototypeOf(variable) === Object.getPrototypeOf({});

    const nonObjectSamples = [ '', 1, true, Symbol() ]; // array/function handled below
    const nonObjectsToString = nonObjectSamples.map(toObjectString);
    const variableToObjectString = toObjectString(variable);
    const isObjectLiteralOrNativeOrCustomClassInstance = !nonObjectsToString.includes(variableToObjectString);
    const isObjectLiteralOrCustomClassInstance = variableToObjectString === toObjectString({});

    const isFunction = typeof variable === typeof (() => {});

    const isArray = Array.isArray(variable);
    const isArrayLength = lengthValue => (
        typeof lengthValue === typeof 1
        && lengthValue > -1
        && lengthValue % 1 === 0
        && lengthValue <= Number.MAX_SAFE_INTEGER
    );
    const isArrayLike = !isFunction && isArrayLength(variable.length);

    const checks = [ isObjectLike ];

    if (!includeFunctions) {
        checks.push(!isFunction);
    }

    if (!includeArrays) {
        checks.push(!isArray);
    }

    const objectLikesAreAcceptable = (includeFunctions || includeArrays);

    if (!objectLikesAreAcceptable) {
        if (!includeNativeClasses && !includeCustomClasses) {
            checks.push(isObjectLiteral);
        } else if (!includeNativeClasses) {
            checks.push(isObjectLiteralOrCustomClassInstance);
        } else if (!includeCustomClasses) {
            const isNotCustomClass = (isObjectLiteral || !isObjectLiteralOrCustomClassInstance);
            checks.push(isObjectLiteralOrNativeOrCustomClassInstance && isNotCustomClass);
        }
    }

    return checks.every(bool => bool);
}
