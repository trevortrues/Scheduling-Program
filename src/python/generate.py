import sys, json, argparse, sqlite3
from pathlib import Path
from ortools.sat.python import cp_model

HERE   = Path(__file__).resolve()
REPO   = HERE.parents[2] 

if sys.platform == 'win32':
    import os
    DEFAULT_DB = Path(os.environ['APPDATA']) / 'schedule-app' / 'Database' / 'schedule.db'
else:
    DEFAULT_DB = Path.home() / '.config' / 'schedule-app' / 'Database' / 'schedule.db'

OUTDIR = REPO / "src" / "renderer" / "src" / "components"
OUT    = OUTDIR / "schedule.json"

DB_TO_CONSTRAINT = {
    "Stroke": "STROKE",   
    "VA": "VA",
    "UH": "UH",          
    "ELECTIVE": "ELECTIVE",
    "CC": "CC",
    "VAC": "VAC",
    "": ""
}

CONSTRAINT_TO_DB = {
    "STROKE":   "Stroke",
    "VA":       "VA",
    "UH":      "B/U",
    "ELECTIVE": "ELECTIVE",
    "CC":       "CC",
    "VAC":      "VAC",
    "":         "",
}

CONSTRAINT_TO_UI = {
    "STROKE": "stroke",    
    "VA": "VA",
    "UH": "B/U",          
    "ELECTIVE": "Elective",
    "CC": "CC",
    "VAC": "VAC",
    "": ""
} 

DIFFERENT_YEAR_SERVICES = {"STROKE"}
YEAR_DOMAIN = {2, 3, 4}
CC_NAME = "CC"
ELECTIVE_NAME = "ELECTIVE"
HOLIDAY_WEEKS = {29, 30}

def load_from_database(db_path, schedule_set_id=1):
    """Load residents and services from SQLite database"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) as count
        FROM weeks
        WHERE schedule_set_id = ?
    """, (schedule_set_id,))
    weeks = cursor.fetchone()['count']

    cursor.execute("""
        SELECT
            r.res_id as _id,
            r.first_name || ' ' || r.last_name as name,
            '' as email,
            r.pgy_level as year
        FROM residents r
        WHERE r.is_active = 1
        ORDER BY r.res_id
    """)
    residents_data = [dict(row) for row in cursor.fetchall()]

    for resident in residents_data:
        cursor.execute("""
            SELECT
                (julianday(w.week_start) - julianday(
                    (SELECT MIN(week_start) FROM weeks WHERE schedule_set_id = ?)
                )) / 7 + 1 as week_num
            FROM assignments a
            JOIN weeks w ON a.week_id = w.week_id
            WHERE a.res_id = ?
              AND a.is_vacation = 1
              AND w.schedule_set_id = ?
            ORDER BY w.week_start
        """, (schedule_set_id, resident['_id'], schedule_set_id))

        off_weeks = [int(row['week_num']) for row in cursor.fetchall()]
        resident['offWeeks'] = off_weeks

    cursor.execute("""
        SELECT DISTINCT name
        FROM services
        WHERE name NOT IN ('VAC', '')
        ORDER BY name
    """)
    service_names = []
    for row in cursor.fetchall():
        db_name = row['name']
        internal = DB_TO_CONSTRAINT.get(db_name, db_name)
        internal = internal.upper()
        service_names.append(internal)

    services = []
    for name in service_names:
        slots = 2 if name == "STROKE" else 1
        services.append({"name": name, "slotsPerWeek": slots})

    conn.close()

    return {
        "residents": residents_data,
        "services": services,
        "weeks": weeks,
        "schedule_set_id": schedule_set_id
    }

