/**
 * Utility types for TypeScript that aren't included natively.
 *
 * Some common mapping modifiers include:
 *  - `?` = Make properties optional.
 *  - `readonly` = Make properties immutable.
 *  - `-` = Remove specified modifier (e.g. `-readonly` or `-?`).
 *
 * [`any` vs `unknown`]{@link https://www.typescriptlang.org/docs/handbook/type-compatibility.html#any-unknown-object-void-undefined-null-and-never-assignability}:
 * - It's typically better when writing generic types to favor `unknown` over `any`.
 * - `unknown` is more typesafe than `any` because it forces the uses/extensions of
 *    the type to specify an actual type (e.g. [function example]{@link https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown}).
 * - `any` lets anything go, so there is little-to-no type safety when writing generics.
 *
 * [Notes about `Record`]{@link https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type}:
 * - Record<string, never> == {}
 * - Record<string, undefined> == { [optional keys]: undefined }
 * - Record<string, any> == { [optional keys]: any }
 *
 * @see [Utility types]{@link https://www.typescriptlang.org/docs/handbook/utility-types.html}
 * @see [Generic types]{@link https://www.typescriptlang.org/docs/handbook/2/generics.html}
 * @see [Mapping types]{@link https://www.typescriptlang.org/docs/handbook/2/mapped-types.html}
 * @see [Catch-all types (any, void, never, etc.)]{@link https://www.typescriptlang.org/docs/handbook/type-compatibility.html#any-unknown-object-void-undefined-null-and-never-assignability}
 * @see [Modifying modifiers while mapping types]{@link https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#mapping-modifiers}
 * @see [Conditional types and `infer`]{@link https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types}
 * @see [Conditional types and `infer` release notes]{@link https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#type-inference-in-conditional-types}
 * @see [Getting type from another declared generic-type variable]{@link https://stackoverflow.com/questions/18215899/get-type-of-generic-parameter/62733441#62733441}
 * @see [Example `IF` conditional type]{@link https://stackoverflow.com/questions/65659576/how-to-define-a-conditional-return-type-based-on-if-an-object-property-is-set-in/65661015#65661015}
 * @see [`infer`]{@link https://stackoverflow.com/questions/60067100/why-is-the-infer-keyword-needed-in-typescript}
 *
 * @file
 */


/**
 * Valid JSON primitive types.
 */
export type JsonPrimitive = (
    string
    | number
    | boolean
    | null
    | Array<JsonPrimitive>
    | { [key: string]: JsonPrimitive }
);


/**
 * Gets all keys from a type, excluding those of the specified parent, `P`.
 *
 * Valid key types are:
 * - Objects: strings, symbols.
 * - Arrays: numbers, strings, symbols.
 *
 * By default, this excludes all the built-in keys from `Object` and `Array` so that
 * only the keys of the specified type are considered.
 *
 * @see [StackOverflow post about excluding inherited keys]{@link https://stackoverflow.com/questions/44130410/typescript-keyof-and-indexer-compatibility/44130727#44130727}
 */
export type OwnKeys<T, P = Array<T> | Object> = {
    /*
     * Note: We can't use `[key: string | number | symbol]: T[K]` here because that would force
     * all keys to have to be of one type rather than allowing mixing of all three.
     *
     * For example, if `T` is an array, then ignore the built-in functions when omitting type `V` from entries.
     * This results in filtering the "plain" array (without built-ins).
     * They could be added back in with `& Array<T>`.
     * As such, that would make use of the default, interface-based logic by casting arrays to
     * an object for filtering, then back to an array for usability.
     */
    [K in keyof T as K extends (string | number | symbol)
        ? K
        : never
    ]: T[K];
} & Omit<T, keyof P>;


/**
 * Same as Nullable except without `null`.
 */
export type Optional<T> = T | undefined;


/**
 * Opposite of built-in `NonNullable`.
 */
export type Nullable<T, OnlyNull = false> = OnlyNull extends false
    ? Optional<T> | null
    : T | null;


/**
 * Companion to built-in `keyof` except gets all value types of an Object
 * instead of keys.
 *
 * @see [`ValueOf` example]{@link https://stackoverflow.com/questions/49285864/is-there-a-valueof-similar-to-keyof-in-typescript/49286056#49286056}
 */
export type ValueOf<O, K extends keyof O = keyof O> = O[K];

