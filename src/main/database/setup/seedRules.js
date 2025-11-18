import { getDatabase } from '../connection/index.js';

export function seedRules() {
    const db = getDatabase();

    //
    // ─────────────────────────────────────────────────────────────
    //  1. Service Constraints
    // ─────────────────────────────────────────────────────────────
    //
    const serviceConstraints = {
        "Stroke":      { inpatient: 1, rotation: 2, min: 2, max: 2, cover365: 1, holidays: 1 },
        "VA":          { inpatient: 1, rotation: 2, min: 1, max: 1, cover365: 1, holidays: 0 },
        "UH":          { inpatient: 1, rotation: 2, min: 1, max: 1, cover365: 1, holidays: 0 },
        "ELECTIVE":    { inpatient: 0, rotation: 1, min: 0, max: 100, cover365: 0, holidays: 0},
        "CC":          { inpatient: 0, rotation: 1, min: 0, max: 5, cover365: 0, holidays: 0 }
    };

    const insertServiceConstraint = db.prepare(`
        INSERT INTO service_constraints
        (service_id, rotation_length, is_inpatient, requires_365_coverage, required_on_holidays, min_residents, max_residents)
        VALUES (
            (SELECT service_id FROM services WHERE name = ?),
            ?, ?, ?, ?, ?, ?
        )
    `);

    for (const [name, c] of Object.entries(serviceConstraints)) {
        insertServiceConstraint.run(
            name,
            c.rotation,
            c.inpatient,
            c.cover365,
            c.holidays,
            c.min,
            c.max
        );
    }

    //
    // ─────────────────────────────────────────────────────────────
    //  2. PGY Min/Max Rules
    // ─────────────────────────────────────────────────────────────
    //
    const pgyLevels = [2, 3, 4];

    const pgyMinMaxWeeks = {
        "Stroke": {
            2: { min: 5, max: 10 },
            3: { min: 3, max: 3 },
            4: { min: 2, max: 2 }
        },
        "VA": {
            2: { min: 0, max: 6 }
        },
        "UH": {
            2: { min: 4, max: 4 },
            3: { min: 2, max: 2 },
            4: { min: 0, max: 1 }
        },
        "ELECTIVE": {
            2: { min: 3, max: 3 },
            3: { min: 3, max: 3 },
            4: { min: 12, max: 18 }
        },
        "CC": {
            2: { min: 8, max: 8 },
            3: { min: 8, max: 8 },
            4: { min: 8, max: 8 }
        }
    };

    const insertPgyRule = db.prepare(`
        INSERT INTO service_pgy_rules (service_id, pgy_level, min_weeks, max_weeks)
        VALUES (
            (SELECT service_id FROM services WHERE name = ?),
            ?, ?, ?
        )
    `);

    for (const [serviceName, pgyMap] of Object.entries(pgyMinMaxWeeks)) {
        for (const pgy of pgyLevels) {
            const rule = pgyMap[pgy];
            if (!rule) continue; // skip missing PGY levels

            insertPgyRule.run(
                serviceName,
                pgy,
                rule.min,
                rule.max
            );
        }
    }

    //
    // ─────────────────────────────────────────────────────────────
    //  3. Service Incompatibilities
    // ─────────────────────────────────────────────────────────────
    //
    const serviceIncompatibilities = {
        "Stroke": ["VA"],
        "VA": [],
        "UH": ["Stroke"],
        "ELECTIVE": []
    };

    const getServiceId = db.prepare(`
        SELECT service_id FROM services WHERE name = ?
    `);

    const insertIncompatibility = db.prepare(`
        INSERT INTO service_incompatibilities
        (service_id, incompatible_service_id)
        VALUES (?, ?)
    `);

    for (const [service, incompatibleList] of Object.entries(serviceIncompatibilities)) {
        const serviceId = getServiceId.get(service).service_id;

        for (const incompatible of incompatibleList) {
            const incompatibleId = getServiceId.get(incompatible).service_id;

            insertIncompatibility.run(serviceId, incompatibleId);
        }
    }

    console.log("Rules (constraints, PGY, incompatibilities) seeded");
}