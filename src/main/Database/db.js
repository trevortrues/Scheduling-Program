const Database = require('better-sqlite3');
const path = require('path');


const dbPath = path.join(__dirname, 'schedule.db');
console.log(dbPath);
const db = new Database(dbPath);

// --- Drop tables if they exist ---
db.prepare('DROP TABLE IF EXISTS schedule').run();
db.prepare('DROP TABLE IF EXISTS schedule_sets').run();
db.prepare('DROP TABLE IF EXISTS vacations').run();
db.prepare('DROP TABLE IF EXISTS services').run();
db.prepare('DROP TABLE IF EXISTS residents').run();

// --- Create tables ---
db.prepare(`
    CREATE TABLE IF NOT EXISTS residents (
        res_id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        pgy_level INTEGER NOT NULL
    )
`).run();

// db.prepare(`
//     CREATE TABLE IF NOT EXISTS services (
//         service_id INTEGER PRIMARY KEY AUTOINCREMENT,
//         service_name TEXT NOT NULL
//     )
// `).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS vacations (
        vacation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        res_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        FOREIGN KEY (res_id) REFERENCES residents(res_id)
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS schedule_sets (
        schedule_set_id INTEGER PRIMAry KEY AUTOINCREMENT,
        name TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS schedule (
        schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_set_id INTEGER NOT NULL,
        res_id INTEGER NOT NULL,
        service TEXT,
        week_start DATE NOT NULL,
        week_end DATE NOT NULL,
        is_overnight BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (res_id) REFERENCES residents(res_id),
        FOREIGN KEY (schedule_set_id) REFERENCES schedule_sets(schedule_set_id),
        UNIQUE(res_id, week_start)
    )
`).run();

// --- Populate residents ---
const pgyDistribution = [
    ...Array(10).fill(2),
    ...Array(10).fill(3),
    ...Array(7).fill(4)
];

for (let i = 0; i < 27; i++) {
    const firstName = `Resident${i + 1}`;
    const lastName = `Lastname${i + 1}`;
    const pgy = pgyDistribution[i];
    db.prepare(
        `INSERT INTO residents (first_name, last_name, pgy_level) VALUES (?, ?, ?)`
    ).run(firstName, lastName, pgy);
}



// --- Populate vacations ---
for (let res_id = 1; res_id <= 27; res_id++) {
    const vacationWeeks = new Set();
    while (vacationWeeks.size < 4) {
        vacationWeeks.add(Math.floor(Math.random() * 52));
    }
    for (const weekNum of vacationWeeks) {
        const start = new Date(2025, 0, 1 + weekNum * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        db.prepare(
            `INSERT INTO vacations (res_id, start_date, end_date) VALUES (?, ?, ?)`
        ).run(res_id, start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    }
}

// --- Create schedule set ---
const scheduleSetInfo = db.prepare(`
    INSERT INTO schedule_sets (name, start_date, end_date)
    VALUES (?, ?, ?)
`).run(
    '2025-2026 Main',
    '2025-07-01',      
    '2026-06-30'   
);
const schedule_set_id = scheduleSetInfo.lastInsertRowid;
const services = ["Stroke", "VA", "UH", "ELECTIVE", "CC"];

// --- Populate schedule ---
let currentWeek = new Date(2025, 6, 1); 

for (let i = 0; i < 52; i++){
    const weekStart = new Date(currentWeek);
    const weekEnd = new Date(currentWeek);
    weekEnd.setDate(weekStart.getDate() + 6);

    for (let res_id = 1; res_id <= 27; res_id++) {

        const service_idx = Math.floor(Math.random() * 5);
        const over_night = Math.floor(Math.random() * 2);
        db.prepare(
            `INSERT INTO schedule (schedule_set_id, res_id, service, week_start, week_end, is_overnight) 
                VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
            schedule_set_id,
            res_id,
            services[service_idx],
            weekStart.toISOString().split('T')[0],
            weekEnd.toISOString().split('T')[0],
            over_night
        );
    }

    currentWeek.setDate(currentWeek.getDate() + 7);
}


console.table(db.prepare(`SELECT * FROM schedule`).all());

db.close();
console.log('Database connection closed.');