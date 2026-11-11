/* global process */
/**
 * Chunk 3 Unit Tests: Pure Task Selectors
 * Tests:
 * 1. selectInbox
 * 2. selectToday (boundary tests: 23:59 vs 00:00, overdue first, timed before date-only)
 * 3. selectUpcoming (grouping, Tomorrow label, month/year boundaries, sorting)
 * 4. selectCompleted
 * 5. countByView
 */

import {
    selectInbox,
    selectToday,
    selectUpcoming,
    selectCompleted,
    countByView,
    isSameDay,
    isBeforeDay,
    isAfterDay,
} from '../src/utils/taskSelectors.js';

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

// Fixed "now" for deterministic tests: Wednesday, Nov 11, 2026, 14:00 local time
const fixedNow = new Date(2026, 10, 11, 14, 0, 0); // Month is 0-indexed: 10 = November

console.log('--- RUNNING CHUNK 3 TESTS ---');

// ==========================================
// Suite 1: Day boundary helpers
// ==========================================
suite('Suite 1: Day Boundary Helpers');
{
    const todayMidday = new Date(2026, 10, 11, 12, 0);
    const todayNight = new Date(2026, 10, 11, 23, 59, 59);
    const tomorrowMorning = new Date(2026, 10, 12, 0, 0, 0);
    const yesterday = new Date(2026, 10, 10, 23, 59);

    assert(isSameDay(todayMidday, todayNight), 'isSameDay returns true for same calendar day');
    assert(!isSameDay(todayNight, tomorrowMorning), 'isSameDay returns false across midnight');
    assert(isBeforeDay(yesterday, todayMidday), 'isBeforeDay returns true for yesterday');
    assert(!isBeforeDay(todayNight, todayMidday), 'isBeforeDay returns false for same day');
    assert(isAfterDay(tomorrowMorning, todayNight), 'isAfterDay returns true for tomorrow vs today');
    assert(!isAfterDay(todayNight, todayMidday), 'isAfterDay returns false for same day');
}

// ==========================================
// Suite 2: selectInbox
// ==========================================
suite('Suite 2: selectInbox');
{
    assert(selectInbox([]).length === 0, 'selectInbox on empty array returns empty array');
    assert(selectInbox(null).length === 0, 'selectInbox on null safely returns empty array');

    const tasks = [
        { id: '1', title: 'Task 1', completed: false, createdAt: '2026-11-10T10:00:00.000Z' },
        { id: '2', title: 'Task 2', completed: true, createdAt: '2026-11-11T12:00:00.000Z' },
        { id: '3', title: 'Task 3', completed: false, createdAt: '2026-11-11T13:00:00.000Z' },
    ];

    const inbox = selectInbox(tasks);
    assert(inbox.length === 2, 'selectInbox excludes completed tasks');
    assert(inbox[0].id === '3', 'selectInbox returns newest first');
    assert(inbox[1].id === '1', 'selectInbox returns older active task second');

    // Immutability check
    assert(tasks[0].id === '1', 'selectInbox does not mutate input array');
}

