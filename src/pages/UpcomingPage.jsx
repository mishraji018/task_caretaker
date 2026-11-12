import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import TaskItem from '../components/tasks/TaskItem';
import TaskForm from '../components/tasks/TaskForm';
import SearchBar from '../components/tasks/SearchBar';
import FilterPanel from '../components/tasks/FilterPanel';
import SortMenu from '../components/tasks/SortMenu';
import NoResults from '../components/tasks/NoResults';
import EmptyState from '../components/tasks/EmptyState';
import TaskListSkeleton from '../components/tasks/TaskListSkeleton';
import { selectUpcoming } from '../utils/taskSelectors';
import { filterTasks, sortTasks } from '../utils/taskFilters';
import { useTheme } from '../contexts/ThemeContext';
import { CalendarDays, Filter } from 'lucide-react';

export default function UpcomingPage() {
    const { isDark } = useTheme();
    const {
        tasks,
        categories,
        loading,
        layoutMode,
        filters,
        searchInput,
        setSearchInput,
        setFilter,
        clearFilters,
        activeCount,
        onOpenFiltersSheet,
        selectedTaskId,
        onSelectTask,
        onToggle,
        onEdit,
        onDelete,
        onAddSubtask,
        onToggleSubtask,
        onRemoveSubtask,
        onOpenCategoryManager,
        onAddTask,
        onFocusForm,
        taskFormRef,
    } = useOutletContext();

    const now = useMemo(() => new Date(), []);

    // 1. Selector (Date-grouped base)
    const rawGroups = useMemo(() => selectUpcoming(tasks, now), [tasks, now]);
    const totalRawUpcoming = rawGroups.reduce((acc, g) => acc + g.tasks.length, 0);

    // 2. Filter & Sort inside each date group
    const displayGroups = useMemo(() => {
        return rawGroups
            .map((group) => {
                const filteredInGroup = filterTasks(group.tasks, filters, categories, now);
                // Apply sort inside date group (hide 'due' option since group dictates date)
                const sortKey = filters.sort === 'due' ? 'created' : filters.sort;
                const sortedInGroup = sortTasks(filteredInGroup, sortKey, filters.dir);
                return {
                    ...group,
                    tasks: sortedInGroup,
                };
            })
            .filter((group) => group.tasks.length > 0);
    }, [rawGroups, filters, categories, now]);

    const totalDisplayUpcoming = displayGroups.reduce((acc, g) => acc + g.tasks.length, 0);

    return (
        <div className="space-y-6">
            {/* View Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5 ${
                        isDark ? 'text-white' : 'text-zinc-900'
                    }`}>
                        <CalendarDays className="w-7 h-7 text-indigo-500" />
                        <span>Upcoming</span>
                    </h1>
                    <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {totalRawUpcoming === 1 ? '1 scheduled task' : `${totalRawUpcoming} scheduled tasks across ${rawGroups.length} dates`}
                    </p>
                </div>
            </div>

            {/* Laptop Inline Task Form */}
            {layoutMode === 'laptop' && (
                <TaskForm
                    ref={taskFormRef}
                    onAddTask={onAddTask}
                    categories={categories}
                    onOpenCategoryManager={onOpenCategoryManager}
                    currentView="upcoming"
                />
            )}

            {/* Search, Filter & Sort Toolbar */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <SearchBar
                        value={searchInput}
                        onChange={setSearchInput}
                        onClear={() => setSearchInput('')}
                        resultCount={totalDisplayUpcoming}
                    />

                    {layoutMode === 'mobile' ? (
                        <button
                            type="button"
                            onClick={onOpenFiltersSheet}
                            aria-label={`Open filters. ${activeCount} active.`}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer min-h-[40px] shrink-0 ${
                                activeCount > 0
                                    ? isDark
                                        ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40'
                                        : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                    : isDark
                                    ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                                    : 'bg-white border-zinc-200 text-zinc-700 hover:text-zinc-900'
                            }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filters</span>
                            {activeCount > 0 && (
                                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                                    {activeCount}
                                </span>
                            )}
                        </button>
                    ) : (
                        <SortMenu
                            sortKey={filters.sort === 'due' ? 'created' : filters.sort}
                            dir={filters.dir}
                            onSortKeyChange={(k) => setFilter('sort', k)}
                            onDirChange={(d) => setFilter('dir', d)}
                            hideDueOption={true}
                        />
                    )}
                </div>

                {layoutMode !== 'mobile' && (
                    <div className="flex items-center justify-between pt-1">
                        <FilterPanel
                            filters={filters}
                            categories={categories}
                            onFilterChange={setFilter}
                            onClearFilters={clearFilters}
                            activeCount={activeCount}
                        />
                    </div>
                )}
            </div>

            {/* Content Area: Empty vs NoResults vs Grouped List */}
            {loading ? (
                <TaskListSkeleton count={4} />
            ) : rawGroups.length === 0 ? (
                <EmptyState
                    onFocusForm={onFocusForm}
                    title="No upcoming tasks"
                    message="You have no tasks scheduled for future dates. Plan ahead by setting due dates on your tasks."
                />
            ) : displayGroups.length === 0 ? (
                <NoResults onClearFilters={clearFilters} />
            ) : (
                <div className="space-y-8">
                    {displayGroups.map((group) => (
                        <div key={group.dateKey} className="space-y-3">
                            {/* Group Date Header */}
                            <div className="flex items-center justify-between border-b pb-2 border-zinc-200 dark:border-zinc-800">
                                <h2 className={`text-sm sm:text-base font-bold tracking-tight ${
                                    isDark ? 'text-zinc-200' : 'text-zinc-800'
                                }`}>
                                    {group.label}
                                </h2>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
                                }`}>
                                    {group.tasks.length}
                                </span>
                            </div>

                            {/* Task Items in Group */}
                            <div className="space-y-2.5">
                                {group.tasks.map((task) => (
                                    <TaskItem
                                        key={task.id}
                                        task={task}
                                        categories={categories}
                                        isSelected={selectedTaskId === task.id}
                                        searchQuery={filters.query}
                                        onSelect={onSelectTask}
                                        onToggle={onToggle}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onAddSubtask={onAddSubtask}
                                        onToggleSubtask={onToggleSubtask}
                                        onRemoveSubtask={onRemoveSubtask}
                                        onOpenCategoryManager={onOpenCategoryManager}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
