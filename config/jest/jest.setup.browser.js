global.XMLHttpRequest = jest.fn(() => {
    return {
        open: () => {},
        send: () => {},
    };
});

global.fetch = jest.fn(() => Promise.resolve({
    json: () => ({ realFetchResponse: 'realFetchResponse' }),
    text: () => 'realFetchResponse',
}));
global.Headers = jest.fn();
global.Request = jest.fn((url, options) => ({
    url,
    text: () => Promise.resolve(options ? options.body : ''),
}));


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


// See: https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
mockObjProperty(window, 'matchMedia', jest.fn(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
})));
