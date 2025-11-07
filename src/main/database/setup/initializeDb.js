import { getDatabase } from '../connection/index.js';

export function seedDatabase() {
    const db = getDatabase();

    db.pragma('foreign_keys = OFF'); 

    db.prepare('DROP TABLE IF EXISTS assignments').run();
    db.prepare('DROP TABLE IF EXISTS weeks').run();
    db.prepare('DROP TABLE IF EXISTS services').run();
    db.prepare('DROP TABLE IF EXISTS schedule_sets').run();
    db.prepare('DROP TABLE IF EXISTS residents').run();
    db.prepare('DROP TABLE IF EXISTS service_constraints').run();
    db.prepare('DROP TABLE IF EXISTS service_pgy_rules').run();

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
            name TEXT UNIQUE,
            description TEXT,
            is_active INTEGER NOT NULL DEFAULT 1
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
        CREATE TABLE service_constraints (
            service_id INTEGER PRIMARY KEY,
            rotation_length INTEGER,
            is_impatient NOT NULL DEFAULT 1,
            requires_365_coverage INTEGER DEFAULT 0,
            min_residents INTEGER DEFAULT 1,
            max_residents INTEGER DEFAULT 1,
            FOREIGN KEY (service_id) REFERENCES services(service_id)
        )
    `).run();

    db.prepare(`
        CREATE TABLE service_pgy_rules (
            service_id INTEGER NOT NULL,
            pgy_level INTEGER NOT NULL,
            min_weeks INTEGER DEFAULT 0,
            max_weeks INTEGER DEFAULT 0,
            FOREIGN KEY (service_id) REFERENCES services(service_id),
            UNIQUE(service_id, pgy_level)
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
            is_impatient BOOLEAN NOT NULL DEFAULT 0,
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
    const services = ["Stroke", "VA", "UH", "ELECTIVE", "CC", "VAC", ""];
    for (const name of services) {
        let desc = name + " description";
        db.prepare(`INSERT INTO services (name, description, is_active) VALUES (?, ?, 1)`).run(name, desc);
    }

    // --- Service Constraints Seed ---
    const serviceConstraints = {
        "Stroke":      { impatient: 1, rotation: 2, min: 2, max: 2, cover365: 1 },
        "VA":          { impatient: 1, rotation: 2, min: 1, max: 1, cover365: 1 },
        "UH":          { impatient: 1, rotation: 2, min: 1, max: 1, cover365: 1 },
        "ELECTIVE":    { impatient: 0, rotation: 1, min: 0, max: 100, cover365: 0 },
        "CC":          { impatient: 0, rotation: 1, min: 0, max: 5, cover365: 0 }
    };

    for (const [name, c] of Object.entries(serviceConstraints)) {
        db.prepare(`
            INSERT INTO service_constraints (service_id, rotation_length, is_impatient, requires_365_coverage, min_residents, max_residents)
            VALUES (
                (SELECT service_id FROM services WHERE name = ?),
                ?, ?, ?, ?, ?
            )
        `).run(name, c.rotation, c.impatient, c.cover365, c.min, c.max);
    }

    const pgyLevels = [2, 3, 4];

    const pgyMinMaxWeeks = {
        "Stroke": {
            2: { min: 5, max: 10 },
            3: { min: 3, max: 3 },
            4: { min: 2, max: 2 }
        },
        "VA": {
            2: { min: 0, max: 6 }
        },
        "UH": {
            2: { min: 4, max: 4 },
            3: { min: 2, max: 2 },
            4: { min: 0, max: 1 }
        },
        "ELECTIVE": {
            2: { min: 3, max: 3 },
            3: { min: 3, max: 3 },
            4: { min: 12, max: 18 }
        },
        "CC": {
            2: { min: 8, max: 8 },
            3: { min: 8, max: 8 },
            4: { min: 8, max: 8 }
        }
    };

    for (const [serviceName, pgyMap] of Object.entries(pgyMinMaxWeeks)) {
        for (const pgy of pgyLevels) {
            const minMax = pgyMap[pgy];
            if (minMax) {
                db.prepare(`
                    INSERT INTO service_pgy_rules (service_id, pgy_level, min_weeks, max_weeks)
                    VALUES (
                        (SELECT service_id FROM services WHERE name = ?),
                        ?, ?, ?
                    )
                `).run(serviceName, pgy, minMax.min, minMax.max);
            }
        }
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

    const serviceConstraint = db.prepare(`SELECT * FROM service_constraints`).all();
    console.table(serviceConstraint);

    // Query all rows from service_pgy_rules
    const servicePgyRules = db.prepare(`SELECT * FROM service_pgy_rules`).all();
    console.table(servicePgyRules);

    const startDate = new Date(2025, 6, 1); 
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
        (res_id, week_id, service_id, is_overnight, is_vacation, is_impatient, vacation_priority)
        VALUES (?, ?, ?, ?, ?, ?, ?)
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
                insertAssignment.run(res_id, weekIds[i], 6, 0, 1, 0, priority);
            } else {
                const randomService = services[Math.floor(Math.random() * 5)]; 
                const service_id = getServiceId.get(randomService).service_id;
                insertAssignment.run(res_id, weekIds[i], service_id, isOvernight, 0, null);
            }
        }
    }
}