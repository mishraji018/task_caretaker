import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import TaskItem from '../components/tasks/TaskItem';
import TaskForm from '../components/tasks/TaskForm';
import EmptyState from '../components/tasks/EmptyState';
import { selectUpcoming } from '../utils/taskSelectors';
import { useTheme } from '../contexts/ThemeContext';
import { CalendarDays } from 'lucide-react';

export default function UpcomingPage() {
    const { isDark } = useTheme();
    const {
        tasks,
        categories,
        layoutMode,
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
    const groups = useMemo(() => selectUpcoming(tasks, now), [tasks, now]);
    const totalUpcoming = groups.reduce((acc, g) => acc + g.tasks.length, 0);

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
                        {totalUpcoming === 1 ? '1 scheduled task' : `${totalUpcoming} scheduled tasks across ${groups.length} dates`}
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

            {/* Empty State */}
            {groups.length === 0 ? (
                <EmptyState
                    onFocusForm={onFocusForm}
                    title="No upcoming tasks"
                    message="You have no tasks scheduled for future dates. Plan ahead by setting due dates on your tasks."
                />
            ) : (
                /* Grouped Dates List */
                <div className="space-y-8">
                    {groups.map((group) => (
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

                            {/* Task Items (Same TaskItem reused) */}
                            <div className="space-y-2.5">
                                {group.tasks.map((task) => (
                                    <TaskItem
                                        key={task.id}
                                        task={task}
                                        categories={categories}
                                        isSelected={selectedTaskId === task.id}
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
