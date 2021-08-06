// noinspection JSConstantReassignment

import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

configure({ adapter: new Adapter() });

class StorageMock {
    storage = {};

    setItem(key, val) {
        this.storage[key] = val;
    }

    getItem(key) {
        return (key in this.storage) ? this.storage[key] : null;
    }

    removeItem(key) {
        delete this.storage[key];
    }

    clear() {
        this.storage = {};
    }

    get length() {
        return Object.keys(this.storage).length;
    }

    key(index) {
        return Object.keys(this.storage)[index] || null;
    }

    /**
     * Returns a generator/iterator for use in array spreading.
     *
     * Note:
     *   - function* myGenerator() {...}  --  Returns an iterator
     *                                      (wrapper around `return { next: ..., done: bool };`).
     *   - yield <X>  --  Returns `X` as the next value of the iterator's `.next().value` call.
     *   - yield* <iterable>  --  Forwards the `yield` return to another iterable.
     *
     * Final result:
     *   - Use `Symbol.iterator` to mark that this method is to be called when iterating over the class instance.
     *   - Mark it as a generator so we don't have to manually implement `next()`/`done` values.
     *   - Forward the iterator values for each iteration to `Object.entries()` to handle `this.storage` iteration automatically.
     *   - Map the iterator values to objects so it shows proper `storageKey: storageVal` assignments.
     *   - Use `return` to automatically signal the end of the `yield` sequence, i.e. mark `done: true`.
     *
     * Note: It seems it's not possible to override object spreading logic at this time (see [this SO post]{@link https://stackoverflow.com/questions/68631046/how-to-override-object-destructuring-for-es-class-just-like-array-destructuring}).
     * As such, object spreading will simply enumerate over the public class instance variables,
     * including arrow functions (since they're bound in the constructor under the hood) but not normal functions.
     *
     * @returns {Generator<string, string>}
     * @see [Iterators and Generators]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators}
     * @see [yield* delegation to other iterables]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield*}
     */
    *[Symbol.iterator]() {
        return yield* Object.entries(this.storage)
            .map(([ k, v ]) => ({ [k]: v }));
    }

    /**
     * Returns the requested primitive representation of the class based on
     * the USAGE of the class, not the methods called on it.
     *
     * `Symbol.toPrimitive` gives you fine-grained control over what is returned
     * based on how it's used by the parent, i.e. operations using the class, not
     * specific methods called on your class.
     * How the parent uses your class is informed by the JSON primitive value passed
     * into the `requestedType` parameter, e.g.:
     *     console.log(`${myClass}`); // requestedType === 'string'
     *     console.log(3 + myClass);  // requestedType === 'number'
     *
     * Functions like `toString()` are sort of wrappers around this method, but
     * with two caveats:
     *     - If the method is called directly (`console.log(myClass.toString())`),
     *       then the explicit `toString()` method would be called, even if it's not
     *       defined (in which case, it'd travel up the inheritance chain, up to `Object`).
     *     - If the method is not defined, then `Symbol.toPrimitive` is defaulted to,
     *       again, only if the method isn't called explicitly.
     *
     * Thus, this only works for class usage, not for specific class function calls.
     * If the parent explicitly calls `myClass.toString()`, then this function won't
     * be called at all.
     *
     * Can also be used to overwrite other custom functions, like [valueOf()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf}.
     * (Note that `valueOf()` should probably not be overridden since it will usually
     * add the class name followed by a representation of its internal structure, as told
     * by `Object.getOwnPropertyDescriptors()`)
     *
     * @param {string} requestedType - Type the class was casted to by the parent.
     * @returns {*} - Casted type of the class.
     * @see [Symbol.toPrimitive]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toPrimitive}
     */
    [Symbol.toPrimitive](requestedType) {
        if (requestedType === typeof '') {
            return `[object ${this.constructor.name}]`;
        }

        if (requestedType === typeof 0) {
            return this.length;
        }

        return this.storage;
    }

    toString() {
        return this[Symbol.toPrimitive](typeof '');
    }

    /**
     * Returns the object to be passed to `JSON.stringify()`.
     *
     * `key` represents the key the object is nested in when called by the parent,
     * e.g.
     *   - JSON.stringify(myClass); // key == null
     *   - JSON.stringify({ myKey: myClass }); // key == 'myKey'
     *   - JSON.stringify([ 'a', myClass ]); // key == 1
     *
     * Thus, return the specified `storage` key only if it matches a key stored by the
     * calling parent.
     *
     * @param {(string|number)} key - Key this class is nested under when called by the
     *                                the parent's `JSON.stringify()`.
     * @returns {Object} - The storage contents.
     */
    toJSON(key) {
        if (this.getItem(key)) {
            return this.getItem(key);
        }

        return this.storage;
    }
}

global.localStorage = new StorageMock();
global.sessionStorage = new StorageMock();

global.XMLHttpRequest = jest.fn(() => {
    return {
        open: () => {},
        send: () => {}
    };
});

