import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from './useDebouncedValue';
import {
    parseFiltersFromSearchParams,
    filtersToSearchParams,
    countActiveFilters,
} from '../utils/taskFilters';

/**
 * Custom hook to manage search, filter, and sort state synced with the URL search parameters.
 * - Uses replace navigation to prevent polluting browser history.
 * - Preserves other URL parameters such as '?task=<id>'.
 * - Debounces search query input by 200ms before synchronizing to the URL.
 *
 * @returns {{
 *   filters: object,
 *   searchInput: string,
 *   setSearchInput: (val: string) => void,
 *   setFilter: (key: string, value: any) => void,
 *   clearFilters: () => void,
 *   activeCount: number
 * }}
 */
export function useTaskFilters() {
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse filters from the URL
    const filters = useMemo(() => {
        return parseFiltersFromSearchParams(searchParams);
    }, [searchParams]);

    // Internal text input state for snappy typing response
    const [searchInput, setSearchInput] = useState(filters.query);
    const [prevQuery, setPrevQuery] = useState(filters.query);

    // Sync input when URL query changes externally (e.g. browser back/forward or clear)
    if (prevQuery !== filters.query) {
        setPrevQuery(filters.query);
        setSearchInput(filters.query);
    }

    // Debounce the typed input
    const debouncedQuery = useDebouncedValue(searchInput, 200);

    // Synchronize debounced query into URL search params
    useEffect(() => {
        const currentQ = filters.query;
        const nextQ = debouncedQuery.trim();

        if (currentQ !== nextQ) {
            setSearchParams(
                (prev) => {
                    const updated = { ...filters, query: nextQ };
                    return filtersToSearchParams(updated, prev);
                },
                { replace: true }
            );
        }
    }, [debouncedQuery, filters, setSearchParams]);

    // Update single filter key
    const setFilter = useCallback((key, value) => {
        setSearchParams(
            (prev) => {
                const currentFilters = parseFiltersFromSearchParams(prev);
                const updated = { ...currentFilters, [key]: value };
                return filtersToSearchParams(updated, prev);
            },
            { replace: true }
        );
    }, [setSearchParams]);

    // Reset all filters to defaults
    const clearFilters = useCallback(() => {
        setSearchInput('');
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete('q');
                next.delete('status');
                next.delete('priority');
                next.delete('category');
                next.delete('due');
                next.delete('sort');
                next.delete('dir');
                return next;
            },
            { replace: true }
        );
    }, [setSearchParams]);

    const activeCount = useMemo(() => {
        return countActiveFilters(filters);
    }, [filters]);

    return {
        filters,
        searchInput,
        setSearchInput,
        setFilter,
        clearFilters,
        activeCount,
    };
}

export default useTaskFilters;
