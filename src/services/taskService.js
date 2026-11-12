import { TASKS_KEY, CORRUPT_KEY, STORAGE_KEY } from '../constants/storageKeys.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { validateTitle, validateDescription } from '../utils/validation.js';
import { migrateTasks, hasFutureVersionDetected } from './migrations.js';
import { categoryService } from './categoryService.js';

export { TASKS_KEY, CORRUPT_KEY, STORAGE_KEY, ValidationError, NotFoundError, validateTitle, validateDescription };

/**
 * @typedef {Object} Subtask
 * @property {string} id - Stable subtask identifier
 * @property {string} title - Subtask title (1-120 characters)
 * @property {boolean} done - Completion flag
 */

/**
 * @typedef {Object} Task
 * @property {string} id - Stable unique identifier (UUID v4)
 * @property {string} title - Task title (1-120 characters)
 * @property {string} description - Optional task details (up to 1000 characters)
 * @property {boolean} completed - Completion status
 * @property {string | null} completedAt - ISO timestamp when completed, null otherwise
 * @property {string} createdAt - ISO timestamp when created
 * @property {string} updatedAt - ISO timestamp when last modified
 * @property {string | null} dueAt - ISO string in UTC or null
 * @property {boolean} hasDueTime - false = date only (end of local day), true = specific time
 * @property {'high' | 'medium' | 'low'} priority - Task priority (default 'medium')
 * @property {string | null} categoryId - Reference to Category id or null
 * @property {Subtask[]} subtasks - Subtask items (max 30)
 * @property {number} schemaVersion - Schema version identifier (2)
 */

const VALID_PRIORITIES = ['high', 'medium', 'low'];
const MAX_SUBTASKS = 30;

// In-memory fallback if localStorage is disabled, blocked, or full
let memoryStore = [];
let corruptedDetected = false;
let quotaExceededDetected = false;
const listeners = new Set();

function notifyListeners() {
    listeners.forEach((fn) => {
        try {
            fn();
        } catch {
            // Safe listener execution
        }
    });
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
            window.dispatchEvent(new CustomEvent('taskcaretaker:tasks-updated'));
        } catch {
            // Ignore event dispatch errors safely
        }
    }
}

function isStorageSupported() {
    if (quotaExceededDetected) {
        return false;
    }
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return false;
        }
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

function isValidTask(item) {
    return (
        item !== null &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        item.id.trim().length > 0 &&
        typeof item.title === 'string' &&
        typeof item.completed === 'boolean'
    );
}

function normalizeTask(raw) {
    const rawPriority = String(raw.priority || '').toLowerCase();
    const priority = VALID_PRIORITIES.includes(rawPriority) ? rawPriority : 'medium';

    let dueAt = null;
    let hasDueTime = false;
    if (typeof raw.dueAt === 'string' && raw.dueAt.trim()) {
        const d = new Date(raw.dueAt);
        if (!isNaN(d.getTime())) {
            dueAt = d.toISOString();
            hasDueTime = Boolean(raw.hasDueTime);
        }
    }

    const categoryId = typeof raw.categoryId === 'string' && raw.categoryId.trim() ? raw.categoryId.trim() : null;

    let subtasks = [];
    if (Array.isArray(raw.subtasks)) {
        subtasks = raw.subtasks.slice(0, MAX_SUBTASKS).map((sub, idx) => ({
            id: typeof sub.id === 'string' && sub.id.trim() ? sub.id : `subtask-${Date.now()}-${idx}`,
            title: typeof sub.title === 'string' ? sub.title.trim().slice(0, 120) : '',
            done: Boolean(sub.done),
        })).filter((s) => s.title.length > 0);
    }

    return {
        id: raw.id,
        title: String(raw.title || ''),
        description: typeof raw.description === 'string' ? raw.description : '',
        completed: Boolean(raw.completed),
        completedAt: raw.completedAt ? String(raw.completedAt) : null,
        createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
        updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString(),
        dueAt,
        hasDueTime,
        priority,
        categoryId,
        subtasks,
        schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 2,
    };
}

