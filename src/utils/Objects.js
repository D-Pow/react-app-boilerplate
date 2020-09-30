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
 * Determines the differences between two objects, returning all nested
 * paths of differences.
 *
 * Ignores prototypes and inheritance.
 *
 * If arguments are not objects or arrays, then '.' will be returned if they differ.
 *
 * @param {Object} obj1 - 1 of 2 objects to be compared
 * @param {Object} obj2 - 2 of 2 objects to be compared
 * @param {boolean} [showArrayIndex=true] - If the index of arrays should be included in diff set
 * @returns {Set<string>} - Set showing paths to nested differences
 */
export function diffObjects(obj1, obj2, showArrayIndex = true) {
    // object literals, class instances, arrays, and functions
    const areBothRealObjects = (a, b) => ((a instanceof Object) && (b instanceof Object));
    const functionType = typeof (diffObjects);
    const areBothFunctions = (a, b) => ((typeof a === functionType) && (typeof b === functionType));
    const areBothArrays = (a, b) => (Array.isArray(a) && Array.isArray(b));

    const differences = [];

    function handleDifferentTypes(a, b, key) {
        if (typeof a !== typeof b) {
            differences.push(key);

            return true;
        }

        return false;
    }

    function handleNonObjects(a, b, key) {
        if (!areBothRealObjects(a, b)) {
            // anything not a "real" object:
            // strings, numbers, booleans, null, undefined, and symbols
            if (a !== b) {
                differences.push(key);
            }

            return true;
        }

        return false;
    }

    function handleFunctions(a, b, key) {
        if (areBothFunctions(a, b)) {
            if (a.toString() !== b.toString()) {
                differences.push(key);
            }

            return true;
        }

        return false;
    }

    function handleArrays(a, b, key) {
        if (areBothArrays(a, b)) {
            for (let i = 0; (i < a.length || i < b.length); i++) {
                const indexKey = `[${i}]`;
                let nestedKey = `${key}` + (showArrayIndex ? indexKey : '');

                if (key === '.') {
                    // force top-level call to show root index if array
                    nestedKey = indexKey;
                }

                handleAllValues(a[i], b[i], nestedKey);
            }

            return true;
        }

        return false;
    }

    function handleObjects(a, b, key) {
        const parentKeyPath = key === '.'
            ? '' // don't add '.' to top-level call for objects, and clear original '.'
            : `${key}.`; // add '.' after previous path to show it's a key from a parent object
        const allKeysForBothObjects = new Set(Object.keys(a).concat(Object.keys(b)));

        allKeysForBothObjects.forEach(nestedKey => {
            const value1 = a[nestedKey];
            const value2 = b[nestedKey];
            const nestedKeyPath = `${parentKeyPath}${nestedKey}`;

            handleAllValues(value1, value2, nestedKeyPath);
        });

        return true;
    }

    function handleAllValues(a, b, key) {
        return (
            handleDifferentTypes(a, b, key)
            || handleNonObjects(a, b, key)
            || handleFunctions(a, b, key)
            || handleArrays(a, b, key)
            || handleObjects(a, b, key)
        );
    }

    handleAllValues(obj1, obj2, '.'); // '.' is safety check in case non-(array|object) args are passed

    return new Set(differences);
}

/**
 * Determines if two objects are equal.
 * Ignores prototypes and inheritance.
 *
 * @param {Object} obj1 - 1 of 2 objects to be compared
 * @param {Object} obj2 - 2 of 2 objects to be compared
 * @returns {boolean} - If the stringified version of obj1 equals that of obj2
 */
export function objEquals(obj1, obj2) {
    return diffObjects(obj1, obj2).size === 0;
}

/**
 * Determines if a given variable is an object.
 *
 * @param {*} variable - Variable to check if it's an object
 * @param {{}} options - What to include in is-object check
 * @param {boolean} [options.includeClasses=true] - If native/custom JavaScript class instances should return true.
 * @param {boolean} [options.includeArrays=false] - If arrays should return true.
 *                                                  If this is true, classes will be included.
 * @param {boolean} [options.includeFunctions=false] - If functions should return true.
 *                                                     If this is true, classes will be included.
 * @param {boolean} [options.includeNull=false] - If null should return true.
 * @returns {boolean} - If the variable is an object as described by the passed options.
 */
