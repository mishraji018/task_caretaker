import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ConfirmDialog({
    isOpen,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    isDestructive = true,
}) {
    const { isDark } = useTheme();
    const cancelButtonRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        // Autofocus cancel button first for safety against accidental deletion
        setTimeout(() => {
            cancelButtonRef.current?.focus();
        }, 50);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            onClick={onCancel}
        >
            <div
                className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-all ${isDark
                        ? 'bg-gray-800 border-gray-700 text-gray-100'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div
                        className={`p-3 rounded-xl flex-shrink-0 ${isDestructive
                                ? isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                                : isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                            }`}
                    >
                        <AlertTriangle className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                        <h3 id="confirm-dialog-title" className="text-lg font-semibold mb-1">
                            {title}
                        </h3>
                        <p id="confirm-dialog-message" className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {message}
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        onClick={onCancel}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark
                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

