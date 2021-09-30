/**
 * Descriptor passed to decorator functions.
 * Decorators can decorate a class itself or one of its properties,
 * including static/instance variables, functions, and getters/setters.
 *
 * Decorator will be called *before* the decorated field is actually initialized, so class variables and
 * arrow functions (both static and instance) won't appear in the PropertyDescriptor's `value` field.
 * Instead, the `value` field will be replaced with an `initializer` function which is used to create
 * the value for the given property.
 * This will likely change over time to include new features, such as distinctions between `method` and `getter/setter`,
 * `metadata`, etc.
 *
 * @see [TC39 proposal docs]{@link https://github.com/tc39/proposal-decorators#2-calling-decorators}
 */
interface DecoratorDescriptor {
    kind: 'class' | 'method' | 'field';
    key: string;
    placement: 'static' | 'prototype' | 'own';
    descriptor: PropertyDescriptor;
    /**
     * Only for variables and arrow functions (both static and instance),
     * this function is what generates the value for the variable/function.
     */
    initializer?: () => any;
    /**
     * Only for `kind: class`, this gives descriptors for every property a
     * class might have, regardless of static, prototype, or own.
     */
    elements?: DecoratorDescriptor[];
}

/**
 * Decorator function API described in the [tc39-proposal]{@link https://github.com/tc39/proposal-decorators}.
 */
type DecoratorFunctionNew = (decoratorDescriptor: DecoratorDescriptor) => any;


/**
 * Legacy decorator function API.
 * Activate with `@babel/plugin-proposal-decorators` --> `legacy: true`.
 *
 * @see [TypeScript decorator docs]{@link https://www.typescriptlang.org/docs/handbook/decorators.html}
 */
type DecoratorFunctionLegacy = (
    /**
     * Class (constructor) or class instance that is/owns the property being decorated.
     * Note: Class instances won't have instance variables/arrow functions due to `constructor()` not being called, yet.
     */
    target: (Object|Function),
    /**
     * Name of the decorated property; undefined if on the class itself.
     */
    propertyName: (string|undefined),
    /**
     * Property descriptor of the decorated property; undefined if on the class itself.
     */
    propertyDescriptor: (PropertyDescriptor|undefined),
) => any;

export type Decorator = (DecoratorFunctionNew | DecoratorFunctionLegacy);


/**
 * Generic type-definition of a non-arg decorator.
 */
export function decoratorWithoutArgs(...params: Parameters<Decorator>) {
    logArgs({
        target: params[0],
        propertyName: params[1],
        propertyDescriptor: params[2],
    });
}

/**
 * Generic type-definition of an arg-dependent decorator.
 */
export function decoratorWithArgs(...decoratorArgs: any[]) {
    function actualDecorator(...params: Parameters<Decorator>) {
        logArgs({
            decoratorArgs,
            target: params[0],
            propertyName: params[1],
            propertyDescriptor: params[2],
        });
    }

    return actualDecorator;
}


function logArgs(argsAsObj: {[key: string]: any}) {
    const getArrayToPrint = (obj: Object) => Object
        .entries(obj)
        .filter(([ argName, argVal ]) => argVal)
        .flatMap(([ argName, argVal ]) => ([ `${argName}:`, argVal, '\n' ]));
    let toPrint = getArrayToPrint(argsAsObj);

    if (Object.keys(argsAsObj).length === 1 && argsAsObj?.target) {
        toPrint = getArrayToPrint(argsAsObj.target);
    }

    console.log(
        ...toPrint,
    );
}
