import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce rapidly changing values (e.g. search input).
 * Always cancels active timeout on cleanup.
 *
 * @template T
 * @param {T} value
 * @param {number} [delay=200]
 * @returns {T}
 */
export function useDebouncedValue(value, delay = 200) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default useDebouncedValue;