/**
 * Companion to built-in `Omit` except for omitting all value types of an Object
 * instead of keys.
 *
 * If the result after omitting the specified value is null or undefined,
 * then the key is removed as well.
 *
 * @see [Filtering out keys if they extend a type]{@link https://stackoverflow.com/questions/49397567/how-to-remove-properties-via-mapped-type-in-typescript/63990350#63990350}
 */
export type OmitValues<T, V = never> = {
    [K in keyof T as Exclude<T[K], V> extends
        never | null | undefined
            ? never
            : K
    ]: Exclude<T[K], V>;
};


/**
 * Companion to built-in `Pick` except for picking all keys containing the specified value
 * types instead of keys, maintaining if keys were optional or required.
 *
 * If the result after picking the specified value is null, undefined, or never,
 * then the key is removed as well.
 *
 * @see [Filtering out keys if they extend a type]{@link https://stackoverflow.com/questions/49397567/how-to-remove-properties-via-mapped-type-in-typescript/63990350#63990350}
 */
export type PickValues<T, V> = {
    [K in keyof T as Extract<T[K], V> extends
        never | null | undefined
            ? never
            : K
    ]: Extract<T[K], V>;
};


/**
 * Picks only the optional properties from a type, removing the required ones.
 * Optionally, recurses through nested objects if `DEEP` is true.
 */
export type PickOptional<T, DEEP extends boolean = false> = { // `DEEP` must be false b/c `never` interferes with root level objects with both optional/required properties
    // If `undefined` extends the type of the value, it's optional (e.g. `undefined extends string | undefined`)
    [K in keyof T as undefined extends T[K]
        ? K
        : never
    ]: DEEP extends false
        ? T[K]
        : T[K] extends Optional<Record<string, unknown>> // Like above, we must include `undefined` so we can recurse through both keys in `{ o?: object, ro: object }`
            ? PickOptional<T[K], DEEP>
            : T[K];
};


/**
 * Picks only the required fields out of a type, removing the optional ones.
 * Optionally, recurses through nested objects if `DEEP` is true.
 */
export type PickRequired<T, DEEP extends boolean = false> = {
    [K in keyof T as K extends keyof PickOptional<T, DEEP>
        ? never
        : K
    ]: T[K] extends Record<string, unknown>
        ? PickRequired<T[K], DEEP>
        : T[K];
};


/**
 * Companion to built-in `Partial` except that it makes each nested property optional
 * as well.
 *
 * Each non-object key's value will be either:
 * - If `NT` (NewType) is left out, then the original type from `T` remains.
 * - The specified `NT` type.
 */
export type PartialDeep<T, NT = never> = {
    // `?:` makes the key optional. Record<string, any> == Object
    [K in keyof T]?: T[K] extends Record<string, any>
        ? Nullable<PartialDeep<T[K], NT>>
        : NT extends never
            ? Nullable<T[K]>
            : Nullable<NT>
};


/**
 * Converts an arrays entries to a Union type (i.e. `(Val1 | Val2 | ...)`.).
 *
 * @see [Inspiration]{@link https://stackoverflow.com/questions/45251664/typescript-derive-union-type-from-tuple-array-values}
 */
export type UnionArrayEntries<Arr extends Array<unknown>> = Arr[number];



/*****
 * Helpful type utils and shortcuts for boolean logic.
 *
 * @see [Inspiration: Lack of and/or/not expressions in TS]{@link https://github.com/microsoft/TypeScript/issues/31579}
 *****/


/**
 * Negates a boolean type expression.
 *
 * Optionally, define the true/false return types instead of `true`/`false`.
 */
export type Not<BoolCheck, TrueReturn = true, FalseReturn = false> =
    BoolCheck extends TrueReturn | true
        ? FalseReturn
        : TrueReturn;


/**
 * Ensures all boolean type expressions in the specified tuple are true.
 *
 * Optionally, define the true/false return types instead of `true`/`false`.
 */
export type And<BoolChecks, TrueReturn = true, FalseReturn = false> =
    // Accept arrays of both booleans and the parent-specified return type
    BoolChecks extends Array<TrueReturn> | Array<true>
        ? TrueReturn
        : FalseReturn;


/**
 * Checks if at least one boolean type expression in the specified tuple is true.
 *
 * Optionally, define the true/false return types instead of `true`/`false`.
 */
