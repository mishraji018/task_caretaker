import { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { Keyboard, X } from 'lucide-react';

/**
 * Keyboard Shortcuts Modal Dialog.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 */
export default function ShortcutsHelp({ isOpen, onClose }) {
    const { isDark } = useTheme();
    const modalRef = useRef(null);
    const closeBtnRef = useRef(null);
    const previousFocusRef = useRef(null);

    useBodyScrollLock(isOpen);

    useEffect(() => {
        if (!isOpen) return;

        previousFocusRef.current = document.activeElement;
        closeBtnRef.current?.focus();

        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }

            // Focus trap
            if (e.key === 'Tab' && modalRef.current) {
                const focusable = modalRef.current.querySelectorAll(
                    'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length === 0) return;

                const firstEl = focusable[0];
                const lastEl = focusable[focusable.length - 1];

                if (e.shiftKey && document.activeElement === firstEl) {
                    e.preventDefault();
                    lastEl.focus();
                } else if (!e.shiftKey && document.activeElement === lastEl) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
                previousFocusRef.current.focus();
            }
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sections = [
        {
            title: 'Global Navigation',
            shortcuts: [
                { keys: ['Ctrl', 'K'], label: 'Open Command Palette' },
                { keys: ['N'], label: 'Create new task' },
                { keys: ['/'], label: 'Focus search bar' },
                { keys: ['?'], label: 'Show this shortcuts reference' },
                { keys: ['Esc'], label: 'Close open dialog or sheet' },
            ],
        },
        {
            title: 'Task List (When row is focused)',
            shortcuts: [
                { keys: ['↑', '↓'], label: 'Navigate between tasks' },
                { keys: ['Space'], label: 'Toggle task complete / active' },
                { keys: ['Enter'], label: 'Open task details' },
                { keys: ['Delete'], label: 'Delete task (with Undo)' },
            ],
        },
        {
            title: 'Touch Gestures (Mobile)',
            shortcuts: [
                { keys: ['Swipe →'], label: 'Complete task (with Undo)' },
                { keys: ['← Swipe'], label: 'Delete task (with Undo)' },
            ],
        },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 motion-reduce:animate-none"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="shortcuts-dialog-title"
                className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
                }`}
            >
                {/* Header */}
                <div
                    className={`flex items-center justify-between px-5 py-4 border-b ${
                        isDark ? 'border-zinc-800' : 'border-zinc-100'
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        <Keyboard className="w-5 h-5 text-indigo-500" aria-hidden="true" />
                        <h2 id="shortcuts-dialog-title" className="text-base font-bold tracking-tight">
                            Keyboard Shortcuts
                        </h2>
                    </div>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close shortcuts modal"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isDark
                                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                        } focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                    {sections.map((sec) => (
                        <div key={sec.title} className="space-y-2.5">
                            <h3
                                className={`text-xs font-semibold uppercase tracking-wider ${
                                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                                }`}
                            >
                                {sec.title}
                            </h3>
                            <div className="space-y-2">
                                {sec.shortcuts.map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex items-center justify-between text-xs sm:text-sm py-1"
                                    >
                                        <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                                            {item.label}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {item.keys.map((k) => (
                                                <kbd
                                                    key={k}
                                                    className={`px-2 py-0.5 rounded font-mono text-xs font-bold border shadow-xs ${
                                                        isDark
                                                            ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                            : 'bg-zinc-100 border-zinc-300 text-zinc-800'
                                                    }`}
                                                >
                                                    {k}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div
                    className={`px-5 py-3 border-t text-center text-xs ${
                        isDark ? 'border-zinc-800 text-zinc-500 bg-zinc-950/40' : 'border-zinc-100 text-zinc-400 bg-zinc-50'
                    }`}
                >
                    Press <kbd className="font-mono font-bold">Esc</kbd> anytime to close
                </div>
            </div>
        </div>
    );
}
