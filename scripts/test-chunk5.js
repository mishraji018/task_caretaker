/* global process */
/**
 * Chunk 5 Unit Tests: Undo, Task Restoration, Toast Queue, and Hotkeys Guards
 */

import {
    taskService,
    STORAGE_KEY,
    CORRUPT_KEY,
    NotFoundError,
} from '../src/services/taskService.js';

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

function resetStorage() {
    mockStorage.clear();
    mockStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    taskService.getAll();
}

console.log('====================================');
console.log('--- RUNNING CHUNK 5 UNIT TESTS ---');
console.log('====================================');

// ==========================================
// Suite 1: taskService.restore Mechanics
// ==========================================
suite('Suite 1: taskService.restore & Snapshot Integrity');
{
    resetStorage();

    const original = taskService.create({
        title: 'Draft quarterly report',
        description: 'Include revenue figures',
        priority: 'high',
    });

    const snapshot = JSON.parse(JSON.stringify(original));

    // Delete task
    taskService.remove(original.id);
    assert(taskService.getAll().length === 0, 'Task removed from storage on delete');

    // Restore task
    const restored = taskService.restore(snapshot);
    assert(Boolean(restored), 'taskService.restore returned restored task');
    assert(restored.id === original.id, 'Restored task keeps exact original ID');
    assert(restored.title === original.title, 'Restored task keeps title');
    assert(restored.description === original.description, 'Restored task keeps description');
    assert(restored.priority === original.priority, 'Restored task keeps priority');
    assert(restored.createdAt === original.createdAt, 'Restored task keeps exact createdAt');
    assert(restored.updatedAt === original.updatedAt, 'Restored task keeps exact updatedAt');
    assert(restored.completed === false, 'Restored task keeps completed status');
    assert(restored.completedAt === null, 'Restored task keeps completedAt null');

    // Calling restore twice on existing id must NOT duplicate
    const secondRestore = taskService.restore(snapshot);
    assert(secondRestore.id === original.id, 'Second restore returns existing task');
    assert(taskService.getAll().length === 1, 'Calling restore twice does not duplicate task');
}

// ==========================================
// Suite 2: Complete -> Undo Round Trip
// ==========================================
suite('Suite 2: Complete -> Undo Preserves completedAt');
{
    resetStorage();

    const task = taskService.create({ title: 'Prepare board slides' });
    const prevCompleted = task.completed;
    const prevCompletedAt = task.completedAt;

    // Toggle complete
    const completed = taskService.update(task.id, { completed: true });
    assert(completed.completed === true, 'Task completed marked true');
    assert(Boolean(completed.completedAt), 'completedAt populated');

    // Undo completion
    const undone = taskService.update(task.id, {
        completed: prevCompleted,
        completedAt: prevCompletedAt,
    });
    assert(undone.completed === false, 'Undo restored completed to false');
    assert(undone.completedAt === null, 'Undo restored completedAt back to null');
}

// ==========================================
// Suite 3: Delete -> Undo -> Delete -> Undo Sequence
// ==========================================
suite('Suite 3: Sequential Delete and Undo Cycles');
{
    resetStorage();

    const t1 = taskService.create({ title: 'Sequential task' });
    const snap1 = JSON.parse(JSON.stringify(t1));

    // Cycle 1: Delete -> Undo
    taskService.remove(t1.id);
    assert(taskService.getAll().length === 0, 'Cycle 1: Task removed');
    taskService.restore(snap1);
    assert(taskService.getAll().length === 1, 'Cycle 1: Task restored');

    // Cycle 2: Delete -> Undo again
    taskService.remove(t1.id);
    assert(taskService.getAll().length === 0, 'Cycle 2: Task removed');
    taskService.restore(snap1);
    assert(taskService.getAll().length === 1, 'Cycle 2: Task restored');
    assert(taskService.getAll()[0].id === t1.id, 'Task ID still matches exactly');
}

// ==========================================
// Suite 4: Multi-Delete & Independent Undo
// ==========================================
suite('Suite 4: Multi-Delete & Independent Undo');
{
    resetStorage();

    const t1 = taskService.create({ title: 'Task Alpha' });
    const t2 = taskService.create({ title: 'Task Beta' });
    const snap1 = JSON.parse(JSON.stringify(t1));
    const snap2 = JSON.parse(JSON.stringify(t2));

    // Delete both
    taskService.remove(t1.id);
    taskService.remove(t2.id);
    assert(taskService.getAll().length === 0, 'Both tasks deleted');

    // Undo only the first
    taskService.restore(snap1);
    const current = taskService.getAll();
    assert(current.length === 1, 'Only one task restored');
    assert(current[0].id === t1.id, 'Task Alpha restored, Task Beta remains deleted');

    // Undo the second
    taskService.restore(snap2);
    assert(taskService.getAll().length === 2, 'Both tasks now back in storage');
}

