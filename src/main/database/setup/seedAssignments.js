import { getDatabase } from '../connection/index.js';

export function seedAssignments(weekIds) {
    const db = getDatabase();

    // Services list matching your seeding logic
    const services = ["Stroke", "VA", "UH", "ELECTIVE", "CC", "VAC", ""];

    // Prepared insert statement
    const insertAssignment = db.prepare(`
        INSERT INTO assignments
        (res_id, week_id, service_id, is_overnight, is_vacation, is_impatient, vacation_priority)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Lookup to convert service name -> service_id
    const getServiceId = db.prepare(`
        SELECT service_id FROM services WHERE name = ?
    `);

    const NUM_RESIDENTS = 27;
    const NUM_WEEKS = weekIds.length; // should be 53

    for (let res_id = 1; res_id <= NUM_RESIDENTS; res_id++) {

        // --- Pick 4 random vacation weeks ---
        const vacationWeeks = new Set();
        while (vacationWeeks.size < 4) {
            vacationWeeks.add(Math.floor(Math.random() * (NUM_WEEKS - 1))); 
        }

        // --- Loop through all weeks ---
        for (let weekIndex = 0; weekIndex < NUM_WEEKS; weekIndex++) {

            const week_id = weekIds[weekIndex];
            const isVacation = vacationWeeks.has(weekIndex);
            const isOvernight = Math.random() < 0.5 ? 1 : 0;

            if (isVacation) {
                // Vacation = service_id 6 (VAC)
                const priority = Math.floor(Math.random() * 3) + 1;
                insertAssignment.run(
                    res_id,
                    week_id,
                    6,          // VAC service
                    0,          // is_overnight
                    1,          // is_vacation
                    0,          // is_impatient
                    priority
                );
            } else {
                // Pick random non-vacation service
                const randomService = services[Math.floor(Math.random() * 5)];
                const record = getServiceId.get(randomService);
                const service_id = record?.service_id || null;

                insertAssignment.run(
                    res_id,
                    week_id,
                    service_id,
                    isOvernight,
                    0,      // not vacation
                    0,      // not inpatient
                    null
                );
            }
        }
    }

    console.log("Assignments seeded");
}