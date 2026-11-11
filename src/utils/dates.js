const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats a Date object's time in 12-hour AM/PM format (e.g. "5:00 PM").
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date) {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

/**
 * Determines whether a task is overdue relative to `now`.
 * Completed tasks and tasks without a due date are NEVER overdue.
 * Date-only tasks (hasDueTime: false) are overdue ONLY after the end of that local day (23:59:59.999).
 *
 * @param {{ dueAt?: string | null, hasDueTime?: boolean, completed?: boolean }} task
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
export function isOverdue(task, now = new Date()) {
    if (!task || task.completed || !task.dueAt) {
        return false;
    }

    const due = new Date(task.dueAt);
    if (isNaN(due.getTime())) {
        return false;
    }

    const currentTime = now.getTime();

    if (task.hasDueTime) {
        return currentTime > due.getTime();
    }

    // Date-only: overdue only after 23:59:59.999 of that local day
    const endOfLocalDay = new Date(
        due.getFullYear(),
        due.getMonth(),
        due.getDate(),
        23, 59, 59, 999
    ).getTime();

    return currentTime > endOfLocalDay;
}

/**
 * Returns a human-friendly string for the task's due date.
 * Examples: 'Today 5:00 PM', 'Today', 'Tomorrow', 'Mon 12 Nov', 'Overdue by 2 days'.
 * Date-only tasks never display a time component.
 *
 * @param {{ dueAt?: string | null, hasDueTime?: boolean, completed?: boolean }} task
 * @param {Date} [now=new Date()]
 * @returns {string}
 */
export function formatDue(task, now = new Date()) {
    if (!task || !task.dueAt) {
        return '';
    }

    const due = new Date(task.dueAt);
    if (isNaN(due.getTime())) {
        return '';
    }

    const overdue = isOverdue(task, now);

    // Overdue formatting
    if (overdue) {
        const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
        const diffDays = Math.round((startOfNow - startOfDue) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
            return task.hasDueTime ? `Overdue (${formatTime(due)})` : 'Overdue today';
        }
        if (diffDays === 1) {
            return 'Overdue by 1 day';
        }
        return `Overdue by ${diffDays} days`;
    }

    // Check if Today
    const isToday = (
        due.getFullYear() === now.getFullYear() &&
        due.getMonth() === now.getMonth() &&
        due.getDate() === now.getDate()
    );

    if (isToday) {
        return task.hasDueTime ? `Today ${formatTime(due)}` : 'Today';
    }

    // Check if Tomorrow
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const isTomorrow = (
        due.getFullYear() === tomorrow.getFullYear() &&
        due.getMonth() === tomorrow.getMonth() &&
        due.getDate() === tomorrow.getDate()
    );

    if (isTomorrow) {
        return task.hasDueTime ? `Tomorrow ${formatTime(due)}` : 'Tomorrow';
    }

    // Other dates: 'Mon 12 Nov' or 'Mon 12 Nov 2027' (if different year)
    const weekday = WEEKDAYS[due.getDay()];
    const day = due.getDate();
    const month = MONTHS[due.getMonth()];
    const sameYear = due.getFullYear() === now.getFullYear();
    const yearStr = sameYear ? '' : ` ${due.getFullYear()}`;

    const dateBase = `${weekday} ${day} ${month}${yearStr}`;
    return task.hasDueTime ? `${dateBase} ${formatTime(due)}` : dateBase;
}

/**
 * Converts a task's ISO dueAt to local HTML date and time input values.
 * Uses local time to completely prevent the off-by-one-day bug.
 *
 * @param {{ dueAt?: string | null, hasDueTime?: boolean }} task
 * @returns {{ date: string, time: string }}
 */
export function toInputValue(task) {
    if (!task || !task.dueAt) {
        return { date: '', time: '' };
    }

    const d = new Date(task.dueAt);
    if (isNaN(d.getTime())) {
        return { date: '', time: '' };
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;

    let time = '';
    if (task.hasDueTime) {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        time = `${hours}:${minutes}`;
    }

    return { date, time };
}

/**
 * Converts local HTML date and time input strings into an ISO string.
 * Uses local time to construct the Date, preventing date shift.
 * If dateString is empty or invalid, returns { dueAt: null, hasDueTime: false }.
 *
 * @param {string} [dateString] - 'YYYY-MM-DD'
 * @param {string} [timeString] - 'HH:MM' (optional)
 * @returns {{ dueAt: string | null, hasDueTime: boolean }}
 */
export function fromInputValue(dateString, timeString) {
    if (!dateString || typeof dateString !== 'string' || !dateString.trim()) {
        return { dueAt: null, hasDueTime: false };
    }

    const parts = dateString.trim().split('-');
    if (parts.length !== 3) {
        return { dueAt: null, hasDueTime: false };
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
        return { dueAt: null, hasDueTime: false };
    }

    const hasTime = typeof timeString === 'string' && timeString.trim().length > 0;

    let hours = 12;
    let minutes = 0;

    if (hasTime) {
        const timeParts = timeString.trim().split(':');
        if (timeParts.length >= 2) {
            const h = Number(timeParts[0]);
            const m = Number(timeParts[1]);
            if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
                hours = h;
                minutes = m;
            }
        }
    }

    const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    if (isNaN(localDate.getTime())) {
        return { dueAt: null, hasDueTime: false };
    }

    return {
        dueAt: localDate.toISOString(),
        hasDueTime: hasTime,
    };
}
