import { Filter, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Filter panel controls: status, priority, category, due horizon.
 *
 * @param {object} props
 * @param {object} props.filters { status, priority, categoryId, due }
 * @param {Array<object>} props.categories
 * @param {(key: string, value: string) => void} props.onFilterChange
 * @param {() => void} props.onClearFilters
 * @param {number} props.activeCount
 * @param {boolean} [props.isMobileSheet=false] When rendered inside mobile bottom sheet
 */
export default function FilterPanel({
    filters = {},
    categories = [],
    onFilterChange,
    onClearFilters,
    activeCount = 0,
    isMobileSheet = false,
}) {
    const { isDark } = useTheme();

    const selectClass = `px-3 py-2 rounded-xl text-xs font-semibold border outline-none cursor-pointer transition-colors ${
        isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-indigo-500'
            : 'bg-white border-zinc-200 text-zinc-700 focus:border-indigo-500'
    }`;

    const labelClass = `block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
        isDark ? 'text-zinc-400' : 'text-zinc-500'
    }`;

    const content = (
        <div className={isMobileSheet ? 'space-y-4' : 'flex flex-wrap items-center gap-2'}>
            {/* 1. Status Filter */}
            <div className={isMobileSheet ? '' : 'flex items-center gap-1.5'}>
                {isMobileSheet && <label className={labelClass}>Status</label>}
                <select
                    value={filters.status || 'all'}
                    onChange={(e) => onFilterChange('status', e.target.value)}
                    aria-label="Filter by status"
                    className={`${selectClass} ${isMobileSheet ? 'w-full' : ''}`}
                >
                    <option value="all">All Status</option>
                    <option value="active">Active only</option>
                    <option value="completed">Completed only</option>
                </select>
            </div>

            {/* 2. Priority Filter */}
            <div className={isMobileSheet ? '' : 'flex items-center gap-1.5'}>
                {isMobileSheet && <label className={labelClass}>Priority</label>}
                <select
                    value={filters.priority || 'all'}
                    onChange={(e) => onFilterChange('priority', e.target.value)}
                    aria-label="Filter by priority"
                    className={`${selectClass} ${isMobileSheet ? 'w-full' : ''}`}
                >
                    <option value="all">All Priorities</option>
                    <option value="high">🔴 High Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="low">🟢 Low Priority</option>
                </select>
            </div>

            {/* 3. Category Filter */}
            <div className={isMobileSheet ? '' : 'flex items-center gap-1.5'}>
                {isMobileSheet && <label className={labelClass}>Category</label>}
                <select
                    value={filters.categoryId || 'all'}
                    onChange={(e) => onFilterChange('categoryId', e.target.value)}
                    aria-label="Filter by category"
                    className={`${selectClass} ${isMobileSheet ? 'w-full' : ''}`}
                >
                    <option value="all">All Categories</option>
                    <option value="none">Uncategorised</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* 4. Due Date Filter */}
            <div className={isMobileSheet ? '' : 'flex items-center gap-1.5'}>
                {isMobileSheet && <label className={labelClass}>Due Horizon</label>}
                <select
                    value={filters.due || 'all'}
                    onChange={(e) => onFilterChange('due', e.target.value)}
                    aria-label="Filter by due horizon"
                    className={`${selectClass} ${isMobileSheet ? 'w-full' : ''}`}
                >
                    <option value="all">Any Due Date</option>
                    <option value="overdue">⚠️ Overdue</option>
                    <option value="today">📅 Due Today</option>
                    <option value="week">🗓️ Next 7 Days</option>
                    <option value="none">No Due Date</option>
                </select>
            </div>

            {/* Clear Filters Button */}
            {activeCount > 0 && (
                <button
                    type="button"
                    onClick={onClearFilters}
                    aria-label="Clear all filters"
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900'
                    } ${isMobileSheet ? 'w-full justify-center mt-2' : ''}`}
                >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear ({activeCount})</span>
                </button>
            )}
        </div>
    );

    return content;
}

