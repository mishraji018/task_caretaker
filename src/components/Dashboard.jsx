import { useRef } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useTheme } from '../contexts/ThemeContext';
import TaskForm from './tasks/TaskForm';
import TaskList from './tasks/TaskList';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';

export default function Dashboard() {
    const { isDark } = useTheme();
    const {
        tasks,
        loading,
        error,
        isStorageBlocked,
        corruptNotice,
        dismissCorruptNotice,
        clearError,
        addTask,
        editTask,
        toggleTask,
        deleteTask,
    } = useTasks();

    const taskFormRef = useRef(null);

    return (
        <div className="max-w-3xl mx-auto py-2">
            {/* Header */}
            <div className="mb-6">
                <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                    My Tasks
                </h2>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    Stay on top of your day • Manage, track, and complete your tasks
                </p>
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
                        className="p-1 rounded-lg hover:bg-red-500/20 text-red-400"
                    >
                        <X className="w-4 h-4" />
                    </button>
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
                        className="p-1 rounded-lg hover:bg-red-500/20 text-red-400"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Task Creation Form */}
            <TaskForm ref={taskFormRef} onAddTask={addTask} />

            {/* Tasks List */}
            {loading ? (
                <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'} animate-pulse`}>
                    Loading tasks...
                </div>
            ) : (
                <TaskList
                    tasks={tasks}
                    onToggle={toggleTask}
                    onEdit={editTask}
                    onDelete={deleteTask}
                    onFocusForm={() => taskFormRef.current?.focus()}
                />
            )}
        </div>
    );
}
