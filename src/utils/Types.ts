/**
 * Utility types for TypeScript that aren't included natively.
 *
 * Some common mapping modifiers include:
 *  - `?` = Make properties optional.
 *  - `readonly` = Make properties immutable.
 *  - `-` = Remove specified modifier (e.g. `-readonly` or `-?`).
 *
 * @see [Utility types]{@link https://www.typescriptlang.org/docs/handbook/utility-types.html}
 * @see [Generic types]{@link https://www.typescriptlang.org/docs/handbook/2/generics.html}
 * @see [Mapping types]{@link https://www.typescriptlang.org/docs/handbook/2/mapped-types.html}
 * @see [Modifying modifiers while mapping types]{@link https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#mapping-modifiers}
 * @see [Conditional types and `infer`]{@link https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types}
 * @see [Getting type from another declared generic-type variable]{@link https://stackoverflow.com/questions/18215899/get-type-of-generic-parameter/62733441#62733441}
 * @see [Example `IF` conditional type]{@link https://stackoverflow.com/questions/65659576/how-to-define-a-conditional-return-type-based-on-if-an-object-property-is-set-in/65661015#65661015}
 * @see [`infer`]{@link https://stackoverflow.com/questions/60067100/why-is-the-infer-keyword-needed-in-typescript}
 * @file
 */

import type { InferProps as PropTypesInferProps } from 'prop-types';


export * from '@/utils/Decorators';

/**
 * Opposite of built-in `NonNullable`.
 */
export type Nullable<T> = T | null | undefined;

/**
 * Same as Nullable except without `null`.
 */
export type Optional<T> = T | undefined;

/**
 * Companion to built-in `Partial` except that it makes each nested property optional
 * as well.
 *
 * Each non-object/leaf value will be either:
 * - If `T` is left out, then the type it was remains.
 * - The specified `T` type.
 */
type PartialDeep<O, T = never> = {
    // `?:` makes the key optional
    [K in keyof O]?: O[K] extends Record<string, any>
        ? PartialDeep<O[K]>
        : T extends never
            ? O[K]
            : T
}

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

/**
 * Extracts types of JSX component props defined using PropTypes.
 *
 * `PropTypes.InferProps` has a bug where they inject `null` as a possible type for
 * JSX `propTypes` (e.g. `type | null | undefined`) but non-required types can only
 * be `type | undefined`.
 *
 * This fixes the bug by stripping out the `null` values from the resulting
 * `PropTypes.InferProps` call.
 * Note: It must be done for each key-value pair separately so the pairing is maintained.
 *
 * @see [PropTypes.InferProps bug]{@link https://github.com/DefinitelyTyped/DefinitelyTyped/issues/45094}
 */
export type InferProps<O> = OmitValues<PropTypesInferProps<O>, null>;
