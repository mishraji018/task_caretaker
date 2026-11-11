import { SearchX, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Filtered no-results empty state.
 * Displayed when tasks exist in the view, but none match the current query or filters.
 *
 * @param {object} props
 * @param {() => void} props.onClearFilters
 */
export default function NoResults({ onClearFilters }) {
    const { isDark } = useTheme();

    return (
        <div
            className={`flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed transition-colors ${
                isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50/60'
            }`}
        >
            <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                    isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200/80 text-zinc-600'
                }`}
            >
                <SearchX className="w-7 h-7" />
            </div>

            <h3 className={`text-base sm:text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                No matching tasks found
            </h3>
            <p className={`text-xs sm:text-sm max-w-sm mb-5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                We couldn't find any tasks matching your active search keywords or filter criteria.
            </p>

            {onClearFilters && (
                <button
                    type="button"
                    onClick={onClearFilters}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                    <X className="w-4 h-4" />
                    <span>Clear all filters</span>
                </button>
            )}
        </div>
    );
}
