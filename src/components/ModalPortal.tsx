'use client';

import { useEffect, useSyncExternalStore, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
    children: ReactNode;
    lockScroll?: boolean;
}

const emptySubscribe = () => () => {};

/**
 * Portals dialog overlays to document.body to prevent ancestor transforms,
 * filters, or containing-block traps from breaking position: fixed coordinates.
 * Manages background body scroll locking and restoration cleanly.
 */
export default function ModalPortal({ children, lockScroll = true }: ModalPortalProps) {
    const isClient = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false
    );

    useEffect(() => {
        if (!lockScroll || typeof document === 'undefined') return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [lockScroll]);

    if (!isClient || typeof document === 'undefined') {
        return null;
    }

    return createPortal(children, document.body);
}
