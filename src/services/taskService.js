/**
 * @typedef {Object} Task
 * @property {string} id - Stable unique identifier (UUID v4)
 * @property {string} title - Task title (1-120 characters)
 * @property {string} description - Optional task details (up to 1000 characters)
 * @property {boolean} completed - Completion status
 * @property {string | null} completedAt - ISO timestamp when completed, null otherwise
 * @property {string} createdAt - ISO timestamp when created
 * @property {string} updatedAt - ISO timestamp when last modified
 * @property {number} schemaVersion - Schema version identifier (1)
 */

export const STORAGE_KEY = 'taskcaretaker.tasks.v1';
export const CORRUPT_KEY = 'taskcaretaker.tasks.v1.corrupt';

export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}

// In-memory fallback if localStorage is disabled, blocked, or full
let memoryStore = [];
let corruptedDetected = false;
let quotaExceededDetected = false;

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
    return {
        id: raw.id,
        title: String(raw.title || ''),
        description: typeof raw.description === 'string' ? raw.description : '',
        completed: Boolean(raw.completed),
        completedAt: raw.completedAt ? String(raw.completedAt) : null,
        createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
        updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString(),
        schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1,
    };
}

function persist(tasks) {
    memoryStore = tasks;

    if (!isStorageSupported()) {
        return;
    }

    try {
        const serialized = JSON.stringify(tasks);
        window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
        // Storage full (quota exceeded) or blocked
        quotaExceededDetected = true;
    }
}

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
     * Retrieves all tasks.
     * Returns [] if storage is empty or corrupt; drops invalid items; never throws.
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

            // Drop any items that do not match the minimum valid shape
            const valid = parsed.filter(isValidTask).map(normalizeTask);
            memoryStore = valid;
            return valid;
        } catch {
            return [...memoryStore];
        }
    },

    /**
     * Creates a new task.
     * Trims both; title required (1-120 chars); description max 1000 chars.
     * Throws ValidationError with a readable message.
     * @param {{ title: string, description?: string }} input
     * @returns {Task}
     */
    create({ title, description = '' }) {
        if (typeof title !== 'string') {
            throw new ValidationError('Task title must be a valid text string.');
        }

        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            throw new ValidationError('Title is required and cannot be empty or only spaces.');
        }

        if (trimmedTitle.length > 120) {
            throw new ValidationError('Title must be 120 characters or fewer.');
        }

        const trimmedDescription = typeof description === 'string' ? description.trim() : '';
        if (trimmedDescription.length > 1000) {
            throw new ValidationError('Description must be 1000 characters or fewer.');
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
            schemaVersion: 1,
        };

        const existing = this.getAll();
        const updated = [newTask, ...existing];
        persist(updated);

        return newTask;
    },

    /**
     * Updates an existing task by id.
     * Only title, description, and completed may change.
     * Always sets updatedAt. Sets completedAt when completed becomes true, clears when false.
     * Throws NotFoundError if the id does not exist.
     * @param {string} id
     * @param {{ title?: string, description?: string, completed?: boolean }} patch
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
            if (typeof patch.title !== 'string') {
                throw new ValidationError('Title must be a text string.');
            }
            const trimmedTitle = patch.title.trim();
            if (!trimmedTitle) {
                throw new ValidationError('Title cannot be empty or whitespace only.');
            }
            if (trimmedTitle.length > 120) {
                throw new ValidationError('Title must be 120 characters or fewer.');
            }
            updated.title = trimmedTitle;
        }

        if ('description' in patch) {
            const trimmedDesc = typeof patch.description === 'string' ? patch.description.trim() : '';
            if (trimmedDesc.length > 1000) {
                throw new ValidationError('Description must be 1000 characters or fewer.');
            }
            updated.description = trimmedDesc;
        }

        if ('completed' in patch && typeof patch.completed === 'boolean') {
            if (patch.completed !== current.completed) {
                updated.completed = patch.completed;
                updated.completedAt = patch.completed ? new Date().toISOString() : null;
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
};

export default taskService;
