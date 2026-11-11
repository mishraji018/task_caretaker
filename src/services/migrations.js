import { TASKS_KEY, TASKS_BACKUP_KEY } from '../constants/storageKeys.js';

const VALID_PRIORITIES = ['high', 'medium', 'low'];
const MAX_SUBTASKS = 30;

let futureVersionDetected = false;

/**
 * Validates whether a date string is a parseable ISO date.
 * @param {*} val
 * @returns {boolean}
 */
function isValidDateString(val) {
    if (typeof val !== 'string' || !val) return false;
    const d = new Date(val);
    return !isNaN(d.getTime());
}

/**
 * Sanitizes subtask items, enforcing max 30 items and safe defaults.
 * @param {*} rawSubtasks
 * @returns {Array<{ id: string, title: string, done: boolean }>}
 */
function sanitizeSubtasks(rawSubtasks) {
    if (!Array.isArray(rawSubtasks)) {
        return [];
    }

    return rawSubtasks.slice(0, MAX_SUBTASKS).map((sub, index) => {
        if (!sub || typeof sub !== 'object') {
            return {
                id: `subtask-${Date.now()}-${index}`,
                title: 'Untitled Subtask',
                done: false,
            };
        }

        return {
            id: typeof sub.id === 'string' && sub.id.trim() ? sub.id : `subtask-${Date.now()}-${index}`,
            title: typeof sub.title === 'string' ? sub.title.trim().slice(0, 120) : '',
            done: Boolean(sub.done),
        };
    }).filter((sub) => sub.title.length > 0);
}

/**
 * Migrates a raw array of tasks to Schema v2.
 * Idempotent: running on already migrated v2 tasks leaves them intact.
 * Automatically backs up original v1 storage to 'taskcaretaker.tasks.v1.backup' on first migration.
 *
 * @param {Array<*>} rawTasks - Array of parsed tasks from storage
 * @returns {{ tasks: Array<*>, migrated: boolean, futureVersion: boolean }}
 */
export function migrateTasks(rawTasks) {
    if (!Array.isArray(rawTasks)) {
        return { tasks: [], migrated: false, futureVersion: false };
    }

    let needsMigration = false;
    let hasFutureVersion = false;

    const migratedTasks = rawTasks.map((item) => {
        if (!item || typeof item !== 'object') {
            return null;
        }

        // Schema version check
        const version = typeof item.schemaVersion === 'number' ? item.schemaVersion : 1;

        // Future version detection (> 2): leave untouched, do not downgrade
        if (version > 2) {
            hasFutureVersion = true;
            futureVersionDetected = true;
            return item;
        }

        // Check if item needs upgrade from v1 or has missing fields
        const isV1 = version === 1;
        const hasMissingFields = (
            item.dueAt === undefined ||
            item.hasDueTime === undefined ||
            item.priority === undefined ||
            item.categoryId === undefined ||
            item.subtasks === undefined
        );

        if (isV1 || hasMissingFields) {
            needsMigration = true;
        }

        // Validate and sanitize priority
        let priority = 'medium';
        if (VALID_PRIORITIES.includes(item.priority)) {
            priority = item.priority;
        }

        // Validate and sanitize dueAt & hasDueTime
        let dueAt = null;
        let hasDueTime = false;
        if (isValidDateString(item.dueAt)) {
            dueAt = new Date(item.dueAt).toISOString();
            hasDueTime = Boolean(item.hasDueTime);
        }

        // Validate and sanitize categoryId
        let categoryId = null;
        if (typeof item.categoryId === 'string' && item.categoryId.trim().length > 0) {
            categoryId = item.categoryId.trim();
        }

        // Validate and sanitize subtasks
        const subtasks = sanitizeSubtasks(item.subtasks);

        return {
            ...item,
            dueAt,
            hasDueTime,
            priority,
            categoryId,
            subtasks,
            schemaVersion: 2,
        };
    }).filter(Boolean);

    // If migration was performed, backup old storage key before writing (first time only)
    if (needsMigration) {
        performBackupIfMissing();
    }

    return {
        tasks: migratedTasks,
        migrated: needsMigration,
        futureVersion: hasFutureVersion,
    };
}

/**
 * Copies the raw tasks storage key to the backup key if no backup exists yet.
 */
function performBackupIfMissing() {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        const existingBackup = window.localStorage.getItem(TASKS_BACKUP_KEY);
        if (!existingBackup) {
            const rawCurrent = window.localStorage.getItem(TASKS_KEY);
            if (rawCurrent) {
                window.localStorage.setItem(TASKS_BACKUP_KEY, rawCurrent);
            }
        }
    } catch {
        // Ignore backup storage errors (e.g. quota full)
    }
}

/**
 * Returns true if any future schema version (> 2) was encountered.
 */
export function hasFutureVersionDetected() {
    return futureVersionDetected;
}
