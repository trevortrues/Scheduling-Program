import { getDatabase } from '../connection/index.js';

export function seedServices() {
    const db = getDatabase();
    const services = ["Stroke", "VA", "UH", "ELECTIVE", "CC", "VAC", ""];

    for (const name of services) {
        db.prepare(`
            INSERT INTO services (name, description, is_active)
            VALUES (?, ?, 1)
        `).run(name, `${name} description`);
    }
}