import { ValidationError } from './errors.js';

const MAX_SUBTASKS = 30;
const MAX_TITLE_LENGTH = 120;

/**
 * Calculates completion progress for subtasks.
 *
 * @param {{ subtasks?: Array<{ done: boolean }> }} task
 * @returns {{ done: number, total: number }}
 */
export function subtaskProgress(task) {
    if (!task || !Array.isArray(task.subtasks) || task.subtasks.length === 0) {
        return { done: 0, total: 0 };
    }

    const total = task.subtasks.length;
    const done = task.subtasks.filter((s) => Boolean(s.done)).length;
    return { done, total };
}

/**
 * Returns a new task object with a new subtask appended.
 * Enforces maximum 30 subtasks and 1-120 character title.
 * Does not mutate the original task object.
 *
 * @param {Object} task
 * @param {string} title
 * @returns {Object} New task object
 * @throws {ValidationError}
 */
export function addSubtask(task, title) {
    if (!task || typeof task !== 'object') {
        throw new ValidationError('Task object is required.');
    }

    if (typeof title !== 'string') {
        throw new ValidationError('Subtask title must be a valid text string.');
    }

    const trimmed = title.trim();
    if (!trimmed) {
        throw new ValidationError('Subtask title cannot be empty or only spaces.');
    }

    if (trimmed.length > MAX_TITLE_LENGTH) {
        throw new ValidationError(`Subtask title must be ${MAX_TITLE_LENGTH} characters or fewer.`);
    }

    const currentSubtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    if (currentSubtasks.length >= MAX_SUBTASKS) {
        throw new ValidationError(`Cannot add more than ${MAX_SUBTASKS} subtasks.`);
    }

    const newSubtask = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `subtask-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: trimmed,
        done: false,
    };

    return {
        ...task,
        subtasks: [...currentSubtasks, newSubtask],
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Returns a new task object with the specified subtask's completion status toggled.
 * Does not mutate the original task object.
 * Note: Completing all subtasks does NOT auto-complete the parent task.
 *
 * @param {Object} task
 * @param {string} subtaskId
 * @returns {Object} New task object
 */
export function toggleSubtask(task, subtaskId) {
    if (!task || !Array.isArray(task.subtasks) || !subtaskId) {
        return task;
    }

    const updatedSubtasks = task.subtasks.map((sub) => {
        if (sub.id === subtaskId) {
            return { ...sub, done: !sub.done };
        }
        return sub;
    });

    return {
        ...task,
        subtasks: updatedSubtasks,
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Returns a new task object with the specified subtask removed.
 * Does not mutate the original task object.
 *
 * @param {Object} task
 * @param {string} subtaskId
 * @returns {Object} New task object
 */
export function removeSubtask(task, subtaskId) {
    if (!task || !Array.isArray(task.subtasks) || !subtaskId) {
        return task;
    }

    const updatedSubtasks = task.subtasks.filter((sub) => sub.id !== subtaskId);

    return {
        ...task,
        subtasks: updatedSubtasks,
        updatedAt: new Date().toISOString(),
    };
}
