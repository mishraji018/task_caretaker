import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Task sorting menu (created, due, priority, title; asc / desc).
 *
 * @param {object} props
 * @param {string} props.sortKey
 * @param {'asc'|'desc'} props.dir
 * @param {(key: string) => void} props.onSortKeyChange
 * @param {(dir: 'asc'|'desc') => void} props.onDirChange
 * @param {boolean} [props.hideDueOption=false] Hidden on Upcoming page where date grouping takes precedence
 * @param {boolean} [props.isMobileSheet=false] When rendered inside mobile bottom sheet
 */
export default function SortMenu({
    sortKey = 'created',
    dir = 'desc',
    onSortKeyChange,
    onDirChange,
    hideDueOption = false,
    isMobileSheet = false,
}) {
    const { isDark } = useTheme();

    const selectClass = `px-3 py-2 rounded-xl text-xs font-semibold border outline-none cursor-pointer transition-colors ${
        isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-indigo-500'
            : 'bg-white border-zinc-200 text-zinc-700 focus:border-indigo-500'
    }`;

    return (
        <div className={`flex items-center gap-1.5 ${isMobileSheet ? 'w-full' : ''}`}>
            {isMobileSheet && (
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 w-full ${
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                    Sort by
                </label>
            )}

            <div className={`flex items-center gap-1.5 ${isMobileSheet ? 'w-full' : ''}`}>
                <select
                    value={sortKey}
                    onChange={(e) => onSortKeyChange(e.target.value)}
                    aria-label="Sort tasks by"
                    className={`${selectClass} ${isMobileSheet ? 'flex-1' : ''}`}
                >
                    <option value="created">Date Created</option>
                    {!hideDueOption && <option value="due">Due Date</option>}
                    <option value="priority">Priority</option>
                    <option value="title">Alphabetical (Title)</option>
                </select>

                <button
                    type="button"
                    onClick={() => onDirChange(dir === 'asc' ? 'desc' : 'asc')}
                    aria-label={`Sort direction: currently ${dir === 'asc' ? 'Ascending' : 'Descending'}. Click to toggle.`}
                    title={dir === 'asc' ? 'Ascending' : 'Descending'}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center ${
                        isDark
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                >
                    {dir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>
    );
}

