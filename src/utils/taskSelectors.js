/**
 * Pure task selector functions for Task Caretaker views:
 * - selectInbox: Active tasks, newest first.
 * - selectToday: Active tasks due today or overdue, with overdue oldest first, then today by time.
 * - selectUpcoming: Active tasks due after today, grouped and sorted by date and time.
 * - selectCompleted: Completed tasks, most recently completed first.
 * - countByView: Counts for inbox, today, upcoming views.
 *
 * All functions are pure, never mutate input arrays or objects, and respect local day boundaries.
 */

import { isOverdue } from './dates.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Returns true if d1 and d2 fall on the exact same local calendar day.
 * @param {Date} d1
 * @param {Date} d2
 * @returns {boolean}
 */
export function isSameDay(d1, d2) {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

/**
 * Returns true if d1's calendar day is strictly before d2's calendar day in local time.
 * @param {Date} d1
 * @param {Date} d2
 * @returns {boolean}
 */
export function isBeforeDay(d1, d2) {
    const s1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
    const s2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
    return s1 < s2;
}

/**
 * Returns true if d1's calendar day is strictly after d2's calendar day in local time.
 * @param {Date} d1
 * @param {Date} d2
 * @returns {boolean}
 */
export function isAfterDay(d1, d2) {
    const s1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
    const s2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
    return s1 > s2;
}

/**
 * Formats a local date for upcoming group labels: 'Tomorrow' or 'Mon 12 Nov' (or with year if different).
 * @param {Date} date
 * @param {Date} now
 * @returns {string}
 */
export function formatUpcomingLabel(date, now) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (isSameDay(date, tomorrow)) {
        return 'Tomorrow';
    }

    const weekday = WEEKDAYS[date.getDay()];
    const day = date.getDate();
    const month = MONTHS[date.getMonth()];
    const sameYear = date.getFullYear() === now.getFullYear();

    return sameYear ? `${weekday} ${day} ${month}` : `${weekday} ${day} ${month} ${date.getFullYear()}`;
}

/**
 * Returns 'YYYY-MM-DD' representing the local calendar day of the given Date.
 * @param {Date} date
 * @returns {string}
 */
export function toLocalDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * selectInbox(tasks):
 * Not completed, newest first (by createdAt descending).
 * Pure function: returns a new array, does not mutate input.
 *
 * @param {Array<object>} tasks
 * @returns {Array<object>}
 */
export function selectInbox(tasks = []) {
    if (!Array.isArray(tasks)) return [];
    return tasks
        .filter(t => Boolean(t && !t.completed))
        .slice()
        .sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
        });
}

/**
 * selectToday(tasks, now = new Date()):
 * Not completed and (due today OR overdue).
 * Sort order:
 * 1. Overdue first (oldest first by dueAt).
 * 2. Today's tasks by due time (earlier timed tasks first).
 * 3. Date-only tasks after timed ones.
 *
 * @param {Array<object>} tasks
 * @param {Date} [now=new Date()]
 * @returns {Array<object>}
 */
