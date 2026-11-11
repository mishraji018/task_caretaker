/* global process */
import { taskService } from '../src/services/taskService.js';
import { categoryService } from '../src/services/categoryService.js';
import { migrateTasks, hasFutureVersionDetected } from '../src/services/migrations.js';
import { isOverdue, formatDue, toInputValue, fromInputValue, formatTime } from '../src/utils/dates.js';
import { addSubtask, toggleSubtask, removeSubtask, subtaskProgress } from '../src/utils/subtasks.js';
import { ValidationError, NotFoundError } from '../src/utils/errors.js';
import { TASKS_KEY, TASKS_BACKUP_KEY, CATEGORIES_KEY, CATEGORIES_SEEDED_KEY } from '../src/constants/storageKeys.js';

// Mock localStorage for Node environment testing
class MockLocalStorage {
    constructor() {
        this.store = {};
    }
    getItem(key) {
        return this.store[key] ?? null;
    }
    setItem(key, value) {
        this.store[key] = String(value);
    }
    removeItem(key) {
        delete this.store[key];
    }
    clear() {
        this.store = {};
    }
}

globalThis.window = {
    localStorage: new MockLocalStorage(),
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        failed++;
    }
}

console.log('--- RUNNING CHUNK 2 TESTS ---');

// ==========================================
// 1. MIGRATION TESTS
// ==========================================
console.log('\n[Suite 1: Schema Migration]');
window.localStorage.clear();

// 1.1 Migrate v1 task to v2
const v1Task = {
    id: 't-v1',
    title: 'Old Task',
    description: 'Old Desc',
    completed: false,
    completedAt: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    schemaVersion: 1,
};
const res1 = migrateTasks([v1Task]);
assert(res1.migrated === true, 'v1 task detected as needing migration');
assert(res1.tasks[0].schemaVersion === 2, 'Migrated task has schemaVersion 2');
assert(res1.tasks[0].dueAt === null, 'Default dueAt is null');
assert(res1.tasks[0].hasDueTime === false, 'Default hasDueTime is false');
assert(res1.tasks[0].priority === 'medium', 'Default priority is medium');
assert(res1.tasks[0].categoryId === null, 'Default categoryId is null');
assert(Array.isArray(res1.tasks[0].subtasks) && res1.tasks[0].subtasks.length === 0, 'Default subtasks is empty array');

// 1.2 Backup created on migration
window.localStorage.setItem(TASKS_KEY, JSON.stringify([v1Task]));
taskService.getAll(); // triggers migration in taskService
const backupValue = window.localStorage.getItem(TASKS_BACKUP_KEY);
assert(backupValue !== null && backupValue.includes('Old Task'), 'Original v1 data backed up to TASKS_BACKUP_KEY');

// 1.3 Idempotent: migrating again changes nothing
const res2 = migrateTasks(res1.tasks);
assert(res2.migrated === false, 'Migrating already up-to-date v2 tasks is idempotent');

// 1.4 Bad fields replaced with safe defaults
const badItem = {
    id: 't-bad',
    title: 'Bad Item',
    priority: 'INVALID_PRIORITY',
    dueAt: 'NOT_A_DATE',
    subtasks: 'NOT_AN_ARRAY',
    schemaVersion: 1,
};
const res3 = migrateTasks([badItem]);
assert(res3.tasks[0].priority === 'medium', 'Invalid priority falls back to medium');
assert(res3.tasks[0].dueAt === null, 'Invalid date string falls back to null');
assert(Array.isArray(res3.tasks[0].subtasks), 'Invalid subtasks falls back to []');

// 1.5 Future schemaVersion (> 2) left untouched
const futureItem = {
    id: 't-future',
    title: 'Future Item',
    schemaVersion: 5,
    customFutureField: 'preserve_me',
};
const res4 = migrateTasks([futureItem]);
assert(res4.tasks[0].schemaVersion === 5, 'Future schemaVersion preserved without downgrade');
assert(res4.tasks[0].customFutureField === 'preserve_me', 'Future custom fields preserved');
assert(hasFutureVersionDetected() === true, 'hasFutureVersionDetected flag raised');

// ==========================================
// 2. DATE UTILITIES TESTS
// ==========================================
console.log('\n[Suite 2: Date Utilities]');
const mockNow = new Date('2026-11-15T14:00:00.000Z');

// 2.1 Completed or no due date is never overdue
assert(isOverdue({ completed: true, dueAt: '2026-11-01T00:00:00.000Z' }, mockNow) === false, 'Completed task is not overdue');
assert(isOverdue({ completed: false, dueAt: null }, mockNow) === false, 'Task without due date is not overdue');

// 2.2 Date-only task due today is not overdue at 14:00
const todayDateOnly = fromInputValue('2026-11-15', '');
assert(isOverdue({ ...todayDateOnly, completed: false }, new Date('2026-11-15T14:00:00')) === false, 'Date-only task due today is NOT overdue midday');

