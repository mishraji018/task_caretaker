import { Search, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Accessible search input for tasks.
 * - role="search" wrapper
 * - Clear (X) button
 * - Escape key clears search
 * - Polite aria-live region announcing result counts
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(val: string) => void} props.onChange
 * @param {() => void} props.onClear
 * @param {number} props.resultCount
 */
export default function SearchBar({
    value = '',
    onChange,
    onClear,
    resultCount = 0,
}) {
    const { isDark } = useTheme();

    return (
        <div role="search" aria-label="Search tasks" className="relative flex-1 min-w-[200px]">
            <label htmlFor="task-search-input" className="sr-only">
                Search tasks
            </label>

            <div className="relative flex items-center">
                <Search className={`absolute left-3.5 w-4 h-4 pointer-events-none ${
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                }`} />

                <input
                    id="task-search-input"
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            onClear();
                        }
                    }}
                    placeholder="Search tasks, categories, subtasks..."
                    className={`w-full pl-10 pr-10 py-2 rounded-xl text-xs sm:text-sm font-medium border outline-none transition-all ${
                        isDark
                            ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                            : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10'
                    }`}
                />

                {value && (
                    <button
                        type="button"
                        onClick={onClear}
                        aria-label="Clear search"
                        className={`absolute right-2.5 p-1 rounded-lg transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center ${
                            isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                        }`}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Polite screen reader announcement */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {value ? `${resultCount} ${resultCount === 1 ? 'task' : 'tasks'} found` : ''}
            </div>
        </div>
    );
}
