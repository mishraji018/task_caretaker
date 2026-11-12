import { useState, useRef, useEffect } from 'react';
import TaskItem from './TaskItem';
import EmptyState from './EmptyState';
import TaskListSkeleton from './TaskListSkeleton';
import { useTheme } from '../../contexts/ThemeContext';

export default function TaskList({
    tasks,
    categories = [],
    selectedTaskId = null,
    searchQuery = '',
    preserveOrder = false,
    loading = false,
    onSelectTask,
    onToggle,
    onEdit,
    onDelete,
    onAddSubtask,
    onToggleSubtask,
    onRemoveSubtask,
    onOpenCategoryManager,
    onFocusForm,
    emptyTitle,
    emptyMessage,
}) {
    const { isDark } = useTheme();
    const [focusedIndex, setFocusedIndex] = useState(0);
    const containerRef = useRef(null);

    // Sync focused element within roving index
    useEffect(() => {
        if (!containerRef.current) return;
        const activeEl = document.activeElement;
        // Only shift focus if the keyboard focus was already inside the task list
        if (activeEl && containerRef.current.contains(activeEl)) {
            const nextFocusTarget = containerRef.current.querySelector('[tabindex="0"]');
            if (nextFocusTarget && typeof nextFocusTarget.focus === 'function') {
                nextFocusTarget.focus();
            }
        }
    }, [focusedIndex]);

    if (loading) {
        return <TaskListSkeleton count={4} />;
    }

    if (!tasks || tasks.length === 0) {
        return (
            <EmptyState
                onFocusForm={onFocusForm}
                title={emptyTitle}
                message={emptyMessage}
            />
        );
    }

    if (preserveOrder) {
        return (
            <div ref={containerRef} className="space-y-2.5">
                {tasks.map((task, idx) => (
                    <TaskItem
                        key={task.id}
                        task={task}
                        categories={categories}
                        isSelected={selectedTaskId === task.id}
                        searchQuery={searchQuery}
                        isRovingActive={idx === focusedIndex}
                        onFocusNext={() => setFocusedIndex((prev) => Math.min(prev + 1, tasks.length - 1))}
                        onFocusPrev={() => setFocusedIndex((prev) => Math.max(prev - 1, 0))}
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
        );
    }

    // Active tasks first (newest first), completed tasks below (newest completed first)
    const activeTasks = tasks
        .filter((t) => !t.completed)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const completedTasks = tasks
        .filter((t) => t.completed)
        .sort((a, b) => {
            const timeA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.createdAt).getTime();
            const timeB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(a.createdAt).getTime();
            return timeB - timeA;
        });

    const allOrdered = [...activeTasks, ...completedTasks];

    return (
        <div ref={containerRef} className="space-y-6">
            {/* Active Tasks */}
            {activeTasks.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            Tasks ({activeTasks.length})
                        </h3>
                    </div>
                    <div className="space-y-2.5">
                        {activeTasks.map((task, idx) => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                categories={categories}
                                isSelected={selectedTaskId === task.id}
                                searchQuery={searchQuery}
                                isRovingActive={idx === focusedIndex}
                                onFocusNext={() => setFocusedIndex((prev) => Math.min(prev + 1, allOrdered.length - 1))}
                                onFocusPrev={() => setFocusedIndex((prev) => Math.max(prev - 1, 0))}
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
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-t pt-4 border-zinc-200 dark:border-zinc-800">
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Completed ({completedTasks.length})
                        </h3>
                    </div>
                    <div className="space-y-2.5">
                        {completedTasks.map((task, idx) => {
                            const globalIdx = activeTasks.length + idx;
                            return (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    categories={categories}
                                    isSelected={selectedTaskId === task.id}
                                    searchQuery={searchQuery}
                                    isRovingActive={globalIdx === focusedIndex}
                                    onFocusNext={() => setFocusedIndex((prev) => Math.min(prev + 1, allOrdered.length - 1))}
                                    onFocusPrev={() => setFocusedIndex((prev) => Math.max(prev - 1, 0))}
                                    onSelect={onSelectTask}
                                    onToggle={onToggle}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onAddSubtask={onAddSubtask}
                                    onToggleSubtask={onToggleSubtask}
                                    onRemoveSubtask={onRemoveSubtask}
                                    onOpenCategoryManager={onOpenCategoryManager}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
