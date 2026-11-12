/**
 * Pure task filtering and sorting functions for Task Caretaker.
 * All functions are pure, never mutate input arrays, and respect local day boundaries.
 */

import { isOverdue } from './dates.js';
import { isSameDay } from './taskSelectors.js';

/**
 * Normalizes text for search and comparisons:
 * - Lowercase
 * - Trims edges
 * - Strips accents / diacritics (e.g. 'café' -> 'cafe')
 * - Collapses repeated spaces
 * - Fully Unicode & Hindi safe
 *
 * @param {string} s
 * @returns {string}
 */
export function normalizeText(s) {
    if (typeof s !== 'string') return '';
    return s
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

/**
 * Determines whether a task matches a search query using AND logic across all query words.
 * Inspects title, description, category name, and subtask titles.
 * Empty or spaces-only query matches all tasks.
 *
 * @param {object} task
 * @param {string} query
 * @param {Array<object>} [categories=[]]
 * @returns {boolean}
 */
export function matchesQuery(task, query = '', categories = []) {
    if (!task) return false;
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return true;

    const queryWords = normalizedQuery.split(' ').filter(Boolean);
    if (queryWords.length === 0) return true;

    // Find category name
    let categoryName = '';
    if (task.categoryId && Array.isArray(categories)) {
        const cat = categories.find((c) => c && c.id === task.categoryId);
        if (cat?.name) categoryName = cat.name;
    }

    // Collect subtask titles
    const subtaskTitles = Array.isArray(task.subtasks)
        ? task.subtasks.map((s) => s?.title || '').join(' ')
        : '';

    // Combined target text
    const target = normalizeText(
        `${task.title || ''} ${task.description || ''} ${categoryName} ${subtaskTitles}`
    );

    // AND logic: Every query word must appear somewhere in target
    return queryWords.every((word) => target.includes(word));
}

/**
 * Filters a list of tasks according to the given filter criteria.
 * Pure function: never mutates input array.
 *
 * @param {Array<object>} tasks
 * @param {object} filters
 * @param {string} [filters.query] Search string
 * @param {'all'|'active'|'completed'} [filters.status='all']
 * @param {'all'|'high'|'medium'|'low'} [filters.priority='all']
 * @param {string} [filters.categoryId='all'] 'all' | 'none' | <id>
 * @param {'all'|'overdue'|'today'|'week'|'none'} [filters.due='all']
 * @param {Array<object>} [categories=[]]
 * @param {Date} [now=new Date()]
 * @returns {Array<object>}
 */
export function filterTasks(tasks = [], filters = {}, categories = [], now = new Date()) {
    if (!Array.isArray(tasks)) return [];

    const {
        query = '',
        status = 'all',
        priority = 'all',
        categoryId = 'all',
        due = 'all',
    } = filters;

    // Resolve category filter: if categoryId points to a deleted/unknown category, behave as 'all'
    const isCategoryFilterValid =
        categoryId === 'all' ||
        categoryId === 'none' ||
        (Array.isArray(categories) && categories.some((c) => c && c.id === categoryId));
    const effectiveCategory = isCategoryFilterValid ? categoryId : 'all';

    // Week boundary range: start of today through end of (today + 6 days) in local time
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 23, 59, 59, 999).getTime();

    return tasks.filter((task) => {
        if (!task) return false;

        // 1. Search Query
        if (!matchesQuery(task, query, categories)) {
            return false;
        }

        // 2. Status Filter
        if (status === 'active' && task.completed) return false;
        if (status === 'completed' && !task.completed) return false;

        // 3. Priority Filter
        if (['high', 'medium', 'low'].includes(priority)) {
            const taskPriority = task.priority || 'medium';
            if (taskPriority !== priority) return false;
        }

        // 4. Category Filter
        if (effectiveCategory === 'none') {
            if (task.categoryId) return false;
        } else if (effectiveCategory !== 'all') {
            if (task.categoryId !== effectiveCategory) return false;
        }

        // 5. Due Horizon Filter
        if (due === 'none') {
            if (task.dueAt) return false;
        } else if (due === 'overdue') {
            if (!isOverdue(task, now)) return false;
        } else if (due === 'today') {
            if (!task.dueAt) return false;
            const d = new Date(task.dueAt);
            if (isNaN(d.getTime()) || !isSameDay(d, now)) return false;
        } else if (due === 'week') {
            if (!task.dueAt) return false;
            const d = new Date(task.dueAt);
            if (isNaN(d.getTime())) return false;
            const time = d.getTime();
            if (time < startOfToday || time > endOfWeek) return false;
        }

        return true;
    });
}

/**
 * Performs a STABLE sort on tasks.
 * - key: 'created' | 'due' | 'priority' | 'title'
 * - dir: 'asc' | 'desc'
 * - Special rule: Tasks without a due date ALWAYS go LAST when sorting by 'due', in both directions.
 * - Priority order: high > medium > low.
 * - Title sort is case and accent-insensitive.
 *
 * @param {Array<object>} tasks
 * @param {'created'|'due'|'priority'|'title'} [key='created']
 * @param {'asc'|'desc'} [dir='desc']
 * @returns {Array<object>}
 */
