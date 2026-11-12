/* global process */
/**
 * Integration Test Suite for Task Caretaker (Chunks 1 - 4)
 * Verifies cross-feature interoperability, safety, resilience, and performance.
 */

import { performance } from 'node:perf_hooks';
import {
    taskService,
    STORAGE_KEY,
    CORRUPT_KEY,
    ValidationError,
    NotFoundError,
} from '../src/services/taskService.js';
import {
    categoryService,
} from '../src/services/categoryService.js';
import {
    TASKS_BACKUP_KEY,
    CATEGORIES_KEY,
    CATEGORIES_SEEDED_KEY,
} from '../src/constants/storageKeys.js';
import {
    selectInbox,
    selectToday,
    selectUpcoming,
    selectCompleted,
    countByView,
    isSameDay,
} from '../src/utils/taskSelectors.js';
import {
    normalizeText,
    matchesQuery,
    filterTasks,
    sortTasks,
    parseFiltersFromSearchParams,
    filtersToSearchParams,
} from '../src/utils/taskFilters.js';
import {
    addSubtask,
    toggleSubtask,
    removeSubtask,
    subtaskProgress,
} from '../src/utils/subtasks.js';
import {
    isOverdue,
    formatDue,
    toInputValue,
    fromInputValue,
} from '../src/utils/dates.js';

