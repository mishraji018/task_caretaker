import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import TaskList from '../components/tasks/TaskList';
import TaskForm from '../components/tasks/TaskForm';
import { selectToday } from '../utils/taskSelectors';
import { useTheme } from '../contexts/ThemeContext';
import { Calendar } from 'lucide-react';

export default function TodayPage() {
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
    const todayTasks = selectToday(tasks, now);

    // Friendly date subtitle: "Wednesday, 11 Nov"
    const todaySubtitle = useMemo(() => {
        const options = { weekday: 'long', day: 'numeric', month: 'short' };
        return now.toLocaleDateString(undefined, options);
    }, [now]);

    return (
        <div className="space-y-6">
            {/* View Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5 ${
                        isDark ? 'text-white' : 'text-zinc-900'
                    }`}>
                        <Calendar className="w-7 h-7 text-indigo-500" />
                        <span>Today</span>
                    </h1>
                    <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {todaySubtitle} • {todayTasks.length === 1 ? '1 task due' : `${todayTasks.length} tasks due`}
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
                    currentView="today"
                />
            )}

            {/* Task List */}
            <TaskList
                tasks={todayTasks}
                categories={categories}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddSubtask={onAddSubtask}
                onToggleSubtask={onToggleSubtask}
                onRemoveSubtask={onRemoveSubtask}
                onOpenCategoryManager={onOpenCategoryManager}
                onFocusForm={onFocusForm}
                emptyTitle="Nothing due today. Enjoy your day!"
                emptyMessage="All clear for today. You can review upcoming deadlines or relax."
            />
        </div>
    );
}
