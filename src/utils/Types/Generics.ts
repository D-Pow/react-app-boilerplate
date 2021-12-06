/**
 * Utility types for TypeScript that aren't included natively.
 *
 * Some common mapping modifiers include:
 *  - `?` = Make properties optional.
 *  - `readonly` = Make properties immutable.
 *  - `-` = Remove specified modifier (e.g. `-readonly` or `-?`).
 *
 * Note about `Record`:
 * - Record<string, never> == {}
 * - Record<string, undefined> == { [optional keys]: undefined }
 * - Record<string, any> == { [optional keys]: any }
 *
 * @see [Utility types]{@link https://www.typescriptlang.org/docs/handbook/utility-types.html}
 * @see [Generic types]{@link https://www.typescriptlang.org/docs/handbook/2/generics.html}
 * @see [Mapping types]{@link https://www.typescriptlang.org/docs/handbook/2/mapped-types.html}
 * @see [Modifying modifiers while mapping types]{@link https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#mapping-modifiers}
 * @see [Conditional types and `infer`]{@link https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types}
 * @see [Getting type from another declared generic-type variable]{@link https://stackoverflow.com/questions/18215899/get-type-of-generic-parameter/62733441#62733441}
 * @see [Example `IF` conditional type]{@link https://stackoverflow.com/questions/65659576/how-to-define-a-conditional-return-type-based-on-if-an-object-property-is-set-in/65661015#65661015}
 * @see [`infer`]{@link https://stackoverflow.com/questions/60067100/why-is-the-infer-keyword-needed-in-typescript}
 *
 * @file
 */


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
 * Makes all top-level keys optional.
 */
export type OptionalKeys<O, K extends keyof O> = Partial<Pick<O, K>> & Omit<O, K>


/**
 * Companion to built-in `keyof` except for getting all value types of an Object
 * instead of keys.
 *
 * @see [`ValueOf` example]{@link https://stackoverflow.com/questions/49285864/is-there-a-valueof-similar-to-keyof-in-typescript/49286056#49286056}
 */
export type ValueOf<O, K extends keyof O> = O[K];


/**
 * Companion to built-in `Omit` except for omitting all value types of an Object
 * instead of keys.
 */
export type OmitValues<O, V> = {
    [ K in keyof O ]: Exclude<ValueOf<O, K>, V>;
};


/**
 * Companion to built-in `Partial` except that it makes each nested property optional
 * as well.
 *
 * Each non-object/leaf value will be either:
 * - If `T` is left out, then the type it was remains.
 * - The specified `T` type.
 */
export type PartialDeep<O, T = never> = {
    // `?:` makes the key optional. Record<string, any> == Object
    [K in keyof O]?: O[K] extends Record<string, any>
        ? Nullable<PartialDeep<O[K]>>
        : T extends never
            ? Nullable<O[K]>
            : Nullable<T>
};


/**
 * Overwrites a type or interface, `T`, with all the keys/values from the type or
 * interface, `NT`, resulting in the intersection of the two objects.
 *
 * @example Change field types.
 * interface OrigType { a: object, b: string };
 * interface ModifiedType extends Modify<OrigType, { b: boolean }> {}
 * type ResultingModifiedType = { a: object, b: boolean }
 * @example Add new fields.
 * interface OrigType { a: object, b: string };
 * interface ModifiedType extends Modify<OrigType, { c: boolean }> {}
 * type ResultingModifiedType = { a: object, b: string, c: boolean }
 * @example Modify nested fields (deletes unspecified keys).
 * type OrigType = { a: string, b: { c: number } };
 * interface ModifiedType extends Modify<OrigType, { b: { d: string, e: number } }> {}
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
 * interface ModifiedType extends Modify<OrigType, { b: boolean }> {}
 * type ResultingModifiedType = { a: object, b: boolean }
 * @example Add new fields.
 * interface OrigType { a: object, b: string };
 * interface ModifiedType extends Modify<OrigType, { c: boolean }> {}
 * type ResultingModifiedType = { a: object, b: string, c: boolean }
 * @example Modify nested fields (keeps unspecified keys).
 * type OrigType = { a: string, b: { c: number } };
 * interface ModifiedType extends Modify<OrigType, { b: { d: string, e: number } }> {}
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
