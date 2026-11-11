import { useOutletContext } from 'react-router-dom';
import TaskList from '../components/tasks/TaskList';
import TaskForm from '../components/tasks/TaskForm';
import { selectInbox } from '../utils/taskSelectors';
import { useTheme } from '../contexts/ThemeContext';
import { Inbox } from 'lucide-react';

export default function InboxPage() {
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

    const inboxTasks = selectInbox(tasks);

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

            {/* Task List */}
            <TaskList
                tasks={inboxTasks}
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
                emptyTitle="Inbox is clear"
                emptyMessage="No pending tasks in your inbox. Add a task to capture what's on your mind."
            />
        </div>
    );
}
