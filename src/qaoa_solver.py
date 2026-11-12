"""
QAOA solver written directly on Qiskit primitives.

Pipeline:
  QuadraticProgram (unbalanced QUBO) --to_ising()--> SparsePauliOp H_C
  QAOAAnsatz(H_C, reps=p)            --> parameterised circuit
  StatevectorEstimator               --> <H_C>(beta, gamma), minimised by COBYLA
                                         from several random starts
  StatevectorSampler (shots)         --> bitstring distribution -> schedules
"""
import numpy as np
from scipy.optimize import minimize
from qiskit import transpile
from qiskit.circuit.library import QAOAAnsatz
from qiskit.primitives import StatevectorSampler
from qiskit.quantum_info import Statevector

from . import model as M


def tune_penalty(grid_l1=(1, 2, 4, 6, 8), grid_l2=(0.5, 1, 2, 3, 4, 6)):  # -> (4, 0.5)
    """Pick the smallest-norm (l1, l2) whose QUBO ground state is the true
    constrained optimum. Done classically by enumeration on this small
    instance (documented as a limitation: larger instances need a heuristic)."""
    from .baselines import exact_bruteforce
    target = tuple(exact_bruteforce()["x"])
    xs = M.all_assignments()
    choices = []
    for l1 in grid_l1:
        for l2 in grid_l2:
            qp = M.unbalanced_qubo(l1, l2)
            vals = [qp.objective.evaluate(x) for x in xs]
            order = np.argsort(vals)
            best = tuple(xs[order[0]].tolist())
            gap = vals[order[1]] - vals[order[0]]
            if best == target:
                choices.append((l1 + l2, -gap, l1, l2))
    choices.sort()
    _, _, l1, l2 = choices[0]
    return l1, l2


class QAOARunner:
    def __init__(self, qp, reps=2, seed=7, cvar_alpha=1.0):
        self.qp = qp
        self.reps = reps
        self.rng = np.random.default_rng(seed)
        op, offset = qp.to_ising()
        # normalise so angles live on a sensible scale
        self.scale = float(np.max(np.abs(op.coeffs)))
        self.op = op / self.scale
        self.offset = offset
        self.ansatz = QAOAAnsatz(self.op, reps=reps)
        # Transpile once to basic gates so each evaluation is a fast simulation
        self.circ = transpile(self.ansatz, basis_gates=["h", "rx", "rz", "rzz", "cx"],
                              optimization_level=1)
        # H_C is diagonal in the computational basis: precompute its spectrum
        self.diag = np.real(self.op.to_matrix(sparse=True).diagonal())
        self.cvar_alpha = cvar_alpha
        self.sampler = StatevectorSampler(seed=seed)
        self.history = []

    def energy(self, params):
        """<H_C> (cvar_alpha=1) or CVaR_alpha (Barkoutsos et al., 2020)."""
        probs = Statevector(self.circ.assign_parameters(params)).probabilities()
        if self.cvar_alpha >= 1.0:
            e = float(probs @ self.diag)
        else:
            order = np.argsort(self.diag)
            p, d = probs[order], self.diag[order]
            cum = np.cumsum(p)
            k = np.searchsorted(cum, self.cvar_alpha)
            e = float((p[:k] @ d[:k] + (self.cvar_alpha - (cum[k-1] if k else 0)) * d[k])
                      / self.cvar_alpha)
        self.history.append(e)
        return e

    def optimise(self, ramps=(0.4, 0.7, 1.0, 1.5), maxiter=500):
        """Linear-ramp (annealing-inspired) initialisation: beta decreases and
        gamma increases across layers, like a discretised quantum anneal.
        Several ramp lengths are tried; COBYLA refines each."""
        best = None
        p = self.reps
        t = (np.arange(p) + 0.5) / p
        for dt in ramps:
            x0 = np.concatenate([(1 - t) * dt, t * dt])   # [betas..., gammas...]
            start = len(self.history)
            res = minimize(self.energy, x0, method="COBYLA",
                           options={"maxiter": maxiter, "rhobeg": 0.2})
            trace = self.history[start:]
            if best is None or res.fun < best["fun"]:
                best = {"fun": res.fun, "params": res.x, "trace": trace, "ramp": dt}
        self.best = best
        return best

    def probabilities(self):
        return Statevector(self.circ.assign_parameters(self.best["params"])).probabilities()

    def sample(self, shots=4096):
        circ = self.circ.assign_parameters(self.best["params"])
        circ.measure_all()
        counts = self.sampler.run([circ], shots=shots).result()[0].data.meas.get_counts()
        out = []
        for bits, c in counts.items():
            # Qiskit: rightmost char is qubit 0 == variable 0
            x = np.array([int(b) for b in reversed(bits)])
            out.append((x, c / shots))
        out.sort(key=lambda t: -t[1])
        return out


def solve(reps=4, shots=4096, seed=7, cvar_alpha=0.1):
    l1, l2 = tune_penalty()
    qp = M.unbalanced_qubo(l1, l2)
    runner = QAOARunner(qp, reps=reps, seed=seed, cvar_alpha=cvar_alpha)
    runner.optimise()
    samples = runner.sample(shots)
    # Decode: best feasible schedule among the measured bitstrings
    scored = []
    for x, p in samples:
        val, feas = M.evaluate(x)
        scored.append({"x": x.tolist(), "prob": p, "value": val, "feasible": feas})
    feas_sorted = sorted([s for s in scored if s["feasible"]], key=lambda s: s["value"])
    return {
        "lambda": (l1, l2),
        "num_qubits": runner.ansatz.num_qubits,
        "depth": runner.circ.depth(),
        "cvar_alpha": cvar_alpha,
        "reps": reps,
        "trace": runner.best["trace"],
        "samples": scored,
        "best": feas_sorted[0] if feas_sorted else None,
        "most_likely": scored[0],
        "feasible_mass": sum(s["prob"] for s in scored if s["feasible"]),
        "exact_probs": runner.probabilities(),
    }
