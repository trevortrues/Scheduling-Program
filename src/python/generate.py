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

DIFFERENT_YEAR_SERVICES = {"Stroke"}
# DIFFERENT_YEAR_SERVICES = {}
YEAR_DOMAIN = {2, 3, 4}
CC_NAME = "CC"
ELECTIVE_NAME = "ELECTIVE"
VAC_NAME = "VAC"
HOLIDAY_WEEKS = {29, 30}
DEBUG_ENABLED = False

ALLOWED_BREAK_ROTATION = {CC_NAME, VAC_NAME}

ALLOWED_OVER_MAX = {ELECTIVE_NAME}
#ALLOWED_OVER_MAX = {}

ENABLE_FAIRNESS_OPTIMIZATION = False
ENABLE_DYNAMIC_PREREQ_TRACKING = False
ENABLE_E_VARIABLES = False

ROTATION_LENGTHS = {
}

def get_rotation_length(service_name, pgy_level, service_constraints=None):
    if service_constraints and service_name in service_constraints:
        return service_constraints[service_name]['rotation_length']

    if service_name not in ROTATION_LENGTHS:
        return 1  # Default to 1 

    if pgy_level not in ROTATION_LENGTHS[service_name]:
        return 1  # Default to 1 

    return ROTATION_LENGTHS[service_name][pgy_level]

def get_prerequisites(service_name, pgy_level, service_prerequisites=None):
    if not service_prerequisites:
        return {}
    if service_name not in service_prerequisites:
        return {}
    if pgy_level not in service_prerequisites[service_name]:
        return {}
    return service_prerequisites[service_name][pgy_level]

def get_week_constraints(service_name, week, service_constraints=None, service_segments=None):
    if service_segments and service_name in service_segments:
        for segment in service_segments[service_name]:
            if segment['start_week'] <= week <= segment['end_week']:
                return (segment['min_residents'], segment['max_residents'])
    if service_constraints and service_name in service_constraints:
        return (
            service_constraints[service_name]['min_residents'],
            service_constraints[service_name]['max_residents']
        )

    return (0, 100)

