import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Plus, Loader2, Calendar, Clock, Flag, Tag } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { fromInputValue } from '../../utils/dates';

const MAX_TITLE_LENGTH = 120;
const MAX_DESC_LENGTH = 1000;

const TaskForm = forwardRef(function TaskForm({ onAddTask, categories = [], onOpenCategoryManager }, ref) {
    const { isDark } = useTheme();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [priority, setPriority] = useState('medium');
    const [categoryId, setCategoryId] = useState('');
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

    function handleDateChange(e) {
        const val = e.target.value;
        setDueDate(val);
        if (!val) {
            setDueTime('');
        }
    }

    function handleCategoryChange(e) {
        const val = e.target.value;
        if (val === '__new_category__') {
            if (onOpenCategoryManager) {
                onOpenCategoryManager();
            }
            return;
        }
        setCategoryId(val);
    }

    function clearForm() {
        setTitle('');
        setDescription('');
        setDueDate('');
        setDueTime('');
        setPriority('medium');
        setCategoryId('');
        setTitleError('');
        setDescError('');
    }

    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            clearForm();
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

        const { dueAt, hasDueTime } = fromInputValue(dueDate, dueTime);

        try {
            setIsSaving(true);
            setTitleError('');
            setDescError('');
            await onAddTask({
                title: trimmedTitle,
                description: trimmedDesc,
                dueAt,
                hasDueTime,
                priority,
                categoryId: categoryId || null,
                subtasks: [],
            });
            clearForm();
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
            className={`rounded-2xl border p-5 shadow-sm transition-colors mb-6 ${isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
        >
            <div className="space-y-4">
                {/* Title */}
                <div>
                    <label
                        htmlFor="task-title-input"
                        className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'
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
                                    ? 'border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                                    : 'border-zinc-300 bg-zinc-50 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                            }`}
                    />
                    {titleError && (
                        <p className="mt-1.5 text-xs text-red-500 font-medium">{titleError}</p>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label
                        htmlFor="task-description-input"
                        className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'
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
                                    ? 'border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                                    : 'border-zinc-300 bg-zinc-50 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                            }`}
                    />
                    {descError && (
                        <p className="mt-1.5 text-xs text-red-500 font-medium">{descError}</p>
                    )}
                </div>

                {/* Task Details Controls Grid: Due Date, Time, Priority, Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    {/* Due Date */}
                    <div>
                        <label
                            htmlFor="task-due-date"
                            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'
                                }`}
                        >
                            <Calendar className="w-3.5 h-3.5" /> Due Date
                        </label>
                        <input
                            id="task-due-date"
                            type="date"
                            value={dueDate}
                            onChange={handleDateChange}
                            disabled={isSaving}
                            className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-all ${isDark
                                    ? 'border-zinc-700 bg-zinc-800/60 text-white focus:border-indigo-500'
                                    : 'border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-indigo-500'
                                }`}
                        />
                    </div>

                    {/* Due Time (Optional, only enabled if date selected) */}
                    <div>
                        <label
                            htmlFor="task-due-time"
                            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'
                                }`}
                        >
                            <Clock className="w-3.5 h-3.5" /> Time (Optional)
                        </label>
                        <input
                            id="task-due-time"
                            type="time"
                            value={dueTime}
                            onChange={(e) => setDueTime(e.target.value)}
                            disabled={isSaving || !dueDate}
                            className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isDark
                                    ? 'border-zinc-700 bg-zinc-800/60 text-white focus:border-indigo-500'
                                    : 'border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-indigo-500'
                                }`}
                        />
                    </div>

                    {/* Priority Selector */}
                    <div>
                        <span
                            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'
                                }`}
                        >
                            <Flag className="w-3.5 h-3.5" /> Priority
                        </span>
                        <div className="flex items-center gap-1">
                            {/* High */}
                            <button
                                type="button"
                                onClick={() => setPriority('high')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${priority === 'high'
                                        ? 'bg-rose-500/15 border-rose-500 text-rose-500 dark:text-rose-400 shadow-xs'
                                        : isDark
                                            ? 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600'
                                            : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                                    }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                <span>High</span>
                            </button>

                            {/* Medium */}
                            <button
                                type="button"
                                onClick={() => setPriority('medium')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${priority === 'medium'
                                        ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                                        : isDark
                                            ? 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600'
                                            : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                                    }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>Medium</span>
                            </button>

                            {/* Low */}
                            <button
                                type="button"
                                onClick={() => setPriority('low')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${priority === 'low'
                                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                        : isDark
                                            ? 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600'
                                            : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                                    }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>Low</span>
                            </button>
                        </div>
                    </div>

                    {/* Category Selector */}
                    <div>
                        <label
                            htmlFor="task-category-select"
                            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'
                                }`}
                        >
                            <Tag className="w-3.5 h-3.5" /> Category
                        </label>
                        <select
                            id="task-category-select"
                            value={categoryId}
                            onChange={handleCategoryChange}
                            disabled={isSaving}
                            className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-all cursor-pointer ${isDark
                                    ? 'border-zinc-700 bg-zinc-800/80 text-white focus:border-indigo-500'
                                    : 'border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-indigo-500'
                                }`}
                        >
                            <option value="">No Category</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                            <option value="__new_category__">+ New category...</option>
                        </select>
                    </div>
                </div>

                {/* Footer Submit Row */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                    <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {title.length}/{MAX_TITLE_LENGTH} chars
                    </span>

                    <button
                        type="submit"
                        disabled={isAddDisabled}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-sm cursor-pointer"
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
