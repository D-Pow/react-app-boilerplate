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
export interface DecoratorDescriptorNew {
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
    elements?: DecoratorDescriptorNew[];
}

/**
 * Decorator function API described in the [tc39-proposal]{@link https://github.com/tc39/proposal-decorators}.
 */
export type DecoratorFunctionNew = (decoratorDescriptor: DecoratorDescriptorNew) => any;


/**
 * Legacy decorator function API.
 * Activate with `@babel/plugin-proposal-decorators` --> `legacy: true`.
 *
 * @see [TypeScript decorator docs]{@link https://www.typescriptlang.org/docs/handbook/decorators.html}
 */
export type DecoratorFunctionLegacy = (
    /**
     * Class (constructor) or class instance that is/owns the property being decorated.
     * Note: Class instances won't have instance variables/arrow functions due to `constructor()` not being called, yet.
     */
    target: object | ((...args: any[]) => any),
    /**
     * Name of the decorated property; undefined if on the class itself.
     */
    propertyName?: string,
    /**
     * Property descriptor of the decorated property; undefined if on the class itself.
     */
    propertyDescriptor?: PropertyDescriptor,
) => any;


/**
 * Decorator type for all types of decorators, including both new and legacy APIs.
 */
export type Decorator = (
    DecoratorFunctionNew
    | DecoratorFunctionLegacy
    | ClassDecorator
    | PropertyDecorator
    | MethodDecorator
    | ParameterDecorator
);


/**
 * `Reflect` metadata keys introduced by [reflect-metadata]{@link https://www.npmjs.com/package/reflect-metadata}.
 *
 * Note: Generally speaking, these only really work best when in TypeScript files; JavaScript files will often miss
 * many details from a given `Reflect.metadata` key.
 *
 * @example - Print each metadata key's value
 * `@MyClass.printMetadata`
 * class MyClass {
 *     private static printMetadata(...args: Parameters<DecoratorFunctionLegacy>): ReturnType<DecoratorFunctionLegacy>;
 *     private static printMetadata(target: object, key?: string, propertyDescriptor?: PropertyDescriptor) {
 *         console.log('metadata:', { // or `arguments?.callee` to get the function name
 *             target,
 *             key,
 *             propertyDescriptor,
 *             designType: Reflect.getMetadata(DecoratorMetadataKeys.Type, target, key ?? ''),
 *             designParamTypes: Reflect.getMetadata(DecoratorMetadataKeys.ParamTypes, target, key ?? ''),
 *             designReturnType: Reflect.getMetadata(DecoratorMetadataKeys.ReturnType, target, key ?? ''),
 *         });
 *     }
 *
 *     `@MyClass.printMetadata`
 *     x: string = 'hi';
 *
 *     // @MyClass.printMetadata // Not valid due to "real" private variable (`private` is still accessible, `#` is not)
 *     static #printVars(name: string, varObj: Record<string, any>) {
 *         console.log(name, varObj);
 *     }
 *
 *     `@MyClass.printMetadata`
 *     sayHi(a: string, b: string, c: number) {
 *         // console.log('args.callee', arguments.callee);
 *         MyClass.#printVars('sayHi', {
 *             a,
 *             b,
 *             c,
 *             x: this.x,
 *         });
 *         this.x += a + b + `${c}`;
 *     }
 * }
 * const myClass = new MyClass();
 * myClass.sayHi('A', 'B', 7);
 *
 * @see [`reflect-metadata` in action blog]{@link http://blog.wolksoftware.com/decorators-metadata-reflection-in-typescript-from-novice-to-expert-part-4}
 * @see [TypeScript decorator docs]{@link https://www.typescriptlang.org/docs/handbook/decorators.html#metadata}
 */
export const DecoratorMetadataKeys = {
    Type: 'design:type',
    ParamTypes: 'design:paramtypes',
    ReturnType: 'design:returntype',
};


/**
 * Generic type-definition of a non-arg decorator.
 */
function decoratorWithoutArgs(...params: Parameters<Decorator>) {
    logArgs({
        target: params[0],
        propertyName: params[1],
        propertyDescriptor: params[2],
    });
}

/**
 * Generic type-definition of an arg-dependent decorator.
 */
function decoratorWithArgs(...decoratorArgs: any[]) {
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
    const getArrayToPrint = (obj: Record<string, unknown>) => Object
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
