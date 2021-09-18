/**
 * @typedef {Object} Decorator
 * @property {function} classOrFunction - Class function or class type (i.e. constructor) to pass.
 * @property {string} propertyName - Class instance's function name or null if on a class itself.
 * @property {PropertyDescriptor} propertyDescriptor - Property descriptor of the annotated function/class.
 */

/**
 * Generic type-definition of a non-arg decorator.
 *
 * @param {Decorator.classOrFunction} targetClassOrFunction
 * @param {Decorator.propertyName} propertyName
 * @param {Decorator.propertyDescriptor} propertyDescriptor
 */
export function decoratorWithoutArgs(targetClassOrFunction, propertyName, propertyDescriptor) {
    // Add decorator logic
}

/**
 * Generic type-definition of an arg-dependent decorator.
 *
 * @param {...*} - Arguments for an arbitrary decorator requiring params.
 */
export function decoratorWithArgs(...decoratorArgs) {
    /**
     * @param {Decorator.classOrFunction} targetClassOrFunction
     * @param {Decorator.propertyName} propertyName
     * @param {Decorator.propertyDescriptor} propertyDescriptor
     */
    function actualDecorator(targetClassOrFunction, propertyName, propertyDescriptor) {
        // Add decorator logic
    }

    return actualDecorator;
}