// ==========================================
// Suite 3: selectToday & Boundary Tests
// ==========================================
suite('Suite 3: selectToday & Boundary Rules');
{
    // Task due today at 23:59 local
    const dueTodayEnd = new Date(2026, 10, 11, 23, 59, 0).toISOString();
    // Task due tomorrow at 00:00 local
    const dueTomorrowStart = new Date(2026, 10, 12, 0, 0, 0).toISOString();
    // Date-only task due today
    const dueTodayDateOnly = new Date(2026, 10, 11, 0, 0, 0).toISOString();
    // Overdue task from 2 days ago
    const dueOverdueOld = new Date(2026, 10, 9, 10, 0, 0).toISOString();
    // Overdue task from yesterday
    const dueYesterday = new Date(2026, 10, 10, 18, 0, 0).toISOString();
    // Task due today at 16:00 (upcoming today)
    const dueTodayLater = new Date(2026, 10, 11, 16, 0, 0).toISOString();
    // Task due today at 10:00 (past today time, so overdue)
    const dueTodayMorning = new Date(2026, 10, 11, 10, 0, 0).toISOString();

    const tasks = [
        { id: 't-tomorrow', title: 'Tomorrow 00:00', dueAt: dueTomorrowStart, hasDueTime: true, completed: false },
        { id: 't-today-end', title: 'Today 23:59', dueAt: dueTodayEnd, hasDueTime: true, completed: false },
        { id: 't-date-only', title: 'Today Date-Only', dueAt: dueTodayDateOnly, hasDueTime: false, completed: false },
        { id: 't-overdue-9th', title: 'Overdue Nov 9', dueAt: dueOverdueOld, hasDueTime: true, completed: false },
        { id: 't-yesterday', title: 'Yesterday', dueAt: dueYesterday, hasDueTime: true, completed: false },
        { id: 't-today-later', title: 'Today 16:00', dueAt: dueTodayLater, hasDueTime: true, completed: false },
        { id: 't-today-morning', title: 'Today 10:00', dueAt: dueTodayMorning, hasDueTime: true, completed: false },
        { id: 't-completed', title: 'Completed Today', dueAt: dueTodayEnd, hasDueTime: true, completed: true },
        { id: 't-no-date', title: 'No due date', dueAt: null, hasDueTime: false, completed: false },
    ];

    const todayList = selectToday(tasks, fixedNow);

    assert(todayList.some(t => t.id === 't-today-end'), 'Boundary: task due today at 23:59 local is in Today');
    assert(!todayList.some(t => t.id === 't-tomorrow'), 'Boundary: task due tomorrow at 00:00 is NOT in Today');
    assert(todayList.some(t => t.id === 't-date-only'), 'Boundary: date-only task due today is in Today');
    assert(!todayList.some(t => t.id === 't-no-date'), 'Boundary: task with no due date is NOT in Today');
    assert(!todayList.some(t => t.id === 't-completed'), 'Completed tasks are excluded from Today');

    // Check ordering:
    // Overdue first: 't-overdue-9th', 't-yesterday', 't-today-morning' (oldest first)
    // Then today's remaining: 't-today-later', 't-today-end' (by time)
    // Then date-only: 't-date-only' (after timed ones)
    const ids = todayList.map(t => t.id);

    assert(ids.indexOf('t-overdue-9th') < ids.indexOf('t-yesterday'), 'Overdue oldest (Nov 9) is before yesterday (Nov 10)');
    assert(ids.indexOf('t-yesterday') < ids.indexOf('t-today-morning'), 'Overdue yesterday is before overdue morning');
    assert(ids.indexOf('t-today-morning') < ids.indexOf('t-today-later'), 'Overdue morning is before today remaining');
    assert(ids.indexOf('t-today-later') < ids.indexOf('t-today-end'), 'Today 16:00 is before Today 23:59');
    assert(ids.indexOf('t-today-end') < ids.indexOf('t-date-only'), 'Date-only task is placed after timed ones');
}

// ==========================================
// Suite 4: selectUpcoming & Grouping
// ==========================================
suite('Suite 4: selectUpcoming & Grouping');
{
    const dueTomorrowStart = new Date(2026, 10, 12, 0, 0, 0).toISOString();
    const dueTomorrowNoon = new Date(2026, 10, 12, 12, 0, 0).toISOString();
    const dueTomorrowDateOnly = new Date(2026, 10, 12, 0, 0, 0).toISOString();
    // Nov 15
    const dueNov15 = new Date(2026, 10, 15, 9, 30, 0).toISOString();
    // Dec 31 (month boundary)
    const dueDec31 = new Date(2026, 11, 31, 15, 0, 0).toISOString();
    // Jan 5, 2027 (year boundary)
    const dueJan5NextYear = new Date(2027, 0, 5, 11, 0, 0).toISOString();

    const tasks = [
        { id: 'u-tomorrow-noon', title: 'Tomorrow Noon', dueAt: dueTomorrowNoon, hasDueTime: true, completed: false },
        { id: 'u-tomorrow-start', title: 'Tomorrow 00:00', dueAt: dueTomorrowStart, hasDueTime: true, completed: false },
        { id: 'u-tomorrow-date-only', title: 'Tomorrow Date-Only', dueAt: dueTomorrowDateOnly, hasDueTime: false, completed: false },
        { id: 'u-nov15', title: 'Nov 15', dueAt: dueNov15, hasDueTime: true, completed: false },
        { id: 'u-dec31', title: 'Dec 31', dueAt: dueDec31, hasDueTime: true, completed: false },
        { id: 'u-next-year', title: 'Jan 5 2027', dueAt: dueJan5NextYear, hasDueTime: true, completed: false },
        { id: 'u-today', title: 'Today Task', dueAt: new Date(2026, 10, 11, 15, 0).toISOString(), hasDueTime: true, completed: false },
    ];

    const upcoming = selectUpcoming(tasks, fixedNow);

    assert(upcoming.length === 4, 'selectUpcoming created 4 date groups (Tomorrow, Nov 15, Dec 31, Jan 5)');
    assert(upcoming[0].label === 'Tomorrow', 'First group label is "Tomorrow"');
    assert(upcoming[0].dateKey === '2026-11-12', 'Tomorrow dateKey is 2026-11-12');

    // Check sorting inside Tomorrow group: timed 00:00, then timed 12:00, then date-only
    const tomorrowTasks = upcoming[0].tasks.map(t => t.id);
    assert(tomorrowTasks[0] === 'u-tomorrow-start', 'Inside group: 00:00 timed task is first');
    assert(tomorrowTasks[1] === 'u-tomorrow-noon', 'Inside group: 12:00 timed task is second');
    assert(tomorrowTasks[2] === 'u-tomorrow-date-only', 'Inside group: date-only task is after timed ones');

    // Month & year boundary
    assert(upcoming[2].dateKey === '2026-12-31', 'Month boundary preserved (2026-12-31)');
    assert(upcoming[3].dateKey === '2027-01-05', 'Year boundary preserved (2027-01-05)');
    assert(upcoming[3].label.includes('2027'), 'Year included in label for next year date');
}

