import { getDatabase } from '../connection/index.js';

export function seedWeeks(schedule_set_id) {
    const db = getDatabase();
    const insertWeek = db.prepare(`
        INSERT INTO weeks (schedule_set_id, week_start, week_end)
        VALUES (?, ?, ?)
    `);

    const weekIds = [];
    const currentYear = new Date().getFullYear();

    const startDate = new Date(`${currentYear}-07-01`);
    let firstSunday = new Date(startDate);

    while (firstSunday.getDay() !== 0) {
        firstSunday.setDate(firstSunday.getDate() + 1);
    }

    let weekStart = new Date(startDate);
    let weekEnd = new Date(firstSunday);
    weekEnd.setDate(weekEnd.getDate() - 1);

    // Week 1
    let info = insertWeek.run(
        schedule_set_id,
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
    );
    weekIds.push(info.lastInsertRowid);

    // Weeks 2–53
    weekStart = new Date(firstSunday);
    for (let i = 2; i <= 53; i++) {
        weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        info = insertWeek.run(
            schedule_set_id,
            weekStart.toISOString().split('T')[0],
            weekEnd.toISOString().split('T')[0]
        );
        weekIds.push(info.lastInsertRowid);

        weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() + 1);
    }

    return weekIds;
}