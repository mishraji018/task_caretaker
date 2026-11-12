import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import TaskList from '../components/tasks/TaskList';
import TaskForm from '../components/tasks/TaskForm';
import SearchBar from '../components/tasks/SearchBar';
import FilterPanel from '../components/tasks/FilterPanel';
import SortMenu from '../components/tasks/SortMenu';
import NoResults from '../components/tasks/NoResults';
import { selectInbox } from '../utils/taskSelectors';
import { filterTasks, sortTasks } from '../utils/taskFilters';
import { useTheme } from '../contexts/ThemeContext';
import { Inbox, Filter } from 'lucide-react';

export default function InboxPage() {
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

    // 1. Selector (View base)
    const inboxTasks = useMemo(() => selectInbox(tasks), [tasks]);

    // 2. Filter (respecting active query and criteria)
    const filteredTasks = useMemo(() => {
        return filterTasks(inboxTasks, filters, categories);
    }, [inboxTasks, filters, categories]);

    // 3. Sort (stable order)
    const sortedTasks = useMemo(() => {
        return sortTasks(filteredTasks, filters.sort, filters.dir);
    }, [filteredTasks, filters.sort, filters.dir]);

    return (
        <div className="space-y-6">
            {/* View Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5 ${
                        isDark ? 'text-white' : 'text-zinc-900'
                    }`}>
                        <Inbox className="w-7 h-7 text-indigo-500" />
                        <span>Inbox</span>
                    </h1>
                    <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {inboxTasks.length === 1 ? '1 active task' : `${inboxTasks.length} active tasks`}
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
                    currentView="inbox"
                />
            )}

            {/* Search, Filter & Sort Toolbar */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <SearchBar
                        value={searchInput}
                        onChange={setSearchInput}
                        onClear={() => setSearchInput('')}
                        resultCount={sortedTasks.length}
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
                            sortKey={filters.sort}
                            dir={filters.dir}
                            onSortKeyChange={(k) => setFilter('sort', k)}
                            onDirChange={(d) => setFilter('dir', d)}
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

            {/* Task Content: Empty vs NoResults vs TaskList */}
            {loading ? (
                <TaskList loading={true} />
            ) : inboxTasks.length === 0 ? (
                <TaskList
                    tasks={[]}
                    onFocusForm={onFocusForm}
                    emptyTitle="Inbox is clear"
                    emptyMessage="No pending tasks in your inbox. Add a task to capture what's on your mind."
                />
            ) : sortedTasks.length === 0 ? (
                <NoResults onClearFilters={clearFilters} />
            ) : (
                <TaskList
                    tasks={sortedTasks}
                    categories={categories}
                    selectedTaskId={selectedTaskId}
                    searchQuery={filters.query}
                    preserveOrder={true}
                    onSelectTask={onSelectTask}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddSubtask={onAddSubtask}
                    onToggleSubtask={onToggleSubtask}
                    onRemoveSubtask={onRemoveSubtask}
                    onOpenCategoryManager={onOpenCategoryManager}
                    onFocusForm={onFocusForm}
                />
            )}
        </div>
    );
}
