import { getDatabase } from '../connection/index.js';

export function seedRules() {
    const db = getDatabase();

    const getServiceId = db.prepare(`
        SELECT service_id FROM services WHERE name = ?
    `);

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
    //  2. Segment Constraints
    // ─────────────────────────────────────────────────────────────
    //

    const serviceConstraintSegments = {
        "Stroke": [
            { start_week: 1, end_week: 10, min_residents: 1, max_residents: 2 },
            { start_week: 11, end_week: 52, min_residents: 1, max_residents: 2 }
        ],
        "VA": [
            { start_week: 1, end_week: 10, min_residents: 2, max_residents: 2 },
            { start_week: 11, end_week: 52, min_residents: 1, max_residents: 1 }
        ],
        "UH": [
            { start_week: 1, end_week: 10, min_residents: 1, max_residents: 1 },
            { start_week: 11, end_week: 52, min_residents: 0, max_residents: 1 }
        ]
    };

    const insertSegmentConstraint = db.prepare(`
        INSERT INTO service_constraint_segments
        (service_id, start_week, end_week, min_residents, max_residents)
        VALUES (
            (SELECT service_id FROM services WHERE name = ?),
            ?, ?, ?, ?
        )
    `);

    for (const [serviceName, segments] of Object.entries(serviceConstraintSegments)) {
        for (const segment of segments) {
            insertSegmentConstraint.run(
                serviceName,
                segment.start_week,
                segment.end_week,
                segment.min_residents,
                segment.max_residents
            );
        }
    }



    //
    // ─────────────────────────────────────────────────────────────
    //  3. PGY Min/Max Rules
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
            if (!rule) continue; 

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
    //  4. Service Incompatibilities
    // ─────────────────────────────────────────────────────────────
    //

    const serviceIncompatibilities = {
        "Stroke": ["VA"],
        "VA": [],
        "UH": ["Stroke"],
        "ELECTIVE": []
    };



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

    //
    // ─────────────────────────────────────────────────────────────
    //  5. Service PreRequisites
    // ─────────────────────────────────────────────────────────────
    //  

    const servicePrerequisites = {
        "UH": [
            { name: "Stroke", weeks: 2 }
        ],
        "Stroke": [],
        "VA": [],
        "ELECTIVE": []
    };

    const insertPrerequisite = db.prepare(`
        INSERT INTO service_prerequisites
        (service_id, prerequisite_service_id, week_count)
        VALUES (?, ?, ?)
    `);

    for (const [service, prerequisiteList] of Object.entries(servicePrerequisites)) {
        const serviceId = getServiceId.get(service).service_id;

        for (const { name, weeks } of prerequisiteList) {
            const prerequisiteId = getServiceId.get(name).service_id;

            insertPrerequisite.run(serviceId, prerequisiteId, weeks);
        }
    }

    console.log("Rules (constraints, PGY, incompatibilities) seeded");
}