/**
 * Decorates a class or a class' property.
 * Property can be a variable or function (including getters/setters).
 *
 * Decorator will be called *before* the class is actually initialized, so instance variables and
 * bound methods likely won't appear on `target`.
 * Similarly, for instance variables/bound methods, the `propertyDescriptor` will often come with a
 * custom `initializer` function which is used to create the value for the given property. More details [here]{@link https://github.com/tc39/proposal-decorators#2-calling-decorators}.
 *
 * @typedef {Object} Decorator
 * @property {(function|Object)} target - Class (constructor) or class instance that is/owns the property being decorated.
 *                              Note: Class instances won't have instance variables/arrow functions due to `constructor()` not being called, yet.
 * @property {(string|undefined)} propertyName - Name of the decorated property; undefined if on the class itself.
 * @property {(PropertyDescriptor|undefined)} propertyDescriptor - Property descriptor of the decorated property; undefined if on the class itself.
 */

function logArgs(argsAsObj) {
    const getArrayToPrint = obj => Object
        .entries(obj)
        .filter(([ argName, argVal ]) => argVal)
        .flatMap(([ argName, argVal ]) => ([ `${argName}:`, argVal, '\n' ]));
    let toPrint = getArrayToPrint(argsAsObj);

    if (Object.keys(argsAsObj).length === 1 && argsAsObj.target) {
        toPrint = getArrayToPrint(argsAsObj.target);
    }

    console.log(
        ...toPrint,
    );
}

/**
 * Generic type-definition of a non-arg decorator.
 *
 * @param {Decorator.target} target
 * @param {Decorator.propertyName} propertyName
 * @param {Decorator.propertyDescriptor} propertyDescriptor
 */
export function decoratorWithoutArgs(target, propertyName, propertyDescriptor) {
    logArgs({
        target,
        propertyName,
        propertyDescriptor,
    });
}

/**
 * Generic type-definition of an arg-dependent decorator.
 *
 * @param {...*} decoratorArgs - Arguments for an arbitrary decorator requiring params.
 */
export function decoratorWithArgs(...decoratorArgs) {
    /**
     * @param {Decorator.target} target
     * @param {Decorator.propertyName} propertyName
     * @param {Decorator.propertyDescriptor} propertyDescriptor
     */
    function actualDecorator(target, propertyName, propertyDescriptor) {
        logArgs({
            decoratorArgs,
            target,
            propertyName,
            propertyDescriptor,
        });
    }

    return actualDecorator;
}