def load_from_database(db_path, schedule_set_id=1):
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
        SELECT s.name, sc.rotation_length, sc.min_residents, sc.max_residents
        FROM service_constraints sc
        JOIN services s ON sc.service_id = s.service_id
    """)
    service_constraints = {}
    for row in cursor.fetchall():
        service_name = row['name']
        service_constraints[service_name] = {
            'rotation_length': row['rotation_length'],
            'min_residents': row['min_residents'],
            'max_residents': row['max_residents']
        }

    cursor.execute("""
        SELECT s.name, spr.pgy_level, spr.min_weeks, spr.max_weeks
        FROM service_pgy_rules spr
        JOIN services s ON spr.service_id = s.service_id
    """)
    pgy_rules = {}
    for row in cursor.fetchall():
        service_name = row['name']
        if service_name not in pgy_rules:
            pgy_rules[service_name] = {}
        pgy_rules[service_name][row['pgy_level']] = {
            'min_weeks': row['min_weeks'],
            'max_weeks': row['max_weeks']
        }

    cursor.execute("""
        SELECT s.name, scs.start_week, scs.end_week,
               scs.min_residents, scs.max_residents
        FROM service_constraint_segments scs
        JOIN services s ON scs.service_id = s.service_id
        ORDER BY s.name, scs.start_week
    """)
    service_segments = {}
    for row in cursor.fetchall():
        service_name = row['name']
        if service_name not in service_segments:
            service_segments[service_name] = []
        service_segments[service_name].append({
            'start_week': row['start_week'],
            'end_week': row['end_week'],
            'min_residents': row['min_residents'],
            'max_residents': row['max_residents']
        })

    cursor.execute("""
        SELECT s.name, prereq_s.name as prereq_name, sp.week_count
        FROM service_prerequisites sp
        JOIN services s ON sp.service_id = s.service_id
        JOIN services prereq_s ON sp.prerequisite_service_id = prereq_s.service_id
        ORDER BY s.name, prereq_s.name
    """)
    service_prerequisites = {}
    for row in cursor.fetchall():
        service_name = row['name']
        prereq_name = row['prereq_name']

        if service_name not in service_prerequisites:
            service_prerequisites[service_name] = {}

        # Prerequisites only for PGY-2 for now
        if 2 not in service_prerequisites[service_name]:
            service_prerequisites[service_name][2] = {}

        service_prerequisites[service_name][2][prereq_name] = row['week_count']

    cursor.execute("""
        SELECT DISTINCT name
        FROM services
        WHERE name NOT IN ('VAC', '')
        ORDER BY name
    """)
    service_names = []
    for row in cursor.fetchall():
        service_names.append(row['name'])

    services = []
    for name in service_names:
        max_slots = 1

        if name in service_constraints:
            max_slots = service_constraints[name]['max_residents']

        if name in service_segments:
            for segment in service_segments[name]:
                max_slots = max(max_slots, segment['max_residents'])

        services.append({"name": name, "slotsPerWeek": max_slots})

    conn.close()

    return {
        "residents": residents_data,
        "services": services,
        "weeks": weeks,
        "schedule_set_id": schedule_set_id,
        "service_constraints": service_constraints,
        "pgy_rules": pgy_rules,
        "service_segments": service_segments,
        "service_prerequisites": service_prerequisites
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
            service_name = asg["service"]
            service_id = service_map.get(service_name)

            if service_id:
                cursor.execute("""
                    INSERT INTO assignments (res_id, week_id, service_id, is_overnight, is_vacation)
                    VALUES (?, ?, ?, 0, 0)
                """, (res_id, week_id, service_id))

        for vac in week_data["weekOff"]:
            res_id = int(vac["residentId"])
            vac_service_id = service_map.get(VAC_NAME)
            priority = vac.get("vacationPriority", 1)

            if vac_service_id:
                cursor.execute("""
                    INSERT INTO assignments (res_id, week_id, service_id, is_overnight, is_vacation, vacation_priority)
                    VALUES (?, ?, ?, 0, 1, ?)
                """, (res_id, week_id, vac_service_id, priority))

    conn.commit()
    conn.close()

def convert_to_ui_format(weeks_out, residents):
    """Convert detailed schedule output to simple UI format for schedule.json"""
    result = {}
    num_weeks = len(weeks_out)

    for r in residents:
        resident_name = r.get("name", f"R{r.get('_id')}")
        result[resident_name] = [ELECTIVE_NAME] * num_weeks

    res_id_to_name = {str(r.get("_id")): r.get("name", f"R{r.get('_id')}") for r in residents}

    for week_data in weeks_out:
        w_idx = week_data["week"] - 1

        for asg in week_data["assignments"]:
            res_id = str(asg["residentId"])
            if res_id in res_id_to_name:
                resident_name = res_id_to_name[res_id]
                result[resident_name][w_idx] = asg["service"]

        for vac in week_data["weekOff"]:
            res_id = str(vac["residentId"])
            if res_id in res_id_to_name:
                resident_name = res_id_to_name[res_id]
                result[resident_name][w_idx] = VAC_NAME

    weekly_counts = []
    for w in range(num_weeks):
        count = 0
        for r_key in result:
            assignment = result[r_key][w]
            if assignment and assignment != "" and assignment != VAC_NAME:
                count += 1
        weekly_counts.append(count)

    result["weekly_counts"] = weekly_counts
    return result

def plan_cc(residents, weeks, other_weekly_slots, service_constraints=None, pgy_rules=None, other_weekly_slots_by_week=None):
    N = len(residents)
    model = cp_model.CpModel()

    C = {}
    for r_i, _ in enumerate(residents):
        for w in range(1, weeks + 1):
            C[(r_i, w)] = model.NewBoolVar(f"C_r{r_i}_w{w}")

    cc_min = 0
    cc_max = 5
    if service_constraints and CC_NAME in service_constraints:
        cc_min = service_constraints[CC_NAME]['min_residents']
        cc_max = service_constraints[CC_NAME]['max_residents']

    S = {}
    for w in range(1, weeks + 1):
        if w == 1 or w in HOLIDAY_WEEKS:
            s = model.NewIntVar(0, 0, f"S_w{w}")
        else:
            
            if other_weekly_slots_by_week:
                ub = max(0, min(cc_max, N - other_weekly_slots_by_week[w]))
            else:
                ub = max(0, min(cc_max, N - other_weekly_slots))
            lb = 0 if ub == 0 else cc_min
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

    for r_i, r in enumerate(residents):
        pgy = r["year"]
        if pgy_rules and CC_NAME in pgy_rules and pgy in pgy_rules[CC_NAME]:
            lo = pgy_rules[CC_NAME][pgy]['min_weeks']
            hi = pgy_rules[CC_NAME][pgy]['max_weeks']
        else:
            lo = max(0, (weeks - 1) // 6 - 1)
            hi = (weeks + 5) // 6 + 1

        tot = model.NewIntVar(0, weeks, f"tot_cc_r{r_i}")
        model.Add(tot == sum(C[(r_i, w)] for w in range(1, weeks + 1)))
        model.Add(tot >= lo)
        model.Add(tot <= hi)

    off_penalties = []
    for r_i, r in enumerate(residents):
        off = set(int(w) for w in (r.get("offWeeks") or []) if 1 <= int(w) <= weeks)
        for w in off:
            off_penalties.append(C[(r_i, w)])


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
    solver.parameters.num_search_workers = 16 
    solver.parameters.max_time_in_seconds = 30.0
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None, None

    cc_plan = {(r_i, w): int(solver.Value(C[(r_i, w)]))
               for r_i, _ in enumerate(residents) for w in range(1, weeks + 1)}
    slots_plan = {w: int(solver.Value(S[w])) for w in range(1, weeks + 1)}

    return cc_plan, slots_plan

def _norm_service(s):
    name = str(s.get("Service") or s.get("name") or "").strip()
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

def build_multiweek_schedule(residents_raw, services_raw, weeks: int, service_constraints=None, pgy_rules=None, service_segments=None, service_prerequisites=None):
    services = [_norm_service(s) for s in services_raw]
    residents = [_norm_resident(r) for r in residents_raw]

    cc = next((s for s in services if s["name"] == CC_NAME), None)
    elective_present = any(s["name"] == ELECTIVE_NAME for s in services)
    fixed_services = [s for s in services if s["name"] != ELECTIVE_NAME]

    N = len(residents)
    other_weekly_slots_by_week = {}
    for w in range(1, weeks + 1):
        slots_this_week = 0
        for s in fixed_services:
            if s["name"] != CC_NAME:
                s_name = s["name"]
                min_residents, _ = get_week_constraints(s_name, w, service_constraints, service_segments)
                slots_this_week += min_residents
        other_weekly_slots_by_week[w] = slots_this_week
    other_weekly_slots = max(other_weekly_slots_by_week.values()) if other_weekly_slots_by_week else 0

    for s in fixed_services:
        total_slots = weeks * (s["slotsPerWeek"] if s["name"] != CC_NAME else 5)
        if total_slots < N:
            raise ValueError(
                f"Infeasible: service '{s['name']}' has only {total_slots} total slots "
                f"over {weeks} weeks, but there are {N} residents."
            )

    cc_plan, slots_plan = (None, {w: 0 for w in range(1, weeks + 1)})
    if cc is not None:
        cc_plan, slots_plan = plan_cc(residents, weeks, other_weekly_slots, service_constraints, pgy_rules, other_weekly_slots_by_week)
        if cc_plan is None:
            return None

    for w in range(1, weeks + 1):
        need = other_weekly_slots_by_week[w] + (slots_plan[w] if cc is not None else 0)
        if need > N:
            raise ValueError(f"Infeasible: week {w} needs {need} fixed slots but only {N} residents.")

    model = cp_model.CpModel()

    X = {}
    for r_i, r in enumerate(residents):
        pgy = r["year"]
        for s in fixed_services:
            s_name = s["name"]

            if pgy_rules and s_name in pgy_rules and pgy in pgy_rules[s_name]:
                if pgy_rules[s_name][pgy].get('max_weeks', 100) == 0:
                    continue

            for w in range(1, weeks + 1):
                slots_here = s["slotsPerWeek"]
                if s_name == CC_NAME:
                    slots_here = slots_plan[w]
                for k in range(slots_here):
                    X[(r_i, s_name, w, k)] = model.NewBoolVar(f"x_r{r_i}_{s_name}_w{w}_k{k}")

    E = {}
    if elective_present and ENABLE_E_VARIABLES:
        for r_i, _ in enumerate(residents):
            for w in range(1, weeks + 1):
                E[(r_i, w)] = model.NewBoolVar(f"elective_r{r_i}_w{w}")

    OFF = {}
    for r_i, _ in enumerate(residents):
        for w in range(1, weeks + 1):
            OFF[(r_i, w)] = model.NewBoolVar(f"OFF_r{r_i}_w{w}")

    services_needing_on_service = set()
    if service_prerequisites:
        for svc_prereqs in service_prerequisites.values():
            for pgy_prereqs in svc_prereqs.values():
                for prereq_svc in pgy_prereqs.keys():
                    if prereq_svc != "one_of":
                        services_needing_on_service.add(prereq_svc)
    for s in fixed_services:
        s_name = s["name"]
        for pgy in YEAR_DOMAIN:
            rot_len = get_rotation_length(s_name, pgy, service_constraints)
            if rot_len > 1:
                services_needing_on_service.add(s_name)
                break
    services_needing_on_service.add(CC_NAME)

    if DEBUG_ENABLED:
        print(f"DEBUG: Services needing on_service tracking: {sorted(services_needing_on_service)}")
        print(f"DEBUG: Skipping on_service for: {sorted(set(s['name'] for s in fixed_services) - services_needing_on_service)}")

    on_service = {}
    for r_i, r in enumerate(residents):
        pgy = r["year"]
        for s in fixed_services:
            s_name = s["name"]

            if s_name not in services_needing_on_service:
                continue

            if pgy_rules and s_name in pgy_rules and pgy in pgy_rules[s_name]:
                if pgy_rules[s_name][pgy].get('max_weeks', 100) == 0:
                    continue

            for w in range(1, weeks + 1):
                slots_here = s["slotsPerWeek"]
                if s_name == CC_NAME:
                    slots_here = slots_plan[w]

                if slots_here > 0:
                    var = model.NewBoolVar(f"on_{s_name}_r{r_i}_w{w}")
                    slot_vars = [X[(r_i, s_name, w, k)] for k in range(slots_here) if (r_i, s_name, w, k) in X]
                    if slot_vars:
                        model.Add(sum(slot_vars) >= 1).OnlyEnforceIf(var)
                        model.Add(sum(slot_vars) == 0).OnlyEnforceIf(var.Not())
                        on_service[(r_i, s_name, w)] = var

    prereq_services = set()
    if service_prerequisites:
        for service_prereqs in service_prerequisites.values():
            for pgy_prereqs in service_prereqs.values():
                for prereq_service in pgy_prereqs.keys():
                    if prereq_service != "one_of":
                        prereq_services.add(prereq_service)

    for r_i, r in enumerate(residents):
        pgy = r["year"]
        for s in fixed_services:
            s_name = s["name"]
            rot_len = get_rotation_length(s_name, pgy, service_constraints)
            if rot_len == 0:
                for w in range(1, weeks + 1):
                    slots_here = s["slotsPerWeek"]
                    if s_name == CC_NAME:
                        slots_here = slots_plan[w]
                    for k in range(slots_here):
                        if (r_i, s_name, w, k) in X:
                            model.Add(X[(r_i, s_name, w, k)] == 0)

    if ENABLE_DYNAMIC_PREREQ_TRACKING:
        cumulative_counts = {}
        for r_i, r in enumerate(residents):
            pgy = r["year"]
            has_prereqs = any(get_prerequisites(s["name"], pgy, service_prerequisites) for s in fixed_services)
            if has_prereqs:
                for prereq_service in prereq_services:
                    prereq_s = next((s for s in fixed_services if s["name"] == prereq_service), None)
                    if prereq_s is None:
                        continue

                    cumulative_counts[(r_i, prereq_service)] = {}
                    for w in range(1, weeks + 1):
                        cumulative_counts[(r_i, prereq_service)][w] = model.NewIntVar(
                            0, weeks, f"cumcount_{prereq_service}_r{r_i}_w{w}"
                        )

        for r_i, r in enumerate(residents):
            for prereq_service in prereq_services:
                if (r_i, prereq_service) not in cumulative_counts:
                    continue

                for w in range(1, weeks + 1):
                    on_service_w = on_service.get((r_i, prereq_service, w))

                    if w == 1:
                        if on_service_w is None:
                            model.Add(cumulative_counts[(r_i, prereq_service)][w] == 0)
                        else:
                            model.Add(cumulative_counts[(r_i, prereq_service)][w] == on_service_w)
                    else:
                        if on_service_w is None:
                            model.Add(cumulative_counts[(r_i, prereq_service)][w] == cumulative_counts[(r_i, prereq_service)][w-1])
                        else:
                            model.Add(cumulative_counts[(r_i, prereq_service)][w] ==
                                     cumulative_counts[(r_i, prereq_service)][w-1] + on_service_w)

        for r_i, r in enumerate(residents):
            pgy = r["year"]

            for s in fixed_services:
                s_name = s["name"]
                prereqs = get_prerequisites(s_name, pgy, service_prerequisites)

                if not prereqs:
                    continue

                total_prereq_weeks = sum(prereqs.values()) if isinstance(prereqs, dict) and "one_of" not in prereqs else 0

                for w in range(1, weeks + 1):
                    prereq_conditions = []

                    for prereq_service, required_weeks in prereqs.items():
                        if prereq_service == "one_of":
                            continue

                        if (r_i, prereq_service) in cumulative_counts:
                            if w == 1:
                                prereq_met = model.NewBoolVar(f"prereq_{prereq_service}_met_r{r_i}_w{w}")
                                model.Add(0 >= required_weeks).OnlyEnforceIf(prereq_met)
                                model.Add(0 < required_weeks).OnlyEnforceIf(prereq_met.Not())
                            else:
                                count = cumulative_counts[(r_i, prereq_service)][w - 1]
                                prereq_met = model.NewBoolVar(f"prereq_{prereq_service}_met_r{r_i}_w{w}")
                                model.Add(count >= required_weeks).OnlyEnforceIf(prereq_met)
                                model.Add(count < required_weeks).OnlyEnforceIf(prereq_met.Not())

                            prereq_conditions.append(prereq_met)

                    if prereq_conditions:
                        all_prereqs_met = model.NewBoolVar(f"all_prereqs_met_{s_name}_r{r_i}_w{w}")
                        model.AddBoolAnd(prereq_conditions).OnlyEnforceIf(all_prereqs_met)
                        model.AddBoolOr([pc.Not() for pc in prereq_conditions]).OnlyEnforceIf(all_prereqs_met.Not())

                        slots_here = s["slotsPerWeek"]
                        if s_name == CC_NAME:
                            slots_here = slots_plan[w]

                        prereq_vars = [X[(r_i, s_name, w, k)] for k in range(slots_here) if (r_i, s_name, w, k) in X]
                        if prereq_vars:
                            model.Add(sum(prereq_vars) == 0).OnlyEnforceIf(all_prereqs_met.Not())
    else:
        if DEBUG_ENABLED:
            print("DEBUG: Using simplified prerequisite blocking (no cumulative tracking)")
        for r_i, r in enumerate(residents):
            pgy = r["year"]
            for s in fixed_services:
                s_name = s["name"]
                prereqs = get_prerequisites(s_name, pgy, service_prerequisites)

                if not prereqs:
                    continue

                total_prereq_weeks = sum(v for k, v in prereqs.items() if k != "one_of")
                min_start_week = total_prereq_weeks + 1

                for w in range(1, min(min_start_week, weeks + 1)):
                    slots_here = s["slotsPerWeek"]
                    if s_name == CC_NAME:
                        slots_here = slots_plan[w]
                    for k in range(slots_here):
                        if (r_i, s_name, w, k) in X:
                            model.Add(X[(r_i, s_name, w, k)] == 0)
    for r_i, r in enumerate(residents):
        pgy = r["year"]
        for s in fixed_services:
            s_name = s["name"]
            rot_len = get_rotation_length(s_name, pgy, service_constraints)

            if rot_len <= 1:
                continue

            for w in range(1, weeks + 1):
                on_service_w = on_service.get((r_i, s_name, w))
                if on_service_w is None:
                    continue  # No slots this week

                on_service_prev = on_service.get((r_i, s_name, w - 1)) if w > 1 else None

                starts_rotation = model.NewBoolVar(f"starts_{s_name}_r{r_i}_w{w}")
                if w == 1 or on_service_prev is None:
                    model.Add(starts_rotation == on_service_w)
                else:
                    model.AddBoolAnd([on_service_w, on_service_prev.Not()]).OnlyEnforceIf(starts_rotation)
                    model.AddBoolOr([on_service_w.Not(), on_service_prev]).OnlyEnforceIf(starts_rotation.Not())

                for offset in range(1, rot_len):
                    next_w = w + offset
                    if next_w > weeks:
                        break

                    on_service_next = on_service.get((r_i, s_name, next_w))
                    if on_service_next is None:
                        continue  # No slots in next_w

                    on_break_activity = []
                    for break_service in ALLOWED_BREAK_ROTATION:
                        if break_service == VAC_NAME:
                            on_break_activity.append(OFF[(r_i, next_w)])
                        else:
                            on_break = on_service.get((r_i, break_service, next_w))
                            if on_break is not None:
                                on_break_activity.append(on_break)

                    if on_break_activity:
                        model.AddBoolOr([on_service_next] + on_break_activity).OnlyEnforceIf(starts_rotation)
                    else:
                        model.Add(on_service_next == 1).OnlyEnforceIf(starts_rotation)

    for r_i, r in enumerate(residents):
        pgy = r["year"]
        for s in fixed_services:
            s_name = s["name"]
            rot_len = get_rotation_length(s_name, pgy, service_constraints)

            if s_name in ALLOWED_OVER_MAX:
                continue

            if rot_len <= 1:
                continue

            for w in range(1, weeks - rot_len + 1):
                on_consecutive = []
                all_valid = True
                for offset in range(rot_len):
                    week_num = w + offset
                    on_this_week = on_service.get((r_i, s_name, week_num))
                    if on_this_week is None:
                        all_valid = False
                        break
                    on_consecutive.append(on_this_week)

                if not all_valid or not on_consecutive:
                    continue

                next_week = w + rot_len
                if next_week <= weeks:
                    on_next = on_service.get((r_i, s_name, next_week))
                    if on_next is not None:
                        # If all weeks w to w+rot_len-1 are on service, then week w+rot_len must be off
                        # Use AddBoolOr: at least one of (NOT on_w, NOT on_w+1, ..., NOT on_next_week)
                        # This is equivalent to: NOT (on_w AND on_w+1 AND ... AND on_next_week)
                        model.AddBoolOr([oc.Not() for oc in on_consecutive] + [on_next.Not()])

    for s in fixed_services:
        s_name = s["name"]
        for w in range(1, weeks + 1):
            min_residents_week, max_residents_week = get_week_constraints(
                s_name, w, service_constraints, service_segments
            )
            slots_here = s["slotsPerWeek"]
            if s_name == CC_NAME:
                slots_here = slots_plan[w]
                for k in range(slots_here):
                    vars_for_slot = [X[(r_i, s_name, w, k)] for r_i, _ in enumerate(residents) if (r_i, s_name, w, k) in X]
                    if vars_for_slot:
                        model.Add(sum(vars_for_slot) == 1)
            else:
                for k in range(slots_here):
                    vars_for_slot = [X[(r_i, s_name, w, k)] for r_i, _ in enumerate(residents) if (r_i, s_name, w, k) in X]
                    if vars_for_slot:
                        model.Add(sum(vars_for_slot) <= 1)

                total_on_service = [
                    X[(r_i, s_name, w, k)]
                    for r_i, _ in enumerate(residents)
                    for k in range(slots_here)
                    if (r_i, s_name, w, k) in X
                ]
                if total_on_service:
                    model.Add(sum(total_on_service) >= min_residents_week)
                    model.Add(sum(total_on_service) <= max_residents_week)

    for r_i, _ in enumerate(residents):
        for w in range(1, weeks + 1):
            fixed_vars = [
                X[(r_i, s["name"], w, k)]
                for s in fixed_services
                for k in range(slots_plan[w] if s["name"] == CC_NAME else s["slotsPerWeek"])
                if (r_i, s["name"], w, k) in X
            ]
            fixed_sum = sum(fixed_vars) if fixed_vars else 0
            if elective_present and ENABLE_E_VARIABLES:
                model.Add(OFF[(r_i, w)] + E[(r_i, w)] + fixed_sum == 1)
            else:
                model.Add(OFF[(r_i, w)] + fixed_sum <= 1)

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
                        year_vars = [
                            X[(r_i, s["name"], w, k)]
                            for r_i, r in enumerate(residents) if r["year"] == y
                            for k in range(slots_here)
                            if (r_i, s["name"], w, k) in X
                        ]
                        if year_vars:
                            model.Add(sum(year_vars) <= 1)

    # old stroke constraints
    # stroke_service = next((s for s in fixed_services if s["name"] == "STROKE"), None)
    # if stroke_service:
    #     for r_i, r in enumerate(residents):
    #         if r["year"] == 4:
    #             total_stroke = model.NewIntVar(0, weeks, f"pgy4_r{r_i}_total_stroke")
    #             model.Add(total_stroke == sum(
    #                 X[(r_i, "STROKE", w, k)]
    #                 for w in range(1, weeks + 1)
    #                 for k in range(stroke_service["slotsPerWeek"])
    #             ))
    #             model.Add(total_stroke <= 2)
    #
    #             is_two_weeks = model.NewBoolVar(f"pgy4_r{r_i}_two_stroke")
    #             model.Add(total_stroke == 2).OnlyEnforceIf(is_two_weeks)
    #             model.Add(total_stroke != 2).OnlyEnforceIf(is_two_weeks.Not())
    #
    #             for w in range(1, weeks + 1):
    #                 on_w = model.NewBoolVar(f"pgy4_r{r_i}_on_stroke_w{w}")
    #                 model.Add(sum(X[(r_i, "STROKE", w, k)] for k in range(stroke_service["slotsPerWeek"])) >= 1).OnlyEnforceIf(on_w)
    #                 model.Add(sum(X[(r_i, "STROKE", w, k)] for k in range(stroke_service["slotsPerWeek"])) == 0).OnlyEnforceIf(on_w.Not())
    #
    #                 both = model.NewBoolVar(f"pgy4_r{r_i}_two_and_on_w{w}")
    #                 model.AddBoolAnd([is_two_weeks, on_w]).OnlyEnforceIf(both)
    #                 model.AddBoolOr([is_two_weeks.Not(), on_w.Not()]).OnlyEnforceIf(both.Not())
    #
    #                 adjacent = []
    #                 if w > 1:
    #                     on_w_minus_1 = model.NewBoolVar(f"pgy4_r{r_i}_on_stroke_w{w-1}_check")
    #                     model.Add(sum(X[(r_i, "STROKE", w - 1, k)] for k in range(stroke_service["slotsPerWeek"])) >= 1).OnlyEnforceIf(on_w_minus_1)
    #                     model.Add(sum(X[(r_i, "STROKE", w - 1, k)] for k in range(stroke_service["slotsPerWeek"])) == 0).OnlyEnforceIf(on_w_minus_1.Not())
    #                     adjacent.append(on_w_minus_1)
    #                 if w < weeks:
    #                     on_w_plus_1 = model.NewBoolVar(f"pgy4_r{r_i}_on_stroke_w{w+1}_check")
    #                     model.Add(sum(X[(r_i, "STROKE", w + 1, k)] for k in range(stroke_service["slotsPerWeek"])) >= 1).OnlyEnforceIf(on_w_plus_1)
    #                     model.Add(sum(X[(r_i, "STROKE", w + 1, k)] for k in range(stroke_service["slotsPerWeek"])) == 0).OnlyEnforceIf(on_w_plus_1.Not())
    #                     adjacent.append(on_w_plus_1)
    #
    #                 if adjacent:
    #                     model.AddBoolOr(adjacent).OnlyEnforceIf(both)
    #
    #         elif r["year"] == 3:
    #             total_stroke = sum(
    #                 X[(r_i, "STROKE", w, k)]
    #                 for w in range(1, weeks + 1)
    #                 for k in range(stroke_service["slotsPerWeek"])
    #             )
    #             model.Add(total_stroke <= 6)

    if cc is not None:
        for w in range(1, weeks + 1):
            slots_here = slots_plan[w]
            for r_i, _ in enumerate(residents):
                want = cc_plan[(r_i, w)]
                if slots_here == 0 and want == 0:
                    continue
                cc_vars = [X[(r_i, CC_NAME, w, k)] for k in range(slots_here) if (r_i, CC_NAME, w, k) in X]
                if cc_vars:
                    model.Add(sum(cc_vars) == want)

    for r_i, r in enumerate(residents):
        pgy = r["year"]
        for s in fixed_services:
            s_name = s["name"]

            if s_name == CC_NAME:
                continue

            if pgy_rules and s_name in pgy_rules and pgy in pgy_rules[s_name]:
                min_weeks = pgy_rules[s_name][pgy]['min_weeks']
                max_weeks = pgy_rules[s_name][pgy]['max_weeks']
            else:
                min_weeks = 0
                max_weeks = 100

            if max_weeks == 0:
                continue

            service_vars = [
                X[(r_i, s_name, w, k)]
                for w in range(1, weeks + 1)
                for k in range(s["slotsPerWeek"])
                if (r_i, s_name, w, k) in X
            ]
            if service_vars:
                total_weeks = model.NewIntVar(0, weeks, f"total_{s_name}_r{r_i}_pgy{pgy}")
                model.Add(total_weeks == sum(service_vars))
                model.Add(total_weeks >= min_weeks)
                model.Add(total_weeks <= max_weeks)

    if ENABLE_FAIRNESS_OPTIMIZATION:
        service_spreads = []
        for s in fixed_services:
            if s["name"] in (CC_NAME, ELECTIVE_NAME):
                continue
            counts = []
            for r_i, _ in enumerate(residents):
                service_vars = [
                    X[(r_i, s["name"], w, k)]
                    for w in range(1, weeks + 1)
                    for k in range(s["slotsPerWeek"])
                    if (r_i, s["name"], w, k) in X
                ]
                if service_vars:
                    cnt = model.NewIntVar(0, weeks, f"cnt_{s['name']}_r{r_i}")
                    model.Add(cnt == sum(service_vars))
                    counts.append(cnt)
            if counts:
                s_max = model.NewIntVar(0, weeks, f"{s['name']}_max")
                s_min = model.NewIntVar(0, weeks, f"{s['name']}_min")
                for cnt in counts:
                    model.Add(cnt <= s_max)
                    model.Add(cnt >= s_min)
                spread = model.NewIntVar(0, weeks, f"{s['name']}_spread")
                model.Add(spread == s_max - s_min)
                service_spreads.append(spread)

        model.Minimize(5 * sum(service_spreads))

    if DEBUG_ENABLED:
        print(f"DEBUG: Total variables: {len(model.Proto().variables)}")
        print(f"DEBUG: Total constraints: {len(model.Proto().constraints)}")
        print("DEBUG: Vacation weeks per resident:")
        for r_i, r in enumerate(residents):
            off_weeks = r.get("offWeeks", [])
            print(f"  {r['name']} (PGY-{r['year']}): {len(off_weeks)} weeks - {off_weeks}")
            if len(off_weeks) > 5:
                print(f"    WARNING: More than 5 vacation weeks requested!")
            has_29 = 29 in off_weeks
            has_30 = 30 in off_weeks
            if has_29 and has_30:
                print(f"    ERROR: Has BOTH holiday weeks 29 and 30!")

    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = 16
    solver.parameters.max_time_in_seconds = 300.0
    if DEBUG_ENABLED:
        print(f"DEBUG: Starting solver...")
    status = solver.Solve(model)
    if DEBUG_ENABLED:
        status_name = {
            cp_model.OPTIMAL: "OPTIMAL",
            cp_model.FEASIBLE: "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.MODEL_INVALID: "MODEL_INVALID",
            cp_model.UNKNOWN: "UNKNOWN (timeout?)"
        }.get(status, f"UNKNOWN({status})")
        print(f"DEBUG: Solver status = {status_name}, wall time = {solver.WallTime():.2f}s")

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        if DEBUG_ENABLED:
            print("DEBUG: Schedule generation failed!")
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
                    if (r_i, s["name"], w, k) in X and solver.Value(X[(r_i, s["name"], w, k)]) == 1:
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
                if ENABLE_E_VARIABLES:
                    is_elective = solver.Value(E[(r_i, w)]) == 1
                else:
                    is_vacation = solver.Value(OFF[(r_i, w)]) == 1
                    is_on_fixed = any(
                        solver.Value(X[(r_i, s["name"], w, k)]) == 1
                        for s in fixed_services
                        for k in range(slots_plan[w] if s["name"] == CC_NAME else s["slotsPerWeek"])
                        if (r_i, s["name"], w, k) in X
                    )
                    is_elective = not is_vacation and not is_on_fixed

                if is_elective:
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
        sys.exit(1)

    data = load_from_database(db_path, args.schedule_set_id)

    residents = data["residents"]
    services = data["services"]
    weeks = data.get("weeks", args.weeks)
    schedule_set_id = data["schedule_set_id"]
    service_constraints = data.get("service_constraints", {})
    pgy_rules = data.get("pgy_rules", {})
    service_segments = data.get("service_segments", {})
    service_prerequisites = data.get("service_prerequisites", {})
    print(f"Generating schedule...")

    try:
        weeks_out = build_multiweek_schedule(residents, services, weeks, service_constraints, pgy_rules, service_segments, service_prerequisites)
    except ValueError as e:
        result = {"ok": False, "reason": "invalid_config", "message": str(e)}
    else:
        if weeks_out is None:
            result = {"ok": False, "reason": "infeasible"}
            print("ERROR: Could not find feasible schedule")
        else:
            print("Schedule generated successfully")

            # print("Writing to database...")
            # write_to_database(db_path, weeks_out, residents, schedule_set_id)

            ui_format = convert_to_ui_format(weeks_out, residents)
            result = ui_format

            print(f"Schedule complete with {len(weeks_out)} weeks")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote to {out_path}")

if __name__ == "__main__":
    main()
