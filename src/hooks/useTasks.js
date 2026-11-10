import { useState, useEffect, useCallback, useRef } from 'react';
import { taskService, STORAGE_KEY } from '../services/taskService';

export function useTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [corruptNotice, setCorruptNotice] = useState(false);
    const [isStorageBlocked, setIsStorageBlocked] = useState(false);

    const isSubmittingRef = useRef(false);

    const loadTasks = useCallback(() => {
        try {
            const data = taskService.getAll();
            setTasks(data);
            if (taskService.hasCorruptedData()) {
                setCorruptNotice(true);
            }
            if (!taskService.isStorageWorking()) {
                setIsStorageBlocked(true);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tasks.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    // Multi-tab synchronization
    useEffect(() => {
        function handleStorageChange(event) {
            if (event.key === STORAGE_KEY) {
                loadTasks();
            }
        }

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [loadTasks]);

    /**
     * Add task with optimistic update & rollback
     */
    const addTask = useCallback(async ({ title, description }) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setError(null);

        const previousTasks = [...tasks];
        try {
            const created = taskService.create({ title, description });
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

    const dismissCorruptNotice = useCallback(() => {
        taskService.dismissCorruptedNotice();
        setCorruptNotice(false);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
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
    };
}

export default useTasks;

