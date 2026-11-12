import { useEffect } from 'react';

/**
 * Global Keyboard Shortcuts Hook for laptop & tablet environments.
 *
 * Supported keys:
 * - Ctrl/Cmd + K: Open Command Palette (works anywhere)
 * - N: New task (focus input / open add sheet)
 * - /: Focus search input
 * - ?: Open keyboard shortcuts help modal
 * - Esc: Dismiss topmost open sheet/dialog
 *
 * Strictly ignores shortcuts while typing in input/textarea/select or when modifier keys (Ctrl/Alt/Meta) are held.
 * Never overrides browser essentials (Ctrl+C, Ctrl+V, Ctrl+F, Ctrl+R).
 *
 * @param {object} actions
 * @param {() => void} [actions.onNewTask]
 * @param {() => void} [actions.onFocusSearch]
 * @param {() => void} [actions.onOpenCommandPalette]
 * @param {() => void} [actions.onOpenShortcutsHelp]
 * @param {() => void} [actions.onCloseTopModal]
 * @param {boolean} [actions.enabled=true]
 */
export function useHotkeys({
    onNewTask,
    onFocusSearch,
    onOpenCommandPalette,
    onOpenShortcutsHelp,
    onCloseTopModal,
    enabled = true,
}) {
    useEffect(() => {
        if (!enabled) return;

        function handleKeyDown(e) {
            const isInputTarget =
                e.target &&
                (e.target.tagName === 'INPUT' ||
                    e.target.tagName === 'TEXTAREA' ||
                    e.target.tagName === 'SELECT' ||
                    e.target.isContentEditable);

            // 1. Ctrl / Cmd + K: Open Command Palette (Global, even when input has focus)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                onOpenCommandPalette?.();
                return;
            }

            // 2. Escape: Dismiss topmost modal
            if (e.key === 'Escape') {
                if (typeof onCloseTopModal === 'function') {
                    onCloseTopModal();
                }
                return;
            }

            // If user is currently typing in an input or textarea, ignore single-key shortcuts
            if (isInputTarget) {
                return;
            }

            // Ignore if modifier keys are held (preserve native browser shortcuts)
            if (e.ctrlKey || e.altKey || e.metaKey) {
                return;
            }

            // 3. / : Focus search bar
            if (e.key === '/') {
                e.preventDefault();
                onFocusSearch?.();
                return;
            }

            // 4. N or n : New task
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                onNewTask?.();
                return;
            }

            // 5. ? : Shortcuts help modal
            if (e.key === '?') {
                e.preventDefault();
                onOpenShortcutsHelp?.();
                return;
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        onNewTask,
        onFocusSearch,
        onOpenCommandPalette,
        onOpenShortcutsHelp,
        onCloseTopModal,
        enabled,
    ]);
}

export default useHotkeys;
