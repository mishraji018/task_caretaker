import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/**
 * Single Toast Notification item with timer pause on hover/focus.
 *
 * @param {object} props
 * @param {{
 *   id: string,
 *   message: string,
 *   type?: 'info' | 'success' | 'error',
 *   actionLabel?: string,
 *   onAction?: () => void,
 *   duration?: number
 * }} props.toast
 * @param {(id: string) => void} props.onDismiss
 */
export default function Toast({ toast, onDismiss }) {
    const { isDark } = useTheme();
    const { id, message, type = 'info', actionLabel, onAction, duration = 6000 } = toast;

    const [isPaused, setIsPaused] = useState(false);
    const remainingTimeRef = useRef(duration);
    const startTimeRef = useRef(Date.now());
    const timerRef = useRef(null);

    // Auto-dismiss timer logic with pause/resume support
    useEffect(() => {
        if (duration <= 0) return;

        if (!isPaused) {
            startTimeRef.current = Date.now();
            timerRef.current = setTimeout(() => {
                onDismiss(id);
            }, remainingTimeRef.current);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [id, duration, isPaused, onDismiss]);

    const handleMouseEnter = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        const elapsed = Date.now() - startTimeRef.current;
        remainingTimeRef.current = Math.max(remainingTimeRef.current - elapsed, 500);
        setIsPaused(true);
    };

    const handleMouseLeave = () => {
        setIsPaused(false);
    };

    const handleFocus = () => {
        handleMouseEnter();
    };

    const handleBlur = (e) => {
        // If focus is still within this toast card, stay paused
        if (e.currentTarget.contains(e.relatedTarget)) return;
        handleMouseLeave();
    };

    const handleActionClick = () => {
        try {
            if (typeof onAction === 'function') {
                onAction();
            }
        } finally {
            onDismiss(id);
        }
    };

    const Icon = type === 'error' ? AlertCircle : type === 'success' ? CheckCircle2 : Info;
    const iconColor =
        type === 'error'
            ? 'text-rose-500'
            : type === 'success'
            ? 'text-emerald-500'
            : 'text-indigo-500';

    return (
        <div
            role={type === 'error' ? 'alert' : 'status'}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`pointer-events-auto flex items-center justify-between gap-3 w-full max-w-sm sm:max-w-md p-3.5 rounded-2xl border shadow-xl transition-all duration-200 motion-reduce:transition-none select-none ${
                isDark
                    ? 'bg-zinc-900/95 border-zinc-800 text-zinc-100 shadow-black/40 backdrop-blur-md'
                    : 'bg-white/95 border-zinc-200 text-zinc-900 shadow-zinc-300/40 backdrop-blur-md'
            }`}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} aria-hidden="true" />
                <span className="text-xs sm:text-sm font-medium leading-snug truncate">
                    {message}
                </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {actionLabel && (
                    <button
                        type="button"
                        onClick={handleActionClick}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                        {actionLabel}
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onDismiss(id)}
                    aria-label="Dismiss notification"
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                        isDark
                            ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                    } focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