export function selectToday(tasks = [], now = new Date()) {
    if (!Array.isArray(tasks)) return [];

    const filtered = tasks.filter(t => {
        if (!t || t.completed || !t.dueAt) return false;
        const due = new Date(t.dueAt);
        if (isNaN(due.getTime())) return false;

        const dueToday = isSameDay(due, now);
        const overdue = isOverdue(t, now);
        return dueToday || overdue;
    });

    return filtered.slice().sort((a, b) => {
        const aOverdue = isOverdue(a, now);
        const bOverdue = isOverdue(b, now);

        // 1. Overdue tasks come first
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        const dueA = new Date(a.dueAt).getTime();
        const dueB = new Date(b.dueAt).getTime();

        // If both are overdue: oldest first (earliest dueAt first)
        if (aOverdue && bOverdue) {
            if (dueA !== dueB) return dueA - dueB;
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        }

        // Neither is overdue: both are due today
        // Timed tasks come before date-only tasks
        const aHasTime = Boolean(a.hasDueTime);
        const bHasTime = Boolean(b.hasDueTime);

        if (aHasTime && !bHasTime) return -1;
        if (!aHasTime && bHasTime) return 1;

        // Both are timed: sort by time ascending
        if (aHasTime && bHasTime) {
            if (dueA !== dueB) return dueA - dueB;
        }

        // Fallback to createdAt for stability
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
}

/**
 * selectUpcoming(tasks, now = new Date()):
 * Not completed, due AFTER today (strictly next local calendar days onwards).
 * Returns [{ dateKey: 'YYYY-MM-DD', label: 'Tomorrow' | 'Mon 12 Nov', tasks }]
 * sorted by date; tasks inside a group sorted by time (timed first, date-only after).
 *
 * @param {Array<object>} tasks
 * @param {Date} [now=new Date()]
 * @returns {Array<{ dateKey: string, label: string, tasks: Array<object> }>}
 */
export function selectUpcoming(tasks = [], now = new Date()) {
    if (!Array.isArray(tasks)) return [];

    const upcomingTasks = tasks.filter(t => {
        if (!t || t.completed || !t.dueAt) return false;
        const due = new Date(t.dueAt);
        if (isNaN(due.getTime())) return false;
        return isAfterDay(due, now);
    });

    // Group by local calendar date
    const groupsMap = new Map();

    for (const task of upcomingTasks) {
        const due = new Date(task.dueAt);
        const dateKey = toLocalDateKey(due);

        if (!groupsMap.has(dateKey)) {
            groupsMap.set(dateKey, {
                dateKey,
                date: due,
                label: formatUpcomingLabel(due, now),
                tasks: [],
            });
        }
        groupsMap.get(dateKey).tasks.push(task);
    }

    // Sort tasks inside each group: timed first by dueAt, then date-only
    for (const group of groupsMap.values()) {
        group.tasks.sort((a, b) => {
            const aHasTime = Boolean(a.hasDueTime);
            const bHasTime = Boolean(b.hasDueTime);

            if (aHasTime && !bHasTime) return -1;
            if (!aHasTime && bHasTime) return 1;

            const dueA = new Date(a.dueAt).getTime();
            const dueB = new Date(b.dueAt).getTime();

            if (aHasTime && bHasTime && dueA !== dueB) {
                return dueA - dueB;
            }

            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        });
    }

    // Sort groups by dateKey ascending
    const sortedGroups = Array.from(groupsMap.values())
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
        .map(({ dateKey, label, tasks: groupTasks }) => ({
            dateKey,
            label,
            tasks: groupTasks,
        }));

    return sortedGroups;
}

/**
 * selectCompleted(tasks):
 * Completed tasks, most recently completed first (by completedAt descending, falling back to updatedAt).
 *
 * @param {Array<object>} tasks
 * @returns {Array<object>}
 */
export function selectCompleted(tasks = []) {
    if (!Array.isArray(tasks)) return [];
    return tasks
        .filter(t => Boolean(t && t.completed))
        .slice()
        .sort((a, b) => {
            const timeA = new Date(a.completedAt || a.updatedAt || 0).getTime();
            const timeB = new Date(b.completedAt || b.updatedAt || 0).getTime();
            return timeB - timeA;
        });
}

/**
 * countByView(tasks, now = new Date()):
 * Returns view counts: { inbox, today, upcoming }.
 *
 * @param {Array<object>} tasks
 * @param {Date} [now=new Date()]
 * @returns {{ inbox: number, today: number, upcoming: number }}
 */
export function countByView(tasks = [], now = new Date()) {
    const inbox = selectInbox(tasks).length;
    const today = selectToday(tasks, now).length;
    const upcomingGroups = selectUpcoming(tasks, now);
    const upcoming = upcomingGroups.reduce((acc, g) => acc + g.tasks.length, 0);

    return { inbox, today, upcoming };
}