export function isObject(variable, {
    includeClasses = true,
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

    const isObjectLike = variable instanceof Object;
    const isObjectLiteral = Object.getPrototypeOf(variable) === Object.prototype;
    const isFunction = typeof variable === typeof isObject;
    const isArray = Array.isArray(variable);

    const checks = [ isObjectLike ];

    if (!includeFunctions) {
        checks.push(!isFunction);
    }

    if (!includeArrays) {
        checks.push(!isArray);
    }

    const objectLikesAreAcceptable = (includeFunctions || includeArrays);

    if (!objectLikesAreAcceptable && !includeClasses) {
        checks.push(isObjectLiteral);
    }

    return checks.every(bool => bool);
}

/**
 * Deep-copies an object. Prevents pointers from being reused, and changes from being
 * shared between the passed object and returned obj.
 *
 * Note: `Symbol` keys/values in the cloned object are the same as that of the original one.
 *
 * @param {Object} obj - Object to copy.
 * @returns {Object} - Deep-copied object.
 */
export function deepCopy(obj) {
    if (obj instanceof HTMLElement || obj instanceof Node) {
        return obj;
    }

    if (!isObject(obj)) {
        if (Array.isArray(obj)) {
            return obj.map(deepCopy);
        }

        return obj; // primitives don't need copying; functions handled in previous call
    }

    // TODO circular references

    if (obj instanceof Map) {
        const copy = new obj.constructor();

        obj.forEach((val, key) => {
            copy.set(deepCopy(key), deepCopy(val));
        });

        return copy;
    }

    if (obj instanceof Set) {
        const copy = new obj.constructor();

        obj.forEach(key => {
            copy.add(deepCopy(key));
        });

        return copy;
    }

    if (obj instanceof RegExp) {
        const copy = new RegExp(obj);
        copy.lastIndex = obj.lastIndex;
        return copy;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }

    if (obj instanceof Error) {
        const copy = new obj.constructor(obj.message);

        for (let key of [ 'stack', 'code', 'errno', 'syscall' ]) {
            if (obj[key]) {
                copy[key] = obj[key];
            }
        }

        return copy;
    }

    if (typeof Promise !== 'undefined' && obj instanceof Promise) {
        return new Promise(
            res => {
                obj.then(res);
            },
            rej => {
                obj.catch(rej);
            });
    }

    const getTag = x => Object.prototype.toString.call(x);
    const getTypeFromTag = x => getTag(x).match(/(?:\[object )([^\]]+)\]/)[1];

    const typedArrayRegex = /((.+Array)|(Array.+))/; // TypedArray has extra text before/after "Array"
    const isTypedArray = typedArrayRegex.test(getTypeFromTag(obj));

    if (isTypedArray) {
        // (TypedArray.prototype.slice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/slice)
        // technically returns a shallow copy, but since their entries are only ever primitives, this is acceptable.
        try {
            return obj.slice();
        } catch (e) {
            const copy = new obj.constructor(obj.length);
            copy.set(obj);
            return copy;
        }
    }

    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) {
        try {
            return Buffer.from(obj);
        } catch (e) {
            // Node.js < 5.10
            const copy = new obj.constructor(obj.length);
            obj.copy(copy);
            return copy;
        }
    }

    /*
     * `Object.create()` copies over prototype and property descriptors
     * but fails to re-bind `this` on arrow functions and re-instantiate
     * fields.
     * Thus, call new on constructor.
     *
     * Also, `Object.getOwnPropertyDescriptors()` will return `Symbol` keys, but
     * they will be inaccessible by `Object.entries()`, `for (val in descriptors)`, etc.
     * so manually get the keys first (both "normal" and Symbol keys), followed by individual
     * `Object.getOwnPropertyDescriptor()` calls.
     * This combo will end up copying over values initialized/passed in the `obj`'s constructor.
     */
    const copy = new obj.constructor();
    const objKeys = Object.getOwnPropertyNames(obj).concat(Object.getOwnPropertySymbols(obj));

    objKeys.forEach(key => {
        const origKeyProperties = Object.getOwnPropertyDescriptor(obj, key);
        let copiedVal = deepCopy(origKeyProperties.value);

        if (typeof copiedVal === typeof deepCopy) {
            if (obj.constructor === Object) {
                /*
                 * Both class and arrow functions on classes will be taken care of in
                 * `new obj.constructor()` call. However, object literals will not be
                 * included in this.
                 *
                 * Any functions that appear in `Object.getOwnPropertyDescriptor()`
                 * are bound functions, including arrow functions, and need to be re-bound
                 * to the new object.
                 */
                Object.defineProperty(copy, key, {
                    ...origKeyProperties,
                    value: copiedVal.bind(copy)
                });
            }
        } else {
            Object.defineProperty(copy, key, {
                ...origKeyProperties,
                value: copiedVal
            });
        }
    });

    return copy;
}
