import { useState, useEffect, useRef } from 'react';

/**
 * Mobile touch-only swipe gesture hook for task rows.
 * Swipe Right = Complete (Green check)
 * Swipe Left = Delete (Red trash)
 *
 * Strictly ignores vertical scrolling, mouse dragging, and interactive children (buttons/checkboxes).
 * Suppresses trailing click on swipe to prevent accidental modal openings.
 *
 * @param {import('react').RefObject<HTMLElement | null>} elementRef
 * @param {object} options
 * @param {() => void} [options.onSwipeLeft]
 * @param {() => void} [options.onSwipeRight]
 * @param {number} [options.threshold=80]
 * @param {boolean} [options.enabled=true]
 * @returns {{
 *   translateX: number,
 *   isSwiping: boolean,
 *   direction: 'left' | 'right' | null
 * }}
 */
export function useSwipe(elementRef, { onSwipeLeft, onSwipeRight, threshold = 80, enabled = true }) {
    const [translateX, setTranslateX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [direction, setDirection] = useState(null);

    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const isSwipingRef = useRef(false);
    const directionRef = useRef(null);
    const isLockedRef = useRef(false); // Locked to vertical scrolling
    const justSwipedRef = useRef(false);

    useEffect(() => {
        const el = elementRef.current;
        if (!el || !enabled) return;

        // Ensure touch-action allows vertical scrolling natively
        el.style.touchAction = 'pan-y';

        function handlePointerDown(e) {
            // Touch only; mouse dragging does nothing
            if (e.pointerType !== 'touch') return;

            // Do not initiate swipe if touching an interactive element
            const target = e.target;
            if (
                target.closest('button') ||
                target.closest('input') ||
                target.closest('textarea') ||
                target.closest('select') ||
                target.closest('a')
            ) {
                return;
            }

            startXRef.current = e.clientX;
            startYRef.current = e.clientY;
            isSwipingRef.current = false;
            directionRef.current = null;
            isLockedRef.current = false;

            window.addEventListener('pointermove', handlePointerMove, { passive: false });
            window.addEventListener('pointerup', handlePointerUp);
            window.addEventListener('pointercancel', handlePointerCancel);
        }

        function handlePointerMove(e) {
            if (e.pointerType !== 'touch' || isLockedRef.current) return;

            const dx = e.clientX - startXRef.current;
            const dy = e.clientY - startYRef.current;

            // Determine gesture intent
            if (!isSwipingRef.current) {
                if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
                    // Vertical scrolling wins - abort horizontal swipe
                    isLockedRef.current = true;
                    return;
                }
                if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
                    isSwipingRef.current = true;
                    setIsSwiping(true);
                }
            }

            if (isSwipingRef.current) {
                // Prevent vertical scroll interference while actively swiping
                if (e.cancelable) {
                    e.preventDefault();
                }

                // Apply slight logarithmic damping past threshold
                const clampedDx =
                    Math.abs(dx) > threshold
                        ? Math.sign(dx) * (threshold + (Math.abs(dx) - threshold) * 0.4)
                        : dx;

                const dir = dx > 0 ? 'right' : 'left';
                directionRef.current = dir;
                setDirection(dir);
                setTranslateX(clampedDx);
            }
        }

        function handlePointerUp(e) {
            cleanupListeners();

            if (isSwipingRef.current) {
                const dx = e.clientX - startXRef.current;
                if (dx > threshold && typeof onSwipeRight === 'function') {
                    justSwipedRef.current = true;
                    onSwipeRight();
                } else if (dx < -threshold && typeof onSwipeLeft === 'function') {
                    justSwipedRef.current = true;
                    onSwipeLeft();
                }

                // Suppress following click event
                setTimeout(() => {
                    justSwipedRef.current = false;
                }, 300);
            }

            isSwipingRef.current = false;
            setIsSwiping(false);
            setDirection(null);
            setTranslateX(0);
        }

        function handlePointerCancel() {
            cleanupListeners();
            isSwipingRef.current = false;
            setIsSwiping(false);
            setDirection(null);
            setTranslateX(0);
        }

        function cleanupListeners() {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerCancel);
        }

        function handleClickCapture(e) {
            if (justSwipedRef.current) {
                e.stopPropagation();
                e.preventDefault();
            }
        }

        el.addEventListener('pointerdown', handlePointerDown);
        el.addEventListener('click', handleClickCapture, true);

        return () => {
            el.removeEventListener('pointerdown', handlePointerDown);
            el.removeEventListener('click', handleClickCapture, true);
            cleanupListeners();
        };
    }, [elementRef, enabled, onSwipeLeft, onSwipeRight, threshold]);

    return {
        translateX,
        isSwiping,
        direction,
    };
}

export default useSwipe;
