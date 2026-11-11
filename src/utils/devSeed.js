/**
 * DEV-ONLY helper to generate realistic demo tasks for performance testing.
 * Protected by import.meta.env.DEV so Vite completely strips it in production builds.
 */

export function seedDemoTasks(n = 1000) {
    if (!import.meta.env.DEV) return [];

    const priorities = ['high', 'medium', 'low'];
    const titles = [
        'Review quarterly budget report',
        'Update documentation for REST API',
        'Organize team retro meeting',
        'Fix mobile layout alignment bug',
        'Plan sprint backlog with engineering',
        'Prepare slides for client demo',
        'Refactor authentication middleware',
        'Deploy v2 schema to staging cluster',
        'Weekly groceries and supplies',
        'Buy birthday gift for colleague',
        'Doctor dental checkup appointment',
        'Renew vehicle insurance policy',
        'Design responsive bottom navigation dock',
        'Schedule flight tickets for conference',
        'Audit web accessibility contrast guidelines',
        'Complete online Python performance course',
        'Inspect server logs for memory spikes',
        'Sync calendar invitations for workshop',
        'Review pull request comments on GitHub',
        'Optimize database query execution plan',
    ];

    const tasks = [];
    const now = new Date();

    for (let i = 0; i < n; i++) {
        const titleIndex = i % titles.length;
        const priority = priorities[i % priorities.length];
        const isDone = i % 6 === 0;

        // Offset due dates: some overdue, some today, some future, some no date
        let dueAt = null;
        let hasDueTime = false;
        if (i % 5 !== 0) {
            const dayOffset = (i % 25) - 5; // -5 to +19 days
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, 9 + (i % 8), (i % 4) * 15);
            dueAt = d.toISOString();
            hasDueTime = i % 2 === 0;
        }

        const subtasks = [];
        if (i % 3 === 0) {
            subtasks.push({
                id: `seed-sub-${i}-1`,
                title: `Check requirement checklist step ${i + 1}`,
                done: isDone || i % 2 === 0,
            });
            subtasks.push({
                id: `seed-sub-${i}-2`,
                title: `Send update email to stakeholder ${i + 1}`,
                done: isDone,
            });
        }

        tasks.push({
            id: `seed-task-${i + 1}`,
            title: `${titles[titleIndex]} #${i + 1}`,
            description: i % 2 === 0 ? `Detailed action items and operational notes for task #${i + 1}.` : '',
            completed: isDone,
            completedAt: isDone ? new Date(now.getTime() - i * 60000).toISOString() : null,
            priority,
            categoryId: null,
            dueAt,
            hasDueTime,
            subtasks,
            createdAt: new Date(now.getTime() - (n - i) * 120000).toISOString(),
            updatedAt: new Date().toISOString(),
            schemaVersion: 2,
        });
    }

    return tasks;
}

export default seedDemoTasks;
