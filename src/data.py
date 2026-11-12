"""
Test instance for Roshni: solar-aware fair load-shedding.

A small, illustrative distribution grid (fictional feeders, realistic shape):
three sheddable feeders + one protected hospital feeder, three load-shedding
time blocks in one day. Numbers are in MW and are kept as small integers so the
QUBO stays compact (9 decision qubits).

Key idea: what the grid saves by cutting a feeder is its NET load
(demand - rooftop solar), because grid-tied solar inverters switch off when the
feeder is de-energised (anti-islanding protection). At midday a solar-rich
feeder can have net load <= 0, so cutting it saves nothing.
"""

SLOTS = ["11am-1pm", "3pm-5pm", "7pm-9pm"]

FEEDERS = [
    {
        "id": "SUN",
        "name": "Sunview Housing",
        "desc": "well-off sector, heavy rooftop solar",
        "demand": [4, 5, 7],        # MW gross demand per slot
        "solar":  [2, 6, 0],        # MW rooftop solar per slot
        "customers": 3000,
        "backup": 0.40,             # share of homes with off-grid / battery backup
        "recovery": 0.95,           # share of billed energy actually paid
    },
    {
        "id": "IND",
        "name": "Industrial Estate",
        "desc": "factories and workshops",
        "demand": [6, 6, 5],
        "solar":  [1, 2, 0],
        "customers": 2000,
        "backup": 0.10,
        "recovery": 0.90,
    },
    {
        "id": "OLD",
        "name": "Old Town",
        "desc": "dense low-income area, no solar",
        "demand": [3, 4, 6],
        "solar":  [0, 0, 0],
        "customers": 6000,
        "backup": 0.00,
        "recovery": 0.60,
    },
]

# Protected feeder: never shed, so it gets no decision variable.
PROTECTED = {"id": "HOSP", "name": "City Hospital", "demand": [2, 2, 2]}

# Supply shortfall the utility must cover in each slot (MW).
DEFICIT = [4, 4, 8]

# Objective weights (documented in the report).
WEIGHTS = {
    "revenue": 1.0,   # per MW of paid energy lost
    "pain": 1.0,      # fairness: per (affected-customer-thousands x hours^2)
    "backtoback": 3.0 # per pair of consecutive blocks cut on the same feeder
}


def net_load(f):
    return [d - s for d, s in zip(f["demand"], f["solar"])]


def pain_weight(f):
    """Thousands of customers who actually lose power when this feeder is cut."""
    return f["customers"] / 1000.0 * (1.0 - f["backup"])


def var_name(fi, t):
    return f"x_{FEEDERS[fi]['id']}_{t}"
