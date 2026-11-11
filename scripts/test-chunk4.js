/* global process */
/**
 * Chunk 4 Unit Tests: Pure Task Filters, Sorting, and URL State
 */

import {
    normalizeText,
    matchesQuery,
    filterTasks,
    sortTasks,
    countActiveFilters,
    parseFiltersFromSearchParams,
    filtersToSearchParams,
} from '../src/utils/taskFilters.js';

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

const fixedNow = new Date(2026, 10, 11, 14, 0, 0); // Nov 11, 2026 14:00

console.log('--- RUNNING CHUNK 4 TESTS ---');

// ==========================================
// Suite 1: normalizeText
// ==========================================
suite('Suite 1: normalizeText');
{
    assert(normalizeText('  HELLO   World  ') === 'hello world', 'Lowercases, trims, and collapses spaces');
    assert(normalizeText('Café résumé') === 'cafe resume', 'Strips accents/diacritics');
    assert(normalizeText('हिंदी कार्य') === 'हिंदी कार्य', 'Preserves Hindi/Unicode characters safely');
    assert(normalizeText(null) === '', 'Handles null input safely');
    assert(normalizeText(123) === '', 'Handles non-string input safely');
}

// ==========================================
// Suite 2: matchesQuery & Regex Escaping
// ==========================================
suite('Suite 2: matchesQuery & Regex Safety');
{
    const categories = [
        { id: 'cat-work', name: 'Work Project' },
        { id: 'cat-home', name: 'Personal Errands' },
    ];

    const task = {
        id: '1',
        title: 'Review financial report',
        description: 'Discuss Q3 revenue metrics with team',
        categoryId: 'cat-work',
        subtasks: [
            { id: 's1', title: 'Prepare PowerPoint slides', done: false },
        ],
    };

    assert(matchesQuery(task, ''), 'Empty query matches all');
    assert(matchesQuery(task, '   '), 'Spaces-only query matches all');
    assert(matchesQuery(task, 'financial'), 'Matches single word in title');
    assert(matchesQuery(task, 'revenue discuss'), 'Multi-word AND matches across description and title (order independent)');
    assert(matchesQuery(task, 'project financial', categories), 'Matches category name alongside title');
    assert(matchesQuery(task, 'powerpoint'), 'Matches subtask title');
    assert(!matchesQuery(task, 'financial marketing'), 'Fails if any word in AND query is missing');

    // Special regex characters in query
    const specialQueries = ['(', '[abc', '.*', '\\', '+', '?', '^', '$', '{', '}'];
    for (const q of specialQueries) {
        try {
            const result = matchesQuery(task, q);
            assert(typeof result === 'boolean', `Query with regex char "${q}" executes without crashing`);
        } catch (err) {
            assert(false, `Query "${q}" threw error: ${err.message}`);
        }
    }

    // Hindi/Unicode match
    const hindiTask = {
        id: '2',
        title: 'किताब पढ़ना',
        description: 'हर रोज शाम 5 बजे',
    };
    assert(matchesQuery(hindiTask, 'किताब'), 'Matches Hindi title');
    assert(matchesQuery(hindiTask, 'पढ़ना शाम'), 'Matches Hindi multi-word AND');
}

