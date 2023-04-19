import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { uuid } from '@/utils/Crypto';


export interface PortalProps {
    wrapperId?: string;
    children: React.ReactNode;
}

/**
 * Moves the render of the passed children to a new <div> element as a direct descendent of <body> rather than
 * as a descendent of where it was originally put in the source code.
 *
 * @param wrapperId - Unique HTML element ID to use for the portal content's parent (default: random UUID).
 * @param children - Children to render within the new <div> portal element.
 *
 * @see [React portal example]{@link https://blog.logrocket.com/build-modal-with-react-portals}
 */
function ReactPortal({
    wrapperId = uuid(),
    children,
}: PortalProps) {
    const wrapperIdRef = useRef(wrapperId);

    const wrapperElem = document.getElementById(wrapperIdRef.current);

    // Unlike `useEffect()`, `useLayoutEffect()` runs before browser repaint, so this is render-blocking code.
    // However, we use it here so the element is created as soon as possible.
    useLayoutEffect(() => {
        if (wrapperElem == null) {
            const newWrapperElem = document.createElement('div');

            newWrapperElem.setAttribute('id', wrapperIdRef.current);

            document.body.appendChild(newWrapperElem);
        }
    }, [ wrapperElem ]);

    if (!wrapperElem) {
        return;
    }

    return createPortal(children, wrapperElem);
}

export default ReactPortal;
