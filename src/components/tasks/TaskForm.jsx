import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const MAX_TITLE_LENGTH = 120;
const MAX_DESC_LENGTH = 1000;

const TaskForm = forwardRef(function TaskForm({ onAddTask }, ref) {
    const { isDark } = useTheme();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [titleError, setTitleError] = useState('');
    const [descError, setDescError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const titleInputRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus() {
            titleInputRef.current?.focus();
            titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
    }));

    function handleTitleChange(e) {
        const val = e.target.value;
        setTitle(val);

        if (val.length > MAX_TITLE_LENGTH) {
            setTitleError(`Title must be ${MAX_TITLE_LENGTH} characters or fewer (currently ${val.length}).`);
        } else {
            setTitleError('');
        }
    }

    function handleDescChange(e) {
        const val = e.target.value;
        setDescription(val);

        if (val.length > MAX_DESC_LENGTH) {
            setDescError(`Description must be ${MAX_DESC_LENGTH} characters or fewer (currently ${val.length}).`);
        } else {
            setDescError('');
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            setTitle('');
            setDescription('');
            setTitleError('');
            setDescError('');
        } else if (e.key === 'Enter' && !e.shiftKey && e.target === titleInputRef.current) {
            e.preventDefault();
            handleSubmit(e);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        // Prevent double submissions
        if (isSaving) return;

        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            setTitleError('Title is required and cannot be empty or spaces only.');
            titleInputRef.current?.focus();
            return;
        }

        if (trimmedTitle.length > MAX_TITLE_LENGTH) {
            setTitleError(`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);
            titleInputRef.current?.focus();
            return;
        }

        const trimmedDesc = description.trim();
        if (trimmedDesc.length > MAX_DESC_LENGTH) {
            setDescError(`Description must be ${MAX_DESC_LENGTH} characters or fewer.`);
            return;
        }

        try {
            setIsSaving(true);
            setTitleError('');
            setDescError('');
            await onAddTask({ title: trimmedTitle, description: trimmedDesc });
            setTitle('');
            setDescription('');
            titleInputRef.current?.focus();
        } catch (err) {
            setTitleError(err instanceof Error ? err.message : 'Failed to save task.');
        } finally {
            setIsSaving(false);
        }
    }

    const trimmedTitle = title.trim();
    const isAddDisabled = trimmedTitle.length === 0 || title.length > MAX_TITLE_LENGTH || description.length > MAX_DESC_LENGTH || isSaving;

    return (
        <form
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            className={`rounded-2xl border p-5 shadow-sm transition-colors mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
        >
            <div className="space-y-4">
                <div>
                    <label
                        htmlFor="task-title-input"
                        className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}
                    >
                        Task Title *
                    </label>
                    <input
                        ref={titleInputRef}
                        id="task-title-input"
                        type="text"
                        autoFocus
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="What needs to be done? (Press Enter to add, Esc to clear)"
                        disabled={isSaving}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none ${titleError
                                ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                                : isDark
                                    ? 'border-gray-700 bg-gray-900/60 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                    : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            }`}
                    />
                    {titleError && (
                        <p className="mt-1.5 text-xs text-red-500 font-medium">{titleError}</p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="task-description-input"
                        className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}
                    >
                        Description (Optional)
                    </label>
                    <textarea
                        id="task-description-input"
                        rows={2}
                        value={description}
                        onChange={handleDescChange}
                        placeholder="Add more details, links, or notes..."
                        disabled={isSaving}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none resize-none ${descError
                                ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                                : isDark
                                    ? 'border-gray-700 bg-gray-900/60 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                    : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            }`}
                    />
                    {descError && (
                        <p className="mt-1.5 text-xs text-red-500 font-medium">{descError}</p>
                    )}
                </div>

                <div className="flex items-center justify-between pt-1">
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {title.length}/{MAX_TITLE_LENGTH} chars
                    </span>

                    <button
                        type="submit"
                        disabled={isAddDisabled}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-sm"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Adding...</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                <span>Add Task</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
});

export default TaskForm;

