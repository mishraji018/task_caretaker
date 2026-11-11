import { ValidationError } from './errors.js';

const MAX_TITLE_LENGTH = 120;
const MAX_DESC_LENGTH = 1000;

/**
 * Validates and sanitizes a task title.
 * Trimmed first. Title is required, 1-120 characters.
 * @param {string} title
 * @returns {string} Cleaned trimmed title
 * @throws {ValidationError} If title is missing, not a string, empty, or exceeds 120 characters
 */
export function validateTitle(title) {
    if (typeof title !== 'string') {
        throw new ValidationError('Task title must be a valid text string.');
    }

    const trimmed = title.trim();
    if (!trimmed) {
        throw new ValidationError('Title is required and cannot be empty or only spaces.');
    }

    if (trimmed.length > MAX_TITLE_LENGTH) {
        throw new ValidationError(`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);
    }

    return trimmed;
}

/**
 * Validates and sanitizes a task description.
 * Trimmed first. Description is optional, max 1000 characters.
 * @param {string} [text]
 * @returns {string} Cleaned trimmed description
 * @throws {ValidationError} If description exceeds 1000 characters or is invalid type
 */
export function validateDescription(text) {
    if (text === null || text === undefined || text === '') {
        return '';
    }

    if (typeof text !== 'string') {
        throw new ValidationError('Description must be a text string.');
    }

    const trimmed = text.trim();
    if (trimmed.length > MAX_DESC_LENGTH) {
        throw new ValidationError(`Description must be ${MAX_DESC_LENGTH} characters or fewer.`);
    }

    return trimmed;
}