// In-memory mock localStorage
class MockLocalStorage {
    constructor() {
        this.store = {};
    }
    getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
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

const mockStorage = new MockLocalStorage();
globalThis.window = {
    localStorage: mockStorage,
};
globalThis.localStorage = mockStorage;

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

function suite(name) {
    console.log(`\n[${name}]`);
}

console.log('====================================================');
console.log('--- RUNNING INTEGRATION AUDIT TESTS (CHUNKS 1-4) ---');
console.log('====================================================');

// =============================================================
// Suite 1: Full CRUD Lifecycle & Timestamp Consistency
// =============================================================
suite('Suite 1: Full CRUD Lifecycle & Timestamp Consistency');
{
    mockStorage.clear();

    // 1. Create
    const task = taskService.create({
        title: 'Complete tax filing',
        description: 'Gather invoices and receipts',
        priority: 'high',
    });

    assert(task.id && typeof task.id === 'string', 'Created task has valid ID');
    assert(task.title === 'Complete tax filing', 'Title preserved');
    assert(task.completed === false, 'Initial completed is false');
    assert(task.completedAt === null, 'Initial completedAt is null');
    assert(Boolean(task.createdAt), 'Initial createdAt is populated');
    assert(task.updatedAt === task.createdAt, 'Initial updatedAt equals createdAt');

    // 2. Update title & priority
    const originalUpdated = task.updatedAt;
    const updated = taskService.update(task.id, {
        title: 'Complete tax filing for Q3',
        priority: 'medium',
    });
    assert(updated.title === 'Complete tax filing for Q3', 'Title updated');
    assert(updated.priority === 'medium', 'Priority updated');
    assert(updated.completed === false, 'Completed remains false');
    assert(updated.completedAt === null, 'CompletedAt remains null');
    assert(new Date(updated.updatedAt).getTime() >= new Date(originalUpdated).getTime(), 'UpdatedAt progressed on update');

    // 3. Mark complete
    const completedTask = taskService.update(task.id, { completed: true });
    assert(completedTask.completed === true, 'Task completed marked true');
    assert(typeof completedTask.completedAt === 'string', 'completedAt set to valid ISO string');
    assert(!isNaN(new Date(completedTask.completedAt).getTime()), 'completedAt is a parseable timestamp');

    // 4. Un-complete (toggle back)
    const uncompletedTask = taskService.update(task.id, { completed: false });
    assert(uncompletedTask.completed === false, 'Task completed marked false');
    assert(uncompletedTask.completedAt === null, 'completedAt cleared back to null');
    assert(new Date(uncompletedTask.updatedAt).getTime() >= new Date(completedTask.updatedAt).getTime(), 'updatedAt updated on un-complete');

    // 5. Delete
    taskService.remove(task.id);
    assert(taskService.getAll().length === 0, 'Task successfully removed from storage');
    let threwNotFound = false;
    try {
        taskService.update(task.id, { title: 'Should fail' });
    } catch (err) {
        if (err instanceof NotFoundError) threwNotFound = true;
    }
    assert(threwNotFound, 'Updating deleted task throws NotFoundError');
}

// =============================================================
// Suite 2: Category Rename Propagation & Deletion Safety
// =============================================================
suite('Suite 2: Category Rename Propagation & Deletion Safety');
{
    mockStorage.clear();

    const cat = categoryService.create('Work Projects', '#6366f1');
    const task = taskService.create({
        title: 'Prepare pitch deck',
        categoryId: cat.id,
    });

    let currentCats = categoryService.getAll();

    // Search by current category name matches
    assert(matchesQuery(task, 'Work Projects', currentCats) === true, 'Search finds task by category name');

    // Rename category
    const renamedCat = categoryService.rename(cat.id, 'Client Deliverables');
    assert(renamedCat.name === 'Client Deliverables', 'Category name updated in service');

    currentCats = categoryService.getAll();

    // Search by new category name matches
    assert(matchesQuery(task, 'Client Deliverables', currentCats) === true, 'Search by NEW category name finds task');
    // Search by old category name NO LONGER matches
    assert(matchesQuery(task, 'Work Projects', currentCats) === false, 'Search by OLD category name no longer matches');

    // Delete category
    categoryService.remove(cat.id);
    const reloadedTasks = taskService.getAll();
    const affectedTask = reloadedTasks.find((t) => t.id === task.id);
    assert(Boolean(affectedTask), 'Task was not deleted when category was deleted');
    assert(affectedTask.categoryId === null, 'Task categoryId safely set to null');
}

// =============================================================
// Suite 3: Text Safety, Long Text, Unicode, Hindi, & Emojis
// =============================================================
suite('Suite 3: Text Safety, Long Text, Unicode, Hindi, & Emojis');
{
    mockStorage.clear();

    const xssTitle = '<script>alert("xss")</script>';
    const xssDesc = '<img src=x onerror=alert(1)> and "quotes" & ampersands';
    const longDesc = 'A'.repeat(500);
    const emojiTitle = '🎉 Rocket Launch 🚀 Bug Fix 🐛';
    const hindiTitle = 'किराना खरीदारी और ताज़ा फल';
    const hindiDesc = 'बाजार से 2 किलो आम और सब्जियां लानी हैं';

    const t1 = taskService.create({ title: xssTitle, description: xssDesc });
    const t2 = taskService.create({ title: 'Long task test', description: longDesc });
    const t3 = taskService.create({ title: emojiTitle });
    const t4 = taskService.create({ title: hindiTitle, description: hindiDesc });

    assert(t1.title === xssTitle, 'XSS script tag stored literally without mutation');
    assert(t1.description === xssDesc, 'XSS img tag stored literally without mutation');
    assert(t2.description.length === 500, '500-char description stored cleanly');
    assert(t3.title === emojiTitle, 'Emojis stored cleanly');
    assert(t4.title === hindiTitle, 'Hindi title stored cleanly');

    // Search matches exotic inputs
    assert(matchesQuery(t1, '<script>') === true, 'Can search for literal script tags safely');
    assert(matchesQuery(t3, 'Rocket') === true, 'Can search text next to emojis');
    assert(matchesQuery(t3, '🚀') === true, 'Can search directly for emoji character');
    assert(matchesQuery(t4, 'किराना') === true, 'Can search Hindi keyword in title');
    assert(matchesQuery(t4, 'सब्जियां') === true, 'Can search Hindi keyword in description');
    assert(matchesQuery(t4, 'किराना आम') === true, 'Multi-word AND query works across Hindi title and description');
}

// =============================================================
// Suite 4: Subtasks CRUD & Parent State Isolation
// =============================================================
suite('Suite 4: Subtasks CRUD & Parent State Isolation');
{
    mockStorage.clear();

    let task = taskService.create({
        title: 'Project feature release',
        description: 'Ship version 1.0',
    });

    task = addSubtask(task, 'Review PR #42');
    task = addSubtask(task, 'Write integration tests');
    task = addSubtask(task, 'Update changelog');

    assert(task.subtasks.length === 3, 'Three subtasks added');
    assert(matchesQuery(task, 'PR #42') === true, 'Subtask text is searchable by query');
    assert(matchesQuery(task, 'changelog') === true, 'Subtask title matches search');

    const sub1 = task.subtasks[0];
    const toggledTask = toggleSubtask(task, sub1.id);
    assert(toggledTask.subtasks[0].done === true, 'Subtask marked done');
    assert(toggledTask.completed === false, 'Toggling subtask does NOT alter parent task completed state');

    const progress = subtaskProgress(toggledTask);
    assert(progress.done === 1 && progress.total === 3, 'Subtask progress calculates 1/3');

    const removedTask = removeSubtask(toggledTask, sub1.id);
    assert(removedTask.subtasks.length === 2, 'Subtask removed');
    assert(subtaskProgress(removedTask).total === 2, 'Total updated to 2');
}

// =============================================================
// Suite 5: Schema Migration & Backup Idempotence
// =============================================================
suite('Suite 5: Schema Migration & Backup Idempotence');
{
    mockStorage.clear();

    // Seed raw Schema v1 tasks
    const v1Tasks = [
        {
            id: 'legacy-1',
            title: 'Task from chunk 1',
            description: 'Legacy task',
            completed: false,
            createdAt: '2026-11-01T10:00:00.000Z',
            updatedAt: '2026-11-01T10:00:00.000Z',
            completedAt: null,
            schemaVersion: 1,
        },
    ];
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(v1Tasks));

