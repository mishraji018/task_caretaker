import { useEffect, useRef } from 'react';

/**
 * Locks document.body scroll while locked is true.
 * Preserves the previous overflow and paddingRight to prevent layout shifts.
 * Always restores original state on unmount or when unlocked.
 *
 * @param {boolean} locked
 */
export function useBodyScrollLock(locked = true) {
    const originalStyles = useRef(null);

    useEffect(() => {
        if (!locked || typeof document === 'undefined') return;

        // Store original styles on first lock
        if (!originalStyles.current) {
            originalStyles.current = {
                overflow: document.body.style.overflow,
                paddingRight: document.body.style.paddingRight,
            };
        }

        // Compensate for scrollbar disappearance if any
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollBarWidth > 0) {
            document.body.style.paddingRight = `${scrollBarWidth}px`;
        }

        document.body.style.overflow = 'hidden';

        return () => {
            if (originalStyles.current) {
                document.body.style.overflow = originalStyles.current.overflow;
                document.body.style.paddingRight = originalStyles.current.paddingRight;
                originalStyles.current = null;
            }
        };
    }, [locked]);
}

export default useBodyScrollLock;
