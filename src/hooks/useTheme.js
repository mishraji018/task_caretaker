import { useState, useEffect, useCallback } from 'react';
import { THEME_KEY } from '../constants/storageKeys';

/**
 * Reads the initial theme mode safely from localStorage.
 * Falls back to 'system' on any error or invalid value.
 * @returns {'light' | 'dark' | 'system'}
 */
function getStoredThemeMode() {
    try {
        if (typeof window === 'undefined') return 'system';
        const stored = localStorage.getItem(THEME_KEY) || localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            return stored;
        }
    } catch {
        // Fall back safely on quota or storage access error
    }
    return 'system';
}

/**
 * Checks system dark preference.
 * @returns {boolean}
 */
function getSystemIsDark() {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true; // Default fallback
}

/**
 * Updates DOM root classes, CSS colorScheme, and meta theme-color tag.
 * @param {'dark' | 'light'} theme
 */
function applyThemeToDOM(theme) {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
    } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
    }

    // Update or create <meta name="theme-color">
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#09090b' : '#ffffff');
}

/**
 * Custom hook providing 3-mode theme management: 'light' | 'dark' | 'system'.
 * - Synchronizes with OS preference when in 'system' mode.
 * - Updates DOM and localStorage reliably without flash.
 *
 * @returns {{
 *   mode: 'light' | 'dark' | 'system',
 *   resolvedTheme: 'light' | 'dark',
 *   isDark: boolean,
 *   setMode: (mode: 'light' | 'dark' | 'system') => void,
 *   toggleTheme: () => void
 * }}
 */
export function useTheme() {
    const [mode, setModeState] = useState(getStoredThemeMode);
    const [systemDark, setSystemDark] = useState(getSystemIsDark);

    // Compute active resolved theme: 'light' or 'dark'
    const resolvedTheme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
    const isDark = resolvedTheme === 'dark';

    // Apply theme to DOM whenever resolvedTheme changes
    useEffect(() => {
        applyThemeToDOM(resolvedTheme);
    }, [resolvedTheme]);

    // Listen to live OS system preference changes
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            setSystemDark(e.matches);
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, []);

    // Change theme mode and persist to storage
    const setMode = useCallback((nextMode) => {
        if (!['light', 'dark', 'system'].includes(nextMode)) return;

        setModeState(nextMode);
        try {
            localStorage.setItem(THEME_KEY, nextMode);
        } catch {
            // Storage quota or restriction safe
        }
    }, []);

    // Simple 2-way toggle for backwards compatibility
    const toggleTheme = useCallback(() => {
        setMode(isDark ? 'light' : 'dark');
    }, [isDark, setMode]);

    return {
        mode,
        resolvedTheme,
        isDark,
        setMode,
        toggleTheme,
    };
}

export default useTheme;