// ==========================================
// Suite 3: filterTasks
// ==========================================
suite('Suite 3: filterTasks');
{
    const categories = [
        { id: 'c1', name: 'Work' },
        { id: 'c2', name: 'Personal' },
    ];

    const todayDate = new Date(2026, 10, 11, 18, 0, 0).toISOString();
    const overdueDate = new Date(2026, 10, 9, 10, 0, 0).toISOString();
    const in3Days = new Date(2026, 10, 14, 10, 0, 0).toISOString();
    const nextMonth = new Date(2026, 11, 25, 10, 0, 0).toISOString();

    const tasks = [
        { id: 't1', title: 'Work High Overdue', completed: false, priority: 'high', categoryId: 'c1', dueAt: overdueDate, hasDueTime: true },
        { id: 't2', title: 'Work Med Today', completed: false, priority: 'medium', categoryId: 'c1', dueAt: todayDate, hasDueTime: true },
        { id: 't3', title: 'Personal Low Week', completed: false, priority: 'low', categoryId: 'c2', dueAt: in3Days, hasDueTime: true },
        { id: 't4', title: 'Completed Work', completed: true, priority: 'high', categoryId: 'c1', dueAt: todayDate, hasDueTime: true },
        { id: 't5', title: 'No Date Task', completed: false, priority: 'medium', categoryId: null, dueAt: null },
        { id: 't6', title: 'Far Future Task', completed: false, priority: 'low', categoryId: 'c2', dueAt: nextMonth, hasDueTime: true },
    ];

    // Status filter
    assert(filterTasks(tasks, { status: 'active' }).length === 5, 'Status: active filters out completed tasks');
    assert(filterTasks(tasks, { status: 'completed' }).length === 1, 'Status: completed keeps only completed');

    // Priority filter
    assert(filterTasks(tasks, { priority: 'high' }).length === 2, 'Priority: high keeps high tasks only');
    assert(filterTasks(tasks, { priority: 'low' }).length === 2, 'Priority: low keeps low tasks only');

    // Category filter
    assert(filterTasks(tasks, { categoryId: 'c1' }, categories).length === 3, 'Category: c1 keeps c1 tasks');
    assert(filterTasks(tasks, { categoryId: 'none' }, categories).length === 1, 'Category: none keeps uncategorized');
    assert(filterTasks(tasks, { categoryId: 'deleted-cat' }, categories).length === 6, 'Deleted category ID falls back to all');

    // Due filter
    assert(filterTasks(tasks, { due: 'overdue' }, categories, fixedNow).length === 1, 'Due: overdue matches t1');
    assert(filterTasks(tasks, { due: 'today' }, categories, fixedNow).length === 2, 'Due: today matches t2 and t4');
    assert(filterTasks(tasks, { due: 'week' }, categories, fixedNow).length === 3, 'Due: week matches t2, t3, t4');
    assert(filterTasks(tasks, { due: 'none' }, categories, fixedNow).length === 1, 'Due: none matches t5');

    // Combined filter
    const combined = filterTasks(tasks, { status: 'active', priority: 'high', categoryId: 'c1' }, categories);
    assert(combined.length === 1 && combined[0].id === 't1', 'Combined active + high + c1 correctly isolates t1');

    // Immutability
    assert(tasks.length === 6, 'Input tasks array is not mutated');
}

// ==========================================
// Suite 4: sortTasks & Stable Sort
// ==========================================
suite('Suite 4: sortTasks (Stable & No-Due-Date Last)');
{
    const tasks = [
        { id: 'a', title: 'Task Alpha', priority: 'medium', dueAt: null, createdAt: '2026-11-01T10:00:00Z' },
        { id: 'b', title: 'Task Beta', priority: 'high', dueAt: '2026-11-15T10:00:00Z', createdAt: '2026-11-02T10:00:00Z' },
        { id: 'c', title: 'Task Gamma', priority: 'low', dueAt: '2026-11-12T10:00:00Z', createdAt: '2026-11-03T10:00:00Z' },
        { id: 'd', title: 'Task Delta', priority: 'high', dueAt: null, createdAt: '2026-11-04T10:00:00Z' },
    ];

    // Priority sort
    const prioDesc = sortTasks(tasks, 'priority', 'desc');
    assert(prioDesc[0].priority === 'high' && prioDesc[1].priority === 'high', 'Priority desc puts high first');
    // Stable check: 'b' was before 'd' in input, should remain before 'd'
    assert(prioDesc[0].id === 'b' && prioDesc[1].id === 'd', 'Stable sort preserves relative order for equal priority');

    // Title sort
    const titleAsc = sortTasks(tasks, 'title', 'asc');
    assert(titleAsc[0].id === 'a' && titleAsc[3].id === 'c', 'Title asc orders alphabetically');

    // Due sort: Tasks with no due date ALWAYS go LAST in both directions!
    const dueAsc = sortTasks(tasks, 'due', 'asc');
    assert(dueAsc[0].id === 'c', 'Due asc puts earliest date first (Nov 12)');
    assert(dueAsc[1].id === 'b', 'Due asc puts next date second (Nov 15)');
    assert(dueAsc[2].dueAt === null && dueAsc[3].dueAt === null, 'Due asc puts tasks without due date LAST');

    const dueDesc = sortTasks(tasks, 'due', 'desc');
    assert(dueDesc[0].id === 'b', 'Due desc puts latest date first (Nov 15)');
    assert(dueDesc[1].id === 'c', 'Due desc puts earlier date second (Nov 12)');
    assert(dueDesc[2].dueAt === null && dueDesc[3].dueAt === null, 'Due desc STILL puts tasks without due date LAST');
}

// ==========================================
// Suite 5: countActiveFilters
// ==========================================
suite('Suite 5: countActiveFilters');
{
    assert(countActiveFilters({}) === 0, 'Empty filters object has 0 active filters');
    assert(countActiveFilters({ status: 'all', priority: 'all', categoryId: 'all', due: 'all', query: '   ' }) === 0, 'Default filters count as 0');
    assert(countActiveFilters({ query: 'test' }) === 1, 'Query counts as 1');
    assert(countActiveFilters({ query: 'test', priority: 'high', due: 'today' }) === 3, 'Multiple active filters counted accurately');
}

