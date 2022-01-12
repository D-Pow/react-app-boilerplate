import { hyphenOrSnakeCaseToCamelCase } from '@/utils/Text';

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
 * Attempts to parse a string into an object; stringifies anything else.
 * Returns the original variable if it's not valid JSON.
 *
 * @param {(string|*)} variable - String to parse or object to stringify.
 * @param {Object} [options] - Parsing options.
 * @param {boolean} [options.keepFunctions=false] - Attempt maintaining function definitions when parsing `obj`.
 * @param {number} [spaces=4] - Number of spaces to indent stringified object entries.
 * @returns {*} - Vanilla JavaScript string or parsed object.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify}
 */
export function convertJson(variable, { keepFunctions = false, spaces = 4 } = {}) {
    const funcToString = (key, val) => {
        if (typeof val === typeof JSON.stringify) {
            /*
             * Function.prototype.toString() will keep original function names, but since
             * the object has a key with the function name, we must replace it with `function` to avoid
             * invalid syntax errors.
             * Arrow functions remain unaffected.
             *
             * i.e.
             * {
             *   a: function(){}  -->  a: function(){},
             *   b(){}  -->  b: b(){},  // invalid, so requires converting from `b()` to `function()`
             *   c: () => {}  -->  c: () => {}
             * }
             */
            return val.toString().replace(/^\w+/, 'function');
        }

        return val;
    };
    const stringToFunc = (key, val) => {
        if (/^(function)?\(/.test(val)) {
            /*
             * Function constructor returns a new anonymous function with the content
             * of the string passed to it.
             * To keep the original function as-is, nest the string inside the anonymous
             * function wrapper's return statement, then call that anonymous function
             * to return the original function.
             * It will automatically be set to `key` of the top-level object.
             */
            return new Function(`return ${val}`)();
        }

        return val;
    };
    const stringifier = keepFunctions ? funcToString : null;
    const parser = keepFunctions ? stringToFunc : null;

    try {
        if (typeof variable === typeof '') {
            try {
                return JSON.parse(
                    variable,
                    parser,
                );
            } catch (couldNotParseFunctions) {
                return JSON.parse(
                    variable,
                    null,
                );
            }
        } else {
            try {
                return JSON.stringify(
                    variable,
                    stringifier,
                    spaces,
                );
            } catch (couldNotParseFunctions) {
                return JSON.stringify(
                    variable,
                    null,
                    spaces,
                );
            }
        }
    } catch (invalidJsonFormat) {
        return variable;
    }
}

/**
 * Attempts to parse an object into a vanilla JavaScript object literal.
 *
 * @param {*} obj - Any type of object
 * @param {Object} [options] - Parsing options.
 * @param {boolean} [options.keepFunctions=false] - Attempt maintaining function definitions when parsing `obj`.
 * @returns {*} - Vanilla JavaScript object literal or original object on failure
 */
export function attemptParseObjLiteral(obj, { keepFunctions = false } = {}) {
    return convertJson(
        convertJson(obj, { keepFunctions }),
        { keepFunctions },
    );
}

/**
 * Inverse of `Object.entries(obj)`: Converts an Nx2 matrix into an object.
 * If any key is seen twice, then the resulting value of that key in the object will be an array
 * of values.
 *
 * @param {*[][]} matrix - Matrix to convert to an object.
 * @returns {Object} - Object representation of the matrix.
 */
export function matrixToObj(matrix) {
    return matrix.reduce((obj, [ key, val ]) => {
        if (!(key in obj)) {
            obj[key] = val;
        } else if (Array.isArray(obj[key])) {
            obj[key].push(val);
        } else {
            obj[key] = [ obj[key], val ];
        }

        return obj;
    }, {});
}

/**
 * Generates a path from the root `<html>` element to the specified HTML element/node.
 * Created by doing a recursive tree traversal from the leaf element passed as an arg
 * to the top-level element (usually `<html>`), tracking each element's index in its parent's
 * child list along the way.
 *
 * Note: Unique IDs will change if the DOM changes.
 *
 * @param {(HTMLElement|Node)} targetNode - Element for which to get the unique ID.
 * @returns {string} - Unique ID for the element, based on its location in the DOM.
 */
export function getElementLocationInDom(targetNode) {
    const pieces = [ 'doc' ];
    let node = targetNode;

    while (node && node.parentNode) {
        // `Node.childNodes` returns all children, including elements, plain text, comments, etc.
        // `Element.children` returns only HTML elements.
        // Each have their own pros/cons. See: https://stackoverflow.com/questions/7935689/what-is-the-difference-between-children-and-childnodes-in-javascript
        pieces.push(Array.prototype.indexOf.call(node.parentNode.children, node));
        // `parentNode` is slightly more reliable than `parentElement` for special elements, e.g. DocumentFragment, SVGs, etc.
        node = node.parentNode;
    }

    return pieces.join('/');
}

/**
 * Gets the inheritance chain from the specified object up to `Object` (the top-level class all others extend from).
 *
 * @param {any} obj - Object for which to get the inheritance chain.
 * @returns {any[]} - List of inherited prototypes, from the passed argument (index 0) to Object (index lenght-1).
 * @see [StackOverflow inspiration]{@link https://stackoverflow.com/questions/17329462/javascript-prototype-chaining-get-parent-of-parent-of}
 */
export function getPrototypeChain(obj) {
    let proto = Object.getPrototypeOf(obj);
    const prototypeChain = [ proto ];

    while (proto) {
        proto = Object.getPrototypeOf(proto);

        if (proto) {
            // Object is the top-level prototype which has no parents from which it extended.
            // In this case, `proto` will be null, so don't add that to the prototype chain list.
            prototypeChain.push(proto);
        }
    }

    return prototypeChain;
}

/**
 * Adds a new `uniqueId` field to all non-primitive objects.
 *
 * The unique ID is lazy-loaded, meaning it won't be instantiated until called, so
 * objects created later could possibly have lower IDs than those created earlier if
 * the earlier ones didn't access `uniqueId`.
 *
 * IDs are generated in a naive way: Simply incrementing from 1 to infinity
 * as more objects are created.
 *
 * Overwriting a variable with a new instance will cause that new instance to have
 * a new unique ID.
 *
 * @param {Object} options
 * @param {boolean} [options.resetIds] - If calling the function again after it's already been called should reset all IDs.
 */
export function augmentObjectsWithUniqueIds({
    resetIds = false,
} = {}) {
    if (Object.__uniqueIdCounter && !resetIds) {
        return;
    }

    Object.defineProperties(Object, {
        __uniqueIdCounter: {
            configurable: true, // Allow the property to be rewritten in case `resetIds` is true
            enumerable: false,
            writable: true,
            value: 1,
        },
        uniqueIdCounter: {
            configurable: true,
            enumerable: false,
            get() {
                // Auto-increment the global unique-ID counter if it's requested (see `prototype.uniqueId` below)
                return this.__uniqueIdCounter++;
            },
        },
    });

    Object.defineProperties(Object.prototype, {
        __uniqueId: {
            configurable: true,
            enumerable: false,
            writable: true,
            value: null,
        },
        uniqueId: {
            configurable: true,
            enumerable: false,
            get() {
                if (!this.__uniqueId) {
                    // If `__uniqueId` isn't defined, then instantiate it with the global ID counter.
                    // This only happens on the first request for it; subsequent reads will use `__uniqueId`
                    this.uniqueId = Object.uniqueIdCounter;
                }

                return this.__uniqueId;
            },
            set(newId) {
                this.__uniqueId = newId;
            },
        },
    });
}

/**
 * Converts all keys of the object from hyphen-case and/or snake_case to camelCase.
 *
 * Particularly useful for converting CLI arg objects created by `yargs-parser`, `minimist`, etc.
 * from unpredictable object key names to predictable ones.
 *
 * @example
 *   `node my-script.js --arg-a --arg-b=hi`
 *   // yargs-parser output
 *   {
 *       "arg-a": true,
 *       "arg-b": "hi"
 *   }
 *   // this function's output
 *   {
 *       argA: true,
 *       argB: "hi",
 *       // optional duplication to produce above plus:
 *       "arg-a": true,
 *       "arg-b": "hi"
 *   }
 *
 * @param {Object} obj - Object whose keys shall be converted to camelCase.
 * @param {boolean} [keepPreviousKeys=false] - If the previous hyphen-case/snake_case keys should be kept or not.
 * @returns {Object} - Object with camelCased keys.
 */
export function objKeysToCamelCase(obj, keepPreviousKeys = false) {
    return Object.entries(obj).reduce((camelCaseObj, [ key, val ]) => {
        const camelCaseKey = hyphenOrSnakeCaseToCamelCase(key);

        camelCaseObj[camelCaseKey] = val;

        if (keepPreviousKeys) {
            camelCaseObj[key] = val;
        }

        return camelCaseObj;
    }, {});
}

/**
 * Tests that the given variables are instances of the given class(es).
 *
 * Passing multiple classes allows the objects' types to be of any of the classes,
 * but not necessarily the same class.
 *
 * To test only one variable instead of two, pass `undefined` as the second argument,
 * e.g. `areVarsInstancesOf(myVar, undefined, RegExp, String)`
 *
 * @param {*} a - 1 of 2 variables to be compared.
 * @param {*} b - 2 of 2 variables to be compared. Pass `undefined` to only test `a`.
 * @param {...Class} classes - Acceptable classes that the variables can be instances of.
 * @returns {boolean} - If the variables are instances of any of the acceptable classes.
 */
export function areVarsInstancesOf(a, b, ...classes) {
    // Note: This works for `Array` as well unless the passed var/class were created in separate
    // documents/contexts, e.g. `iframeArray instanceof window.Array === false`
    const isInstanceOfClass = (variable, Cls) => (
        (variable instanceof Cls)
        || (Object.prototype.toString.call(variable) === Object.prototype.toString.call(Cls.prototype))
    );

    if (b === undefined) {
        return classes.some(Cls => isInstanceOfClass(a, Cls));
    }

    return [ a, b ].every(variable =>
        classes.some(Cls => isInstanceOfClass(variable, Cls)),
    );
}

/**
 * Sorts objects by the specified fields.
 * Casts number strings to numbers for comparisons.
 *
 * @param {Object[]} objList - List of objects to sort.
 * @param {string[]} byFields - Fields by which to sort, in order of decreasing priority.
 * @param {Object} [options] - Sorting options
 * @param {boolean} [options.reverse=false] - Sort in reverse order.
 * @param {boolean} [options.inPlace=true] - Sort in-place.
 * @param {boolean} [options.stringIgnoreCase=false] - Ignore upper/lower casing in strings.
 * @param {boolean} [options.stringIgnoreDiacritics=false] - Ignore accents and other letter variations.
 * @param {boolean} [options.stringLocale] - Specific locale/language to use (defaults to that set by the user's browser).
 * @returns {Object[]} - Sorted list
 */
export function sortObjects(
    objList,
    byFields,
    {
        reverse = false,
        inPlace = true,
        stringIgnoreCase = false,
        stringIgnoreDiacritics = false,
        stringLocale,
    } = {},
) {
    if (!objList || objList.length === 0 || !byFields || byFields.length === 0) {
        return objList;
    }

    if (!inPlace) {
        objList = [ ...objList ];
    }

    return objList.sort((obj1, obj2) => byFields.reduce((prevComparatorVal, field) => {
        if (prevComparatorVal !== 0) {
            // Previous (higher priority) field in `byFields` already returned a value, so use that instead.
            return prevComparatorVal;
        }

        const val1 = obj1[field];
        const val2 = obj2[field];


        // Sensitivity options: https://tc39.es/ecma402/#sec-collator-comparestrings
        // Note: if two characters are equal, then original list order is maintained, e.g. 'a'.localeCompare('A', {'base'}) === 0
        const CollatorSensitivities = {
            LENIENT: 'base',        // a == A  |  a == á
            ACCENT_ONLY: 'accent',  // a == A  |  a != á
            CASE_ONLY: 'case',      // a != A  |  a == á
            STRICT: 'variant',      // a != A  |  a != á
        };
        const sensitivity = (stringIgnoreCase && stringIgnoreDiacritics)
            ? CollatorSensitivities.LENIENT
            : (!stringIgnoreCase && !stringIgnoreDiacritics)
                ? CollatorSensitivities.STRICT
                : stringIgnoreCase
                    ? CollatorSensitivities.ACCENT_ONLY
                    : CollatorSensitivities.CASE_ONLY;
        // locale of `undefined` defaults to that set by the user's browser
        let comparatorVal = `${val1}`.localeCompare(`${val2}`, stringLocale, { sensitivity });


        const val1IsNumber = !isNaN(Number(val1)) && !isNaN(parseFloat(val1));
        const val2IsNumber = !isNaN(Number(val2)) && !isNaN(parseFloat(val2));

        if (val1IsNumber && val2IsNumber) {
            /*
             * Note that `String(numA).localeCompare(String(numB), undefined, { numeric: true })` doesn't actually
             * cast the strings to numbers, so there are some edge cases where it doesn't work, e.g. if the number of
             * decimal places for each value are different:
             * '5.16'.localeCompare('5.3', undefined, { numeric: true }) === 1 // should be -1 because 5.16 < 5.3
             *
             * Thus:
             *
             * Use Number() to avoid coercing strings that happen to contain numbers in them into numbers.
             * e.g.
             *   Number('5x') === NaN
             *   parseFloat('5x') === 5
             *
             * Use parseFloat() to avoid coercing strings that only contain whitespace into numbers.
             * e.g.
             *   Number('\n\t ') === 0
             *   parseFloat('\n\t ') === NaN
             *
             * See: https://stackoverflow.com/questions/12227594/which-is-better-numberx-or-parsefloatx/13676265#13676265
             */
            const num1 = Number(val1);
            const num2 = Number(val2);

            comparatorVal = num1 < num2
                ? -1
                : num1 > num2
                    ? 1
                    : 0;
        }

        return reverse ? (-1 * comparatorVal) : comparatorVal;
    }, 0));
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
    const areBothRealObjects = (a, b) => areVarsInstancesOf(a, b, Object);
    const areBothFunctions = (a, b) => areVarsInstancesOf(a, b, Function);
    const areBothArrays = (a, b) => areVarsInstancesOf(a, b, Array);

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
 * @param {Object} [options] - What to include in is-object check
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
    includeNull = false,
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
    const circularReferenceMap = arguments[1] || new WeakMap();

    if (circularReferenceMap.has(obj)) {
        return circularReferenceMap.get(obj);
    }

    if (obj instanceof HTMLElement || obj instanceof Node) {
        return obj;
    }

    if (!isObject(obj)) {
        if (Array.isArray(obj)) {
            return obj.map(entry => deepCopy(entry, circularReferenceMap));
        }

        return obj; // primitives don't need copying; functions handled in previous call
    }

    if (obj instanceof Map) {
        const copy = new obj.constructor();

        obj.forEach((val, key) => {
            copy.set(deepCopy(key, circularReferenceMap), deepCopy(val, circularReferenceMap));
        });

        return copy;
    }

    if (obj instanceof Set) {
        const copy = new obj.constructor();

        obj.forEach(key => {
            copy.add(deepCopy(key, circularReferenceMap));
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

    // `Buffer` is only valid in NodeJS environment, but keep it here for cross-compatibility.
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) {  // eslint-disable-line no-undef
        try {
            return Buffer.from(obj);  // eslint-disable-line no-undef
        } catch (e) {
            // Node.js < 5.10
            const copy = new obj.constructor(obj.length);
            obj.copy(copy);
            return copy;
        }
    }

    let copy;

    try {
        /*
         * `Object.create()` copies over prototype and property descriptors
         * but fails to re-bind `this` on arrow functions and re-instantiate
         * fields.
         * Thus, call new on constructor.
         */
        copy = new obj.constructor();
    } catch (e) {
        /*
         * If all else fails (usually from error thrown in constructor),
         * create new object from `obj`'s prototype.
         *
         * This will not re-bind arrow functions, but that is unavoidable
         * if not calling `new obj.constructor()`.
         */
        copy = Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);
    }

    circularReferenceMap.set(obj, copy);

    /**
     * `Object.getOwnPropertyDescriptors()` will return `Symbol` keys, but
     * they will be inaccessible by `Object.entries()`, `for (val in descriptors)`, etc.
     * so manually get the keys first (both "normal" and Symbol keys), followed by individual
     * `Object.getOwnPropertyDescriptor()` calls.
     * This combo will end up copying over values initialized/passed in the `obj`'s constructor.
     */
    const objKeys = Object.getOwnPropertyNames(obj).concat(Object.getOwnPropertySymbols(obj));

    objKeys.forEach(key => {
        const origKeyProperties = Object.getOwnPropertyDescriptor(obj, key);
        let copiedVal = deepCopy(origKeyProperties.value, circularReferenceMap);

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
                    value: copiedVal.bind(copy),
                });
            }
        } else {
            Object.defineProperty(copy, key, {
                ...origKeyProperties,
                value: copiedVal,
            });
        }
    });

    return copy;
}

/**
 * Deep-copies an object using JavaScript's internal [Structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).
 *
 * Note: `Symbol` keys/values in the cloned object are the same as that of the original one.
 *
 * @param {Object} obj - Object to copy.
 * @returns {Promise<Object>} - Deep-copied object.
 */
export async function deepCopyStructuredClone(obj) {
    // Shamelessly taken from https://stackoverflow.com/a/57542053/5771107
    if (typeof MessageChannel !== 'undefined') {
        return await new Promise(res => {
            const { port1, port2 } = new MessageChannel();

            port2.onmessage = messageEvent => {
                console.log(messageEvent.data);
                res(messageEvent.data);
            };
            port1.postMessage(obj);
            port1.close();
        });
    }
}
