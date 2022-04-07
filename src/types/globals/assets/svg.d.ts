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
    import type {
        Ref,
        LegacyRef,
        SVGAttributes,
        PropsWithChildren,
        ForwardRefRenderFunction,
    } from 'react';

    import type { ComponentDeclaration } from '@/types';


    export type ReactSvgElement = SVGElement | SVGSVGElement;
    export type ReactSvgElementProps = (
        SVGAttributes<ReactSvgElement>
        & {
            // Additional properties added by SVGR
            title?: string;
        }
    );
    export type ReactSvgProps = PropsWithChildren<ReactSvgElementProps>;
    export type SvgComponent = ComponentDeclaration<ReactSvgProps>;
    export type SvgReactComponent = (
        SvgComponent
        | ForwardRefRenderFunction<ReactSvgElement, ReactSvgProps>
        | ((props: ReactSvgProps, ref: Ref<ReactSvgElement> & LegacyRef<SVGSVGElement>) => SvgComponent)
    );

    // React component of the SVG, injected by SVGR
    export const ReactComponent: SvgReactComponent;
    // URL of the actual SVG file
    export const SvgUrl: string;
    export {
        SvgUrl as default,
    };
}

declare module '*.svg?url' {
    const SvgUrl: string;

    export default SvgUrl;
}