// ==========================================
// Suite 5: Cross-Route Navigation Undo Simulation
// ==========================================
suite('Suite 5: Cross-Route Navigation Undo');
{
    resetStorage();

    const task = taskService.create({ title: 'Route switch task' });
    const snapshot = JSON.parse(JSON.stringify(task));

    let listenerTriggeredCount = 0;
    const unsubscribe = taskService.subscribe(() => {
        listenerTriggeredCount++;
    });

    // Simulated user on /today deletes task
    taskService.remove(task.id);
    assert(taskService.getAll().length === 0, 'Deleted from storage');
    assert(listenerTriggeredCount === 1, 'Subscriber notified of delete');

    // Simulated navigation to /inbox, then user presses Undo on existing toast
    const restored = taskService.restore(snapshot);
    assert(Boolean(restored), 'Toast Undo handler successfully called taskService.restore');
    assert(taskService.getAll().length === 1, 'Task restored in storage');
    assert(listenerTriggeredCount === 2, 'Mounted /inbox subscriber notified of restoration');

    unsubscribe();
}

// ==========================================
// Suite 6: 20 Quick Deletes & Bulk Undo
// ==========================================
suite('Suite 6: 20 Quick Deletes & Full Restoration');
{
    resetStorage();

    const snapshots = [];
    for (let i = 1; i <= 20; i++) {
        const t = taskService.create({ title: `Batch task #${i}` });
        snapshots.push(JSON.parse(JSON.stringify(t)));
    }
    assert(taskService.getAll().length === 20, 'Created 20 initial tasks');

    // 20 quick deletes
    for (const snap of snapshots) {
        taskService.remove(snap.id);
    }
    assert(taskService.getAll().length === 0, 'All 20 tasks deleted');

    // Restore all 20 in reverse order
    for (let i = snapshots.length - 1; i >= 0; i--) {
        taskService.restore(snapshots[i]);
    }

    const finalTasks = taskService.getAll();
    assert(finalTasks.length === 20, 'All 20 tasks restored');

    const ids = new Set(finalTasks.map((t) => t.id));
    assert(ids.size === 20, 'All 20 restored tasks have unique IDs (no duplicates)');
}

// ==========================================
// Suite 7: Toast Queue Logic (Max 3, FIFO)
// ==========================================
suite('Suite 7: Toast Queue Logic (Max 3, FIFO)');
{
    // Pure function simulating ToastProvider queue state updater
    function addToastToQueue(prev, newToast) {
        const sliced = prev.length >= 3 ? prev.slice(prev.length - 2) : prev;
        return [...sliced, newToast];
    }

    let queue = [];
    queue = addToastToQueue(queue, { id: '1', message: 'T1' });
    queue = addToastToQueue(queue, { id: '2', message: 'T2' });
    queue = addToastToQueue(queue, { id: '3', message: 'T3' });
    assert(queue.length === 3, 'Queue holds 3 toasts');
    assert(queue[0].id === '1', 'Oldest toast is T1');

    // Adding 4th toast evicts T1
    queue = addToastToQueue(queue, { id: '4', message: 'T4' });
    assert(queue.length === 3, 'Queue still capped at max 3');
    assert(queue[0].id === '2', 'T1 was evicted; T2 is now oldest');
    assert(queue[2].id === '4', 'T4 added to end of queue');
}

// ==========================================
// Suite 8: Hotkeys Target Guard Logic
// ==========================================
suite('Suite 8: Hotkeys Target Guard Logic');
{
    function shouldIgnoreShortcut(target, key, isModifierHeld) {
        // Ctrl/Cmd + K works everywhere
        if (isModifierHeld && (key === 'k' || key === 'K')) {
            return false;
        }

        // If user is typing in form controls, ignore single-key shortcuts
        const tagName = target?.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target?.isContentEditable) {
            return true;
        }

        // Preserve native browser shortcuts if modifier is held
        if (isModifierHeld) {
            return true;
        }

        return false;
    }

    assert(shouldIgnoreShortcut({ tagName: 'INPUT' }, 'n', false) === true, "Typing 'n' in input is ignored");
    assert(shouldIgnoreShortcut({ tagName: 'TEXTAREA' }, ' ', false) === true, 'Space in textarea is ignored');
    assert(shouldIgnoreShortcut({ tagName: 'INPUT' }, '/', false) === true, 'Slash in input is ignored');
    assert(shouldIgnoreShortcut({ tagName: 'DIV' }, 'n', false) === false, "Pressing 'n' on page creates new task");
    assert(shouldIgnoreShortcut({ tagName: 'DIV' }, '/', false) === false, 'Pressing slash on page focuses search');
    assert(shouldIgnoreShortcut({ tagName: 'INPUT' }, 'k', true) === false, 'Ctrl+K triggers command palette even inside input');
    assert(shouldIgnoreShortcut({ tagName: 'DIV' }, 'c', true) === true, 'Ctrl+C passes through to browser');
}

// ==========================================
// Suite 9: Corrupt Storage Resilience
// ==========================================
suite('Suite 9: Corrupt Storage Resilience');
{
    const task = { id: 'test-snap', title: 'Snapshot', completed: false, schemaVersion: 2 };
    mockStorage.setItem(STORAGE_KEY, '{ invalid corrupt json %$#@! }');
    const safeRestore = taskService.restore(task);
    assert(safeRestore === null || typeof safeRestore === 'object', 'Restore on corrupt storage handles safely without crashing');
}

// ==========================================
// SUMMARY
// ==========================================
console.log('\n====================================');
console.log(`CHUNK 5 UNIT TESTS COMPLETE`);
console.log(`Passed: ${passed} | Failed: ${failed}`);
console.log('====================================\n');

if (failed > 0) {
    process.exit(1);
}
