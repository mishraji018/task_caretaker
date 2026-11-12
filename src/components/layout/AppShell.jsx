import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomDock from './BottomDock';
import BottomSheet from '../ui/BottomSheet';
import DetailPanel from '../tasks/DetailPanel';
import TaskForm from '../tasks/TaskForm';
import TaskItem from '../tasks/TaskItem';
import FilterPanel from '../tasks/FilterPanel';
import SortMenu from '../tasks/SortMenu';
import ThemeToggle from '../ui/ThemeToggle';
import CategoryManager from '../categories/CategoryManager';
import CommandPalette from '../ui/CommandPalette';
import ShortcutsHelp from '../ui/ShortcutsHelp';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { useTasks } from '../../hooks/useTasks';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { useHotkeys } from '../../hooks/useHotkeys';
import { taskService } from '../../services/taskService';
import { countByView } from '../../utils/taskSelectors';
import { AlertCircle, AlertTriangle, X, Tag, LogOut, Info } from 'lucide-react';

export default function AppShell() {
    const layoutMode = useLayoutMode();
    const { isDark } = useTheme();
    const { logout } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // Filters and sort state synced with URL search params
    const {
        filters,
        searchInput,
        setSearchInput,
        setFilter,
        clearFilters,
        activeCount,
    } = useTaskFilters();

    const {
        tasks,
        categories,
        loading,
        error,
        isStorageBlocked,
        corruptNotice,
        futureVersionNotice,
        dismissCorruptNotice,
        clearError,
        addTask,
        editTask,
        toggleTask,
        deleteTask,
        addSubtask,
        toggleSubtask,
        removeSubtask,
        addCategory,
        renameCategory,
        deleteCategory,
    } = useTasks();

    // Modals / Sheets state
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [isMenuSheetOpen, setIsMenuSheetOpen] = useState(false);
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

    const { toast } = useToast();
    const taskFormRef = useRef(null);

    // Selected task via URL query: ?task=<id>
    const selectedTaskId = searchParams.get('task');
    const selectedTask = useMemo(() => {
        if (!selectedTaskId) return null;
        return tasks.find((t) => t.id === selectedTaskId) || null;
    }, [tasks, selectedTaskId]);

    // If query ?task=<id> points to non-existent task (deleted or bad), clear silently
    useEffect(() => {
        if (selectedTaskId && !selectedTask && !loading) {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete('task');
                    return next;
                },
                { replace: true }
            );
        }
    }, [selectedTaskId, selectedTask, loading, setSearchParams]);

    const handleSelectTask = useCallback((task) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (next.get('task') === task.id) {
                next.delete('task');
            } else {
                next.set('task', task.id);
            }
            return next;
        });
    }, [setSearchParams]);

    const handleClearSelection = useCallback(() => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('task');
            return next;
        });
    }, [setSearchParams]);

    // Task deletion with instant Undo toast
    const handleDeleteTask = useCallback(
        (id) => {
            const target = tasks.find((t) => t.id === id);
            if (!target) return;

            const snapshot = JSON.parse(JSON.stringify(target));
            deleteTask(id);

            if (selectedTaskId === id) {
                handleClearSelection();
            }

            toast({
                message: 'Task deleted',
                type: 'info',
                actionLabel: 'Undo',
                onAction: () => {
                    taskService.restore(snapshot);
                },
            });
        },
        [tasks, deleteTask, selectedTaskId, handleClearSelection, toast]
    );

    // Task completion toggle with instant Undo toast
    const handleToggleTask = useCallback(
        (id) => {
            const target = tasks.find((t) => t.id === id);
            if (!target) return;

            const prevCompleted = target.completed;
            const prevCompletedAt = target.completedAt;

            toggleTask(id);

            const isNowCompleted = !prevCompleted;
            toast({
                message: isNowCompleted ? 'Task completed' : 'Task marked active',
                type: 'success',
                actionLabel: 'Undo',
                onAction: () => {
                    taskService.update(id, {
                        completed: prevCompleted,
                        completedAt: prevCompletedAt,
                    });
                },
            });
        },
        [tasks, toggleTask, toast]
    );

    // Command palette modal opener (closes lower sheets to prevent stacking)
    const handleOpenCommandPalette = useCallback(() => {
        setIsAddSheetOpen(false);
        setIsMenuSheetOpen(false);
        setIsFilterSheetOpen(false);
        setIsCategoryManagerOpen(false);
        setIsShortcutsHelpOpen(false);
        setIsCommandPaletteOpen(true);
    }, []);

    // Global keyboard shortcuts
    useHotkeys({
        onNewTask: () => {
            if (layoutMode === 'laptop') {
                taskFormRef.current?.focus();
            } else {
                setIsAddSheetOpen(true);
            }
        },
        onFocusSearch: () => {
            const searchInput = document.querySelector('input[placeholder*="Search"]');
            searchInput?.focus();
            searchInput?.select();
        },
        onOpenCommandPalette: handleOpenCommandPalette,
        onOpenShortcutsHelp: () => setIsShortcutsHelpOpen(true),
        onCloseTopModal: () => {
            if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
            else if (isShortcutsHelpOpen) setIsShortcutsHelpOpen(false);
            else if (isCategoryManagerOpen) setIsCategoryManagerOpen(false);
            else if (isAddSheetOpen) setIsAddSheetOpen(false);
            else if (isFilterSheetOpen) setIsFilterSheetOpen(false);
            else if (isMenuSheetOpen) setIsMenuSheetOpen(false);
            else if (selectedTaskId) handleClearSelection();
        },
        enabled: true,
    });

    // Calculate live counts
    const viewCounts = useMemo(() => countByView(tasks, new Date()), [tasks]);

    // Outlet context for child route pages (Inbox, Today, Upcoming)
    const outletContext = {
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
        onOpenFiltersSheet: () => setIsFilterSheetOpen(true),
        selectedTaskId,
        onSelectTask: handleSelectTask,
        onToggle: handleToggleTask,
        onEdit: editTask,
        onDelete: handleDeleteTask,
        onAddSubtask: addSubtask,
        onToggleSubtask: toggleSubtask,
        onRemoveSubtask: removeSubtask,
        onOpenCategoryManager: () => setIsCategoryManagerOpen(true),
        onAddTask: addTask,
        onFocusForm: () => {
            if (layoutMode === 'laptop') {
                taskFormRef.current?.focus();
            } else {
                setIsAddSheetOpen(true);
            }
        },
        taskFormRef,
    };

    return (
        <div
            className={`min-h-[100dvh] flex flex-col transition-colors ${
                isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
            }`}
        >
            {/* Skip to Main Content Link for Keyboard Accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:font-bold focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white"
            >
                Skip to main content
            </a>

            <div className="flex-1 flex w-full max-w-[1400px] mx-auto overflow-hidden">
                {/* 1. Sidebar for Laptop & Tablet */}
                <Sidebar
                    counts={viewCounts}
                    categories={categories}
                    selectedCategoryId={filters.categoryId}
                    onSelectCategory={(catId) => setFilter('categoryId', catId)}
                    isTablet={layoutMode === 'tablet'}
                    onNewTask={() => {
                        if (layoutMode === 'laptop') {
                            taskFormRef.current?.focus();
                        } else {
                            setIsAddSheetOpen(true);
                        }
                    }}
                    onManageCategories={() => setIsCategoryManagerOpen(true)}
                    onOpenCommandPalette={handleOpenCommandPalette}
                    onOpenShortcuts={() => setIsShortcutsHelpOpen(true)}
                />

                {/* 2. Main Content Area */}
                <main
                    id="main-content"
                    tabIndex="-1"
                    className={`flex-1 flex flex-col h-[100dvh] overflow-y-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 outline-none ${
                        layoutMode === 'mobile' ? 'pb-24' : 'pb-8'
                    }`}
                >
                    <div className="w-full max-w-3xl mx-auto space-y-4">
                        {/* Storage Full Banner */}
                        {isStorageBlocked && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-sm">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <div className="flex-1">
                                    <p className="font-semibold">Local Storage Full or Blocked</p>
                                    <p className="text-xs text-amber-500/80 mt-0.5">
                                        Your browser storage is quota-constrained or blocked. Changes might not save permanently.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Corrupt Data Banner */}
                        {corruptNotice && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <div className="flex-1">
                                    <p className="font-semibold">Corrupted Data Recovered</p>
                                    <p className="text-xs text-rose-500/80 mt-0.5">
                                        Some stored task data was malformed and was safely quarantined into backup key.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={dismissCorruptNotice}
                                    aria-label="Dismiss notice"
                                    className="p-1 rounded-lg hover:bg-rose-500/20 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Future Version Notice */}
                        {futureVersionNotice && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-sm">
                                <Info className="w-5 h-5 shrink-0" />
                                <div className="flex-1">
                                    <p className="font-semibold">Newer Data Detected</p>
                                    <p className="text-xs text-amber-500/80 mt-0.5">
                                        Tasks created with a newer app version were preserved without modifications.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* General Error Banner */}
                        {error && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <div className="flex-1 font-medium text-xs sm:text-sm">{error}</div>
                                <button
                                    type="button"
                                    onClick={clearError}
                                    aria-label="Clear error"
                                    className="p-1 rounded-lg hover:bg-rose-500/20 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Render active page (InboxPage, TodayPage, UpcomingPage) */}
                        <Outlet context={outletContext} />
                    </div>
                </main>

                {/* 3. Right Detail Panel on Laptop (1024px+) */}
                {layoutMode === 'laptop' && (
                    <DetailPanel
                        task={selectedTask}
                        categories={categories}
                        onClose={handleClearSelection}
                        onToggle={toggleTask}
                        onEdit={editTask}
                        onDelete={deleteTask}
                        onAddSubtask={addSubtask}
                        onToggleSubtask={toggleSubtask}
                        onRemoveSubtask={removeSubtask}
                        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                    />
                )}
            </div>

            {/* 4. Bottom Dock for Mobile */}
            <BottomDock
                counts={viewCounts}
                onOpenAdd={() => setIsAddSheetOpen(true)}
                onOpenMenu={() => setIsMenuSheetOpen(true)}
            />

            {/* 5. Mobile & Tablet Add Task Bottom Sheet */}
            <BottomSheet
                isOpen={isAddSheetOpen}
                onClose={() => setIsAddSheetOpen(false)}
                title="Add New Task"
            >
                <TaskForm
                    onAddTask={addTask}
                    categories={categories}
                    onOpenCategoryManager={() => {
                        setIsAddSheetOpen(false);
                        setIsCategoryManagerOpen(true);
                    }}
                    onSuccess={() => setIsAddSheetOpen(false)}
                    onCancel={() => setIsAddSheetOpen(false)}
                />
            </BottomSheet>

            {/* 6. Tablet & Mobile Task Details Bottom Sheet */}
            {layoutMode !== 'laptop' && (
                <BottomSheet
                    isOpen={Boolean(selectedTask)}
                    onClose={handleClearSelection}
                    title="Task Details"
                >
                    {selectedTask && (
                        <TaskItem
                            key={selectedTask.id}
                            task={selectedTask}
                            categories={categories}
                            isSelected={true}
                            forceExpandedSubtasks={true}
                            onToggle={toggleTask}
                            onEdit={editTask}
                            onDelete={(id) => {
                                deleteTask(id);
                                handleClearSelection();
                            }}
                            onAddSubtask={addSubtask}
                            onToggleSubtask={toggleSubtask}
                            onRemoveSubtask={removeSubtask}
                            onOpenCategoryManager={() => {
                                handleClearSelection();
                                setIsCategoryManagerOpen(true);
                            }}
                        />
                    )}
                </BottomSheet>
            )}

            {/* 7. Mobile Menu Bottom Sheet */}
            <BottomSheet
                isOpen={isMenuSheetOpen}
                onClose={() => setIsMenuSheetOpen(false)}
                title="Menu"
            >
                <div className="space-y-2 py-2">
                    <button
                        type="button"
                        onClick={() => {
                            setIsMenuSheetOpen(false);
                            setIsCategoryManagerOpen(true);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors cursor-pointer ${
                            isDark ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-100' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                        }`}
                    >
                        <Tag className="w-5 h-5 text-indigo-500" />
                        <span>Manage Categories ({categories.length})</span>
                    </button>

                    <div className="pt-2 pb-1">
                        <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${
                            isDark ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>
                            Theme Appearance
                        </label>
                        <ThemeToggle />
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setIsMenuSheetOpen(false);
                            logout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </BottomSheet>

            {/* 8. Mobile Filters Bottom Sheet */}
            <BottomSheet
                isOpen={isFilterSheetOpen}
                onClose={() => setIsFilterSheetOpen(false)}
                title="Filter & Sort Tasks"
            >
                <div className="space-y-6 py-1">
                    <FilterPanel
                        filters={filters}
                        categories={categories}
                        onFilterChange={setFilter}
                        onClearFilters={clearFilters}
                        activeCount={activeCount}
                        isMobileSheet={true}
                    />
                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
                        <SortMenu
                            sortKey={filters.sort}
                            dir={filters.dir}
                            onSortKeyChange={(k) => setFilter('sort', k)}
                            onDirChange={(d) => setFilter('dir', d)}
                            isMobileSheet={true}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsFilterSheetOpen(false)}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                    >
                        Apply
                    </button>
                </div>
            </BottomSheet>

            {/* 9. Category Manager Modal */}
            <CategoryManager
                isOpen={isCategoryManagerOpen}
                onClose={() => setIsCategoryManagerOpen(false)}
                categories={categories}
                onAddCategory={addCategory}
                onRenameCategory={renameCategory}
                onDeleteCategory={deleteCategory}
                tasks={tasks}
            />

            {/* 10. Command Palette (Ctrl/Cmd + K) */}
            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
                tasks={tasks}
                categories={categories}
                onNewTask={() => {
                    if (layoutMode === 'laptop') {
                        taskFormRef.current?.focus();
                    } else {
                        setIsAddSheetOpen(true);
                    }
                }}
                onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                onOpenShortcuts={() => setIsShortcutsHelpOpen(true)}
                onClearFilters={clearFilters}
            />

            {/* 11. Keyboard Shortcuts Reference Dialog */}
            <ShortcutsHelp
                isOpen={isShortcutsHelpOpen}
                onClose={() => setIsShortcutsHelpOpen(false)}
            />
        </div>
    );
}
