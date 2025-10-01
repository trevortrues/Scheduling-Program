const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const dbFolder = path.join(__dirname, '..', 'Database');
if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
}

const dbPath = path.join(dbFolder, 'schedule.db');

(async () => {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // --- Drop Tables ---
    await db.exec('DROP TABLE IF EXISTS residents');
    await db.exec('DROP TABLE IF EXISTS services');
    await db.exec('DROP TABLE IF EXISTS vacations');
    await db.exec('DROP TABLE IF EXISTS schedule');

    // --- Create Tables ---
    await db.exec(`
        CREATE TABLE IF NOT EXISTS residents (
            res_id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            pgy_level INTEGER NOT NULL
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS services (
            service_id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_name TEXT NOT NULL
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS vacations (
            vacation_id INTEGER PRIMARY KEY AUTOINCREMENT,
            res_id INTEGER NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            FOREIGN KEY (res_id) REFERENCES residents(res_id)
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS schedule (
            schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
            res_id INTEGER NOT NULL,
            service_id INTEGER NOT NULL,
            week_start DATE NOT NULL,
            week_end DATE NOT NULL,
            is_overnight BOOLEAN NOT NULL DEFAULT 0,
            FOREIGN KEY (res_id) REFERENCES residents(res_id),
            FOREIGN KEY (service_id) REFERENCES services(service_id),
            UNIQUE(res_id, week_start)
        )
    `);

    // --- Populate Residents ---
    const pgyDistribution = [
        ...Array(10).fill(2), // 10 PGY 2
        ...Array(10).fill(3), // 10 PGY 3
        ...Array(7).fill(4)   // 7 PGY 4
    ];

    for (let i = 0; i < 27; i++) {
        const firstName = `Resident${i + 1}`;
        const lastName = `Lastname${i + 1}`;
        const pgy = pgyDistribution[i];
        await db.run(
            `INSERT INTO residents (first_name, last_name, pgy_level) VALUES (?, ?, ?)`,
            [firstName, lastName, pgy]
        );
    }

    // --- Populate Services ---
    const services = ["Stroke", "VA", "UH", "ELECTIVE", "CC"];
    for (const service of services) {
        await db.run(`INSERT INTO services (service_name) VALUES (?)`, [service]);
    }

    // --- Populate Vacations (4 per resident) ---
    for (let res_id = 1; res_id <= 27; res_id++) {
        const vacationWeeks = new Set();
        while (vacationWeeks.size < 4) {
            vacationWeeks.add(Math.floor(Math.random() * 52));
        }
        for (const weekNum of vacationWeeks) {
            const start = new Date(2025, 0, 1 + weekNum * 7);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            await db.run(
                `INSERT INTO vacations (res_id, start_date, end_date) VALUES (?, ?, ?)`,
                [res_id, start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
            );
        }
    }

    // --- Populate Schedule ---
    for (let weekNum = 0; weekNum < 52; weekNum++) {
        const weekStart = new Date(2025, 0, 1 + weekNum * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        for (let res_id = 1; res_id <= 27; res_id++) {
            const row = await db.get(
                `SELECT COUNT(*) AS cnt FROM vacations WHERE res_id=? AND ? BETWEEN start_date AND end_date`,
                [res_id, weekStart.toISOString().split('T')[0]]
            );
            if (row.cnt === 0) {
                const service_id = Math.floor(Math.random() * 5) + 1;
                const over_night = Math.floor(Math.random() * 2);
                await db.run(
                    `INSERT INTO schedule (res_id, service_id, week_start, week_end, is_overnight) VALUES (?, ?, ?, ?, ?)`,
                    [
                        res_id,
                        service_id,
                        weekStart.toISOString().split('T')[0],
                        weekEnd.toISOString().split('T')[0],
                        over_night
                    ]
                );
            }
        }
    }

    // --- Display Tables ---
    // console.log("\n--- Residents ---");
    // console.table(await db.all(`SELECT * FROM residents`));

    // console.log("\n--- Services ---");
    // console.table(await db.all(`SELECT * FROM services`));

    // console.log("\n--- Vacations ---");
    // console.table(await db.all(`SELECT * FROM vacations ORDER BY res_id, start_date`));

    // console.log("\n--- Schedule ---");
    // console.table(await db.all(`SELECT * FROM schedule ORDER BY res_id, week_start`));i

    console.table(await db.all(`SELECT * FROM vacations WHERE res_id=3`))

    await db.close();
    console.log('Database connection closed.');
})();