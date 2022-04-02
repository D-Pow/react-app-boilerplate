/**
 * Type declaration for SVGs. It's loaded by Webpack using [@svgr/webpack]{@link https://www.npmjs.com/package/@svgr/webpack},
 * which converts SVG files to React components.
 *
 * Note: The imports must be within the module declaration in order to make it global automatically.
 * Otherwise, if there is a top-level import/export, then this file would become a module itself, and would have to be
 * imported by the calling parent.
 * Furthermore, this means we must use `<reference>` to apply the types, either in the calling parent (local import) or
 * in a commonly-referenced file lik index.ts (global import).
 * See the [TS docs on `<reference>` and `.d.ts` vs `.ts`]{@link https://www.typescriptlang.org/docs/handbook/namespaces-and-modules.html#-reference-ing-a-module}
 * for more details.
 */
declare module '*.svg' {
    import type { SVGAttributes } from 'react';

    import type { ReactComponent } from '@/types';

    export const SvgUrl: string;
    export const ReactComponent: (
        ReactComponent<SVGAttributes<SVGElement | SVGSVGElement>>
        & {
            // Additional properties added by SVGR
            title?: string;
        }
    );

    export {
        SvgUrl as default,
    };
}

declare module '*.svg?url' {
    const SvgUrl: string;

    export default SvgUrl;
}
