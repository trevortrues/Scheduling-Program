import json
from ortools.sat.python import cp_model

def export_schedule_to_json(filename="schedule.json"):
    n_pgy2, n_pgy3, n_pgy4 = 10, 10, 7
    weeks = 52
    services = ['stroke', 'B/U', 'wards', 'VA']

    model = cp_model.CpModel()
    n_residents = n_pgy2 + n_pgy3 + n_pgy4
    residents = list(range(n_residents))

    # Variables
    cc = {}
    vac = {}
    service_vars = {}
    for r in residents:
        for w in range(weeks):
            cc[(r, w)] = model.NewBoolVar(f"cc_r{r}_w{w}")
            vac[(r, w)] = model.NewBoolVar(f"vac_r{r}_w{w}")
            for s in services:
                service_vars[(r, w, s)] = model.NewBoolVar(f"svc_{s}_r{r}_w{w}")

    # Vacation: 4 weeks per resident
    for r in residents:
        model.Add(sum(vac[(r, w)] for w in range(weeks)) == 4)

    # CC constraints
    for r in residents:
        for w in range(weeks):
            model.Add(cc[(r, w)] + vac[(r, w)] <= 1)

    window = 6
    for r in residents:
        for w in range(weeks):
            model.Add(sum(cc[(r, (w + i) % weeks)] for i in range(window)) <= 1)

    for r in residents:
        model.Add(sum(cc[(r, w)] for w in range(weeks)) >= 8)
        model.Add(sum(cc[(r, w)] for w in range(weeks)) <= 9)
    for w in range(weeks):
        model.Add(sum(cc[(r, w)] for r in residents) >= 4)
        model.Add(sum(cc[(r, w)] for r in residents) <= 5)

    # Service constraints
    service_requirements = {'stroke':2,'B/U':1,'wards':1,'VA':1}
    for r in residents:
        for w in range(weeks):
            for s in services:
                model.Add(service_vars[(r, w, s)] + vac[(r, w)] <= 1)
                model.Add(service_vars[(r, w, s)] + cc[(r, w)] <= 1)
            model.Add(sum(service_vars[(r, w, s)] for s in services) <= 1)
    for w in range(weeks):
        for s in services:
            model.Add(sum(service_vars[(r, w, s)] for r in residents) == service_requirements[s])

    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30
    status = solver.Solve(model)

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        schedule = {}
        weekly_counts = [0] * weeks  

        for r in residents:
            weekly_assignments = []
            for w in range(weeks):
                assignment = "Elective" 
                if solver.Value(vac[(r, w)]) == 1:
                    assignment = "VAC"
                elif solver.Value(cc[(r, w)]) == 1:
                    assignment = "CC"
                else:
                    for s in services:
                        if solver.Value(service_vars[(r, w, s)]) == 1:
                            assignment = s
                            break
                weekly_assignments.append(assignment)

                if assignment not in ["VAC", "CC"]:
                    weekly_counts[w] += 1

            schedule[f"R{r}"] = weekly_assignments

        schedule["weekly_counts"] = weekly_counts

        with open(filename, "w") as f:
            json.dump(schedule, f, indent=2)

        print(f"Schedule exported to {filename}")
    else:
        print("No solution found.")

if __name__ == "__main__":
    export_schedule_to_json()