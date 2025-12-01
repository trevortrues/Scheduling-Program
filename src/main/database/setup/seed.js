import { seedResidents } from './seedResidents.js';
import { seedServices } from './seedServices.js';
import { seedRules } from './seedRules.js';
import { seedWeeks } from './seedWeeks.js';
import { seedAssignments } from './seedAssignments.js';
import { initDatabase} from './initializeDb.js';
import { getDatabase } from '../connection/index.js';

export function seedDatabase() {
    const db = getDatabase();

    console.log("Resetting & creating tables...");
    initDatabase();

    console.log("Seeding residents...");
    seedResidents();

    console.log("Seeding services...");
    seedServices();

    console.log("Seeding rules...");
    seedRules();

    console.log("Creating schedule set...");
    const scheduleSet = db.prepare(`
        INSERT INTO schedule_sets (name, start_date, end_date)
        VALUES (?, ?, ?)
    `).run('2025–2026 Main', '2025-07-01', '2026-06-30');

    console.log("Generating 53 weeks...");
    const weekIds = seedWeeks(scheduleSet.lastInsertRowid);

    console.log("Seeding assignments...");
    seedAssignments(weekIds);

    console.log("Seeding completed.");
}