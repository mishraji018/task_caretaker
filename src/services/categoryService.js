import {
    CATEGORIES_KEY,
    CATEGORIES_SEEDED_KEY,
    CATEGORIES_CORRUPT_KEY,
} from '../constants/storageKeys.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

/**
 * @typedef {Object} Category
 * @property {string} id - Unique identifier (UUID v4)
 * @property {string} name - Category name (1-30 characters, case-insensitive unique)
 * @property {string} color - Hex color code (e.g. #8B5CF6)
 * @property {string} createdAt - ISO timestamp
 */

const DEFAULT_CATEGORIES = [
    { id: 'cat-work', name: 'Work', color: '#8B5CF6', createdAt: new Date().toISOString() },
    { id: 'cat-study', name: 'Study', color: '#3B82F6', createdAt: new Date().toISOString() },
    { id: 'cat-personal', name: 'Personal', color: '#10B981', createdAt: new Date().toISOString() },
];

let memoryCategories = [];
let onCategoryRemovedListener = null;

function isStorageSupported() {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return false;
        const testKey = '__cat_storage_test__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

function persistCategories(categories) {
    memoryCategories = categories;
    if (!isStorageSupported()) return;

    try {
        window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    } catch {
        // Storage full or blocked
    }
}

export const categoryService = {
    /**
     * Registers a callback invoked whenever a category is deleted,
     * so taskService can nullify matching task categoryIds.
     * @param {(categoryId: string) => void} callback
     */
    setOnCategoryRemovedListener(callback) {
        onCategoryRemovedListener = callback;
    },

    /**
     * Returns all categories. Seeds defaults on first launch only.
     * Recovers safely from corrupt storage.
     * @returns {Category[]}
     */
    getAll() {
        if (!isStorageSupported()) {
            if (memoryCategories.length === 0) {
                memoryCategories = [...DEFAULT_CATEGORIES];
            }
            return [...memoryCategories];
        }

        try {
            const seeded = window.localStorage.getItem(CATEGORIES_SEEDED_KEY);
            const raw = window.localStorage.getItem(CATEGORIES_KEY);

            // First run: seed defaults once
            if (!seeded && !raw) {
                try {
                    window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
                    window.localStorage.setItem(CATEGORIES_SEEDED_KEY, 'true');
                } catch {
                    // Ignore storage error
                }
                memoryCategories = [...DEFAULT_CATEGORIES];
                return [...DEFAULT_CATEGORIES];
            }

            if (!raw) {
                // Seeded flag exists, but user deleted all categories: return empty array
                memoryCategories = [];
                return [];
            }

            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch {
                // Corrupted storage: backup raw value and fall back to default categories
                try {
                    window.localStorage.setItem(CATEGORIES_CORRUPT_KEY, raw);
                    window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
                } catch {
                    // Ignore storage backup errors
                }
                memoryCategories = [...DEFAULT_CATEGORIES];
                return [...DEFAULT_CATEGORIES];
            }

            if (!Array.isArray(parsed)) {
                try {
                    window.localStorage.setItem(CATEGORIES_CORRUPT_KEY, raw);
                    window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
                } catch {
                    // Ignore storage backup errors
                }
                memoryCategories = [...DEFAULT_CATEGORIES];
                return [...DEFAULT_CATEGORIES];
            }

            // Valid categories array
            memoryCategories = parsed;
            return parsed;
        } catch {
            return [...memoryCategories];
        }
    },

    /**
     * Gets a single category by id.
     * @param {string} id
     * @returns {Category | null}
     */
    getById(id) {
        if (!id) return null;
        const all = this.getAll();
        return all.find((c) => c.id === id) || null;
    },

    /**
     * Creates a new category.
     * Name: trimmed, 1-30 chars, case-insensitive unique.
     * @param {string} name
     * @param {string} [color='#6366F1']
     * @returns {Category}
     * @throws {ValidationError}
     */
    create(name, color = '#6366F1') {
        if (typeof name !== 'string') {
            throw new ValidationError('Category name must be a text string.');
        }

        const trimmed = name.trim();
        if (!trimmed) {
            throw new ValidationError('Category name is required.');
        }

        if (trimmed.length > 30) {
            throw new ValidationError('Category name must be 30 characters or fewer.');
        }

        const categories = this.getAll();
        const lower = trimmed.toLowerCase();
        const exists = categories.some((c) => c.name.toLowerCase() === lower);

        if (exists) {
            throw new ValidationError(`Category "${trimmed}" already exists.`);
        }

        const newCategory = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: trimmed,
            color: color || '#6366F1',
            createdAt: new Date().toISOString(),
        };

        const updated = [...categories, newCategory];
        persistCategories(updated);
        return newCategory;
    },

    /**
     * Renames an existing category.
     * @param {string} id
     * @param {string} name
     * @returns {Category}
     * @throws {ValidationError | NotFoundError}
     */
    rename(id, name) {
        if (!id) {
            throw new NotFoundError('Category ID is required.');
        }

        if (typeof name !== 'string') {
            throw new ValidationError('Category name must be a text string.');
        }

        const trimmed = name.trim();
        if (!trimmed) {
            throw new ValidationError('Category name is required.');
        }

        if (trimmed.length > 30) {
            throw new ValidationError('Category name must be 30 characters or fewer.');
        }

        const categories = this.getAll();
        const index = categories.findIndex((c) => c.id === id);

        if (index === -1) {
            throw new NotFoundError('Category not found.');
        }

        const lower = trimmed.toLowerCase();
        const duplicate = categories.some((c) => c.id !== id && c.name.toLowerCase() === lower);

        if (duplicate) {
            throw new ValidationError(`Another category with name "${trimmed}" already exists.`);
        }

        const updatedCat = { ...categories[index], name: trimmed };
        const updatedList = [...categories];
        updatedList[index] = updatedCat;
        persistCategories(updatedList);

        return updatedCat;
    },

    /**
     * Removes a category by id.
     * Automatically notifies listener to set categoryId to null on every task that used it.
     * Never deletes the tasks themselves.
     * @param {string} id
     */
    remove(id) {
        if (!id) return;

        const categories = this.getAll();
        const filtered = categories.filter((c) => c.id !== id);

        if (filtered.length !== categories.length) {
            persistCategories(filtered);

            // Notify listener to remove category references from all tasks
            if (typeof onCategoryRemovedListener === 'function') {
                onCategoryRemovedListener(id);
            }
        }
    },
};

export default categoryService;
