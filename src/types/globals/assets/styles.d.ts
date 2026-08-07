/**
 * css-loader v7 defaults `modules.namedExport` to the value of `esModule` (i.e. `true`),
 * so stylesheets emit *named* exports (`export var homeWrappingIcon = '...'`) rather than
 * a default export. `export =` is what allows `import * as styles from './X.module.scss'`
 * to resolve `styles.someClassName` instead of only `styles.default`.
 *
 * Values are always strings: CSS-Modules class names are hashed strings, and `:export`
 * block values are strings that must be parsed by hand (see `parseScssVar()` in `@/utils/Scss`).
 *
 * Caveat: the index signature means a typo in the class name type-checks as `string` instead of
 * erroring. That's inherent to wildcard module declarations - the only way around it is
 * generating a `.d.ts` per stylesheet (e.g. `typed-scss-modules`).
 */

declare module '*.css' {
    const contents: Record<string, any>;
    export = contents;
}

declare module '*.scss' {
    const contents: Record<string, any>;
    export = contents;
}