// 2.3 Date-only task due yesterday IS overdue
const yesterdayDateOnly = fromInputValue('2026-11-14', '');
assert(isOverdue({ ...yesterdayDateOnly, completed: false }, new Date('2026-11-15T14:00:00')) === true, 'Date-only task due yesterday is overdue today');

// 2.4 Task with time overdue check
const pastTimed = { dueAt: '2026-11-15T10:00:00.000Z', hasDueTime: true, completed: false };
const futureTimed = { dueAt: '2026-11-15T18:00:00.000Z', hasDueTime: true, completed: false };
assert(isOverdue(pastTimed, mockNow) === true, 'Task with time past now is overdue');
assert(isOverdue(futureTimed, mockNow) === false, 'Task with time future now is not overdue');

// 2.5 formatDue tests
const baseDate = new Date('2026-11-15T12:00:00');
const todayTask = { ...fromInputValue('2026-11-15', ''), completed: false };
assert(formatDue(todayTask, baseDate) === 'Today', 'Date-only task due today formats as "Today"');

const tomorrowTask = { ...fromInputValue('2026-11-16', ''), completed: false };
assert(formatDue(tomorrowTask, baseDate) === 'Tomorrow', 'Date-only task due tomorrow formats as "Tomorrow"');

const overdueTask = { ...fromInputValue('2026-11-13', ''), completed: false };
assert(formatDue(overdueTask, baseDate) === 'Overdue by 2 days', 'Task overdue by 2 days formats correctly');
assert(formatTime(new Date('2026-11-15T17:00:00')) === '5:00 PM', 'formatTime formats 17:00 as 5:00 PM');

// 2.6 toInputValue and fromInputValue round-trip
const inputConverted = fromInputValue('2026-12-25', '15:30');
const roundTrip = toInputValue(inputConverted);
assert(roundTrip.date === '2026-12-25' && roundTrip.time === '15:30', 'toInputValue and fromInputValue round-trip matches');

// Empty date returns null
const emptyDate = fromInputValue('', '');
assert(emptyDate.dueAt === null && emptyDate.hasDueTime === false, 'Empty date input returns null dueAt');

// ==========================================
// 3. SUBTASK PURE UTILITY TESTS
// ==========================================
console.log('\n[Suite 3: Subtask Pure Functions]');
let sampleTask = { id: 'parent-1', title: 'Parent', subtasks: [] };

// 3.1 addSubtask
const withSub1 = addSubtask(sampleTask, 'Subtask 1');
assert(withSub1.subtasks.length === 1 && withSub1.subtasks[0].title === 'Subtask 1', 'Subtask added successfully');
assert(sampleTask.subtasks.length === 0, 'Original task was not mutated (pure function)');

// 3.2 toggleSubtask
const subId = withSub1.subtasks[0].id;
const toggled = toggleSubtask(withSub1, subId);
assert(toggled.subtasks[0].done === true, 'Subtask toggled to done');
assert(withSub1.subtasks[0].done === false, 'toggleSubtask did not mutate original');

// 3.3 subtaskProgress
const progress = subtaskProgress(toggled);
assert(progress.done === 1 && progress.total === 1, 'subtaskProgress returns 1/1');

// 3.4 removeSubtask
const removed = removeSubtask(toggled, subId);
assert(removed.subtasks.length === 0, 'Subtask removed successfully');

// ==========================================
// 4. CATEGORY SERVICE & REMOVAL TESTS
// ==========================================
console.log('\n[Suite 4: Category Service]');
window.localStorage.clear();

// 4.1 Default categories seeded on first run
const defaultCats = categoryService.getAll();
assert(defaultCats.length === 3, 'Default categories seeded with 3 items (Work, Study, Personal)');
assert(window.localStorage.getItem(CATEGORIES_SEEDED_KEY) === 'true', 'CATEGORIES_SEEDED_KEY saved');

// 4.2 Re-running getAll does not duplicate categories
const reloadCats = categoryService.getAll();
assert(reloadCats.length === 3, 'Reloading does not duplicate categories');

// 4.3 Create custom category
const customCat = categoryService.create('Freelance', '#EC4899');
assert(customCat.name === 'Freelance', 'Custom category created');

// 4.4 Duplicate category name rejected
try {
    categoryService.create('  freelance  ');
    assert(false, 'Duplicate category name should be rejected');
} catch (e) {
    assert(e instanceof ValidationError, 'Duplicate category throws ValidationError');
}

// 4.5 Task category removal: deleting category nullifies categoryId on tasks without deleting task
const catTask = taskService.create({ title: 'Categorized Task', categoryId: customCat.id });
assert(catTask.categoryId === customCat.id, 'Task created with category');

categoryService.remove(customCat.id);
const reloadedTask = taskService.getAll().find((t) => t.id === catTask.id);
assert(reloadedTask !== undefined, 'Task was NOT deleted when category was removed');
assert(reloadedTask.categoryId === null, 'Task categoryId was set to null after category was deleted');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