// ==========================================
// Suite 6: URL Search Params Round-Trip
// ==========================================
suite('Suite 6: URL Search Params Round-Trip');
{
    // Garbage params ignored safely
    const garbageParams = new URLSearchParams('priority=banana&sort=invalid&due=random');
    const parsedGarbage = parseFiltersFromSearchParams(garbageParams);
    assert(parsedGarbage.priority === 'all', 'Garbage priority falls back to all');
    assert(parsedGarbage.sort === 'created', 'Garbage sort falls back to created');
    assert(parsedGarbage.due === 'all', 'Garbage due falls back to all');

    // Valid filters converted to search params
    const filters = {
        query: 'meeting',
        status: 'active',
        priority: 'high',
        categoryId: 'work-123',
        due: 'today',
        sort: 'due',
        dir: 'asc',
    };

    const existingParams = new URLSearchParams('task=task-456&theme=dark');
    const searchParams = filtersToSearchParams(filters, existingParams);

    assert(searchParams.get('q') === 'meeting', 'q written to URL');
    assert(searchParams.get('status') === 'active', 'status written to URL');
    assert(searchParams.get('priority') === 'high', 'priority written to URL');
    assert(searchParams.get('category') === 'work-123', 'category written to URL');
    assert(searchParams.get('due') === 'today', 'due written to URL');
    assert(searchParams.get('sort') === 'due', 'sort written to URL');
    assert(searchParams.get('dir') === 'asc', 'dir written to URL');
    assert(searchParams.get('task') === 'task-456', 'Existing ?task=<id> parameter is preserved');
    assert(searchParams.get('theme') === 'dark', 'Other existing params preserved');

    // Round trip back
    const roundTripped = parseFiltersFromSearchParams(searchParams);
    assert(roundTripped.query === filters.query, 'Round trip query matches');
    assert(roundTripped.priority === filters.priority, 'Round trip priority matches');
    assert(roundTripped.categoryId === filters.categoryId, 'Round trip category matches');
    assert(roundTripped.sort === filters.sort, 'Round trip sort matches');
    assert(roundTripped.dir === filters.dir, 'Round trip dir matches');
}

// ==========================================
// Suite 7: 1,000 Tasks Benchmark & Edge Cases
// ==========================================
suite('Suite 7: 1,000 Tasks Benchmark & Edge Cases');
{
    // Generate 1,000 realistic tasks
    const priorities = ['high', 'medium', 'low'];
    const titles = ['Submit quarterly tax return', 'Organize team standup', 'Doctor appointment', 'Buy groceries and milk'];
    const tasks1000 = [];

    for (let i = 0; i < 1000; i++) {
        tasks1000.push({
            id: `bench-${i}`,
            title: `${titles[i % titles.length]} #${i}`,
            description: i % 2 === 0 ? 'Urgent financial document discussion with audit team' : '',
            priority: priorities[i % priorities.length],
            completed: i % 4 === 0,
            categoryId: i % 3 === 0 ? 'c-work' : null,
            dueAt: i % 2 === 0 ? new Date(2026, 10, 11 + (i % 7), 10, 0).toISOString() : null,
            hasDueTime: true,
            createdAt: new Date(2026, 10, 1, 0, i).toISOString(),
            subtasks: i % 5 === 0 ? [{ id: `s-${i}`, title: 'Review slide checklist', done: false }] : [],
        });
    }

    const t0 = performance.now();
    // 1. Search across 1,000 tasks
    const queryResults = filterTasks(tasks1000, { query: 'tax return' });
    // 2. Multi-filter across 1,000 tasks
    const filterResults = filterTasks(tasks1000, { priority: 'high', status: 'active', due: 'today' }, [], fixedNow);
    // 3. Sort 1,000 tasks by due date
    const sortedResults = sortTasks(tasks1000, 'due', 'asc');
    const elapsed = performance.now() - t0;

    assert(queryResults.length === 250, 'Search across 1,000 tasks found 250 items');
    assert(filterResults.length > 0, 'Multi-filter isolated matches from 1,000 tasks');
    assert(sortedResults.length === 1000, 'Sorted all 1,000 tasks');
    assert(elapsed < 30, `1,000 tasks search, filter, and sort executed swiftly in ${elapsed.toFixed(2)}ms (< 30ms)`);

    // Edge case: 'cafe' finds 'Café'
    const cafeTask = { id: 'cafe-1', title: 'Visit Café de Flore', completed: false };
    assert(matchesQuery(cafeTask, 'cafe'), "Query 'cafe' matches 'Café'");
    assert(matchesQuery(cafeTask, 'café'), "Query 'café' matches 'Café'");
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
