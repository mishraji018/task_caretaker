/* global process */
import { taskService, STORAGE_KEY, CORRUPT_KEY, ValidationError, NotFoundError } from '../src/services/taskService.js';

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

console.log('--- RUNNING CHUNK 1 TESTS ---');

// 1. Initial getAll() returns []
window.localStorage.clear();
const initialTasks = taskService.getAll();
assert(Array.isArray(initialTasks) && initialTasks.length === 0, 'getAll() on empty storage returns empty array');

// 2. Create valid task
const t1 = taskService.create({ title: 'First Task', description: 'Some details' });
assert(t1.title === 'First Task' && t1.description === 'Some details', 'Task created with correct title and description');
assert(t1.completed === false && t1.completedAt === null, 'Task created with completed: false and completedAt: null');
assert(typeof t1.id === 'string' && t1.id.length > 0, 'Task has valid unique id');
assert(t1.schemaVersion >= 1, 'Task has valid schemaVersion (>= 1)');

// 3. Create trims input
const tTrim = taskService.create({ title: '   Trimmed Title   ', description: '   Trimmed Desc   ' });
assert(tTrim.title === 'Trimmed Title' && tTrim.description === 'Trimmed Desc', 'Title and description are trimmed');

// 4. Reject empty or whitespace-only title
try {
    taskService.create({ title: '   ' });
    assert(false, 'Should reject whitespace-only title');
} catch (e) {
    assert(e instanceof ValidationError, 'Whitespace-only title throws ValidationError');
}

// 5. Reject 10,000 character title (no freeze)
const hugeTitle = 'A'.repeat(10000);
try {
    taskService.create({ title: hugeTitle });
    assert(false, 'Should reject title over 120 chars');
} catch (e) {
    assert(e instanceof ValidationError, '10,000 character title rejected with ValidationError without freeze');
}

// 6. Reject description over 1000 chars
try {
    taskService.create({ title: 'Valid Title', description: 'D'.repeat(1001) });
    assert(false, 'Should reject description over 1000 chars');
} catch (e) {
    assert(e instanceof ValidationError, 'Description over 1000 characters rejected with ValidationError');
}

// 7. Update title and description
const updated1 = taskService.update(t1.id, { title: 'Updated Title', description: 'Updated Desc' });
assert(updated1.title === 'Updated Title' && updated1.description === 'Updated Desc', 'Task title and description updated');
assert(new Date(updated1.updatedAt).getTime() >= new Date(t1.updatedAt).getTime(), 'updatedAt updated');

// 8. Update completed to true -> sets completedAt
const updatedCompleted = taskService.update(t1.id, { completed: true });
assert(updatedCompleted.completed === true, 'Task completed set to true');
assert(typeof updatedCompleted.completedAt === 'string', 'completedAt set to ISO timestamp');

// 9. Update completed to false -> clears completedAt
const updatedIncomplete = taskService.update(t1.id, { completed: false });
assert(updatedIncomplete.completed === false && updatedIncomplete.completedAt === null, 'completedAt cleared when completed is false');

// 10. Update non-existent id throws NotFoundError
try {
    taskService.update('non-existent-id', { title: 'Ghost' });
    assert(false, 'Should throw NotFoundError for non-existent id');
} catch (e) {
    assert(e instanceof NotFoundError, 'Updating non-existent task throws NotFoundError');
}

// 11. Remove task
taskService.remove(t1.id);
const tasksAfterRemove = taskService.getAll();
assert(!tasksAfterRemove.some(t => t.id === t1.id), 'Task removed from storage');

// 12. Remove non-existent id is safe no-op
taskService.remove('non-existent-id');
assert(true, 'Removing non-existent task is safe no-op');

// 13. Corrupted JSON handling ('{bad')
window.localStorage.setItem(STORAGE_KEY, '{bad json');
const recoveredTasks = taskService.getAll();
assert(Array.isArray(recoveredTasks) && recoveredTasks.length === 0, 'Corrupted JSON returns [] without crashing');
assert(window.localStorage.getItem(CORRUPT_KEY) === '{bad json', 'Corrupted raw value preserved in corrupt key');
assert(taskService.hasCorruptedData() === true, 'hasCorruptedData() returns true after corrupt load');

// 14. Dropping invalid items from corrupted array
window.localStorage.setItem(STORAGE_KEY, JSON.stringify([
    { id: 'valid-1', title: 'Valid Task', completed: false },
    { bad: 'item without id or title' },
    null,
    123
]));
const filteredTasks = taskService.getAll();
assert(filteredTasks.length === 1 && filteredTasks[0].id === 'valid-1', 'Invalid items in array dropped, valid kept');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}