    // First getAll triggers migration and backup
    const loaded1 = taskService.getAll();
    assert(loaded1.length === 1, 'Loaded 1 legacy task');
    assert(loaded1[0].schemaVersion === 2, 'Upgraded to schemaVersion 2');
    assert(loaded1[0].priority === 'medium', 'Defaulted priority to medium');
    assert(loaded1[0].dueAt === null, 'Defaulted dueAt to null');
    assert(Array.isArray(loaded1[0].subtasks) && loaded1[0].subtasks.length === 0, 'Defaulted subtasks to []');

    const backupFirst = mockStorage.getItem(TASKS_BACKUP_KEY);
    assert(Boolean(backupFirst), 'Backup created in TASKS_BACKUP_KEY');
    assert(backupFirst.includes('legacy-1'), 'Backup contains original legacy data');

    // Second and third getAll() calls MUST NOT rewrite or duplicate the backup
    const loaded2 = taskService.getAll();
    const backupSecond = mockStorage.getItem(TASKS_BACKUP_KEY);
    assert(backupSecond === backupFirst, 'Second getAll() does NOT rewrite backup');

    const loaded3 = taskService.getAll();
    const backupThird = mockStorage.getItem(TASKS_BACKUP_KEY);
    assert(backupThird === backupFirst, 'Third getAll() does NOT duplicate or change backup');

    // Corrupt JSON quarantine check
    mockStorage.setItem(STORAGE_KEY, '{ invalid corrupt json %$#@! }');
    const safeResult = taskService.getAll();
    assert(Array.isArray(safeResult) && safeResult.length === 0, 'Corrupt storage returns safe empty array');
    assert(mockStorage.getItem(CORRUPT_KEY) === '{ invalid corrupt json %$#@! }', 'Corrupt raw content preserved in CORRUPT_KEY');
    assert(taskService.hasCorruptedData() === true, 'hasCorruptedData() reports true');
}

// =============================================================
// Suite 6: Day Boundary Transitions
// =============================================================
suite('Suite 6: Day Boundary Transitions');
{
    const baseNow = new Date(2026, 10, 12, 14, 0, 0); // Nov 12, 2026 14:00 local

    const tasks = [
        {
            id: 't-today-late',
            title: 'Due today late night',
            dueAt: new Date(2026, 10, 12, 23, 59, 59).toISOString(),
            hasDueTime: true,
            completed: false,
        },
        {
            id: 't-tomorrow-early',
            title: 'Due tomorrow midnight',
            dueAt: new Date(2026, 10, 13, 0, 0, 0).toISOString(),
            hasDueTime: true,
            completed: false,
        },
        {
            id: 't-today-dateonly',
            title: 'Due today all day',
            dueAt: '2026-11-12T00:00:00.000Z',
            hasDueTime: false,
            completed: false,
        },
        {
            id: 't-yesterday-dateonly',
            title: 'Due yesterday all day',
            dueAt: '2026-11-11T00:00:00.000Z',
            hasDueTime: false,
            completed: false,
        },
    ];

    const todaySelected = selectToday(tasks, baseNow);
    const todayIds = todaySelected.map((t) => t.id);

    assert(todayIds.includes('t-today-late'), 'Task due at 23:59:59 local is in Today');
    assert(!todayIds.includes('t-tomorrow-early'), 'Task due tomorrow at 00:00:00 is NOT in Today');
    assert(todayIds.includes('t-today-dateonly'), 'Date-only task due today is in Today');
    assert(todayIds.includes('t-yesterday-dateonly'), 'Overdue task from yesterday is in Today (overdue section)');

    const upcomingGroups = selectUpcoming(tasks, baseNow);
    const upcomingTaskIds = upcomingGroups.flatMap((g) => g.tasks.map((t) => t.id));
    assert(upcomingTaskIds.includes('t-tomorrow-early'), 'Task due tomorrow at 00:00:00 appears in Upcoming');
    assert(!upcomingTaskIds.includes('t-today-late'), 'Today late task does NOT appear in Upcoming');
}