export type Or<BoolChecks, TrueReturn = true, FalseReturn = false> =
    // Like `And<>`, accept both booleans and desired return types
    BoolChecks extends Array<TrueReturn> | Array<boolean>
        // To execute `Or<>` instead of `And<>`, check if *any* value matches `TrueReturn`, not *all*
        ? TrueReturn extends ValueOf<BoolChecks>
            ? TrueReturn
            : FalseReturn
        : never;


/**
 * Simplifies the check of whether or not type `Child` extends type `Parent`
 * so you don't have to write the ternary statement yourself, dramatically
 * improving the readability of your code by removing multiple nested layers
 * of `extends` clauses.
 *
 * Note: For optional keys in `Child`, you MUST specify `Optional<myType>`, otherwise
 * it will fail because `number extends (number | undefined) === (true | false)`.
 *
 * @example Ensure your array is the correct type.
 * type IsNumberArray<T> = IsA<T, Array<number>>;
 * const numArr = [ 3, 4, 5 ];
 * IsNumberArray<typeof numArr>;  // true
 *
 * @example Check if a type is a valid object/array/anything index type.
 * type IndexSignature = string | number | symbol;
 * const potentialKeys = [ 'a', 7, {} ];
 * type ValidKeyTypes = Extract<(typeof potentialKeys)[number], IndexSignature>;
 * type ValidKeys = Array<ValidKeyTypes>;
 * class MyClass<T extends Array<IndexSignature>> {
 *     [V: IndexSignature]: any;
 *
 *     constructor(...initialKeys: T) {
 *         for (const K of initialKeys) {
 *             this[K] = null;
 *         }
 *     }
 * }
 * const validKeys: ValidKeys = [ 'a', 8 ];
 * new MyClass(...validKeys);
 *
 * @example Simplify inference/type declarations with boolean logic. {@link NumberRestricted}
 *
 *
 * @see [`Infer` docs (old but good examples)]{@link https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-inference-in-conditional-types}
 * @see [`Infer` docs (new but fewer examples)]{@link https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types}
 */
export type IsA<Child, Parent, TrueReturn = true, FalseReturn = false> = Child extends Parent
    ? TrueReturn
    : FalseReturn;



/*****
 * Other helpful typedefs that aren't directly related to TS internals or boolean logic.
 *****/


/**
 * If the key is able to be an index value for objects, arrays, etc.
 */
export type IsIndexSignature<T> = Or<[IsA<T, string>, IsA<T, number>, IsA<T, symbol>]>;


/**
 * Ensures number `N` is restricted to not match any of the specified criteria.
 * Returns `N` if it matches all criteria or `never` if it fails even one.
 *
 * All criteria default to the most permissive; toggle them off by declaring them `false`.
 */
export type NumberRestricted<
    N extends number,
    Options extends {
        positive?: boolean;
        negative?: boolean;
        zero?: boolean;
        decimals?: boolean;
    } = {
        positive: true;
        negative: true;
        zero: true;
        decimals: true;
    }
> = IsA<And<[
    // Filter out generic number types, like Infinity and NaN, so we're only dealing with "real" numbers
    Not<IsA<number, N>>,
    // All criteria must be met - either the flag is true|undefined, or `N` doesn't match the number-type format
    And<[
        Or<[
            IsA<Options['positive'], Optional<true>>,
            Not<And<[
                IsA<Optional<Options['positive']>, Optional<false>>,
                IsA<`${N}`, `${string}`>
            ]>>,
            IsA<`${N}`, '0'>,
            IsA<`${N}`, `-${string}`>,
        ]>,
        Or<[
            IsA<Options['negative'], Optional<true>>,
            Not<And<[
                IsA<Optional<Options['negative']>, Optional<false>>,
                IsA<`${N}`, `-${string}`>,
            ]>>,
        ]>,
        Or<[
            IsA<Options['zero'], Optional<true>>,
            Not<And<[
                IsA<Optional<Options['zero']>, Optional<false>>,
                IsA<N, 0>,
            ]>>,
        ]>,
        Or<[
            IsA<Options['decimals'], Optional<true>>,
            Not<And<[
                IsA<Optional<Options['decimals']>, Optional<false>>,
                IsA<`${N}`, `${string}.${string}`>,
            ]>>,
        ]>,
    ]>
]>, true, N, never>; // If all `And<>` results are true, then return `N`, else `never`


/**
 * Infers the nested type from TypeScript generic types.
 *
 * Doesn't include DOM types.
 *
 * TODO
 *  - Simplify with boolean logic above.
 *  - Find a better way to infer nested generics than to hard-code them like this.
 */
