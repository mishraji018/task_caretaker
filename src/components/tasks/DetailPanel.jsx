import { X, CheckCircle2, FileText } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import TaskItem from './TaskItem';

/**
 * Laptop right-side Detail Panel for the selected task.
 * - Uses the SAME TaskItem component (no duplicated code).
 * - Displays an empty hint when no task is selected.
 * - Close button clears selection.
 *
 * @param {object} props
 * @param {object | null} props.task
 * @param {Array<object>} props.categories
 * @param {() => void} props.onClose
 * @param {(id: string) => void} props.onToggle
 * @param {(id: string, patch: object) => Promise<void>} props.onEdit
 * @param {(id: string) => Promise<void>} props.onDelete
 * @param {(taskId: string, title: string) => Promise<void>} props.onAddSubtask
 * @param {(taskId: string, subtaskId: string) => Promise<void>} props.onToggleSubtask
 * @param {(taskId: string, subtaskId: string) => Promise<void>} props.onRemoveSubtask
 * @param {() => void} props.onOpenCategoryManager
 */
export default function DetailPanel({
    task,
    categories = [],
    onClose,
    onToggle,
    onEdit,
    onDelete,
    onAddSubtask,
    onToggleSubtask,
    onRemoveSubtask,
    onOpenCategoryManager,
}) {
    const { isDark } = useTheme();

    return (
        <aside
            aria-label="Task Details Panel"
            className={`hidden lg:flex flex-col w-88 xl:w-96 border-l shrink-0 transition-colors ${
                isDark ? 'bg-zinc-950 border-zinc-800/80 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
        >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
                isDark ? 'border-zinc-800/60' : 'border-zinc-200'
            }`}>
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <h3 className="font-bold text-sm tracking-tight">Task Details</h3>
                </div>
                {task && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close details"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                        }`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {task ? (
                    <div className="space-y-4">
                        <TaskItem
                            key={task.id}
                            task={task}
                            categories={categories}
                            isSelected={true}
                            forceExpandedSubtasks={true}
                            onToggle={onToggle}
                            onEdit={onEdit}
                            onDelete={(id) => {
                                onDelete(id);
                                onClose();
                            }}
                            onAddSubtask={onAddSubtask}
                            onToggleSubtask={onToggleSubtask}
                            onRemoveSubtask={onRemoveSubtask}
                            onOpenCategoryManager={onOpenCategoryManager}
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            isDark ? 'bg-zinc-900 text-zinc-500' : 'bg-zinc-100 text-zinc-400'
                        }`}>
                            <CheckCircle2 className="w-6 h-6 stroke-[1.5]" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">No task selected</p>
                            <p className={`text-xs mt-1 max-w-[200px] ${
                                isDark ? 'text-zinc-500' : 'text-zinc-400'
                            }`}>
                                Click on any task in the list to inspect details, checklist, and notes.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}