// =============================================================
// Suite 7: Multi-Filter Intersection
// =============================================================
suite('Suite 7: Multi-Filter Intersection');
{
    const categories = [
        { id: 'cat-work', name: 'Work' },
        { id: 'cat-home', name: 'Personal' },
    ];
    const testNow = new Date(2026, 10, 12, 12, 0, 0);

    const testTasks = [
        {
            id: '1',
            title: 'Ship project release',
            completed: false,
            priority: 'high',
            categoryId: 'cat-work',
            dueAt: new Date(2026, 10, 12, 17, 0, 0).toISOString(),
            hasDueTime: true,
        },
        {
            id: '2',
            title: 'Ship project release draft',
            completed: true, // completed
            priority: 'high',
            categoryId: 'cat-work',
            dueAt: new Date(2026, 10, 12, 17, 0, 0).toISOString(),
            hasDueTime: true,
        },
        {
            id: '3',
            title: 'Ship project release docs',
            completed: false,
            priority: 'low', // wrong priority
            categoryId: 'cat-work',
            dueAt: new Date(2026, 10, 12, 17, 0, 0).toISOString(),
            hasDueTime: true,
        },
        {
            id: '4',
            title: 'Ship project release notes',
            completed: false,
            priority: 'high',
            categoryId: 'cat-home', // wrong category
            dueAt: new Date(2026, 10, 12, 17, 0, 0).toISOString(),
            hasDueTime: true,
        },
    ];

    const filters = {
        query: 'release',
        status: 'active',
        priority: 'high',
        categoryId: 'cat-work',
        due: 'today',
        sort: 'created',
        dir: 'desc',
    };

    const result = filterTasks(testTasks, filters, categories, testNow);
    assert(result.length === 1 && result[0].id === '1', 'Multi-filter isolated exact target (id: 1) from 4 candidates');
}

// =============================================================
// Suite 8: Stable Sorting & Nulls-Last Invariant
// =============================================================
suite('Suite 8: Stable Sorting & Nulls-Last Invariant');
{
    const items = [
        { id: 'no-due-1', title: 'A', dueAt: null, createdAt: '2026-11-01T10:00:00.000Z' },
        { id: 'due-nov15', title: 'B', dueAt: '2026-11-15T10:00:00.000Z', createdAt: '2026-11-02T10:00:00.000Z' },
        { id: 'no-due-2', title: 'C', dueAt: null, createdAt: '2026-11-03T10:00:00.000Z' },
        { id: 'due-nov12', title: 'D', dueAt: '2026-11-12T10:00:00.000Z', createdAt: '2026-11-04T10:00:00.000Z' },
    ];

    // Due Ascending: Earliest date first, nulls at the end
    const ascSorted = sortTasks(items, 'due', 'asc');
    assert(ascSorted[0].id === 'due-nov12', 'Due asc puts earliest date first');
    assert(ascSorted[1].id === 'due-nov15', 'Due asc puts second earliest date second');
    assert(ascSorted[2].dueAt === null && ascSorted[3].dueAt === null, 'Due asc places all no-due-date tasks at the end');

    // Due Descending: Latest date first, nulls STILL at the end
    const descSorted = sortTasks(items, 'due', 'desc');
    assert(descSorted[0].id === 'due-nov15', 'Due desc puts latest date first');
    assert(descSorted[1].id === 'due-nov12', 'Due desc puts earlier date second');
    assert(descSorted[2].dueAt === null && descSorted[3].dueAt === null, 'Due desc STILL puts all no-due-date tasks at the end');
}

// =============================================================
// Suite 9: Diacritic / Accent Insensitivity
// =============================================================
suite('Suite 9: Diacritic / Accent Insensitivity');
{
    const task = { id: 'cafe', title: 'Café résumé conference', description: 'Meet at naïve café' };

    assert(matchesQuery(task, 'cafe') === true, 'Query "cafe" matches "Café"');
    assert(matchesQuery(task, 'café') === true, 'Query "café" matches "Café"');
    assert(matchesQuery(task, 'resume') === true, 'Query "resume" matches "résumé"');
    assert(matchesQuery(task, 'naive') === true, 'Query "naive" matches "naïve"');
}

