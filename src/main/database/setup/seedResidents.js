import { getDatabase } from '../connection/index.js';

export function seedResidents() {
    const db = getDatabase();
    const pgyDistribution = [...Array(10).fill(2), ...Array(10).fill(3), ...Array(7).fill(4)];

    for (let i = 0; i < 27; i++) {
        db.prepare(
            `INSERT INTO residents (first_name, last_name, pgy_level)
             VALUES (?, ?, ?)`
        ).run(`Resident${i+1}`, `Lastname${i+1}`, pgyDistribution[i]);
    }
}