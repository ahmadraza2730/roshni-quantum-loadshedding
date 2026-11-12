"""
Roshni - solar-aware fair load-shedding with QAOA (Qiskit).

Run:   python run_demo.py            (full run, ~1-2 min)
       python run_demo.py --quick    (skips the depth sweep, ~20 s)

Outputs go to results/ : results.json, summary.md and four PNG charts.
"""
import argparse
import json
import os
import time
import warnings

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from src import data as D, model as M, baselines as B, qaoa_solver as Q

warnings.filterwarnings("ignore")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")

# Palette (validated categorical slots + neutral inks)
INK, INK2, MUTED, SURF = "#0b0b0b", "#52514e", "#a3a29c", "#fcfcfb"
BLUE, ORANGE, AQUA = "#2a78d6", "#eb6834", "#1baf7a"

plt.rcParams.update({
    "figure.facecolor": SURF, "axes.facecolor": SURF, "savefig.facecolor": SURF,
    "axes.edgecolor": MUTED, "axes.labelcolor": INK2, "xtick.color": INK2,
    "ytick.color": INK2, "text.color": INK, "font.size": 10,
    "axes.spines.top": False, "axes.spines.right": False,
})


def bits(x):
    return "".join(str(int(b)) for b in x)


def plot_schedules(schedules, path):
    fig, axes = plt.subplots(1, len(schedules), figsize=(4.2 * len(schedules), 3.4))
    for ax, (title, desc) in zip(axes, schedules):
        grid = np.array(desc["schedule"])
        ax.imshow(np.where(grid == 1, 1, 0), cmap=matplotlib.colors.ListedColormap(["#e8f1fb", "#1f2a3a"]),
                  vmin=0, vmax=1, aspect="auto")
        for fi, f in enumerate(D.FEEDERS):
            net = D.net_load(f)
            for t in range(M.N_T):
                cut = grid[fi, t] == 1
                txt = "CUT" if cut else "on"
                if cut and net[t] <= 0:
                    txt = "CUT\n(wasted)"
                ax.text(t, fi, txt, ha="center", va="center", fontsize=9,
                        color="white" if cut else INK2, fontweight="bold" if cut else "normal")
        ax.set_xticks(range(M.N_T), D.SLOTS)
        ax.set_yticks(range(M.N_F), [f["name"] for f in D.FEEDERS])
        ax.set_xticks(np.arange(-.5, M.N_T, 1), minor=True)
        ax.set_yticks(np.arange(-.5, M.N_F, 1), minor=True)
        ax.grid(which="minor", color=SURF, linewidth=2)
        ax.tick_params(which="minor", length=0)
        for s in ax.spines.values():
            s.set_visible(False)
        short = sum(desc["shortfall_MW"])
        status = "meets every shortfall" if short == 0 else f"{short} MW shortfall unmet"
        ax.set_title(f"{title}\n{status} | {desc['people_hours_dark']:,} people-hours dark",
                     fontsize=10, loc="left", color=INK)
        if ax is not axes[0]:
            ax.set_yticklabels([])
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def plot_histogram(q, exact_x, path, top=15):
    samples = sorted(q["samples"], key=lambda s: -s["prob"])[:top]
    labels = [bits(s["x"]) for s in samples]
    probs = [s["prob"] for s in samples]
    colors = [ORANGE if s["x"] == exact_x else (BLUE if s["feasible"] else MUTED) for s in samples]
    fig, ax = plt.subplots(figsize=(9, 3.6))
    ax.bar(range(len(samples)), probs, color=colors, width=0.7, edgecolor=SURF, linewidth=2)
    ax.set_xticks(range(len(samples)), labels, rotation=60, fontsize=8, family="monospace")
    ax.set_ylabel("Measured probability")
    ax.axhline(1 / 2 ** M.N_VARS, color=INK2, linestyle=":", linewidth=1)
    ax.text(len(samples) - 0.5, 1 / 2 ** M.N_VARS, " random guess", va="bottom", ha="right",
            fontsize=8, color=INK2)
    ax.yaxis.grid(True, color="#e6e5e0", linewidth=0.8)
    ax.set_axisbelow(True)
    from matplotlib.patches import Patch
    ax.legend(handles=[Patch(color=ORANGE, label="exact optimum"),
                       Patch(color=BLUE, label="feasible schedule"),
                       Patch(color=MUTED, label="infeasible")],
              frameon=False, fontsize=8, loc="upper right")
    ax.set_title(f"QAOA output distribution (p={q['reps']}, {q['num_qubits']} qubits, 4096 shots)",
                 loc="left", fontsize=10)
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def plot_convergence(trace, path):
    fig, ax = plt.subplots(figsize=(6, 3.2))
    ax.plot(range(1, len(trace) + 1), trace, color=BLUE, linewidth=2)
    ax.set_xlabel("COBYLA iteration")
    ax.set_ylabel("CVaR energy (normalised)")
    ax.yaxis.grid(True, color="#e6e5e0", linewidth=0.8)
    ax.set_title("Classical optimiser training the quantum circuit", loc="left", fontsize=10)
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def plot_depth(sweep, path):
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.2))
    ps = [s["reps"] for s in sweep]
    axes[0].plot(ps, [s["p_opt"] for s in sweep], color=ORANGE, marker="o", markersize=7, linewidth=2)
    axes[0].axhline(1 / 2 ** M.N_VARS, color=INK2, linestyle=":", linewidth=1)
    axes[0].set_title("P(exact optimum) vs QAOA depth", loc="left", fontsize=10)
    axes[1].plot(ps, [s["feasible_mass"] for s in sweep], color=BLUE, marker="o", markersize=7, linewidth=2)
    axes[1].set_title("P(feasible schedule) vs QAOA depth", loc="left", fontsize=10)
    for ax in axes:
        ax.set_xlabel("QAOA layers p")
        ax.set_xticks(ps)
        ax.set_ylim(bottom=0)
        ax.yaxis.grid(True, color="#e6e5e0", linewidth=0.8)
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true", help="skip depth sweep")
    ap.add_argument("--reps", type=int, default=4)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    t0 = time.time()

    print("== Roshni: solar-aware fair load-shedding ==")
    print("Feeders (net load = demand - rooftop solar, MW):")
    for f in D.FEEDERS:
        print(f"  {f['name']:<18} net {D.net_load(f)}  backup {int(f['backup']*100)}%")
    print(f"  Shortfall to cover per block: {D.DEFICIT}\n")

    qp = M.build_quadratic_program()
    slack = M.slack_qubo(qp)
    print(qp.prettyprint())

    # 1. Exact classical reference
    ex = B.exact_bruteforce()
    exact_desc = B.describe(ex["x"])
    print(f"[exact] brute force over {ex['total']} schedules ({ex['feasible_count']} feasible): "
          f"optimum {ex['value']:.2f}  {bits(ex['x'])}")

    # 2. Status-quo heuristics
    sq = B.describe(B.status_quo_loss())
    rot = B.describe(B.solar_blind_rotate())

    # 3. QAOA
    q = Q.solve(reps=args.reps)
    p_opt = sum(s["prob"] for s in q["samples"] if s["x"] == ex["x"])
    rank = [s["x"] for s in sorted(q["samples"], key=lambda s: -s["prob"])].index(ex["x"]) + 1 \
        if any(s["x"] == ex["x"] for s in q["samples"]) else None
    qd = B.describe(q["best"]["x"])
    gap = (q["best"]["value"] - ex["value"]) / ex["value"] * 100
    print(f"[qaoa]  {q['num_qubits']} qubits (slack encoding would need {slack.get_num_vars()}), "
          f"p={q['reps']}, depth {q['depth']}, penalty l1,l2={q['lambda']}")
    print(f"        best sampled schedule {bits(q['best']['x'])}  value {q['best']['value']:.2f}  "
          f"gap to exact {gap:.2f}%")
    print(f"        P(optimum) = {p_opt:.3f}  ({p_opt * 2 ** M.N_VARS:.0f}x random), "
          f"rank among outcomes = {rank}, P(feasible) = {q['feasible_mass']:.3f}")

    # 4. Depth sweep (optional)
    sweep = []
    if not args.quick:
        tgt_idx = sum(b << k for k, b in enumerate(ex["x"]))
        feas_idx = [k for k in range(2 ** M.N_VARS)
                    if M.evaluate([(k >> j) & 1 for j in range(M.N_VARS)])[1]]
        for p in range(1, 7):
            r = Q.QAOARunner(M.unbalanced_qubo(*q["lambda"]), reps=p, cvar_alpha=0.1)
            r.optimise()
            pr = r.probabilities()
            sweep.append({"reps": p, "p_opt": float(pr[tgt_idx]),
                          "feasible_mass": float(pr[feas_idx].sum())})
            print(f"        sweep p={p}: P(opt)={pr[tgt_idx]:.3f}  P(feasible)={pr[feas_idx].sum():.3f}")
        plot_depth(sweep, os.path.join(OUT, "depth_sweep.png"))

    # Charts
    plot_schedules([("Status quo: cut worst-paying first", sq),
                    ("Solar-blind fair rotation", rot),
                    ("Roshni (QAOA)", qd)],
                   os.path.join(OUT, "schedule_comparison.png"))
    plot_histogram(q, ex["x"], os.path.join(OUT, "qaoa_histogram.png"))
    plot_convergence(q["trace"], os.path.join(OUT, "convergence.png"))

    results = {
        "instance": {"feeders": D.FEEDERS, "slots": D.SLOTS, "deficit": D.DEFICIT,
                     "weights": D.WEIGHTS},
        "exact": {**exact_desc, "bitstring": bits(ex["x"]),
                  "feasible_count": ex["feasible_count"]},
        "status_quo_loss_based": sq,
        "solar_blind_rotation": rot,
        "qaoa": {**qd, "bitstring": bits(q["best"]["x"]), "num_qubits": q["num_qubits"],
                 "slack_encoding_qubits": slack.get_num_vars(), "reps": q["reps"],
                 "depth": q["depth"], "penalty": q["lambda"], "p_optimum": p_opt,
                 "rank_of_optimum": rank, "p_feasible": q["feasible_mass"],
                 "gap_to_exact_percent": gap, "optimizer_evals": len(q["trace"])},
        "depth_sweep": sweep,
        "runtime_s": round(time.time() - t0, 1),
    }
    with open(os.path.join(OUT, "results.json"), "w") as fh:
        json.dump(results, fh, indent=2)

    rows = [("Status quo (worst-paying first)", sq), ("Solar-blind rotation", rot),
            ("Roshni QAOA", qd), ("Exact brute force", exact_desc)]
    md = ["| Method | Objective | Shortfall unmet (MW) | Wasted cuts | People-hours dark | Outage blocks SUN/IND/OLD |",
          "|---|---|---|---|---|---|"]
    for name, d in rows:
        o = d["outage_blocks"]
        md.append(f"| {name} | {d['objective']} | {sum(d['shortfall_MW'])} | {d['wasted_cuts']} | "
                  f"{d['people_hours_dark']:,} | {o['SUN']}/{o['IND']}/{o['OLD']} |")
    with open(os.path.join(OUT, "summary.md"), "w") as fh:
        fh.write("\n".join(md) + "\n")
    print("\n" + "\n".join(md))
    print(f"\nDone in {results['runtime_s']} s. Charts and results.json in {OUT}")


if __name__ == "__main__":
    main()
