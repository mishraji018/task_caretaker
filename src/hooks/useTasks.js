import { useState, useEffect, useCallback, useRef } from 'react';
import { taskService, STORAGE_KEY } from '../services/taskService.js';
import { categoryService } from '../services/categoryService.js';
import { CATEGORIES_KEY } from '../constants/storageKeys.js';
import { addSubtask, toggleSubtask, removeSubtask } from '../utils/subtasks.js';

export function useTasks() {
    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [corruptNotice, setCorruptNotice] = useState(false);
    const [futureVersionNotice, setFutureVersionNotice] = useState(false);
    const [isStorageBlocked, setIsStorageBlocked] = useState(false);

    const isSubmittingRef = useRef(false);

    const loadData = useCallback(() => {
        try {
            const data = taskService.getAll();
            setTasks(data);

            const cats = categoryService.getAll();
            setCategories(cats);

            if (taskService.hasCorruptedData()) {
                setCorruptNotice(true);
            }
            if (taskService.hasFutureVersion()) {
                setFutureVersionNotice(true);
            }
            if (!taskService.isStorageWorking()) {
                setIsStorageBlocked(true);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load task data.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Multi-tab synchronization for tasks and categories
    useEffect(() => {
        function handleStorageChange(event) {
            if (event.key === STORAGE_KEY || event.key === CATEGORIES_KEY) {
                loadData();
            }
        }

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [loadData]);

    // In-app task updates listener (e.g. from Toast Undo across navigation)
    useEffect(() => {
        const unsubscribe = taskService.subscribe(() => {
            loadData();
        });
        return unsubscribe;
    }, [loadData]);

    /**
     * Add task with optimistic update & rollback
     */
    const addTask = useCallback(async (taskInput) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setError(null);

        const previousTasks = [...tasks];
        try {
            const created = taskService.create(taskInput);
            setTasks((prev) => [created, ...prev]);

            if (!taskService.isStorageWorking()) {
                setIsStorageBlocked(true);
            }
            return created;
        } catch (err) {
            setTasks(previousTasks);
            const message = err instanceof Error ? err.message : 'Could not add task.';
            setError(message);
            throw err;
        } finally {
            isSubmittingRef.current = false;
        }
    }, [tasks]);

    /**
     * Edit task with optimistic update & rollback
     */
    const editTask = useCallback(async (id, patch) => {
        setError(null);
        const previousTasks = [...tasks];

        // Optimistic update
        setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t))
        );

        try {
            const updated = taskService.update(id, patch);
            setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

            if (!taskService.isStorageWorking()) {
                setIsStorageBlocked(true);
            }
            return updated;
        } catch (err) {
            setTasks(previousTasks);
            const message = err instanceof Error ? err.message : 'Could not update task.';
            setError(message);
            throw err;
        }
    }, [tasks]);

    /**
     * Toggle completion status
     */
    const toggleTask = useCallback(async (id) => {
        setError(null);
        const taskToToggle = tasks.find((t) => t.id === id);
        if (!taskToToggle) {
            setError('Task not found.');
            return;
        }

        const newCompleted = !taskToToggle.completed;
        const previousTasks = [...tasks];

        // Optimistic update
        setTasks((prev) =>
            prev.map((t) =>
                t.id === id
                    ? {
                        ...t,
                        completed: newCompleted,
                        completedAt: newCompleted ? new Date().toISOString() : null,
                        updatedAt: new Date().toISOString(),
                    }
                    : t
            )
        );

        try {
            const updated = taskService.update(id, { completed: newCompleted });
            setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

            if (!taskService.isStorageWorking()) {
                setIsStorageBlocked(true);
            }
        } catch (err) {
            setTasks(previousTasks);
            const message = err instanceof Error ? err.message : 'Could not toggle task.';
            setError(message);
        }
    }, [tasks]);

    /**
     * Delete task with optimistic update & rollback
     */
    const deleteTask = useCallback(async (id) => {
        setError(null);
        const previousTasks = [...tasks];

        // Optimistic update
        setTasks((prev) => prev.filter((t) => t.id !== id));

        try {
            taskService.remove(id);
            if (!taskService.isStorageWorking()) {
                setIsStorageBlocked(true);
            }
        } catch (err) {
            setTasks(previousTasks);
            const message = err instanceof Error ? err.message : 'Could not delete task.';
            setError(message);
        }
    }, [tasks]);

    /**
     * Subtask management actions
     */
    const handleAddSubtask = useCallback(async (taskId, title) => {
        setError(null);
        const currentTask = tasks.find((t) => t.id === taskId);
        if (!currentTask) return;

        try {
            const updatedTask = addSubtask(currentTask, title);
            await editTask(taskId, { subtasks: updatedTask.subtasks });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add subtask.';
            setError(message);
            throw err;
        }
    }, [tasks, editTask]);

    const handleToggleSubtask = useCallback(async (taskId, subtaskId) => {
        setError(null);
        const currentTask = tasks.find((t) => t.id === taskId);
        if (!currentTask) return;

        try {
            const updatedTask = toggleSubtask(currentTask, subtaskId);
            await editTask(taskId, { subtasks: updatedTask.subtasks });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to toggle subtask.';
            setError(message);
        }
    }, [tasks, editTask]);

    const handleRemoveSubtask = useCallback(async (taskId, subtaskId) => {
        setError(null);
        const currentTask = tasks.find((t) => t.id === taskId);
        if (!currentTask) return;

        try {
            const updatedTask = removeSubtask(currentTask, subtaskId);
            await editTask(taskId, { subtasks: updatedTask.subtasks });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to remove subtask.';
            setError(message);
        }
    }, [tasks, editTask]);

    /**
     * Category actions
     */
    const addCategory = useCallback((name, color) => {
        setError(null);
        try {
            const newCat = categoryService.create(name, color);
            setCategories(categoryService.getAll());
            return newCat;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to create category.';
            setError(msg);
            throw err;
        }
    }, []);

    const renameCategory = useCallback((id, name) => {
        setError(null);
        try {
            const updatedCat = categoryService.rename(id, name);
            setCategories(categoryService.getAll());
            return updatedCat;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to rename category.';
            setError(msg);
            throw err;
        }
    }, []);

    const deleteCategory = useCallback((id) => {
        setError(null);
        try {
            categoryService.remove(id);
            setCategories(categoryService.getAll());
            // Refresh tasks since category was nullified on matching tasks
            setTasks(taskService.getAll());
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete category.';
            setError(msg);
            throw err;
        }
    }, []);

    const dismissCorruptNotice = useCallback(() => {
        taskService.dismissCorruptedNotice();
        setCorruptNotice(false);
    }, []);

    const restoreTask = useCallback((task) => {
        try {
            return taskService.restore(task);
        } catch {
            return null;
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
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
        restoreTask,
        addSubtask: handleAddSubtask,
        toggleSubtask: handleToggleSubtask,
        removeSubtask: handleRemoveSubtask,
        addCategory,
        renameCategory,
        deleteCategory,
        reloadCategories: () => setCategories(categoryService.getAll()),
    };
}

export default useTasks;
