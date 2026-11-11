import { useState, useRef, useEffect } from 'react';
import {
    Check,
    Edit2,
    Trash2,
    X,
    Save,
    AlertCircle,
    Calendar,
    Clock,
    Flag,
    Tag,
    ChevronDown,
    ChevronUp,
    Plus,
    ListTodo,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmDialog from '../ui/ConfirmDialog';
import { isOverdue, formatDue, toInputValue, fromInputValue } from '../../utils/dates';
import { subtaskProgress } from '../../utils/subtasks';

const MAX_TITLE_LENGTH = 120;
const MAX_DESC_LENGTH = 1000;
const MAX_SUBTASK_TITLE_LENGTH = 120;
const MAX_SUBTASKS = 30;

export default function TaskItem({
    task,
    categories = [],
    onToggle,
    onEdit,
    onDelete,
    onAddSubtask,
    onToggleSubtask,
    onRemoveSubtask,
    onOpenCategoryManager,
}) {
    const { isDark } = useTheme();

    // Inline Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editDescription, setEditDescription] = useState(task.description || '');
    const [editDueDate, setEditDueDate] = useState('');
    const [editDueTime, setEditDueTime] = useState('');
    const [editPriority, setEditPriority] = useState(task.priority || 'medium');
    const [editCategoryId, setEditCategoryId] = useState(task.categoryId || '');
    const [editError, setEditError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Subtasks Expand State
    const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [subtaskError, setSubtaskError] = useState('');

    // Delete Confirmation State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const editInputRef = useRef(null);

    // Sync state if external task changes
    useEffect(() => {
        if (!isEditing) {
            setEditTitle(task.title);
            setEditDescription(task.description || '');
            const { date, time } = toInputValue(task);
            setEditDueDate(date);
            setEditDueTime(time);
            setEditPriority(task.priority || 'medium');
            setEditCategoryId(task.categoryId || '');
        }
    }, [task, isEditing]);

    useEffect(() => {
        if (isEditing) {
            editInputRef.current?.focus();
            editInputRef.current?.select();
        }
    }, [isEditing]);

    const category = categories.find((c) => c.id === task.categoryId);
    const overdue = isOverdue(task);
    const dueLabel = formatDue(task);
    const { done: subtasksDone, total: subtasksTotal } = subtaskProgress(task);

    function handleStartEdit() {
        setEditTitle(task.title);
        setEditDescription(task.description || '');
        const { date, time } = toInputValue(task);
        setEditDueDate(date);
        setEditDueTime(time);
        setEditPriority(task.priority || 'medium');
        setEditCategoryId(task.categoryId || '');
        setEditError('');
        setIsEditing(true);
    }

    function handleCancelEdit() {
        setEditTitle(task.title);
        setEditDescription(task.description || '');
        const { date, time } = toInputValue(task);
        setEditDueDate(date);
        setEditDueTime(time);
        setEditPriority(task.priority || 'medium');
        setEditCategoryId(task.categoryId || '');
        setEditError('');
        setIsEditing(false);
    }

    async function handleSaveEdit(e) {
        if (e) e.preventDefault();
        const trimmedTitle = editTitle.trim();

        if (!trimmedTitle) {
            setEditError('Title is required.');
            editInputRef.current?.focus();
            return;
        }

        if (trimmedTitle.length > MAX_TITLE_LENGTH) {
            setEditError(`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);
            editInputRef.current?.focus();
            return;
        }

        const trimmedDesc = editDescription.trim();
        if (trimmedDesc.length > MAX_DESC_LENGTH) {
            setEditError(`Description must be ${MAX_DESC_LENGTH} characters or fewer.`);
            return;
        }

        const { dueAt, hasDueTime } = fromInputValue(editDueDate, editDueTime);

        try {
            setIsSaving(true);
            setEditError('');
            await onEdit(task.id, {
                title: trimmedTitle,
                description: trimmedDesc,
                dueAt,
                hasDueTime,
                priority: editPriority,
                categoryId: editCategoryId || null,
            });
            setIsEditing(false);
        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'Failed to update task.');
        } finally {
            setIsSaving(false);
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelEdit();
        } else if (e.key === 'Enter' && !e.shiftKey && e.target === editInputRef.current) {
            e.preventDefault();
            handleSaveEdit();
        }
    }

    async function handleAddSubtaskSubmit(e) {
        e.preventDefault();
        const trimmed = newSubtaskTitle.trim();
        if (!trimmed) return;

        if (subtasksTotal >= MAX_SUBTASKS) {
            setSubtaskError(`Max ${MAX_SUBTASKS} subtasks allowed.`);
            return;
        }

        if (trimmed.length > MAX_SUBTASK_TITLE_LENGTH) {
            setSubtaskError(`Title must be ${MAX_SUBTASK_TITLE_LENGTH} chars or fewer.`);
            return;
        }

        try {
            setSubtaskError('');
            if (onAddSubtask) {
                await onAddSubtask(task.id, trimmed);
            }
            setNewSubtaskTitle('');
        } catch (err) {
            setSubtaskError(err instanceof Error ? err.message : 'Failed to add subtask.');
        }
    }

    // Priority Styling Tokens
    const priorityColors = {
        high: {
            dot: 'bg-rose-500',
            badge: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
            label: 'High',
        },
        medium: {
            dot: 'bg-amber-500',
            badge: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
            label: 'Medium',
        },
        low: {
            dot: 'bg-emerald-500',
            badge: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            label: 'Low',
        },
    };
    const currentPriority = priorityColors[task.priority] || priorityColors.medium;

    return (
        <>
            <div
                className={`group rounded-2xl border p-4 transition-all duration-200 ${task.completed
                        ? isDark
                            ? 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
                            : 'bg-zinc-100/60 border-zinc-200 text-zinc-400'
                        : isDark
                            ? 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 text-zinc-100 shadow-xs'
                            : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 shadow-xs'
                    }`}
            >
                {isEditing ? (
                    /* Inline Editing Mode */
                    <form onSubmit={handleSaveEdit} onKeyDown={handleKeyDown} className="space-y-3.5">
                        {/* Title */}
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                Task Title
                            </label>
                            <input
                                ref={editInputRef}
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                disabled={isSaving}
                                placeholder="Task title (required)"
                                className={`w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none transition-all ${editError
                                        ? 'border-red-500 ring-2 ring-red-500/20'
                                        : isDark
                                            ? 'border-zinc-700 bg-zinc-800 text-white focus:border-indigo-500'
                                            : 'border-zinc-300 bg-white text-zinc-900 focus:border-indigo-500'
                                    }`}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                Description
                            </label>
                            <textarea
                                rows={2}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                disabled={isSaving}
                                placeholder="Task description (optional)"
                                className={`w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none transition-all ${isDark
                                        ? 'border-zinc-700 bg-zinc-800 text-white focus:border-indigo-500'
                                        : 'border-zinc-300 bg-white text-zinc-900 focus:border-indigo-500'
                                    }`}
                            />
                        </div>

                        {/* Due Date & Time, Priority, Category Inline Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                            {/* Date */}
                            <div>
                                <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={editDueDate}
                                    onChange={(e) => {
                                        setEditDueDate(e.target.value);
                                        if (!e.target.value) setEditDueTime('');
                                    }}
                                    disabled={isSaving}
                                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none ${isDark ? 'border-zinc-700 bg-zinc-800 text-white' : 'border-zinc-300 bg-white text-zinc-900'
                                        }`}
                                />
                            </div>

                            {/* Time */}
                            <div>
                                <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1">Time</label>
                                <input
                                    type="time"
                                    value={editDueTime}
                                    onChange={(e) => setEditDueTime(e.target.value)}
                                    disabled={isSaving || !editDueDate}
                                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none disabled:opacity-40 ${isDark ? 'border-zinc-700 bg-zinc-800 text-white' : 'border-zinc-300 bg-white text-zinc-900'
                                        }`}
                                />
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1">Priority</label>
                                <div className="flex items-center gap-1">
                                    {['high', 'medium', 'low'].map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setEditPriority(p)}
                                            className={`flex-1 py-1 px-1 rounded-md text-[11px] font-medium border capitalize ${editPriority === p
                                                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 font-bold'
                                                    : isDark
                                                        ? 'border-zinc-700 bg-zinc-800 text-zinc-400'
                                                        : 'border-zinc-300 bg-zinc-50 text-zinc-600'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1">Category</label>
                                <select
                                    value={editCategoryId}
                                    onChange={(e) => {
                                        if (e.target.value === '__new_category__') {
                                            if (onOpenCategoryManager) onOpenCategoryManager();
                                            return;
                                        }
                                        setEditCategoryId(e.target.value);
                                    }}
                                    disabled={isSaving}
                                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none ${isDark ? 'border-zinc-700 bg-zinc-800 text-white' : 'border-zinc-300 bg-white text-zinc-900'
                                        }`}
                                >
                                    <option value="">No Category</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                    <option value="__new_category__">+ New category...</option>
                                </select>
                            </div>
                        </div>

                        {editError && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{editError}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                                    }`}
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !editTitle.trim()}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>
                        </div>
                    </form>
                ) : (
                    /* Display Mode */
                    <div>
                        <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={task.completed}
                                aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                                onClick={() => onToggle(task.id)}
                                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${task.completed
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                        : isDark
                                            ? 'border-zinc-700 hover:border-indigo-500 bg-zinc-800/40'
                                            : 'border-zinc-300 hover:border-indigo-500 bg-white'
                                    }`}
                            >
                                {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>

                            {/* Task Content */}
                            <div className="flex-1 min-w-0">
                                {/* Title and Category/Priority Chips Header */}
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    {/* Priority Indicator with Dot AND Text Label */}
                                    <span
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${currentPriority.badge}`}
                                        title={`Priority: ${currentPriority.label}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${currentPriority.dot}`} />
                                        <span>{currentPriority.label}</span>
                                    </span>

                                    {/* Category Chip */}
                                    {category && (
                                        <span
                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/80"
                                        >
                                            <span
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ backgroundColor: category.color }}
                                            />
                                            <span className="truncate max-w-[120px]">{category.name}</span>
                                        </span>
                                    )}

                                    {/* Subtasks Progress Badge */}
                                    {subtasksTotal > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setIsSubtasksExpanded((prev) => !prev)}
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium border transition-colors cursor-pointer ${subtasksDone === subtasksTotal
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/80 hover:border-zinc-400'
                                                }`}
                                            title="Click to view subtasks"
                                        >
                                            <ListTodo className="w-3 h-3" />
                                            <span>
                                                {subtasksDone}/{subtasksTotal}
                                            </span>
                                            {isSubtasksExpanded ? (
                                                <ChevronUp className="w-3 h-3" />
                                            ) : (
                                                <ChevronDown className="w-3 h-3" />
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Title (Plain text only) */}
                                <h4
                                    onClick={() => !task.completed && handleStartEdit()}
                                    className={`text-sm sm:text-base font-semibold break-words leading-snug cursor-pointer transition-all ${task.completed
                                            ? 'line-through text-zinc-400 dark:text-zinc-500'
                                            : isDark
                                                ? 'text-zinc-100'
                                                : 'text-zinc-900'
                                        }`}
                                >
                                    {task.title}
                                </h4>

                                {/* Description (Plain text only) */}
                                {task.description && (
                                    <p
                                        className={`mt-1 text-xs sm:text-sm line-clamp-2 break-words leading-relaxed ${task.completed
                                                ? 'text-zinc-400/80 dark:text-zinc-600'
                                                : isDark
                                                    ? 'text-zinc-400'
                                                    : 'text-zinc-600'
                                            }`}
                                    >
                                        {task.description}
                                    </p>
                                )}

                                {/* Due Date Badge */}
                                {dueLabel && (
                                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                        <span
                                            className={`text-[11px] font-semibold ${overdue
                                                    ? 'text-rose-600 dark:text-rose-400 font-bold animate-pulse'
                                                    : isDark
                                                        ? 'text-zinc-400'
                                                        : 'text-zinc-600'
                                                }`}
                                        >
                                            {overdue ? `⚠️ ${dueLabel}` : dueLabel}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                    type="button"
                                    aria-label={`Toggle subtasks for "${task.title}"`}
                                    onClick={() => setIsSubtasksExpanded((prev) => !prev)}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isSubtasksExpanded
                                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                                            : isDark
                                                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                                                : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'
                                        }`}
                                    title="Subtasks"
                                >
                                    <ListTodo className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Edit task "${task.title}"`}
                                    onClick={handleStartEdit}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark
                                            ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                                            : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'
                                        }`}
                                    title="Edit task"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Delete task "${task.title}"`}
                                    onClick={() => setIsConfirmOpen(true)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    title="Delete task"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Expandable Subtask Checklist */}
                        {isSubtasksExpanded && (
                            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 space-y-2.5 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                        <ListTodo className="w-3.5 h-3.5" /> Subtasks ({subtasksDone}/{subtasksTotal})
                                    </span>
                                    <span className="text-[10px] text-zinc-400">Max {MAX_SUBTASKS}</span>
                                </div>

                                {/* Subtasks List */}
                                {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                                    <div className="space-y-1.5 pl-1">
                                        {task.subtasks.map((sub) => (
                                            <div
                                                key={sub.id}
                                                className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors group/sub"
                                            >
                                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(sub.done)}
                                                        onChange={() => onToggleSubtask && onToggleSubtask(task.id, sub.id)}
                                                        className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                                    />
                                                    <span
                                                        className={`text-xs break-words leading-tight ${sub.done
                                                                ? 'line-through text-zinc-400 dark:text-zinc-500'
                                                                : 'text-zinc-800 dark:text-zinc-200'
                                                            }`}
                                                    >
                                                        {sub.title}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveSubtask && onRemoveSubtask(task.id, sub.id)}
                                                    aria-label={`Remove subtask "${sub.title}"`}
                                                    className="opacity-0 group-hover/sub:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded transition-opacity cursor-pointer"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Subtask Input Form */}
                                {subtasksTotal < MAX_SUBTASKS && (
                                    <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-2 pt-1">
                                        <input
                                            type="text"
                                            value={newSubtaskTitle}
                                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                            placeholder="Add subtask... (Press Enter to add)"
                                            maxLength={MAX_SUBTASK_TITLE_LENGTH}
                                            className={`flex-1 px-3 py-1.5 rounded-xl border text-xs outline-none transition-all ${isDark
                                                    ? 'border-zinc-700 bg-zinc-800/80 text-white placeholder-zinc-500 focus:border-indigo-500'
                                                    : 'border-zinc-300 bg-zinc-50 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500'
                                                }`}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newSubtaskTitle.trim()}
                                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add</span>
                                        </button>
                                    </form>
                                )}

                                {subtaskError && (
                                    <p className="text-[11px] text-rose-500 font-medium">{subtaskError}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Confirm Dialog for Deletion */}
            <ConfirmDialog
                isOpen={isConfirmOpen}
                title="Delete Task"
                message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isDestructive={true}
                onConfirm={() => {
                    setIsConfirmOpen(false);
                    onDelete(task.id);
                }}
                onCancel={() => setIsConfirmOpen(false)}
            />
        </>
    );
}
