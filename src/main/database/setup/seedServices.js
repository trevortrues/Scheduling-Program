import { getDatabase } from '../connection/index.js';

export function seedServices() {
    const db = getDatabase();
    const services = ["Stroke", "VA", "UH", "UNSCHEDULED", "ELECTIVE", "CC", "VAC", "NF", "EEG", "B/U", "NICU", "CHILD", "CLINIC", "RAD", "NFCL", "CONSULTS", "EMG", "EMU", "JEOPARDY-ELECTIVE", ""];

    for (const name of services) {
        db.prepare(`
            INSERT INTO services (name, description, is_active)
            VALUES (?, ?, 1)
        `).run(name, `${name} description`);
    }
}