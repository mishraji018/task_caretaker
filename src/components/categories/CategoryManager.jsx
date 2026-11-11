import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Edit2, Check, AlertCircle, Tag } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmDialog from '../ui/ConfirmDialog';

const PRESET_COLORS = [
    '#8B5CF6', // Violet
    '#6366F1', // Indigo
    '#3B82F6', // Blue
    '#06B6D4', // Cyan
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#EC4899', // Pink
];

export default function CategoryManager({
    isOpen,
    onClose,
    categories,
    tasks,
    onAddCategory,
    onRenameCategory,
    onDeleteCategory,
}) {
    const { isDark } = useTheme();
    const [newName, setNewName] = useState('');
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
    const [error, setError] = useState('');

    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [editingError, setEditingError] = useState('');

    const [categoryToDelete, setCategoryToDelete] = useState(null);

    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleModalClose = useCallback(() => {
        setNewName('');
        setError('');
        setEditingId(null);
        onClose();
    }, [onClose]);

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape' && isOpen && !categoryToDelete) {
                e.preventDefault();
                handleModalClose();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, categoryToDelete, handleModalClose]);

    if (!isOpen) return null;

    function handleCreate(e) {
        e.preventDefault();
        const trimmed = newName.trim();
        if (!trimmed) {
            setError('Category name cannot be empty.');
            return;
        }

        try {
            setError('');
            onAddCategory(trimmed, selectedColor);
            setNewName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create category.');
        }
    }

    function handleStartRename(cat) {
        setEditingId(cat.id);
        setEditingName(cat.name);
        setEditingError('');
    }

    function handleSaveRename(id) {
        const trimmed = editingName.trim();
        if (!trimmed) {
            setEditingError('Name cannot be empty.');
            return;
        }

        try {
            setEditingError('');
            onRenameCategory(id, trimmed);
            setEditingId(null);
        } catch (err) {
            setEditingError(err instanceof Error ? err.message : 'Failed to rename category.');
        }
    }

    function promptDelete(cat) {
        setCategoryToDelete(cat);
    }

    function confirmDelete() {
        if (!categoryToDelete) return;
        onDeleteCategory(categoryToDelete.id);
        setCategoryToDelete(null);
    }

    const affectedTasksCount = categoryToDelete
        ? tasks.filter((t) => t.categoryId === categoryToDelete.id).length
        : 0;

    return (
        <>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
                role="dialog"
                aria-modal="true"
                aria-labelledby="category-manager-title"
                onClick={handleModalClose}
            >
                <div
                    className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border transition-all ${isDark
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                            : 'bg-white border-zinc-200 text-zinc-900'
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                                <Tag className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 id="category-manager-title" className="text-base font-bold">
                                    Manage Categories
                                </h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Organize tasks by project or context
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleModalClose}
                            aria-label="Close category manager"
                            className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Create New Category Form */}
                    <form onSubmit={handleCreate} className="mt-4 space-y-3">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                Add New Category
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Category name (e.g. Work, Study, Health)"
                                    maxLength={30}
                                    className={`flex-1 px-3.5 py-2 rounded-xl border text-sm outline-none transition-all ${isDark
                                            ? 'border-zinc-700 bg-zinc-800/80 text-white placeholder-zinc-500 focus:border-indigo-500'
                                            : 'border-zinc-300 bg-zinc-50 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500'
                                        }`}
                                />
                                <button
                                    type="submit"
                                    disabled={!newName.trim()}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add</span>
                                </button>
                            </div>
                            {error && (
                                <p className="mt-1 text-xs text-rose-500 font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> {error}
                                </p>
                            )}
                        </div>

                        {/* Preset Color Chips */}
                        <div>
                            <span className="block text-[11px] font-medium text-zinc-400 mb-1.5">Color Tag</span>
                            <div className="flex items-center gap-2 flex-wrap">
                                {PRESET_COLORS.map((col) => (
                                    <button
                                        key={col}
                                        type="button"
                                        onClick={() => setSelectedColor(col)}
                                        aria-label={`Select color ${col}`}
                                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${selectedColor === col ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500 ring-offset-white dark:ring-offset-zinc-900' : 'hover:scale-110'
                                            }`}
                                        style={{ backgroundColor: col }}
                                    />
                                ))}
                            </div>
                        </div>
                    </form>

                    {/* Existing Categories List */}
                    <div className="mt-6">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                            Existing Categories ({categories.length})
                        </h4>
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            {categories.length === 0 ? (
                                <p className="text-xs text-zinc-400 py-3 text-center">
                                    No categories created yet.
                                </p>
                            ) : (
                                categories.map((cat) => {
                                    const count = tasks.filter((t) => t.categoryId === cat.id).length;
                                    const isEditing = editingId === cat.id;

                                    return (
                                        <div
                                            key={cat.id}
                                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${isDark
                                                    ? 'bg-zinc-800/40 border-zinc-800 hover:border-zinc-700'
                                                    : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
                                                <span
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: cat.color }}
                                                />
                                                {isEditing ? (
                                                    <div className="flex-1 min-w-0">
                                                        <input
                                                            type="text"
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            maxLength={30}
                                                            autoFocus
                                                            className="w-full px-2 py-1 rounded-lg text-xs border border-indigo-500 bg-white dark:bg-zinc-900 outline-none text-zinc-900 dark:text-white"
                                                        />
                                                        {editingError && (
                                                            <p className="text-[10px] text-rose-500 mt-0.5">{editingError}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-xs font-semibold truncate text-zinc-900 dark:text-zinc-100">
                                                            {cat.name}
                                                        </span>
                                                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400 font-mono">
                                                            {count} {count === 1 ? 'task' : 'tasks'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveRename(cat.id)}
                                                            aria-label="Save rename"
                                                            className="p-1 rounded-lg text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingId(null)}
                                                            aria-label="Cancel rename"
                                                            className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartRename(cat)}
                                                            aria-label={`Rename category "${cat.name}"`}
                                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 cursor-pointer"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => promptDelete(cat)}
                                                            aria-label={`Delete category "${cat.name}"`}
                                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Footer Close */}
                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            onClick={handleModalClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirm Category Deletion Dialog */}
            <ConfirmDialog
                isOpen={Boolean(categoryToDelete)}
                title="Delete Category"
                message={
                    categoryToDelete
                        ? `Deleting "${categoryToDelete.name}" will set ${affectedTasksCount} task(s) to Uncategorised. No tasks will be deleted. Are you sure?`
                        : ''
                }
                confirmLabel="Delete Category"
                cancelLabel="Cancel"
                isDestructive={true}
                onConfirm={confirmDelete}
                onCancel={() => setCategoryToDelete(null)}
            />
        </>
    );
}
