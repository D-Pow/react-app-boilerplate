import {
    useEffect,
    type ReactNode,
} from 'react';

import { useWindowResize } from '@/utils/Hooks';


export interface BreakpointViewProps {
    children?: ReactNode;
    minWidth?: number;
    maxWidth?: number;
}

export default function BreakpointView({
    children = null,
    minWidth = 0,
    maxWidth = Infinity,
}: BreakpointViewProps) {
    const { windowSizeState: { wasResized }, resetWasResized } = useWindowResize();

    useEffect(() => {
        if (wasResized) {
            resetWasResized();
        }
    }, [ wasResized, resetWasResized ]);

    // Use `clientWidth` instead of `innerWidth` to exclude any scrollbar if present.
    // See: https://developer.mozilla.org/en-US/docs/Web/API/Element/clientWidth
    const windowWidth = document.documentElement.clientWidth;

    if (windowWidth < minWidth || windowWidth > maxWidth) {
        return null;
    }

    return (
        <>
            {children}
        </>
    );
}
