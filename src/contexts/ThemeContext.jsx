import { createContext, useContext } from 'react';
import { useTheme as useThemeHook } from '../hooks/useTheme';

const ThemeContext = createContext({
    mode: 'system',
    resolvedTheme: 'dark',
    isDark: true,
    setMode: () => {},
    toggleTheme: () => {},
});

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
    const themeState = useThemeHook();

    return (
        <ThemeContext.Provider value={themeState}>
            {children}
        </ThemeContext.Provider>
    );
}

export default ThemeContext;
