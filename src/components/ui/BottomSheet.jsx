import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Accessible Bottom Sheet component.
 * - Mobile / Tablet drawer sliding up from the bottom (max-height 90dvh).
 * - Traps focus while open and returns focus on close.
 * - Dismisses on Escape, backdrop click, or close button.
 * - Pushes history entry so browser Back button closes the sheet first.
 * - Handles visualViewport resize (virtual keyboard on iOS/Android).
 * - Respects prefers-reduced-motion.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {React.ReactNode} props.children
 * @param {React.RefObject} [props.triggerRef] Element to return focus to upon closing
 */
export default function BottomSheet({
    isOpen,
    onClose,
    title,
    children,
    triggerRef,
}) {
    const { isDark } = useTheme();
    const sheetRef = useRef(null);
    const closeBtnRef = useRef(null);
    const pushedStateRef = useRef(false);
    const [viewportHeight, setViewportHeight] = useState('90dvh');

    useBodyScrollLock(isOpen);

    // Browser Back button integration via history pushState
    useEffect(() => {
        if (!isOpen) return;

        // Push state for back button navigation
        window.history.pushState({ modalSheet: true }, '');
        pushedStateRef.current = true;

        const handlePopState = () => {
            pushedStateRef.current = false;
            onClose();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (pushedStateRef.current) {
                pushedStateRef.current = false;
                window.history.back();
            }
        };
    }, [isOpen, onClose]);

    // Handle visualViewport for mobile on-screen keyboards
    useEffect(() => {
        if (!isOpen || typeof window === 'undefined' || !window.visualViewport) return;

        const handleViewportResize = () => {
            if (window.visualViewport) {
                const height = window.visualViewport.height;
                setViewportHeight(`${Math.min(height * 0.92, window.innerHeight * 0.9)}px`);
            }
        };

        window.visualViewport.addEventListener('resize', handleViewportResize);
        window.visualViewport.addEventListener('scroll', handleViewportResize);
        handleViewportResize();

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportResize);
                window.visualViewport.removeEventListener('scroll', handleViewportResize);
            }
        };
    }, [isOpen]);

    // Focus trap and Escape key handling
    useEffect(() => {
        if (!isOpen) return;

        const previouslyFocused = triggerRef?.current || document.activeElement;

        // Auto focus first focusable input or close button
        const timer = setTimeout(() => {
            if (sheetRef.current) {
                const focusable = sheetRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length > 0) {
                    focusable[0].focus();
                } else if (closeBtnRef.current) {
                    closeBtnRef.current.focus();
                }
            }
        }, 50);

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }

            if (e.key === 'Tab' && sheetRef.current) {
                const focusable = sheetRef.current.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length === 0) return;

                const firstEl = focusable[0];
                const lastEl = focusable[focusable.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstEl) {
                        e.preventDefault();
                        lastEl.focus();
                    }
                } else {
                    if (document.activeElement === lastEl) {
                        e.preventDefault();
                        firstEl.focus();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown);
            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus();
            }
        };
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity motion-reduce:transition-none"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
            role="presentation"
        >
            <div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="bottom-sheet-title"
                style={{ maxHeight: viewportHeight }}
                className={`w-full max-w-2xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border-t ${
                    isDark
                        ? 'bg-zinc-900 border-zinc-700/80 text-zinc-100'
                        : 'bg-white border-zinc-200 text-zinc-900'
                } animate-in slide-in-from-bottom duration-250 motion-reduce:animate-none`}
            >
                {/* Drag Handle Indicator */}
                <div className="pt-3 pb-1 flex justify-center cursor-grab">
                    <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                </div>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-3 border-b ${
                    isDark ? 'border-zinc-800' : 'border-zinc-100'
                }`}>
                    <h2 id="bottom-sheet-title" className="text-lg font-bold tracking-tight">
                        {title}
                    </h2>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close sheet"
                        className={`p-2 rounded-xl transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center ${
                            isDark
                                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                        }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content with internal scroll */}
                <div className="flex-1 overflow-y-auto px-6 py-4 pb-8 space-y-4">
                    {children}
                </div>
            </div>
        </div>
    );
}

