import { useState, useCallback, useMemo } from 'react';
import { ToastContext } from '../../contexts/ToastContext';
import Toast from './Toast';

/**
 * Toast Notification Provider.
 * Enforces max 3 visible toasts (FIFO eviction).
 * Renders an accessible aria-live region above mobile dock / bottom-right on desktop.
 */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = useCallback(
        ({ message, type = 'info', actionLabel, onAction, duration = 6000 }) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const newToast = { id, message, type, actionLabel, onAction, duration };

            setToasts((prev) => {
                // Keep max 2 existing so adding 1 makes max 3
                const sliced = prev.length >= 3 ? prev.slice(prev.length - 2) : prev;
                return [...sliced, newToast];
            });

            return id;
        },
        []
    );

    const contextValue = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

    return (
        <ToastContext.Provider value={contextValue}>
            {children}

            {/* Toast Container - Polite live region */}
            <div
                aria-live="polite"
                aria-atomic="false"
                className="fixed z-50 pointer-events-none flex flex-col gap-2.5 items-center sm:items-end bottom-22 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6"
            >
                {toasts.map((item) => (
                    <Toast key={item.id} toast={item} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export default ToastProvider;