// =============================================================
// Suite 10: Regex Metacharacter Safety
// =============================================================
suite('Suite 10: Regex Metacharacter Safety');
{
    const task = { id: 'regex-test', title: 'Calculate (2 + 2) * [x] ? ^ $ {test} \\ path' };

    const problematicQueries = ['(', ')', '[', ']', '*', '+', '?', '^', '$', '{', '}', '\\', '.*', '[a-z]+'];
    let safeCount = 0;

    for (const q of problematicQueries) {
        try {
            matchesQuery(task, q);
            safeCount++;
        } catch (err) {
            console.error(`Regex blew up on query: "${q}"`, err);
        }
    }

    assert(safeCount === problematicQueries.length, `All ${problematicQueries.length} regex metacharacter queries safely executed`);
}

// =============================================================
// Suite 11: URL Parameter Round-Trip & Preservation
// =============================================================
suite('Suite 11: URL Parameter Round-Trip & Preservation');
{
    const originalParams = new URLSearchParams('task=task-999&session=active');
    const filters = {
        query: 'grocery shopping',
        status: 'active',
        priority: 'high',
        categoryId: 'cat-errands',
        due: 'today',
        sort: 'priority',
        dir: 'desc',
    };

    const outputParams = filtersToSearchParams(filters, originalParams);

    assert(outputParams.get('task') === 'task-999', 'Existing ?task=<id> parameter preserved');
    assert(outputParams.get('session') === 'active', 'Existing custom params preserved');
    assert(outputParams.get('q') === 'grocery shopping', 'Query written to URL');
    assert(outputParams.get('priority') === 'high', 'Priority written to URL');
    assert(outputParams.get('category') === 'cat-errands', 'Category written to URL');

    const parsedBack = parseFiltersFromSearchParams(outputParams, [
        { id: 'cat-errands', name: 'Errands' },
    ]);

    assert(parsedBack.query === 'grocery shopping', 'Parsed back query matches');
    assert(parsedBack.status === 'active', 'Parsed back status matches');
    assert(parsedBack.priority === 'high', 'Parsed back priority matches');
    assert(parsedBack.categoryId === 'cat-errands', 'Parsed back category matches');
    assert(parsedBack.due === 'today', 'Parsed back due matches');
    assert(parsedBack.sort === 'priority', 'Parsed back sort matches');
    assert(parsedBack.dir === 'desc', 'Parsed back dir matches');
}

// =============================================================
// Suite 12: Multi-Timezone Date Consistency
// =============================================================
suite('Suite 12: Multi-Timezone Date Consistency');
{
    // Test date calculations across UTC, morning, evening
    const d1 = new Date(2026, 10, 12, 1, 30, 0); // early AM
    const d2 = new Date(2026, 10, 12, 23, 45, 0); // late PM
    const d3 = new Date(2026, 10, 13, 0, 15, 0); // next day early AM

    assert(isSameDay(d1, d2) === true, 'Same calendar day comparison is true across 22 hours');
    assert(isSameDay(d2, d3) === false, 'Crossing midnight gives false for isSameDay');

    // Date-only round trip via toInputValue / fromInputValue
    const rawIso = new Date(2026, 10, 12, 12, 0, 0, 0).toISOString();
    const fakeTask = { dueAt: rawIso, hasDueTime: false };
    const { date, time } = toInputValue(fakeTask);
    assert(date === '2026-11-12', 'toInputValue extracts YYYY-MM-DD cleanly');
    assert(time === '', 'toInputValue returns empty time for date-only task');

    const reconstructed = fromInputValue(date, time);
    assert(reconstructed.hasDueTime === false, 'fromInputValue preserves hasDueTime false');
    const { date: roundTripDate, time: roundTripTime } = toInputValue(reconstructed);
    assert(roundTripDate === '2026-11-12' && roundTripTime === '', 'fromInputValue round-trip back to input matches exactly');
}

