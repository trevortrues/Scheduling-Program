const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbFolder = path.join(__dirname, '..', 'Database');
if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
}

const dbPath = path.join(dbFolder, 'schedule.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error opening database:', err.message);
});

db.serialize(() => {
    db.run('DROP TABLE IF EXISTS residents');

    db.run(`
        CREATE TABLE IF NOT EXISTS residents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            pgy INTEGER NOT NULL
        )
    `, (err) => {
        if (err) console.error('Error creating table:', err.message);
        else console.log('Table created!');

        const residents = [];

        for (let i = 1; i <= 10; i++) residents.push([`res${i}`, `last${i}`, 2]);
        for (let i = 1; i <= 10; i++) residents.push([`res${i + 10}`, `Last${i + 10}`, 3]);
        for (let i = 1; i <= 7; i++) residents.push([`res${i + 20}`, `last${i + 20}`, 4]);

        const stmt = db.prepare('INSERT INTO residents (first_name, last_name, pgy) VALUES (?, ?, ?)');
        for (const resident of residents) stmt.run(resident);
        stmt.finalize(() => {
            db.all('SELECT * FROM residents', (err, rows) => {
                if (err) console.error('Error querying residents:', err.message);
                else {
                    console.log('All residents in the database:');
                    rows.forEach(row => console.log(row));
                }

                db.close((err) => {
                    if (err) console.error('Error closing database:', err.message);
                    else console.log('Database connection closed.');
                });
            });
        });
    });
});