def write_to_database(db_path, weeks_out, residents, schedule_set_id=1):
    """Write generated schedule back to database"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT week_id, week_start
        FROM weeks
        WHERE schedule_set_id = ?
        ORDER BY week_start
    """, (schedule_set_id,))
    week_ids = [row[0] for row in cursor.fetchall()]

    cursor.execute("SELECT service_id, name FROM services")
    service_map = {row[1]: row[0] for row in cursor.fetchall()}

    cursor.execute("""
        DELETE FROM assignments
        WHERE week_id IN (
            SELECT week_id FROM weeks WHERE schedule_set_id = ?
        )
    """, (schedule_set_id,))

    for week_data in weeks_out:
        week_idx = week_data["week"] - 1
        week_id = week_ids[week_idx]

        for asg in week_data["assignments"]:
            res_id = int(asg["residentId"])
            service_name_internal = asg["service"]            
            db_service_name = CONSTRAINT_TO_DB.get(
                service_name_internal.upper(),
                service_name_internal
            )
            service_id = service_map.get(db_service_name)

            if service_id:
                cursor.execute("""
                    INSERT INTO assignments (res_id, week_id, service_id, is_overnight, is_vacation)
                    VALUES (?, ?, ?, 0, 0)
                """, (res_id, week_id, service_id))

        for vac in week_data["weekOff"]:
            res_id = int(vac["residentId"])
            vac_service_id = service_map.get("VAC")
            priority = vac.get("vacationPriority", 1)

            if vac_service_id:
                cursor.execute("""
                    INSERT INTO assignments (res_id, week_id, service_id, is_overnight, is_vacation, vacation_priority)
                    VALUES (?, ?, ?, 0, 1, ?)
                """, (res_id, week_id, vac_service_id, priority))

    conn.commit()
    conn.close()
    print(f"✓ Wrote schedule to database")

def convert_to_ui_format(weeks_out, residents):
    """Convert detailed schedule output to simple UI format for schedule.json"""
    result = {}
    num_weeks = len(weeks_out)

    for r_i, r in enumerate(residents):
        result[f"R{r_i}"] = ["Elective"] * num_weeks

    res_id_to_idx = {str(r.get("_id")): i for i, r in enumerate(residents)}

    for week_data in weeks_out:
        w_idx = week_data["week"] - 1

        for asg in week_data["assignments"]:
            res_id = str(asg["residentId"])
            if res_id in res_id_to_idx:
                r_i = res_id_to_idx[res_id]
                internal_service = asg["service"] 
                ui_service = CONSTRAINT_TO_UI.get(internal_service.upper(), internal_service)
                result[f"R{r_i}"][w_idx] = ui_service

        for vac in week_data["weekOff"]:
            res_id = str(vac["residentId"])
            if res_id in res_id_to_idx:
                r_i = res_id_to_idx[res_id]
                result[f"R{r_i}"][w_idx] = "VAC"

    weekly_counts = []
    excluded = {"VAC", "CC", "ELECTIVE", "Elective"}
    for w in range(num_weeks):
        count = 0
        for r_key in result:
            if r_key.startswith("R"):
                assignment = result[r_key][w]
                if assignment not in excluded:
                    count += 1
        weekly_counts.append(count)

    result["weekly_counts"] = weekly_counts
    return result

