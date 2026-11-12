"""
Classical references.

1. exact_bruteforce   : enumerates all 2^9 schedules -> provably optimal answer.
2. status_quo_loss    : "cut the worst-paying feeders first" rule, as commonly
                        used by utilities; solar-blind (uses gross demand).
3. solar_blind_rotate : round-robin fairness rule that plans with GROSS demand,
                        i.e. ignores that rooftop solar disappears with the cut.
"""
import numpy as np
from . import data as D
from . import model as M


def exact_bruteforce():
    best = None
    feasible_count = 0
    for x in M.all_assignments():
        val, feas = M.evaluate(x)
        if not feas:
            continue
        feasible_count += 1
        if best is None or val < best[0] - 1e-9:
            best = (val, x)
    return {"value": best[0], "x": best[1].tolist(), "feasible_count": feasible_count,
            "total": 2 ** M.N_VARS}


def status_quo_loss():
    x = np.zeros(M.N_VARS, dtype=int)
    order = sorted(range(M.N_F), key=lambda fi: D.FEEDERS[fi]["recovery"])
    for t in range(M.N_T):
        planned = 0
        for fi in order:
            if planned >= D.DEFICIT[t]:
                break
            x[M.idx(fi, t)] = 1
            planned += D.FEEDERS[fi]["demand"][t]  # solar-blind
    return x


def solar_blind_rotate():
    x = np.zeros(M.N_VARS, dtype=int)
    hours = [0] * M.N_F
    for t in range(M.N_T):
        planned = 0
        # cut feeders with the fewest outages so far; ties -> biggest gross load
        order = sorted(range(M.N_F),
                       key=lambda fi: (hours[fi], -D.FEEDERS[fi]["demand"][t]))
        for fi in order:
            if planned >= D.DEFICIT[t]:
                break
            x[M.idx(fi, t)] = 1
            hours[fi] += 1
            planned += D.FEEDERS[fi]["demand"][t]  # solar-blind
    return x


def describe(x):
    """Human-readable metrics for a schedule."""
    x = np.asarray(x)
    val, feas = M.evaluate(x)
    relief = []
    for t in range(M.N_T):
        r = sum(D.net_load(f)[t] * x[M.idx(fi, t)] for fi, f in enumerate(D.FEEDERS))
        relief.append(int(r))
    outages = {f["id"]: int(sum(x[M.idx(fi, t)] for t in range(M.N_T)))
               for fi, f in enumerate(D.FEEDERS)}
    wasted = sum(1 for fi, f in enumerate(D.FEEDERS) for t in range(M.N_T)
                 if x[M.idx(fi, t)] and D.net_load(f)[t] <= 0)
    people_hours = sum(D.pain_weight(f) * 1000 * 2 * outages[f["id"]]
                       for f in D.FEEDERS)  # blocks are 2 h
    return {
        "objective": round(val, 3),
        "feasible": feas,
        "relief_MW": relief,
        "deficit_MW": D.DEFICIT,
        "shortfall_MW": [max(0, d - r) for d, r in zip(D.DEFICIT, relief)],
        "outage_blocks": outages,
        "max_minus_min_blocks": max(outages.values()) - min(outages.values()),
        "wasted_cuts": wasted,
        "people_hours_dark": int(people_hours),
        "schedule": [[int(x[M.idx(fi, t)]) for t in range(M.N_T)]
                     for fi in range(M.N_F)],
    }
