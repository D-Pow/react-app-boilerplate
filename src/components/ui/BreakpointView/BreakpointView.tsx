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
    const {
        windowSizeState: {
            wasResized,
            widthIgnoringScrollbar: windowWidth,
        },
        resetWasResized,
    } = useWindowResize();

    useEffect(() => {
        if (wasResized) {
            resetWasResized();
        }
    }, [ wasResized, resetWasResized ]);

    if (windowWidth < minWidth || windowWidth > maxWidth) {
        return null;
    }

    return (
        <>
            {children}
        </>
    );
}