export type InferGenericBuiltin<T, Default = T> =
    T extends Promise<infer I> ? I
    : T extends PromiseLike<infer I> ? I
    : T extends Array<infer I> ? I
    : T extends ArrayLike<infer I> ? I
    : T extends ReadonlyArray<infer I> ? I
    : T extends ConcatArray<infer I> ? I
    : T extends (...args: (infer A)[]) => infer R ? (...args: A[]) => R
    : T extends TypedPropertyDescriptor<infer I> ? I
    : T extends Partial<infer I> ? I
    : T extends Required<infer I> ? I
    : T extends Readonly<infer I> ? I
    : T extends Record<string, infer I> ? I
    : T extends Pick<infer I, infer K> ? I
    : T extends Omit<infer I, infer K> ? I
    : T extends Exclude<infer I, infer K> ? I
    : T extends Extract<infer I, infer K> ? I
    : T extends NonNullable<infer I> ? I
    : T extends Parameters<infer I> ? I
    : T extends ReturnType<infer I> ? I
    : T extends ConstructorParameters<infer I> ? I
    : T extends InstanceType<infer I> ? I
    : T extends ThisType<infer I> ? I
    : T extends ThisParameterType<infer I> ? I
    : T extends OmitThisParameter<infer I> ? I
    : T extends Uppercase<infer I> ? I
    : T extends Lowercase<infer I> ? I
    : T extends Capitalize<infer I> ? I
    : T extends Uncapitalize<infer I> ? I
    : Default;


/**
 * Overwrites a type or interface, `T`, with all the keys/values from the type or
 * interface, `NT`, resulting in the intersection of the two objects.
 *
 * @example Change field types.
 * interface OrigType { a: object, b: string };
 * interface ModifiedType extends ModifyIntersection<OrigType, { b: boolean }> {}
 * type ResultingModifiedType = { a: object, b: boolean }
 * @example Add new fields.
 * interface OrigType { a: object, b: string };
 * interface ModifiedType extends ModifyIntersection<OrigType, { c: boolean }> {}
 * type ResultingModifiedType = { a: object, b: string, c: boolean }
 * @example Modify nested fields (deletes unspecified keys).
 * type OrigType = { a: string, b: { c: number } };
 * interface ModifiedType extends ModifyIntersection<OrigType, { b: { d: string, e: number } }> {}
 * type ResultingModifiedType = { a: string, b: { d: string, e: number }}
 */
export type ModifyIntersection<T, NT> = Omit<T, keyof NT> & NT;


/**
 * Joins the keys/values from the type/interface, `O1`, with all the keys/values from
 * the type/interface, `O2`, resulting in the union of the two objects.
 *
 * Companion to `ModifyIntersection` except that any unspecified keys in
 * `O2` don't result in losing the keys/values from `O1`.
 *
 * @example Change field types.
 * interface OrigType { a: object, b: string };
 * interface ModifiedType extends ModifyUnion<OrigType, { b: boolean }> {}
 * type ResultingModifiedType = { a: object, b: boolean }
 * @example Add new fields.
 * interface OrigType { a: object, b: string };
 * interface ModifiedType extends ModifyUnion<OrigType, { c: boolean }> {}
 * type ResultingModifiedType = { a: object, b: string, c: boolean }
 * @example Modify nested fields (keeps unspecified keys).
 * type OrigType = { a: string, b: { c: number } };
 * interface ModifiedType extends ModifyUnion<OrigType, { b: { d: string, e: number } }> {}
 * type ResultingModifiedType = { a: string, b: { c: number, d: string, e: number }}
 */
export type ModifyUnion<O1 extends Record<string, any>, O2 extends PartialDeep<O1 | any, any>> = {
    [K in keyof O1]: O2[K] extends never
        ? O1[K]
        : O2[K] extends Record<string, any>
            ? ModifyUnion<O1[K], O2[K]>
            : O2[K]
} & (
    O1 extends Record<string, any> ? Omit<O2, keyof O1> : O1
);


/**
 * Infers the type of a variable, recursing through object keys/properties if necessary.
 *
 * Usually not needed, try `typeof` first.
 *
 * @see [`keyof`]{@link https://www.typescriptlang.org/docs/handbook/2/mapped-types.html}
 * @see [Modifying modifiers]{@link https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#mapping-modifiers}
 */
export type InferType<T> = T extends Object
    ? { [ K in keyof T ]: InferType<ValueOf<T, K>> }
    : T;