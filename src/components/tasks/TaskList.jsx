import TaskItem from './TaskItem';
import EmptyState from './EmptyState';
import { useTheme } from '../../contexts/ThemeContext';

export default function TaskList({ tasks, onToggle, onEdit, onDelete, onFocusForm }) {
    const { isDark } = useTheme();

    if (!tasks || tasks.length === 0) {
        return <EmptyState onFocusForm={onFocusForm} />;
    }

    // Active tasks first (newest first), completed tasks below (newest completed first)
    const activeTasks = tasks
        .filter((t) => !t.completed)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const completedTasks = tasks
        .filter((t) => t.completed)
        .sort((a, b) => {
            const timeA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.createdAt).getTime();
            const timeB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.createdAt).getTime();
            return timeB - timeA;
        });

    return (
        <div className="space-y-6">
            {/* Active Tasks */}
            {activeTasks.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Tasks ({activeTasks.length})
                        </h3>
                    </div>
                    <div className="space-y-2.5">
                        {activeTasks.map((task) => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                onToggle={onToggle}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-t pt-4 border-gray-200 dark:border-gray-800">
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Completed ({completedTasks.length})
                        </h3>
                    </div>
                    <div className="space-y-2.5">
                        {completedTasks.map((task) => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                onToggle={onToggle}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

