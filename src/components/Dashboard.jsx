import { useRef, useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useTheme } from '../contexts/ThemeContext';
import TaskForm from './tasks/TaskForm';
import TaskList from './tasks/TaskList';
import CategoryManager from './categories/CategoryManager';
import { AlertCircle, AlertTriangle, X, Tag, Info } from 'lucide-react';

export default function Dashboard() {
    const { isDark } = useTheme();
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

    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const taskFormRef = useRef(null);

    return (
        <div className="max-w-3xl mx-auto py-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'} mb-1`}>
                        My Tasks
                    </h2>
                    <p className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Priorities, deadlines, subtasks & categories • Manage effortlessly
                    </p>
                </div>

                {/* Manage Categories Button */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsCategoryManagerOpen(true)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${isDark
                                ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                                : 'bg-white hover:bg-zinc-50 border-zinc-300 text-zinc-700 hover:text-zinc-900 shadow-xs'
                            }`}
                    >
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Categories ({categories.length})</span>
                    </button>
                </div>
            </div>

            {/* Storage Blocked / Full Warning */}
            {isStorageBlocked && (
                <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-sm flex items-start gap-3 animate-in fade-in">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Storage notice</p>
                        <p className="text-xs mt-0.5 text-amber-400">
                            Could not save to browser local storage (it may be blocked, full, or in private mode). Your tasks will be kept in memory for this session.
                        </p>
                    </div>
                </div>
            )}

            {/* Corrupted Storage Detected Notice */}
            {corruptNotice && (
                <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-start justify-between gap-3 animate-in fade-in">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Corrupted data recovered</p>
                            <p className="text-xs mt-0.5 text-red-400">
                                Corrupted task data was found and preserved as a backup. We have safely reset your list so the app runs smoothly.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={dismissCorruptNotice}
                        aria-label="Dismiss notice"
                        className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Future Schema Version Detected Notice */}
            {futureVersionNotice && (
                <div className="mb-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm flex items-start gap-3 animate-in fade-in">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Newer data format detected</p>
                        <p className="text-xs mt-0.5 text-blue-300">
                            Some tasks are saved in a newer schema version. Data was safely preserved and not downgraded.
                        </p>
                    </div>
                </div>
            )}

            {/* General Action Error Banner */}
            {error && (
                <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-start justify-between gap-3 animate-in fade-in">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Action could not be completed</p>
                            <p className="text-xs mt-0.5 text-red-400">{error}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={clearError}
                        aria-label="Dismiss error"
                        className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Task Creation Form with Details Controls */}
            <TaskForm
                ref={taskFormRef}
                onAddTask={addTask}
                categories={categories}
                onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
            />

            {/* Tasks List */}
            {loading ? (
                <div className={`text-center py-12 ${isDark ? 'text-zinc-500' : 'text-zinc-400'} animate-pulse`}>
                    Loading tasks...
                </div>
            ) : (
                <TaskList
                    tasks={tasks}
                    categories={categories}
                    onToggle={toggleTask}
                    onEdit={editTask}
                    onDelete={deleteTask}
                    onAddSubtask={addSubtask}
                    onToggleSubtask={toggleSubtask}
                    onRemoveSubtask={removeSubtask}
                    onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                    onFocusForm={() => taskFormRef.current?.focus()}
                />
            )}

            {/* Category Manager Modal */}
            <CategoryManager
                isOpen={isCategoryManagerOpen}
                onClose={() => setIsCategoryManagerOpen(false)}
                categories={categories}
                tasks={tasks}
                onAddCategory={addCategory}
                onRenameCategory={renameCategory}
                onDeleteCategory={deleteCategory}
            />
        </div>
    );
}
