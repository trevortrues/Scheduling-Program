import { getDatabase } from '../connection/index.js';

export function seedAssignments(weekIds) {
    const db = getDatabase();

    const services = ["Stroke", "VA", "UH", "ELECTIVE", "CC", "VAC", ""];

    const insertAssignment = db.prepare(`
        INSERT INTO assignments
        (res_id, week_id, service_id, is_overnight, is_vacation, is_impatient, vacation_priority)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const getServiceId = db.prepare(`
        SELECT service_id FROM services WHERE name = ?
    `);

    const NUM_RESIDENTS = 27;
    const NUM_WEEKS = weekIds.length; 
    const getResidentPgy = db.prepare(`SELECT pgy_level FROM residents WHERE res_id = ?`);

    for (let res_id = 1; res_id <= NUM_RESIDENTS; res_id++) {
        const residentRow = getResidentPgy.get(res_id);
        const pgyLevel = residentRow?.pgy_level || 2;

        const vacationWeeks = new Set();
        while (vacationWeeks.size < 4) {
            let randomWeek = Math.floor(Math.random() * NUM_WEEKS) + 1;

            // Re-roll if it's a holiday week (all PGY) or week 1 (PGY-3/4 only)
            while ((pgyLevel >= 3 && randomWeek === 1) || randomWeek === 29 || randomWeek === 30) {
                randomWeek = Math.floor(Math.random() * NUM_WEEKS) + 1;
            }
            vacationWeeks.add(randomWeek);
        }

        for (let weekIndex = 0; weekIndex < NUM_WEEKS; weekIndex++) {
            const weekNum = weekIndex + 1;
            const week_id = weekIds[weekIndex];
            const isVacation = vacationWeeks.has(weekNum);
            const isOvernight = Math.random() < 0.5 ? 1 : 0;

            if (isVacation) {
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