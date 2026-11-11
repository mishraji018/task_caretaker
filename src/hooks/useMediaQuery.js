import { useState, useEffect } from 'react';

/**
 * Custom hook to track matching of a CSS media query.
 * Safe on initial SSR / mount render, subscribes with addEventListener('change'),
 * and cleans up listener on unmount.
 *
 * @param {string} query
 * @returns {boolean}
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        const mediaQueryList = window.matchMedia(query);
        const updateMatch = (event) => {
            setMatches(event.matches);
        };

        if (mediaQueryList.addEventListener) {
            mediaQueryList.addEventListener('change', updateMatch);
            return () => mediaQueryList.removeEventListener('change', updateMatch);
        } else if (mediaQueryList.addListener) {
            mediaQueryList.addListener(updateMatch);
            return () => mediaQueryList.removeListener(updateMatch);
        }
    }, [query]);

    return matches;
}

export default useMediaQuery;