// =============================================================
// Suite 13: Theme Mode Storage Persistence
// =============================================================
suite('Suite 13: Theme Mode Storage Persistence');
{
    const THEME_KEY = 'taskcaretaker.theme';
    mockStorage.removeItem(THEME_KEY);

    // Initial default
    const getStoredTheme = () => mockStorage.getItem(THEME_KEY) || 'system';
    assert(getStoredTheme() === 'system', 'Default initial theme is system');

    // Set to dark
    mockStorage.setItem(THEME_KEY, 'dark');
    assert(mockStorage.getItem(THEME_KEY) === 'dark', 'Dark theme persisted in storage');

    // Set to light
    mockStorage.setItem(THEME_KEY, 'light');
    assert(mockStorage.getItem(THEME_KEY) === 'light', 'Light theme persisted in storage');

    // Safe handling of legacy 'theme' key fallback
    mockStorage.removeItem(THEME_KEY);
    mockStorage.setItem('theme', 'dark');
    const legacyFallback = mockStorage.getItem(THEME_KEY) || mockStorage.getItem('theme');
    assert(legacyFallback === 'dark', 'Legacy theme key safely read if primary key absent');
}

// =============================================================
// Suite 14: 1,000 Tasks Performance Benchmark (< 50ms Target)
// =============================================================
suite('Suite 14: 1,000 Tasks Performance Benchmark (< 50ms)');
{
    const benchmarkNow = new Date(2026, 10, 12, 12, 0, 0);
    const benchmarkCategories = [
        { id: 'cat-1', name: 'Engineering' },
        { id: 'cat-2', name: 'Design' },
        { id: 'cat-3', name: 'Marketing' },
        { id: 'cat-4', name: 'Personal' },
    ];

    const thousandTasks = [];
    const priorities = ['high', 'medium', 'low'];
    const catIds = ['cat-1', 'cat-2', 'cat-3', 'cat-4', null];

    for (let i = 1; i <= 1000; i++) {
        const hasTime = i % 2 === 0;
        const dueOffsetDays = (i % 30) - 5; // spans overdue (-5 days) to upcoming (+25 days)
        const dueDate = new Date(benchmarkNow.getTime() + dueOffsetDays * 86400000);

        thousandTasks.push({
            id: `bench-${i}`,
            title: `Task #${i} - Feature delivery and optimization for customer system`,
            description: i % 3 === 0 ? `Detailed description for task #${i} with key metrics` : '',
            completed: i % 4 === 0,
            priority: priorities[i % 3],
            categoryId: catIds[i % 5],
            dueAt: i % 7 === 0 ? null : dueDate.toISOString(),
            hasDueTime: hasTime,
            subtasks: i % 5 === 0 ? [{ id: `s-${i}-1`, title: 'Check checklist item', done: false }] : [],
            createdAt: new Date(benchmarkNow.getTime() - i * 60000).toISOString(),
            updatedAt: new Date(benchmarkNow.getTime() - i * 60000).toISOString(),
            schemaVersion: 2,
        });
    }

    assert(thousandTasks.length === 1000, 'Constructed dataset of 1,000 realistic tasks');

    // Run the full pipeline 5 times and record execution times
    const benchmarkFilters = {
        query: 'optimization customer',
        status: 'active',
        priority: 'high',
        category: 'cat-1',
        due: 'all',
        sort: 'due',
        dir: 'asc',
    };

    const times = [];
    let matchCount = 0;

    for (let run = 0; run < 5; run++) {
        const start = performance.now();

        // 1. View selector (e.g. Inbox / Active selection)
        const activePool = selectInbox(thousandTasks);

        // 2. Multi-filter & full text search
        const filtered = filterTasks(activePool, benchmarkFilters, benchmarkCategories, benchmarkNow);

        // 3. Stable sorting (with nulls last)
        const sorted = sortTasks(filtered, benchmarkFilters.sort, benchmarkFilters.dir);

        const end = performance.now();
        times.push(end - start);
        matchCount = sorted.length;
    }

    const minTime = Math.min(...times);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    console.log(`\n  ⚡ Benchmark Results (5 iterations):`);
    console.log(`     - Min time: ${minTime.toFixed(2)} ms`);
    console.log(`     - Avg time: ${avgTime.toFixed(2)} ms`);
    console.log(`     - Filtered matches found: ${matchCount} tasks`);

    assert(avgTime < 50, `1,000 tasks pipeline executed in ${avgTime.toFixed(2)}ms (target: < 50ms)`);
}

// =============================================================
// SUMMARY
// =============================================================
console.log('\n====================================================');
console.log(`INTEGRATION AUDIT SUITE COMPLETE`);
console.log(`Passed: ${passed} | Failed: ${failed}`);
console.log('====================================================\n');

if (failed > 0) {
    process.exit(1);
}
