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
 * @param {(PropertyDescriptor|*)} mockDescriptor - Either the mocked value or the configuration for `Object.defineProperty()`.
 * @returns {function} - Function to restore the mocked property back to its original value.
 */
export function mockObjProperty(
    obj = window,
    property = '',
    mockDescriptor,
) {
    const originalDescriptor = {
        // Default the value in case it was never defined in the first place
        value: undefined,
        // It's acceptable to spread `undefined`
        ...Object.getOwnPropertyDescriptor(obj, property),
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
        }),
    });
    const allowedGetterSetterKeys = new Set([ 'get', 'set' ]);
    const allowedKeys = new Set(
        Object.keys(getDefaultMockDescriptor(null))
            .concat(...allowedGetterSetterKeys),
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


// TODO Use a Proxy instead to preserve original stack trace location
//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy
/**
 * Ignore certain console messages from polluting jest output.
 *
 * For example, Enzyme has a known issue where it will falsely warn that
 * a state change wasn't wrapped in `act()` even though it wasn't called from
 * the jest test (e.g. state change within `useEffect()`) (see: https://github.com/enzymejs/enzyme/issues/2073).
 *
 * For cases like that, the message can be added to the ignore-list here to prevent it from being printed out.
 *
 * @param {string} consoleMethod - `console.[method]()` for which to ignore messages.
 * @param {...(string|RegExp)} toIgnoreMatchers - Matchers for messages to ignore.
 * @returns {function(...[*]): void} - A decorated `console.[method]()` which ignores the specified messages.
 */
export function withIgnoredMessages(consoleMethod, ...toIgnoreMatchers) {
    const defaultMessagesToAlwaysIgnore = [
        'test was not wrapped in act(...)',
    ];
    const consoleMessagesToIgnore = [
        ...defaultMessagesToAlwaysIgnore,
        ...toIgnoreMatchers,
    ];

    const origConsoleMethod = console[consoleMethod];
    const filteredConsoleMethod = (message, ...args) => {
        const containsIgnoredMessage = consoleMessagesToIgnore.some(toIgnoreMatcher => message?.match(toIgnoreMatcher));

        if (!containsIgnoredMessage) {
            origConsoleMethod(message, ...args);
        }
    };

    console[consoleMethod] = jest.fn(filteredConsoleMethod);
}

withIgnoredMessages(console.warn);
withIgnoredMessages(console.error);