def plan_cc(residents, weeks, other_weekly_slots):
    N = len(residents)
    model = cp_model.CpModel()

    C = {}
    for r_i, _ in enumerate(residents):
        for w in range(1, weeks + 1):
            C[(r_i, w)] = model.NewBoolVar(f"C_r{r_i}_w{w}")

    S = {}
    for w in range(1, weeks + 1):
        if w == 1 or w in HOLIDAY_WEEKS:
            s = model.NewIntVar(0, 0, f"S_w{w}")
        else:
            ub = max(0, min(5, N - other_weekly_slots))
            lb = 0 if ub == 0 else 4
            s = model.NewIntVar(lb, ub, f"S_w{w}")
        S[w] = s

    for w in range(1, weeks + 1):
        model.Add(sum(C[(r_i, w)] for r_i, _ in enumerate(residents)) == S[w])

    H = {h for h in HOLIDAY_WEEKS if 1 <= h <= weeks}
    def in_range(w): return 1 <= w <= weeks

    follow_miss_penalties = []
    prefer5_penalties     = []

    for r_i, _ in enumerate(residents):
        for t in range(1, weeks + 1):
            for d in range(1, 6):
                if in_range(t + d):
                    model.Add(C[(r_i, t)] + C[(r_i, t + d)] <= 1)

            cand = []
            for d in (6, 7, 8):
                w = t + d
                if in_range(w) and (w not in H):
                    cand.append(w)

            if cand:
                model.Add(sum(C[(r_i, w)] for w in cand) <= 1)

                s = model.NewBoolVar(f"miss_follow_r{r_i}_t{t}")
                model.Add(sum(C[(r_i, w)] for w in cand) + s >= C[(r_i, t)])
                follow_miss_penalties.append(s)

                if in_range(t + 6) and (t + 6) not in H:
                    not_ideal = model.NewBoolVar(f"not_ideal_r{r_i}_t{t}")
                    model.Add(not_ideal >= C[(r_i, t)] - C[(r_i, t + 6)])
                    prefer5_penalties.append((r_i, not_ideal))

    penalty_counts = []
    for r_i, _ in enumerate(residents):
        resident_penalties = [p for (rid, p) in prefer5_penalties if rid == r_i]
        if resident_penalties:
            count = model.NewIntVar(0, weeks, f"penalty_count_r{r_i}")
            model.Add(count == sum(resident_penalties))
            penalty_counts.append(count)

    if penalty_counts:
        max_penalty = model.NewIntVar(0, weeks, "max_penalty_per_resident")
        min_penalty = model.NewIntVar(0, weeks, "min_penalty_per_resident")
        for cnt in penalty_counts:
            model.Add(cnt <= max_penalty)
            model.Add(cnt >= min_penalty)
        penalty_spread = model.NewIntVar(0, weeks, "penalty_spread")
        model.Add(penalty_spread == max_penalty - min_penalty)

    lo = max(0, (weeks - 1) // 6 - 1)
    hi = (weeks + 5) // 6 + 1
    for r_i, _ in enumerate(residents):
        tot = model.NewIntVar(0, weeks, f"tot_cc_r{r_i}")
        model.Add(tot == sum(C[(r_i, w)] for w in range(1, weeks + 1)))
        model.Add(tot >= lo)
        model.Add(tot <= hi)

    off_penalties = []
    for r_i, r in enumerate(residents):
        off = set(int(w) for w in (r.get("offWeeks") or []) if 1 <= int(w) <= weeks)
        for w in off:
            off_penalties.append(C[(r_i, w)])

    for w in range(1, weeks + 1):
        if w not in [1] and w not in HOLIDAY_WEEKS:
            pgy4_on_cc = sum(C[(r_i, w)] for r_i, r in enumerate(residents) if r.get("year") == 4)
            model.Add(pgy4_on_cc >= 1)

    first_window_penalties = []
    hi_first = min(6, weeks)
    for r_i, _ in enumerate(residents):
        got = model.NewIntVar(0, 1, f"got_first_win_r{r_i}")
        model.Add(got == sum(C[(r_i, w)] for w in range(2, hi_first + 1)))
        miss = model.NewIntVar(0, 1, f"miss_first_win_r{r_i}")
        model.Add(miss == 1 - got)
        first_window_penalties.append(miss)

    model.Minimize(
        10 * sum(off_penalties)
        + 2 * sum(first_window_penalties)
        + 1000 * sum(p for (_, p) in prefer5_penalties)
        + 50 * sum(follow_miss_penalties)
        + 500 * (penalty_spread if penalty_counts else 0)
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10.0
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None, None

    cc_plan = {(r_i, w): int(solver.Value(C[(r_i, w)]))
               for r_i, _ in enumerate(residents) for w in range(1, weeks + 1)}
    slots_plan = {w: int(solver.Value(S[w])) for w in range(1, weeks + 1)}
    return cc_plan, slots_plan

def _norm_service(s):
    name = str(s.get("Service") or s.get("name") or "").upper().strip()
    slots = s.get("slotsPerWeek")
    if slots is None:
        slots = s.get("residentsRequired")
    if slots is None:
        slots = 1
    return {"name": name, "slotsPerWeek": int(max(1, slots))}

def _norm_resident(r):
    y = int(r.get("year"))
    if y not in YEAR_DOMAIN:
        raise ValueError(f"Resident {r.get('name')} has year={y}; expected one of {sorted(YEAR_DOMAIN)}")
    raw_off = r.get("weeksOff") or r.get("weeksoff") or r.get("offWeeks") or []
    try:
        off_weeks = [int(w) for w in raw_off]
    except Exception:
        off_weeks = []
    return {"_id": r.get("_id"), "name": r.get("name"), "email": r.get("email") or "", "year": y, "offWeeks": off_weeks}

def build_multiweek_schedule(residents_raw, services_raw, weeks: int):
    services = [_norm_service(s) for s in services_raw]
    residents = [_norm_resident(r) for r in residents_raw]

    cc = next((s for s in services if s["name"] == CC_NAME), None)
    elective_present = any(s["name"] == ELECTIVE_NAME for s in services)
    fixed_services = [s for s in services if s["name"] != ELECTIVE_NAME]

    other_weekly_slots = sum(s["slotsPerWeek"] for s in fixed_services if s["name"] != CC_NAME)

    N = len(residents)
    for s in fixed_services:
        total_slots = weeks * (s["slotsPerWeek"] if s["name"] != CC_NAME else 5)
        if total_slots < N:
            raise ValueError(
                f"Infeasible: service '{s['name']}' has only {total_slots} total slots "
                f"over {weeks} weeks, but there are {N} residents."
            )

    cc_plan, slots_plan = (None, {w: 0 for w in range(1, weeks + 1)})
    if cc is not None:
        cc_plan, slots_plan = plan_cc(residents, weeks, other_weekly_slots)
        if cc_plan is None:
            return None

    for w in range(1, weeks + 1):
        need = other_weekly_slots + (slots_plan[w] if cc is not None else 0)
        if need > N:
            raise ValueError(f"Infeasible: week {w} needs {need} fixed slots but only {N} residents.")

    model = cp_model.CpModel()

    X = {}
    for r_i, _ in enumerate(residents):
        for s in fixed_services:
            s_name = s["name"]
            for w in range(1, weeks + 1):
                slots_here = s["slotsPerWeek"]
                if s_name == CC_NAME:
                    slots_here = slots_plan[w]
                for k in range(slots_here):
                    X[(r_i, s_name, w, k)] = model.NewBoolVar(f"x_r{r_i}_{s_name}_w{w}_k{k}")

    E = {}
    if elective_present:
        for r_i, _ in enumerate(residents):
            for w in range(1, weeks + 1):
                E[(r_i, w)] = model.NewBoolVar(f"elective_r{r_i}_w{w}")

    OFF = {}
    for r_i, _ in enumerate(residents):
        for w in range(1, weeks + 1):
            OFF[(r_i, w)] = model.NewBoolVar(f"OFF_r{r_i}_w{w}")

    for s in fixed_services:
        s_name = s["name"]
        for w in range(1, weeks + 1):
            slots_here = s["slotsPerWeek"]
            if s_name == CC_NAME:
                slots_here = slots_plan[w]
            for k in range(slots_here):
                model.Add(sum(X[(r_i, s_name, w, k)] for r_i, _ in enumerate(residents)) == 1)

    for r_i, _ in enumerate(residents):
        for w in range(1, weeks + 1):
            fixed_sum = sum(
                X[(r_i, s["name"], w, k)]
                for s in fixed_services
                for k in range(slots_plan[w] if s["name"] == CC_NAME else s["slotsPerWeek"])
            )
            if elective_present:
                model.Add(OFF[(r_i, w)] + E[(r_i, w)] + fixed_sum == 1)
            else:
                model.Add(OFF[(r_i, w)] + fixed_sum == 1)

    for r_i, r in enumerate(residents):
        for w in (r.get("offWeeks") or []):
            if 1 <= int(w) <= weeks:
                model.Add(OFF[(r_i, int(w))] == 1)

    for r_i, _ in enumerate(residents):
        model.Add(sum(OFF[(r_i, w)] for w in range(1, weeks + 1)) == 5)

    H = [h for h in HOLIDAY_WEEKS if 1 <= h <= weeks]
    if len(H) == 2:
        wA, wB = H
        for r_i in range(N):
            model.Add(OFF[(r_i, wA)] + OFF[(r_i, wB)] == 1)
        half_lo = N // 2
        half_hi = N - half_lo
        flip = model.NewBoolVar("holiday_flip")
        model.Add(sum(OFF[(r_i, wA)] for r_i in range(N)) == half_lo + (half_hi - half_lo) * (1 - flip))
        model.Add(sum(OFF[(r_i, wB)] for r_i in range(N)) == half_lo + (half_hi - half_lo) * flip)
    elif len(H) == 1:
        h = H[0]
        for r_i in range(N):
            model.Add(OFF[(r_i, h)] == 1)

    for s in fixed_services:
        if s["name"] in DIFFERENT_YEAR_SERVICES:
            for w in range(1, min(27, weeks + 1)):
                slots_here = s["slotsPerWeek"] if s["name"] != CC_NAME else slots_plan[w]
                if slots_here >= 2:
                    for y in YEAR_DOMAIN:
                        model.Add(sum(
                            X[(r_i, s["name"], w, k)]
                            for r_i, r in enumerate(residents) if r["year"] == y
                            for k in range(slots_here)
                        ) <= 1)

    stroke_service = next((s for s in fixed_services if s["name"] == "STROKE"), None)
    if stroke_service:
        for r_i, r in enumerate(residents):
            if r["year"] == 4:
                total_stroke = model.NewIntVar(0, weeks, f"pgy4_r{r_i}_total_stroke")
                model.Add(total_stroke == sum(
                    X[(r_i, "STROKE", w, k)]
                    for w in range(1, weeks + 1)
                    for k in range(stroke_service["slotsPerWeek"])
                ))
                model.Add(total_stroke <= 2)

                is_two_weeks = model.NewBoolVar(f"pgy4_r{r_i}_two_stroke")
                model.Add(total_stroke == 2).OnlyEnforceIf(is_two_weeks)
                model.Add(total_stroke != 2).OnlyEnforceIf(is_two_weeks.Not())

                for w in range(1, weeks + 1):
                    on_w = model.NewBoolVar(f"pgy4_r{r_i}_on_stroke_w{w}")
                    model.Add(sum(X[(r_i, "STROKE", w, k)] for k in range(stroke_service["slotsPerWeek"])) >= 1).OnlyEnforceIf(on_w)
                    model.Add(sum(X[(r_i, "STROKE", w, k)] for k in range(stroke_service["slotsPerWeek"])) == 0).OnlyEnforceIf(on_w.Not())

                    both = model.NewBoolVar(f"pgy4_r{r_i}_two_and_on_w{w}")
                    model.AddBoolAnd([is_two_weeks, on_w]).OnlyEnforceIf(both)
                    model.AddBoolOr([is_two_weeks.Not(), on_w.Not()]).OnlyEnforceIf(both.Not())

                    adjacent = []
                    if w > 1:
                        on_w_minus_1 = model.NewBoolVar(f"pgy4_r{r_i}_on_stroke_w{w-1}_check")
                        model.Add(sum(X[(r_i, "STROKE", w - 1, k)] for k in range(stroke_service["slotsPerWeek"])) >= 1).OnlyEnforceIf(on_w_minus_1)
                        model.Add(sum(X[(r_i, "STROKE", w - 1, k)] for k in range(stroke_service["slotsPerWeek"])) == 0).OnlyEnforceIf(on_w_minus_1.Not())
                        adjacent.append(on_w_minus_1)
                    if w < weeks:
                        on_w_plus_1 = model.NewBoolVar(f"pgy4_r{r_i}_on_stroke_w{w+1}_check")
                        model.Add(sum(X[(r_i, "STROKE", w + 1, k)] for k in range(stroke_service["slotsPerWeek"])) >= 1).OnlyEnforceIf(on_w_plus_1)
                        model.Add(sum(X[(r_i, "STROKE", w + 1, k)] for k in range(stroke_service["slotsPerWeek"])) == 0).OnlyEnforceIf(on_w_plus_1.Not())
                        adjacent.append(on_w_plus_1)

                    if adjacent:
                        model.AddBoolOr(adjacent).OnlyEnforceIf(both)

            elif r["year"] == 3:
                total_stroke = sum(
                    X[(r_i, "STROKE", w, k)]
                    for w in range(1, weeks + 1)
                    for k in range(stroke_service["slotsPerWeek"])
                )
                model.Add(total_stroke <= 6)

    if cc is not None:
        for w in range(1, weeks + 1):
            slots_here = slots_plan[w]
            for r_i, _ in enumerate(residents):
                want = cc_plan[(r_i, w)]
                if slots_here == 0 and want == 0:
                    continue
                model.Add(sum(X[(r_i, CC_NAME, w, k)] for k in range(slots_here)) == want)

    for r_i, _ in enumerate(residents):
        for s in fixed_services:
            if s["name"] in (CC_NAME, ELECTIVE_NAME):
                continue
            total_for_service = sum(
                X[(r_i, s["name"], w, k)]
                for w in range(1, weeks + 1)
                for k in range(s["slotsPerWeek"])
            )
            model.Add(total_for_service >= 1)

    service_spreads = []
    for s in fixed_services:
        if s["name"] in (CC_NAME, ELECTIVE_NAME):
            continue
        counts = []
        for r_i, _ in enumerate(residents):
            cnt = model.NewIntVar(0, weeks, f"cnt_{s['name']}_r{r_i}")
            model.Add(cnt == sum(
                X[(r_i, s["name"], w, k)]
                for w in range(1, weeks + 1)
                for k in range(s["slotsPerWeek"])
            ))
            counts.append(cnt)
        s_max = model.NewIntVar(0, weeks, f"{s['name']}_max")
        s_min = model.NewIntVar(0, weeks, f"{s['name']}_min")
        for cnt in counts:
            model.Add(cnt <= s_max)
            model.Add(cnt >= s_min)
        spread = model.NewIntVar(0, weeks, f"{s['name']}_spread")
        model.Add(spread == s_max - s_min)
        service_spreads.append(spread)

    model.Minimize(5 * sum(service_spreads))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 20.0
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None

    weeks_out = []
    for w in range(1, weeks + 1):
        week_asg = []
        week_off = []
        for r_i, r in enumerate(residents):
            if solver.Value(OFF[(r_i, w)]) == 1:
                week_off.append({
                    "residentId": str(r.get("_id") or ""),
                    "residentName": r.get("name"),
                    "residentEmail": r.get("email"),
                    "residentYear": int(r.get("year", 0)),
                })

        for s in fixed_services:
            slots_here = slots_plan[w] if s["name"] == CC_NAME else s["slotsPerWeek"]
            for k in range(slots_here):
                for r_i, r in enumerate(residents):
                    if solver.Value(X[(r_i, s["name"], w, k)]) == 1:
                        week_asg.append({
                            "service": s["name"],
                            "slot": int(k),
                            "residentId": str(r.get("_id") or ""),
                            "residentName": r.get("name"),
                            "residentEmail": r.get("email"),
                            "residentYear": int(r.get("year", 0)),
                        })
                        break

        if elective_present:
            e_slot = 0
            for r_i, r in enumerate(residents):
                if solver.Value(E[(r_i, w)]) == 1:
                    week_asg.append({
                        "service": ELECTIVE_NAME,
                        "slot": e_slot,
                        "residentId": str(r.get("_id") or ""),
                        "residentName": r.get("name"),
                        "residentEmail": r.get("email"),
                        "residentYear": int(r.get("year", 0)),
                    })
                    e_slot += 1

        weeks_out.append({
            "week": w,
            "feasible": True,
            "assignments": week_asg,
            "weekOff": week_off,
            "ccCapacity": 0 if cc is None else int(slots_plan[w]),
        })
    return weeks_out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weeks", type=int, default=52, help="Number of weeks (default 52)")
    ap.add_argument("--db", type=str, default=str(DEFAULT_DB), help="Path to schedule.db")
    ap.add_argument("--out", type=str, default=str(OUT), help="Path to schedule.json output")
    ap.add_argument("--schedule-set-id", type=int, default=1, help="Schedule set ID (default 1)")
    args = ap.parse_args()

    db_path = Path(args.db)

    if not db_path.exists():
        print(f"ERROR: Database not found at {db_path}")
        print(f"Please ensure the Electron app has been run at least once to create the database.")
        sys.exit(1)

    print(f"Loading data from database: {db_path}")

    data = load_from_database(db_path, args.schedule_set_id)

    residents = data["residents"]
    services = data["services"]
    weeks = data.get("weeks", args.weeks)
    schedule_set_id = data["schedule_set_id"]

    print(f"Loaded {len(residents)} residents, {len(services)} services, {weeks} weeks")
    print(f"Generating schedule...")

    try:
        weeks_out = build_multiweek_schedule(residents, services, weeks)
    except ValueError as e:
        result = {"ok": False, "reason": "invalid_config", "message": str(e)}
        print(f"ERROR: {e}")
    else:
        if weeks_out is None:
            result = {"ok": False, "reason": "infeasible"}
            print("ERROR: Could not find feasible schedule")
        else:
            print("Schedule generated successfully")

            print("Writing to database...")
            write_to_database(db_path, weeks_out, residents, schedule_set_id)

            ui_format = convert_to_ui_format(weeks_out, residents)
            result = ui_format

            print(f"Schedule complete with {len(weeks_out)} weeks")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote to {out_path}")

if __name__ == "__main__":
    main()
