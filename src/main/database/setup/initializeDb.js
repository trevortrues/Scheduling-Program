import { getDatabase } from '../connection/index.js';

export function initDatabase() {
    const db = getDatabase();

    db.pragma('foreign_keys = OFF'); 

    db.prepare('DROP TABLE IF EXISTS assignments').run();
    db.prepare('DROP TABLE IF EXISTS weeks').run();
    db.prepare('DROP TABLE IF EXISTS services').run();
    db.prepare('DROP TABLE IF EXISTS schedule_sets').run();
    db.prepare('DROP TABLE IF EXISTS residents').run();
    db.prepare('DROP TABLE IF EXISTS service_constraints').run();
    db.prepare('DROP TABLE IF EXISTS service_pgy_rules').run();
    db.prepare('DROP TABLE IF EXISTS service_incompatibilities').run();
    db.prepare('DROP TABLE IF EXISTS service_prequisites').run();
    db.prepare('DROP TABLE IF EXISTS service_constraint_segments').run();
    db.prepare('DROP TABLE IF EXISTS resident_first_service_constraints').run();

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

    // Should i get rid of min and max? Should we still have global min/max residents per service?
    db.prepare(`
        CREATE TABLE service_constraints (
            service_id INTEGER PRIMARY KEY,
            rotation_length INTEGER DEFAULT 4,
            is_inpatient BOOLEAN DEFAULT 1,       
            requires_365_coverage BOOELAN DEFAULT 0,     
            required_on_holidays BOOLEAN DEFAULT 0,  
            min_residents INTEGER DEFAULT 1,
            max_residents INTEGER DEFAULT 1,
            FOREIGN KEY (service_id) REFERENCES services(service_id)
        )
    `).run();

    db.prepare(`
        CREATE TABLE service_constraint_segments (
            segment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id INTEGER NOT NULL,
            start_week INTEGER NOT NULL,
            end_week INTEGER NOT NULL,
            min_residents INTEGER NOT NULL DEFAULT 1,
            max_residents INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (service_id) REFERENCES service_constraints(service_id)
        );
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
        CREATE TABLE service_incompatibilities (
            service_id INTEGER NOT NULL,
            incompatible_service_id INTEGER NOT NULL,
            FOREIGN KEY (service_id) REFERENCES services(service_id),
            FOREIGN KEY (incompatible_service_id) REFERENCES services(service_id),
            UNIQUE (service_id, incompatible_service_id)
        )    
    `).run();

    // Im just assuming this will be used for PGY2, so not adding pgy level.
    db.prepare(`
        CREATE TABLE service_prerequisites (
            service_id INTEGER NOT NULL,
            prerequisite_service_id INTEGER NOT NULL,
            week_count INTEGER,
            FOREIGN KEY (service_id) REFERENCES services(service_id),
            FOREIGN KEY (prerequisite_service_id) REFERENCES services(service_id),
            UNIQUE (service_id, prerequisite_service_id)
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

    // FYI, you need to manually add the res_id, as autoincrement won't work here.
    db.prepare(`
        CREATE TABLE IF NOT EXISTS resident_first_service_constraints (
            res_id INTEGER PRIMARY KEY,
            required_first_service_id INTEGER NOT NULL,
            FOREIGN KEY (res_id) REFERENCES residents(res_id),
            FOREIGN KEY (required_first_service_id) REFERENCES services(service_id)
        );
    `).run();


    // // --- Seed residents ---
    // const pgyDistribution = [...Array(10).fill(2), ...Array(10).fill(3), ...Array(7).fill(4)];
    // for (let i = 0; i < 27; i++) {
    //     db.prepare(`INSERT INTO residents (first_name, last_name, pgy_level) VALUES (?, ?, ?)`)
    //     .run(`Resident${i + 1}`, `Lastname${i + 1}`, pgyDistribution[i]);
    // }

    // // --- Seed services ---
    // const services = ["Stroke", "VA", "UH", "ELECTIVE", "CC", "VAC", ""];
    // for (const name of services) {
    //     let desc = name + " description";
    //     db.prepare(`INSERT INTO services (name, description, is_active) VALUES (?, ?, 1)`).run(name, desc);
    // }

    // // --- Service Constraints Seed ---
    // const serviceConstraints = {
    //     "Stroke":      { inpatient: 1, rotation: 2, min: 2, max: 2, cover365: 1, holidays: 1 },
    //     "VA":          { inpatient: 1, rotation: 2, min: 1, max: 1, cover365: 1, holidays: 0 },
    //     "UH":          { inpatient: 1, rotation: 2, min: 1, max: 1, cover365: 1, holidays: 0 },
    //     "ELECTIVE":    { inpatient: 0, rotation: 1, min: 0, max: 100, cover365: 0, holidays: 0},
    //     "CC":          { inpatient: 0, rotation: 1, min: 0, max: 5, cover365: 0, holidays: 0 }
    // };

    // for (const [name, c] of Object.entries(serviceConstraints)) {
    //     db.prepare(`
    //         INSERT INTO service_constraints (service_id, rotation_length, is_inpatient, requires_365_coverage, required_on_holidays, min_residents, max_residents)
    //         VALUES (
    //             (SELECT service_id FROM services WHERE name = ?),
    //             ?, ?, ?, ?, ?, ?
    //         )
    //     `).run(name, c.rotation, c.inpatient, c.cover365, c.holidays, c.min, c.max);
    // }

    // const pgyLevels = [2, 3, 4];

    // const pgyMinMaxWeeks = {
    //     "Stroke": {
    //         2: { min: 5, max: 10 },
    //         3: { min: 3, max: 3 },
    //         4: { min: 2, max: 2 }
    //     },
    //     "VA": {
    //         2: { min: 0, max: 6 }
    //     },
    //     "UH": {
    //         2: { min: 4, max: 4 },
    //         3: { min: 2, max: 2 },
    //         4: { min: 0, max: 1 }
    //     },
    //     "ELECTIVE": {
    //         2: { min: 3, max: 3 },
    //         3: { min: 3, max: 3 },
    //         4: { min: 12, max: 18 }
    //     },
    //     "CC": {
    //         2: { min: 8, max: 8 },
    //         3: { min: 8, max: 8 },
    //         4: { min: 8, max: 8 }
    //     }
    // };

    // for (const [serviceName, pgyMap] of Object.entries(pgyMinMaxWeeks)) {
    //     for (const pgy of pgyLevels) {
    //         const minMax = pgyMap[pgy];
    //         if (minMax) {
    //             db.prepare(`
    //                 INSERT INTO service_pgy_rules (service_id, pgy_level, min_weeks, max_weeks)
    //                 VALUES (
    //                     (SELECT service_id FROM services WHERE name = ?),
    //                     ?, ?, ?
    //                 )
    //             `).run(serviceName, pgy, minMax.min, minMax.max);
    //         }
    //     }
    // }

    // // --- Create schedule set for the year ---
    // const scheduleSet = db.prepare(`
    //     INSERT INTO schedule_sets (name, start_date, end_date)
    //     VALUES (?, ?, ?)
    // `).run('2025–2026 Main', '2025-07-01', '2026-06-30');
    // const schedule_set_id = scheduleSet.lastInsertRowid;

    // // --- Create 52 weeks for this schedule set ---
    // const insertWeek = db.prepare(`
    //     INSERT INTO weeks (schedule_set_id, week_start, week_end)
    //     VALUES (?, ?, ?)
    // `);

    // const weekIds = [];
    // const currentYear = new Date().getFullYear();

    // // --- 1. Start fixed at July 1 ---
    // const startDate = new Date(`${currentYear}-07-01`);

    // // --- 2. Find first Sunday after July 1 ---
    // let firstSunday = new Date(startDate);
    // do {
    // firstSunday.setDate(firstSunday.getDate() + 1);
    // } while (firstSunday.getDay() !== 0);

    // // --- 3. WEEK 1: July 1 → the Saturday before first Sunday ---
    // let weekStart = new Date(startDate);
    // let weekEnd = new Date(firstSunday);
    // weekEnd.setDate(weekEnd.getDate() - 1); // Saturday

    // let info = insertWeek.run(
    // schedule_set_id,
    // weekStart.toISOString().split('T')[0],
    // weekEnd.toISOString().split('T')[0]
    // );
    // weekIds.push(info.lastInsertRowid);

    // // --- 4. WEEK 2–52: Normal 7-day weeks ---
    // weekStart = new Date(firstSunday); // now Sunday start

    // for (let i = 2; i <= 53; i++) {
    // weekEnd = new Date(weekStart);
    // weekEnd.setDate(weekStart.getDate() + 6);
    // console.log(weekStart, weekEnd);

    // info = insertWeek.run(
    //     schedule_set_id,
    //     weekStart.toISOString().split('T')[0],
    //     weekEnd.toISOString().split('T')[0]
    // );
    // weekIds.push(info.lastInsertRowid);

    // // next week start
    // weekStart = new Date(weekEnd);
    // weekStart.setDate(weekStart.getDate() + 1);
    // }


    // // --- Seed service incompatibilities ---
    // const serviceIncompatibilities = {
    //     "Stroke": ["VA"], 
    //     "VA": [],         
    //     "UH": ["Stroke"],         
    //     "ELECTIVE": []
    // };

    // const getServiceId2= db.prepare(`SELECT service_id FROM services WHERE name = ?`);

    // for (const [service, incompatibleList] of Object.entries(serviceIncompatibilities)) {
    //     const serviceId = getServiceId2.get(service).service_id;
    //     for (const incompatible of incompatibleList) {
    //         const incompatibleId = getServiceId2.get(incompatible).service_id;
    //         db.prepare(`
    //             INSERT INTO service_incompatibilities (service_id, incompatible_service_id)
    //             VALUES (?, ?)
    //         `).run(serviceId, incompatibleId);
    //     }
    // }

    // const incompat = db.prepare(`SELECT * FROM service_incompatibilities`);
    // console.table(incompat.all());

    // // --- Assign services and vacations ---
    // const insertAssignment = db.prepare(`
    //     INSERT INTO assignments
    //     (res_id, week_id, service_id, is_overnight, is_vacation, is_impatient, vacation_priority)
    //     VALUES (?, ?, ?, ?, ?, ?, ?)
    // `);

    // const getServiceId = db.prepare(`SELECT service_id FROM services WHERE name = ?`);

    // for (let res_id = 1; res_id <= 27; res_id++) {
    //     // Choose 4 random vacation weeks
    //     const vacationWeeks = new Set();
    //     while (vacationWeeks.size < 4) {
    //     vacationWeeks.add(Math.floor(Math.random() * 52));
    //     }

    //     for (let i = 0; i < 53; i++) {
    //         const isVacation = vacationWeeks.has(i);
    //         const isOvernight = Math.random() < 0.5 ? 1 : 0;

    //         if (isVacation) {
    //             const priority = Math.floor(Math.random() * 3) + 1;
    //             insertAssignment.run(res_id, weekIds[i], 6, 0, 1, 0, priority);
    //         } else {
    //             const randomService = services[Math.floor(Math.random() * 5)]; 
    //             const service_id = getServiceId.get(randomService).service_id;
    //             insertAssignment.run(res_id, weekIds[i], service_id, isOvernight, 0, 0, null);
    //         }
    //     }
    // }
}