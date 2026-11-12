import { useContext } from 'react';
import { ToastContext } from '../contexts/ToastContext';

/**
 * Custom hook to trigger or dismiss toasts.
 *
 * @returns {{
 *   toast: (options: {
 *     message: string,
 *     type?: 'info' | 'success' | 'error',
 *     actionLabel?: string,
 *     onAction?: () => void,
 *     duration?: number
 *   }) => string,
 *   dismiss: (id: string) => void
 * }}
 */
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        // Fallback no-op to prevent hard crashes if rendered outside ToastProvider
        return {
            toast: () => '',
            dismiss: () => {},
        };
    }
    return context;
}

export default useToast;