// ==========================================
// Suite 5: selectCompleted & countByView
// ==========================================
suite('Suite 5: selectCompleted & countByView');
{
    const tasks = [
        { id: 'c1', title: 'Comp 1', completed: true, completedAt: '2026-11-10T10:00:00.000Z' },
        { id: 'c2', title: 'Comp 2', completed: true, completedAt: '2026-11-11T12:00:00.000Z' },
        { id: 'a1', title: 'Active no date', completed: false, dueAt: null, createdAt: '2026-11-11T09:00:00.000Z' },
        { id: 'a2', title: 'Active today', completed: false, dueAt: new Date(2026, 10, 11, 15, 0).toISOString(), hasDueTime: true, createdAt: '2026-11-11T08:00:00.000Z' },
        { id: 'a3', title: 'Active upcoming', completed: false, dueAt: new Date(2026, 10, 12, 10, 0).toISOString(), hasDueTime: true, createdAt: '2026-11-11T07:00:00.000Z' },
    ];

    const completed = selectCompleted(tasks);
    assert(completed.length === 2, 'selectCompleted returns completed only');
    assert(completed[0].id === 'c2', 'selectCompleted sorts most recently completed first');

    const counts = countByView(tasks, fixedNow);
    assert(counts.inbox === 3, 'countByView.inbox counts all active tasks (3)');
    assert(counts.today === 1, 'countByView.today counts today tasks (1)');
    assert(counts.upcoming === 1, 'countByView.upcoming counts upcoming tasks (1)');
}

// ==========================================
// Suite 6: Edge Cases & Performance
// ==========================================
suite('Suite 6: Edge Cases & Performance');
{
    // Edge case 1: Task with no due date appears only in Inbox
    const taskNoDate = { id: 'nd1', title: 'No date', completed: false, dueAt: null, createdAt: '2026-11-11T10:00:00.000Z' };
    const taskList = [taskNoDate];

    assert(selectInbox(taskList).length === 1, 'Task with no due date appears in Inbox');
    assert(selectToday(taskList, fixedNow).length === 0, 'Task with no due date does NOT appear in Today');
    assert(selectUpcoming(taskList, fixedNow).length === 0, 'Task with no due date does NOT appear in Upcoming');

    // Edge case 2: Completing a task in Today removes it from Today and updates counts
    const activeTodayTask = {
        id: 'att1',
        title: 'Today task',
        completed: false,
        dueAt: new Date(2026, 10, 11, 16, 0).toISOString(),
        hasDueTime: true,
    };
    const stateBefore = [activeTodayTask];
    assert(selectToday(stateBefore, fixedNow).length === 1, 'Active task is in Today before completion');
    assert(countByView(stateBefore, fixedNow).today === 1, 'countByView.today is 1 before completion');

    // Simulate toggle
    const stateAfter = [{ ...activeTodayTask, completed: true, completedAt: new Date().toISOString() }];
    assert(selectToday(stateAfter, fixedNow).length === 0, 'Completed task removed from Today immediately');
    assert(countByView(stateAfter, fixedNow).today === 0, 'countByView.today decremented immediately');

    // Edge case 3: 200 tasks scale test
    const largeList = [];
    for (let i = 0; i < 200; i++) {
        largeList.push({
            id: `task-${i}`,
            title: `Task #${i}`,
            completed: i % 7 === 0,
            dueAt: new Date(2026, 10, 11 + (i % 10), 10, 0).toISOString(),
            hasDueTime: true,
            createdAt: new Date(2026, 10, 1, 0, i).toISOString(),
        });
    }

    const start = performance.now();
    const inbox200 = selectInbox(largeList);
    const today200 = selectToday(largeList, fixedNow);
    const upcoming200 = selectUpcoming(largeList, fixedNow);
    const completed200 = selectCompleted(largeList);
    const counts200 = countByView(largeList, fixedNow);
    const duration = performance.now() - start;

    assert(inbox200.length === 171, 'Inbox has active tasks from 200');
    assert(completed200.length === 29, 'Completed has 29 tasks from 200');
    assert(today200.length > 0, 'Today has tasks populated from 200');
    assert(upcoming200.length > 0, 'Upcoming groups populated from 200');
    assert(counts200.inbox === 171, 'countByView.inbox matches active tasks');
    assert(duration < 50, `200 tasks processed swiftly in ${duration.toFixed(2)}ms (< 50ms)`);
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
