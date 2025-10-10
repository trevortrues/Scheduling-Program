import { getDatabase } from '../connection/index.js';

export function seedDatabase() {
    const db = getDatabase();

    console.log('Seeding database...');
    db.pragma('foreign_keys = OFF'); 

    db.prepare('DROP TABLE IF EXISTS assignments').run();
    db.prepare('DROP TABLE IF EXISTS weeks').run();
    db.prepare('DROP TABLE IF EXISTS services').run();
    db.prepare('DROP TABLE IF EXISTS schedule_sets').run();
    db.prepare('DROP TABLE IF EXISTS residents').run();

    db.pragma('foreign_keys = ON'); 

    // --- Create tables ---
    db.prepare(`
        CREATE TABLE IF NOT EXISTS residents (
            res_id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            pgy_level INTEGER NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS services (
            service_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
        `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS schedule_sets (
            schedule_set_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL
        )
    `).run();

    db.prepare(`
        CREATE TABLE weeks (
            week_id INTEGER PRIMARY KEY AUTOINCREMENT,
            schedule_set_id INTEGER NOT NULL,
            week_start DATE NOT NULL,
            week_end DATE NOT NULL,
            FOREIGN KEY (schedule_set_id) REFERENCES schedule_sets(schedule_set_id),
            UNIQUE(schedule_set_id, week_start)
        )         
    `).run();

    db.prepare(`
        CREATE TABLE assignments (
            assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            res_id INTEGER NOT NULL,
            week_id INTEGER NOT NULL,
            service_id INTEGER,
            is_overnight BOOLEAN NOT NULL DEFAULT 0,
            is_vacation BOOLEAN NOT NULL DEFAULT 0,
            vacation_priority INTEGER CHECK(vacation_priority BETWEEN 1 AND 3),
            FOREIGN KEY (res_id) REFERENCES residents(res_id),
            FOREIGN KEY (week_id) REFERENCES weeks(week_id),
            FOREIGN KEY (service_id) REFERENCES services(service_id),
            UNIQUE(res_id, week_id)
        )
    `).run();

    // --- Seed residents ---
    const pgyDistribution = [...Array(10).fill(2), ...Array(10).fill(3), ...Array(7).fill(4)];
    for (let i = 0; i < 27; i++) {
        db.prepare(`INSERT INTO residents (first_name, last_name, pgy_level) VALUES (?, ?, ?)`)
        .run(`Resident${i + 1}`, `Lastname${i + 1}`, pgyDistribution[i]);
    }

    // --- Seed services ---
    const services = ["Stroke", "VA", "UH", "ELECTIVE", "CC", "VAC"];
    for (const name of services) {
        db.prepare(`INSERT INTO services (name) VALUES (?)`).run(name);
    }

    // --- Create schedule set for the year ---
    const scheduleSet = db.prepare(`
        INSERT INTO schedule_sets (name, start_date, end_date)
        VALUES (?, ?, ?)
    `).run('2025–2026 Main', '2025-07-01', '2026-06-30');
    const schedule_set_id = scheduleSet.lastInsertRowid;

    // --- Create 52 weeks for this schedule set ---
    const insertWeek = db.prepare(`
        INSERT INTO weeks (schedule_set_id, week_start, week_end)
        VALUES (?, ?, ?)
    `);

    const startDate = new Date(2025, 6, 1); // July 1, 2025
    const weekIds = [];

    for (let i = 0; i < 52; i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const info = insertWeek.run(
        schedule_set_id,
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
        );
        weekIds.push(info.lastInsertRowid);
    }

    // --- Assign services and vacations ---
    const insertAssignment = db.prepare(`
        INSERT INTO assignments
        (res_id, week_id, service_id, is_overnight, is_vacation, vacation_priority)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const getServiceId = db.prepare(`SELECT service_id FROM services WHERE name = ?`);

    for (let res_id = 1; res_id <= 27; res_id++) {
        // Choose 4 random vacation weeks
        const vacationWeeks = new Set();
        while (vacationWeeks.size < 4) {
        vacationWeeks.add(Math.floor(Math.random() * 52));
        }

        for (let i = 0; i < 52; i++) {
            const isVacation = vacationWeeks.has(i);
            const isOvernight = Math.random() < 0.5 ? 1 : 0;

            if (isVacation) {
                const priority = Math.floor(Math.random() * 3) + 1;
                insertAssignment.run(res_id, weekIds[i], null, 0, 1, priority);
            } else {
                const randomService = services[Math.floor(Math.random() * 5)]; // only 5 non-vacation ones
                const service_id = getServiceId.get(randomService).service_id;
                insertAssignment.run(res_id, weekIds[i], service_id, isOvernight, 0, null);
            }
        }
    }
}