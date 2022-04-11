import type TS from 'typescript';


/**
 * tsconfig.json definitions.
 *
 * @see [tsconfig docs]{@link https://www.typescriptlang.org/tsconfig}
 * @see [tsconfig schema]{@link https://json.schemastore.org/tsconfig}
 * @see [JSDoc - using JSON schemas]{@link https://github.com/jsdoc/jsdoc/blob/main/packages/jsdoc/lib/jsdoc/schema.js}
 * @see [`type-fest` tsconfig definition (incomplete)]{@link import('type-fest').TsConfigJson}
 */
export declare interface TsConfig {
    extends?: string | false;
    compilerOptions?: TS.CompilerOptions;
    files?: string[] | false;
    include?: string[] | '**';
    exclude?: string[];
    references?: Array<{ path: string; }> | false;
    compileOnSave?: boolean;
    watchOptions?: TS.WatchOptions;
    typeAcquisition?: TS.TypeAcquisition;
}


/**
 * All TypeScript built-ins.
 *
 * Note: `TS` is a namespace, and namespaces can't extend other namespaces. This means things like below don't work:
 * - import TypeScript from 'typescript'; declare (or export) namespace TypeScript {}
 * - export type TypeScript = typeof TS;
 * - declare module TypeScript { export import TypeScript = TS; }
 * - declare type TypeScript = typeof TS; (technically works, but no IDE autocompletion)
 * - declare type TypeScript = typeof import('typescript');
 *
 * Thus, declare a global variable, `TypeScript`, to encapsulate all the types in `typescript`.
 *
 * @see [GitHub issue on re-exporting namespaces]{@link https://github.com/microsoft/TypeScript/issues/4529#issuecomment-281028204}
 * @see [StackOverflow discussion regarding `Cannot use namespace as a type` error]{@link https://stackoverflow.com/questions/53853815/how-to-fix-cannot-use-namespace-as-a-type-ts2709-in-typescript}
 */
export declare const TypeScript: typeof TS;