global.fetch = jest.fn(() => Promise.resolve({
    json: () => ({ realFetchResponse: 'realFetchResponse' }),
    text: () => 'realFetchResponse'
}));
global.Headers = jest.fn();
global.Request = jest.fn((url, options) => ({
    url,
    text: () => Promise.resolve(options ? options.body : '')
}));


/*** Utils for direct usage in jest tests ***/


/**
 * Mocks a property of an object with the desired [PropertyDescriptor]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty#description}
 * configuration.
 *
 * The returned `restore()` function should be called once the mocked property is no
 * longer needed so that the property's original value/configuration can be reset.
 *
 * @example
 * it('does something', () => {
 *     const restoreMockLocation = mockObjProperty(window, 'location', {
 *         configurable: true,
 *         enumerable: true,
 *         writable: true,
 *         value: {
 *             href: 'https://example.com/users/1234',
 *             origin: 'https://example.com'
 *         }
 *     });
 *     // tests
 *     restoreMockLocation();
 * });
 *
 * @param {Object} [obj=window] - Object for which to mock a property.
 * @param {string} property - Property of the `obj` to mock.
 * @param {PropertyDescriptor} mockDescriptor - Mocked value & configuration.
 * @returns {function} - Function to restore the mocked property back to its original value.
 */
function mockObjProperty(
    obj = window,
    property = '',
    mockDescriptor
) {
    const originalDescriptor = {
        // Default the value in case it was never defined in the first place
        value: undefined,
        // It's acceptable to spread `undefined`
        ...Object.getOwnPropertyDescriptor(obj, property)
    };
    // Get a default PropertyDescriptor with `configurable` and `enumerable` set to true.
    // Add in `writable`/`value` if `value` is specified, otherwise leave it out
    // because `get`/`set` is being used instead.
    const getDefaultMockDescriptor = (value) => ({
        configurable: true, // Property type may be changed; Allows `delete property`.
        enumerable: true, // Property will be displayed in `Object.keys(obj)` and similar.
        // Only one of [ writable, value ] or [ get, set ] can be specified.
        ...(value !== undefined ? {
            writable: true, // Allows `obj.property = newVal`.
            value, // Property value. Defaults to `undefined`
        } : {
            // Don't fill them in b/c e.g. `get() { return obj[property] }` will recurse indefinitely.
            // get() {}, // Property getter.
            // set(newVal) {}, // Property setter.
        })
    });
    const allowedGetterSetterKeys = new Set([ 'get', 'set' ]);
    const allowedKeys = new Set(
        Object.keys(getDefaultMockDescriptor(null))
            .concat(...allowedGetterSetterKeys)
    );

    if (
        (mockDescriptor == null)
        || (typeof mockDescriptor !== typeof {})
        || !Object.keys(mockDescriptor).every(mockDescriptorKey => allowedKeys.has(mockDescriptorKey))
    ) {
        // User didn't pass a PropertyDescriptor.
        // Automatically fill in the passed value into the default descriptor.
        // Ensure it's writable by casting an undefined value to null.
        mockDescriptor = getDefaultMockDescriptor(mockDescriptor !== undefined ? mockDescriptor : null);
    } else {
        mockDescriptor = {
            ...getDefaultMockDescriptor(mockDescriptor.value),
            ...mockDescriptor,
        };
    }

    Object.defineProperty(obj, property, mockDescriptor);

    return () => Object.defineProperty(obj, property, originalDescriptor);
}
global.mockObjProperty = mockObjProperty;


/*** Configuration for jest itself ***/


/**
 * Ignore certain console messages from polluting jest output.
 *
 * For example, Enzyme has a known issue where it will falsely warn that
 * a state change wasn't wrapped in `act()` even though it wasn't called from
 * the jest test (e.g. state change within `useEffect()`) (see: https://github.com/enzymejs/enzyme/issues/2073).
 *
 * For cases like that, the message can be added to the ignore list here
 * and then it won't be printed out.
 *
 * @param {function(...[*]): void} consoleMethod - `console.[method]()` for which to ignore messages.
 * @param {...(string|RegExp)} toIgnoreMatchers - Matchers for messages to ignore.
 * @returns {function(...[*]): void} - A decorated `console.[method]()` which ignores the specified messages.
 */
function withIgnoredMessages(consoleMethod, ...toIgnoreMatchers) {
    const defaultMessagesToAlwaysIgnore = [
        'test was not wrapped in act(...)',
    ];
    const consoleMessagesToIgnore = [
        ...defaultMessagesToAlwaysIgnore,
        ...toIgnoreMatchers,
    ];

    return (message, ...args) => {
        const containsIgnoredMessage = consoleMessagesToIgnore.some(toIgnoreMatcher => message?.match(toIgnoreMatcher));

        if (!containsIgnoredMessage) {
            consoleMethod(message, ...args);
        }
    };
}

console.warn = jest.fn(withIgnoredMessages(console.warn));
console.error = jest.fn(withIgnoredMessages(console.error));
