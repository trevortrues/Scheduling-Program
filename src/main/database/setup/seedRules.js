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
        "VA":          { inpatient: 1, rotation: 2, min: 1, max: 1, cover365: 1, holidays: 1 },
        "UH":          { inpatient: 1, rotation: 2, min: 1, max: 1, cover365: 1, holidays: 1 },
        "ELECTIVE":    { inpatient: 0, rotation: 1, min: 0, max: 100, cover365: 0, holidays: 1},
        "CC":          { inpatient: 0, rotation: 1, min: 0, max: 5, cover365: 0, holidays: 0 },
        "NICU":      { inpatient: 1, rotation: 2, min: 0, max: 1, cover365: 0, holidays: 1 },
        "CHILD":      { inpatient: 1, rotation: 2, min: 0, max: 3, cover365: 0, holidays: 1 },
        "NF":         { inpatient: 1, rotation: 2, min: 2, max: 2, cover365: 1, holidays: 1 },
        "CLINIC":     { inpatient: 0, rotation: 1, min: 0, max: 100, cover365: 0, holidays: 1 },
        "RAD":        { inpatient: 0, rotation: 1/*can be two*/, min: 0, max: 1, cover365: 0, holidays: 1 },
        "NFCL":       { inpatient: 0, rotation: 1/*can be two*/, min: 0, max: 1, cover365: 0, holidays: 1 },
        "CONSULTS":   { inpatient: 0, rotation: 1/*can be two*/, min: 1, max: 1, cover365: 0, holidays: 1 },
        "EMG":        { inpatient: 0, rotation: 1, min: 1, max: 1, cover365: 0, holidays: 1 },
        "EMU":       { inpatient: 1, rotation: 1, min: 1, max: 1, cover365: 1, holidays: 1 },
        "B/U":        { inpatient: 1, rotation: 1, min: 1, max: 1, cover365: 1, holidays: 1 },
        "EEG":        { inpatient: 0, rotation: 1, min: 0, max: 3, cover365: 0, holidays: 1 },
        "JEOPARDY-ELECTIVE": { inpatient: 0, rotation: 1, min: 1, max: 1, cover365: 1, holidays: 0 }
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
        "VA": [
            { start_week: 1, end_week: 10, min_residents: 2, max_residents: 2 },
            { start_week: 11, end_week: 52, min_residents: 1, max_residents: 1 }
        ],
        "UH": [
            { start_week: 1, end_week: 10, min_residents: 2, max_residents: 2 },
            { start_week: 11, end_week: 52, min_residents: 1, max_residents: 1 }
        ],
        "EEG": [
            { start_week: 1, end_week: 10, min_residents: 2, max_residents: 2 },
            { start_week: 11, end_week: 52, min_residents: 1, max_residents: 1 }
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
            2: { min: 4, max: 100 },
            3: { min: 3, max: 3},
            4: { min: 2, max: 2}  
        },
        "VA": {
            2: { min: 6, max: 7 }, // had to change max to 7 to make feasible
            3: { min: 0, max: 0 },
            4: { min: 0, max: 0 }
        },
        "UH": {
            2: { min: 4, max: 4 }, // 40
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
        },
        "CHILD": {
            2: { min: 0, max: 0 },
            3: { min: 4, max: 4 },
            4: { min: 8, max: 8 }
        },
        "CLINIC": {
            2: { min: 4, max: 5 },
            3: { min: 4, max: 5 },
            4: { min: 4, max: 5 }
        },
        "B/U": {
            2: { min: 1, max: 2 },
            3: { min: 2, max: 3 },
            4: { min: 2, max: 3 }
        },
        "EEG": {
            2: { min: 6, max: 7 }, // had to change max to 7 to make feasible
            3: { min: 0, max: 0 },
            4: { min: 0, max: 0 }
        },
        "EMG": {
            2: { min: 0, max: 0 },
            // 3: { min: 8, max: 8 }, // simply cannot have for 10 PGY-3 over 52 weeks with 1 resident coverage
            3: { min: 3, max: 8 },    // max possible without reducing PGY-4 or accounting for EMG course (which we currently dont)
            4: { min: 2, max: 2 }
            //365 coverage
        },
        "EMU": {
            2: { min: 2, max: 2 },
            3: { min: 1, max: 2 },
            4: { min: 1, max: 2 }
        },
        "NICU": {
            2: { min: 2, max: 2 },
            3: { min: 2, max: 2 },
            4: { min: 0, max: 0 }
        },
        "NF": {
            2: { min: 5, max: 100 },
            3: { min: 0, max: 4 },
            4: { min: 2, max: 2 }
        },
        "NFCL": {
            2: { min: 2, max: 3 },
            3: { min: 2, max: 3 },
            4: { min: 1, max: 2 }
        },
        "RAD": {
            2: { min: 0, max: 0 },
            3: { min: 2, max: 2 },
            4: { min: 0, max: 0 }
        },
        "JEOPARDY-ELECTIVE": {
            2: { min: 1, max: 1 },
            3: { min: 1, max: 1 },
            4: { min: 1, max: 100 }
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
        "NF": [
            { name: "Stroke", weeks: 2 },
            {name: "UH", weeks: 2 },
            { name: "VA", weeks: 2 },
            { name: "EEG", weeks: 1 }
        ],
        // "B/U": [
        //     { name: "NF", weeks: 1 }
        // ],
        // "JEOPARDY-ELECTIVE": [
        //     { name: "NF", weeks: 1 }
        // ]
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