export function sortTasks(tasks = [], key = 'created', dir = 'desc') {
    if (!Array.isArray(tasks)) return [];

    const validKey = ['created', 'due', 'priority', 'title'].includes(key) ? key : 'created';
    const validDir = dir === 'asc' ? 'asc' : 'desc';

    const indexed = tasks.map((task, index) => ({ task, index }));

    indexed.sort((a, b) => {
        // Special case: 'due' sort
        if (validKey === 'due') {
            const hasA = Boolean(a.task.dueAt && !isNaN(new Date(a.task.dueAt).getTime()));
            const hasB = Boolean(b.task.dueAt && !isNaN(new Date(b.task.dueAt).getTime()));

            // Tasks without due date ALWAYS go LAST in both directions
            if (!hasA && !hasB) return a.index - b.index;
            if (!hasA) return 1;
            if (!hasB) return -1;

            const timeA = new Date(a.task.dueAt).getTime();
            const timeB = new Date(b.task.dueAt).getTime();
            if (timeA !== timeB) {
                return validDir === 'asc' ? timeA - timeB : timeB - timeA;
            }
            return a.index - b.index;
        }

        let diff = 0;

        if (validKey === 'priority') {
            const weights = { high: 3, medium: 2, low: 1 };
            const wA = weights[a.task.priority] || weights.medium;
            const wB = weights[b.task.priority] || weights.medium;
            diff = wA - wB;
        } else if (validKey === 'title') {
            diff = normalizeText(a.task.title).localeCompare(normalizeText(b.task.title));
        } else {
            // 'created'
            const timeA = new Date(a.task.createdAt || 0).getTime();
            const timeB = new Date(b.task.createdAt || 0).getTime();
            diff = timeA - timeB;
        }

        if (diff !== 0) {
            return validDir === 'desc' ? -diff : diff;
        }

        // Stable tie breaker
        return a.index - b.index;
    });

    return indexed.map((item) => item.task);
}

/**
 * Returns the count of active (non-default) filters.
 * Non-defaults:
 * - query: non-empty
 * - status: !== 'all'
 * - priority: !== 'all'
 * - categoryId: !== 'all'
 * - due: !== 'all'
 *
 * @param {object} filters
 * @returns {number}
 */
export function countActiveFilters(filters = {}) {
    let count = 0;
    if (filters.query && filters.query.trim() !== '') count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.priority && filters.priority !== 'all') count++;
    if (filters.categoryId && filters.categoryId !== 'all') count++;
    if (filters.due && filters.due !== 'all') count++;
    return count;
}

/**
 * Parses filter state from URL search params.
 * Falls back safely to defaults for unknown or invalid values. Never throws.
 *
 * @param {URLSearchParams|object} searchParams
 * @returns {{ query: string, status: string, priority: string, categoryId: string, due: string, sort: string, dir: string }}
 */
export function parseFiltersFromSearchParams(searchParams) {
    const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams || '');

    const q = params.get('q') || '';
    const statusParam = params.get('status');
    const priorityParam = params.get('priority');
    const categoryParam = params.get('category');
    const dueParam = params.get('due');
    const sortParam = params.get('sort');
    const dirParam = params.get('dir');

    const status = ['active', 'completed'].includes(statusParam) ? statusParam : 'all';
    const priority = ['high', 'medium', 'low'].includes(priorityParam) ? priorityParam : 'all';
    const categoryId = categoryParam && categoryParam.trim() !== '' ? categoryParam.trim() : 'all';
    const due = ['overdue', 'today', 'week', 'none'].includes(dueParam) ? dueParam : 'all';
    const sort = ['created', 'due', 'priority', 'title'].includes(sortParam) ? sortParam : 'created';
    const dir = dirParam === 'asc' ? 'asc' : 'desc';

    return {
        query: q,
        status,
        priority,
        categoryId,
        due,
        sort,
        dir,
    };
}

/**
 * Converts filter state to URLSearchParams, preserving all existing params (like 'task').
 * Only non-default filter parameters are written to the URL.
 *
 * @param {object} filters
 * @param {URLSearchParams|object} [existingParams]
 * @returns {URLSearchParams}
 */
export function filtersToSearchParams(filters = {}, existingParams) {
    const nextParams = existingParams instanceof URLSearchParams
        ? new URLSearchParams(existingParams)
        : new URLSearchParams(existingParams || '');

    // q
    if (filters.query && filters.query.trim() !== '') {
        nextParams.set('q', filters.query.trim());
    } else {
        nextParams.delete('q');
    }

    // status
    if (filters.status && filters.status !== 'all') {
        nextParams.set('status', filters.status);
    } else {
        nextParams.delete('status');
    }

    // priority
    if (filters.priority && filters.priority !== 'all') {
        nextParams.set('priority', filters.priority);
    } else {
        nextParams.delete('priority');
    }

    // category
    if (filters.categoryId && filters.categoryId !== 'all') {
        nextParams.set('category', filters.categoryId);
    } else {
        nextParams.delete('category');
    }

    // due
    if (filters.due && filters.due !== 'all') {
        nextParams.set('due', filters.due);
    } else {
        nextParams.delete('due');
    }

    // sort
    if (filters.sort && filters.sort !== 'created') {
        nextParams.set('sort', filters.sort);
    } else {
        nextParams.delete('sort');
    }

    // dir
    if (filters.dir && filters.dir !== 'desc') {
        nextParams.set('dir', filters.dir);
    } else {
        nextParams.delete('dir');
    }

    return nextParams;
}

