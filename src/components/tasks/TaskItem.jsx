import { useState, useRef, useEffect } from 'react';
import { Check, Edit2, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmDialog from '../ui/ConfirmDialog';

const MAX_TITLE_LENGTH = 120;
const MAX_DESC_LENGTH = 1000;

export default function TaskItem({ task, onToggle, onEdit, onDelete }) {
    const { isDark } = useTheme();
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editDescription, setEditDescription] = useState(task.description || '');
    const [editError, setEditError] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const editInputRef = useRef(null);

    // Sync state if external task prop changes
    useEffect(() => {
        if (!isEditing) {
            setEditTitle(task.title);
            setEditDescription(task.description || '');
        }
    }, [task.title, task.description, isEditing]);

    useEffect(() => {
        if (isEditing) {
            editInputRef.current?.focus();
            editInputRef.current?.select();
        }
    }, [isEditing]);

    function handleStartEdit() {
        setEditTitle(task.title);
        setEditDescription(task.description || '');
        setEditError('');
        setIsEditing(true);
    }

    function handleCancelEdit() {
        setEditTitle(task.title);
        setEditDescription(task.description || '');
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

        try {
            setIsSaving(true);
            setEditError('');
            await onEdit(task.id, {
                title: trimmedTitle,
                description: trimmedDesc,
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

    return (
        <>
            <div
                className={`group rounded-2xl border p-4 transition-all duration-200 ${task.completed
                        ? isDark
                            ? 'bg-gray-800/40 border-gray-800 text-gray-500'
                            : 'bg-gray-50/60 border-gray-200 text-gray-400'
                        : isDark
                            ? 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-100 shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-900 shadow-xs'
                    }`}
            >
                {isEditing ? (
                    <form onSubmit={handleSaveEdit} onKeyDown={handleKeyDown} className="space-y-3">
                        <div>
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
                                            ? 'border-gray-600 bg-gray-900 text-white focus:border-blue-500'
                                            : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500'
                                    }`}
                            />
                        </div>

                        <div>
                            <textarea
                                rows={2}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                disabled={isSaving}
                                placeholder="Task description (optional)"
                                className={`w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none transition-all ${isDark
                                        ? 'border-gray-600 bg-gray-900 text-white focus:border-blue-500'
                                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500'
                                    }`}
                            />
                        </div>

                        {editError && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{editError}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !editTitle.trim()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="flex items-start gap-3.5">
                        {/* Custom Checkbox */}
                        <button
                            type="button"
                            role="checkbox"
                            aria-checked={task.completed}
                            aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                            onClick={() => onToggle(task.id)}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${task.completed
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                    : isDark
                                        ? 'border-gray-600 hover:border-blue-500 bg-gray-900/40'
                                        : 'border-gray-300 hover:border-blue-500 bg-white'
                                }`}
                        >
                            {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        {/* Title and Description Preview (plain text only) */}
                        <div className="flex-1 min-w-0" onClick={() => !task.completed && handleStartEdit()}>
                            <h4
                                className={`text-base font-medium break-words leading-snug transition-all ${task.completed
                                        ? 'line-through text-gray-500 dark:text-gray-500'
                                        : isDark ? 'text-gray-100' : 'text-gray-900'
                                    }`}
                            >
                                {task.title}
                            </h4>

                            {task.description && (
                                <p
                                    className={`mt-1 text-sm line-clamp-2 break-words leading-relaxed ${task.completed
                                            ? 'text-gray-500/70 dark:text-gray-500/70'
                                            : isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}
                                >
                                    {task.description}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
                            <button
                                type="button"
                                aria-label={`Edit task "${task.title}"`}
                                onClick={handleStartEdit}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'
                                    }`}
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                aria-label={`Delete task "${task.title}"`}
                                onClick={() => setIsConfirmOpen(true)}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/10 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'
                                    }`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

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

