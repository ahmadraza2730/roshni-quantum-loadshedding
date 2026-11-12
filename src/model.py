"""
Optimization model for Roshni.

Decision variable  x[f,t] = 1  if feeder f is shed during time block t.

Objective (minimise):
  revenue  : sum_{f,t} recovery_f * max(net_{f,t}, 0) * x[f,t]
             (paid energy the utility does not sell)
  fairness : sum_f pain_f * (sum_t x[f,t])^2
             (squared outage count -> spreading outages is cheaper than
              piling them on one area; pain_f = customers who actually lose
              power, i.e. discounted by the off-grid/battery backup share)
  b2b      : sum_f sum_t x[f,t] * x[f,t+1]
             (no back-to-back blocks on the same feeder)

Constraint per block t:
  sum_f net_{f,t} * x[f,t] >= deficit_t
  (the cut must actually relieve the shortfall; solar-aware because it uses
   NET load, which can be <= 0 for solar-rich feeders at midday)

Two QUBO encodings are produced:
  * "slack":      standard Qiskit QuadraticProgramToQubo (adds slack qubits)
  * "unbalanced": unbalanced penalisation (Montanez-Barrera et al., 2022),
                  penalty  -l1*g + l2*g^2  with g = lhs - rhs, which needs NO
                  slack qubits. This is what we run QAOA on.
"""
import itertools
import numpy as np
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.converters import QuadraticProgramToQubo

from . import data as D

N_F = len(D.FEEDERS)
N_T = len(D.SLOTS)
N_VARS = N_F * N_T


def idx(fi, t):
    return fi * N_T + t


def objective_terms():
    """Return (constant, linear dict, quadratic dict) over variable indices."""
    w = D.WEIGHTS
    lin = {}
    quad = {}

    def add_lin(i, v):
        lin[i] = lin.get(i, 0.0) + v

    def add_quad(i, j, v):
        if i == j:
            add_lin(i, v)  # x^2 = x for binaries
            return
        key = (min(i, j), max(i, j))
        quad[key] = quad.get(key, 0.0) + v

    for fi, f in enumerate(D.FEEDERS):
        net = D.net_load(f)
        pw = D.pain_weight(f)
        for t in range(N_T):
            add_lin(idx(fi, t), w["revenue"] * f["recovery"] * max(net[t], 0))
        # fairness: pain * (sum_t x)^2
        for t1 in range(N_T):
            for t2 in range(N_T):
                add_quad(idx(fi, t1), idx(fi, t2), w["pain"] * pw)
        # back-to-back
        for t in range(N_T - 1):
            add_quad(idx(fi, t), idx(fi, t + 1), w["backtoback"])
    return 0.0, lin, quad


def constraint_rows():
    """List of (coeff vector, rhs) for  coeff . x >= rhs."""
    rows = []
    for t in range(N_T):
        c = np.zeros(N_VARS)
        for fi, f in enumerate(D.FEEDERS):
            c[idx(fi, t)] = D.net_load(f)[t]
        rows.append((c, D.DEFICIT[t]))
    return rows


def evaluate(x):
    """True objective value and feasibility of a 0/1 vector x."""
    x = np.asarray(x, dtype=float)
    const, lin, quad = objective_terms()
    val = const + sum(v * x[i] for i, v in lin.items())
    val += sum(v * x[i] * x[j] for (i, j), v in quad.items())
    feas = all(c @ x >= rhs for c, rhs in constraint_rows())
    return float(val), bool(feas)


def build_quadratic_program():
    qp = QuadraticProgram("roshni_loadshedding")
    for fi in range(N_F):
        for t in range(N_T):
            qp.binary_var(D.var_name(fi, t))
    names = [v.name for v in qp.variables]
    _, lin, quad = objective_terms()
    qp.minimize(
        linear={names[i]: v for i, v in lin.items()},
        quadratic={(names[i], names[j]): v for (i, j), v in quad.items()},
    )
    for t, (c, rhs) in enumerate(constraint_rows()):
        qp.linear_constraint(
            linear={names[i]: float(c[i]) for i in range(N_VARS) if c[i] != 0},
            sense=">=", rhs=rhs, name=f"cover_{t}",
        )
    return qp


def slack_qubo(qp):
    return QuadraticProgramToQubo().convert(qp)


def unbalanced_qubo(l1, l2):
    """Penalised QUBO with no slack variables."""
    const, lin, quad = objective_terms()
    lin = dict(lin)
    quad = dict(quad)
    const = float(const)
    for c, rhs in constraint_rows():
        # g = c.x - rhs ; penalty = -l1*g + l2*g^2
        const += l1 * rhs + l2 * rhs * rhs
        for i in range(N_VARS):
            if c[i] == 0:
                continue
            lin[i] = lin.get(i, 0.0) - l1 * c[i] - 2 * l2 * rhs * c[i] + l2 * c[i] * c[i]
            for j in range(i + 1, N_VARS):
                if c[j] == 0:
                    continue
                quad[(i, j)] = quad.get((i, j), 0.0) + 2 * l2 * c[i] * c[j]
    qp = QuadraticProgram("roshni_unbalanced")
    for fi in range(N_F):
        for t in range(N_T):
            qp.binary_var(D.var_name(fi, t))
    names = [v.name for v in qp.variables]
    qp.minimize(
        constant=const,
        linear={names[i]: v for i, v in lin.items()},
        quadratic={(names[i], names[j]): v for (i, j), v in quad.items()},
    )
    return qp


def all_assignments():
    return [np.array(b) for b in itertools.product([0, 1], repeat=N_VARS)]