function persist(tasks) {
    memoryStore = tasks;

    if (!isStorageSupported()) {
        notifyListeners();
        return;
    }

    try {
        const serialized = JSON.stringify(tasks);
        window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
        // Storage full (quota exceeded) or blocked
        quotaExceededDetected = true;
    }

    notifyListeners();
}

// Connect category service to nullify removed categories across tasks
categoryService.setOnCategoryRemovedListener((categoryId) => {
    taskService.clearCategoryFromTasks(categoryId);
});

export const taskService = {
    /**
     * Returns true if localStorage is working, false if running in-memory only.
     * @returns {boolean}
     */
    isStorageWorking() {
        return isStorageSupported();
    },

    /**
     * Checks if corrupted storage was detected on load.
     * @returns {boolean}
     */
    hasCorruptedData() {
        return corruptedDetected;
    },

    /**
     * Clears the corrupted storage notice flag.
     */
    dismissCorruptedNotice() {
        corruptedDetected = false;
    },

    /**
     * Checks if a future schema version was encountered.
     * @returns {boolean}
     */
    hasFutureVersion() {
        return hasFutureVersionDetected();
    },

    /**
     * Sets categoryId to null on all tasks using the given category.
     * Never deletes the tasks.
     * @param {string} categoryId
     */
    clearCategoryFromTasks(categoryId) {
        if (!categoryId) return;
        const currentTasks = this.getAll();
        let changed = false;
        const updated = currentTasks.map((t) => {
            if (t.categoryId === categoryId) {
                changed = true;
                return { ...t, categoryId: null, updatedAt: new Date().toISOString() };
            }
            return t;
        });

        if (changed) {
            persist(updated);
        }
    },

    /**
     * Retrieves all tasks.
     * Automatically applies migrations (v1 -> v2) and drops corrupt items; never throws.
     * @returns {Task[]}
     */
    getAll() {
        if (!isStorageSupported()) {
            return [...memoryStore];
        }

        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return [...memoryStore];
            }

            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch {
                // Corrupted JSON: backup bad value, record flag, clear key
                corruptedDetected = true;
                try {
                    window.localStorage.setItem(CORRUPT_KEY, raw);
                    window.localStorage.removeItem(STORAGE_KEY);
                } catch {
                    // Ignore storage backup errors
                }
                memoryStore = [];
                return [];
            }

            if (!Array.isArray(parsed)) {
                corruptedDetected = true;
                try {
                    window.localStorage.setItem(CORRUPT_KEY, raw);
                    window.localStorage.removeItem(STORAGE_KEY);
                } catch {
                    // Ignore storage backup errors
                }
                memoryStore = [];
                return [];
            }

            // Run automated Schema v1 -> v2 migration
            const migrationResult = migrateTasks(parsed);
            if (migrationResult.migrated) {
                persist(migrationResult.tasks);
            }

            // Filter valid tasks and normalize
            const valid = migrationResult.tasks.filter(isValidTask).map(normalizeTask);
            memoryStore = valid;
            return valid;
        } catch {
            return [...memoryStore];
        }
    },

    /**
     * Creates a new task.
     * Trims both; title required (1-120 chars); description max 1000 chars.
     * Validates dueAt, hasDueTime, priority, categoryId, subtasks.
     * Throws ValidationError with a readable message.
     * @param {{
     *   title: string,
     *   description?: string,
     *   dueAt?: string | null,
     *   hasDueTime?: boolean,
     *   priority?: 'high' | 'medium' | 'low',
     *   categoryId?: string | null,
     *   subtasks?: Array<{ id?: string, title: string, done?: boolean }>
     * }} input
     * @returns {Task}
     */
    create({
        title,
        description = '',
        dueAt = null,
        hasDueTime = false,
        priority = 'medium',
        categoryId = null,
        subtasks = [],
    }) {
        const trimmedTitle = validateTitle(title);
        const trimmedDescription = validateDescription(description);

        // Validate Priority
        let validPriority = 'medium';
        if (priority) {
            const lowerPriority = String(priority).toLowerCase();
            if (!VALID_PRIORITIES.includes(lowerPriority)) {
                throw new ValidationError('Priority must be one of: high, medium, low.');
            }
            validPriority = lowerPriority;
        }

        // Validate Due Date
        let validDueAt = null;
        let validHasDueTime = false;
        if (dueAt !== null && dueAt !== undefined && String(dueAt).trim() !== '') {
            const d = new Date(dueAt);
            if (isNaN(d.getTime())) {
                validDueAt = null;
                validHasDueTime = false;
            } else {
                validDueAt = d.toISOString();
                validHasDueTime = Boolean(hasDueTime);
            }
        }

        // Validate Category ID
        let validCategoryId = null;
        if (typeof categoryId === 'string' && categoryId.trim()) {
            const cat = categoryService.getById(categoryId.trim());
            validCategoryId = cat ? cat.id : null;
        }

        // Validate Subtasks
        let validSubtasks = [];
        if (Array.isArray(subtasks)) {
            if (subtasks.length > MAX_SUBTASKS) {
                throw new ValidationError(`Cannot exceed ${MAX_SUBTASKS} subtasks.`);
            }
            validSubtasks = subtasks.map((sub, idx) => {
                if (!sub || typeof sub !== 'object') {
                    return null;
                }
                const subTitle = typeof sub.title === 'string' ? sub.title.trim() : '';
                if (!subTitle) return null;
                if (subTitle.length > 120) {
                    throw new ValidationError('Subtask title must be 120 characters or fewer.');
                }
                return {
                    id: typeof sub.id === 'string' && sub.id.trim() ? sub.id : `subtask-${Date.now()}-${idx}`,
                    title: subTitle,
                    done: Boolean(sub.done),
                };
            }).filter(Boolean);
        }

        const now = new Date().toISOString();
        const newTask = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            title: trimmedTitle,
            description: trimmedDescription,
            completed: false,
            completedAt: null,
            createdAt: now,
            updatedAt: now,
            dueAt: validDueAt,
            hasDueTime: validHasDueTime,
            priority: validPriority,
            categoryId: validCategoryId,
            subtasks: validSubtasks,
            schemaVersion: 2,
        };

        const existing = this.getAll();
        const updated = [newTask, ...existing];
        persist(updated);

        return newTask;
    },

    /**
     * Updates an existing task by id.
     * Supports title, description, completed, dueAt, hasDueTime, priority, categoryId, subtasks.
     * Always sets updatedAt. Sets completedAt when completed becomes true, clears when false.
     * Throws NotFoundError if the id does not exist.
     * @param {string} id
     * @param {Partial<Task>} patch
     * @returns {Task}
     */
    update(id, patch) {
        if (!id || typeof id !== 'string') {
            throw new NotFoundError('Task ID is required.');
        }

        const tasks = this.getAll();
        const index = tasks.findIndex((t) => t.id === id);

        if (index === -1) {
            throw new NotFoundError(`Task with id "${id}" was not found (it may have been deleted in another tab).`);
        }

        const current = tasks[index];
        const updated = { ...current };

        if ('title' in patch) {
            updated.title = validateTitle(patch.title);
        }

        if ('description' in patch) {
            updated.description = validateDescription(patch.description);
        }

        if ('completed' in patch && typeof patch.completed === 'boolean') {
            if (patch.completed !== current.completed) {
                updated.completed = patch.completed;
                updated.completedAt = patch.completed ? new Date().toISOString() : null;
            }
        }

        if ('priority' in patch) {
            const rawPriority = String(patch.priority).toLowerCase();
            if (!VALID_PRIORITIES.includes(rawPriority)) {
                throw new ValidationError('Priority must be one of: high, medium, low.');
            }
            updated.priority = rawPriority;
        }

        if ('dueAt' in patch) {
            if (patch.dueAt === null || patch.dueAt === undefined || String(patch.dueAt).trim() === '') {
                updated.dueAt = null;
                updated.hasDueTime = false;
            } else {
                const d = new Date(patch.dueAt);
                if (isNaN(d.getTime())) {
                    updated.dueAt = null;
                    updated.hasDueTime = false;
                } else {
                    updated.dueAt = d.toISOString();
                    if ('hasDueTime' in patch) {
                        updated.hasDueTime = Boolean(patch.hasDueTime);
                    }
                }
            }
        } else if ('hasDueTime' in patch) {
            updated.hasDueTime = updated.dueAt ? Boolean(patch.hasDueTime) : false;
        }

        if ('categoryId' in patch) {
            if (patch.categoryId === null || patch.categoryId === undefined || String(patch.categoryId).trim() === '') {
                updated.categoryId = null;
            } else {
                const cat = categoryService.getById(String(patch.categoryId).trim());
                updated.categoryId = cat ? cat.id : null;
            }
        }

        if ('subtasks' in patch) {
            if (!Array.isArray(patch.subtasks)) {
                updated.subtasks = [];
            } else {
                if (patch.subtasks.length > MAX_SUBTASKS) {
                    throw new ValidationError(`Cannot exceed ${MAX_SUBTASKS} subtasks.`);
                }
                updated.subtasks = patch.subtasks.map((sub, idx) => {
                    if (!sub || typeof sub !== 'object') return null;
                    const subTitle = typeof sub.title === 'string' ? sub.title.trim() : '';
                    if (!subTitle) return null;
                    if (subTitle.length > 120) {
                        throw new ValidationError('Subtask title must be 120 characters or fewer.');
                    }
                    return {
                        id: typeof sub.id === 'string' && sub.id.trim() ? sub.id : `subtask-${Date.now()}-${idx}`,
                        title: subTitle,
                        done: Boolean(sub.done),
                    };
                }).filter(Boolean);
            }
        }

        updated.updatedAt = new Date().toISOString();

        const newTasks = [...tasks];
        newTasks[index] = updated;
        persist(newTasks);

        return updated;
    },

    /**
     * Removes a task by id.
     * No-op if the id does not exist.
     * @param {string} id
     */
    remove(id) {
        if (!id || typeof id !== 'string') {
            return;
        }

        const tasks = this.getAll();
        const filtered = tasks.filter((t) => t.id !== id);

        if (filtered.length !== tasks.length) {
            persist(filtered);
        }
    },

    /**
     * Restores an exact task snapshot (same id, createdAt, updatedAt, completedAt, etc.).
     * If a task with that id already exists, does nothing and returns the existing task.
     * Never throws on corrupt storage.
     *
     * @param {object} task
     * @returns {object | null}
     */
    restore(task) {
        if (!task || typeof task !== 'object' || !task.id) {
            return null;
        }

        try {
            const tasks = this.getAll();
            const existing = tasks.find((t) => t.id === task.id);
            if (existing) {
                return existing;
            }

            const restored = normalizeTask(task);
            restored.id = String(task.id);
            if (task.createdAt) restored.createdAt = String(task.createdAt);
            if (task.updatedAt) restored.updatedAt = String(task.updatedAt);
            if (typeof task.completed === 'boolean') {
                restored.completed = task.completed;
                restored.completedAt = task.completedAt ? String(task.completedAt) : null;
            }

            const newTasks = [restored, ...tasks];
            persist(newTasks);
            return restored;
        } catch {
            return null;
        }
    },

    /**
     * Subscribes a listener to in-app task data modifications.
     *
     * @param {() => void} listener
     * @returns {() => void} Unsubscribe function
     */
    subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
};

export default taskService;
