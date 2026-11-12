// Builds docs/Roshni_Report.docx  (node docs/build_report.js)
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, LevelFormat,
  PageBreak, Footer, PageNumber,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const R = JSON.parse(fs.readFileSync(path.join(ROOT, "results", "results.json")));
const img = (p) => fs.readFileSync(path.join(ROOT, p));
const FONT = "Arial";

const P = (text, opts = {}) => new Paragraph({
  spacing: { after: 120 }, ...opts,
  children: (Array.isArray(text) ? text : [text]).map(t => typeof t === "string" ? new TextRun(t) : t),
});
const B = (t) => new TextRun({ text: t, bold: true });
const I = (t) => new TextRun({ text: t, italics: true });
const MONO = (t) => new TextRun({ text: t, font: "Consolas", size: 16 });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const bullet = (parts) => new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 60 },
  children: (Array.isArray(parts) ? parts : [parts]).map(t => typeof t === "string" ? new TextRun(t) : t) });
const code = (lines) => lines.map(l => new Paragraph({ spacing: { after: 0 }, shading: { type: ShadingType.CLEAR, fill: "F3F3F1" },
  children: [MONO(l || " ")] }));
const figure = (file, w, h, caption) => [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
    children: [new ImageRun({ type: "png", data: img(file), transformation: { width: w, height: h } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: caption, italics: true, size: 18, color: "52514E" })] }),
];

const border = { style: BorderStyle.SINGLE, size: 4, color: "C9C8C2" };
const borders = { top: border, bottom: border, left: border, right: border };
function table(headers, rows, widths, highlight = -1) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (t, w, opts = {}) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: String(t), bold: !!opts.bold, size: 19 })] })],
  });
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { bold: true, fill: "E8F1FB" })) }),
      ...rows.map((r, ri) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], ri === highlight ? { bold: true, fill: "FDF1EC" } : {})) })),
    ],
  });
}

const F = R.instance.feeders;
const net = (f) => f.demand.map((d, i) => d - f.solar[i]);
const q = R.qaoa, ex = R.exact, sq = R.status_quo_loss_based, rot = R.solar_blind_rotation;
const sum = (a) => a.reduce((x, y) => x + y, 0);
const pct = Math.round((1 - q.people_hours_dark / sq.people_hours_dark) * 100);
const sched = (d) => F.map((f, fi) => `${f.id}: ` + d.schedule[fi].map((v, t) => v ? R.instance.slots[t] : null).filter(Boolean).join(", ") || `${f.id}: none`).join("; ");

const children = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Roshni: Who Gets the Light?")] }),
  P([new TextRun({ text: "Solar-aware, fair load-shedding scheduled with QAOA in Qiskit", size: 26, color: "52514E" })]),
  P([B("Qiskit Fall Fest 2026 Hackathon"), new TextRun("  ·  Domain: Energy & Smart Infrastructure")]),
  P([B("Team: "), new TextRun("Muhammad Adeen Saghar, Muhammad Ahmad, Atta Ur Rehman")]),
  P([B("Repository: "), new TextRun("https://github.com/ahmadraza2730/roshni-quantum-loadshedding")]),

  H1("Summary"),
  P(`Pakistan's distribution companies shed load every day when supply falls short. Today's practice cuts the worst-paying feeders first and plans with gross demand, which ignores two facts: the same low-income areas go dark repeatedly, and rooftop solar switches off when its feeder is cut, so cutting a solar-rich area at midday relieves almost nothing. Roshni formulates the daily shedding schedule as a binary quadratic optimisation over feeder net load (demand minus solar). It encodes the schedule into a 9-qubit QUBO with an unbalanced-penalty method that needs no slack qubits, and solves it with QAOA on Qiskit's statevector simulator.`),
  P([new TextRun("On our test instance, QAOA's best sampled schedule matches the brute-force optimum exactly (0.00% gap), and the optimum is its single most likely outcome (P = "),
     B(`${(q.p_optimum * 100).toFixed(1)}%`), new TextRun(`, about ${Math.round(q.p_optimum * 512)}× random guessing). The schedule meets every shortfall with `),
     B(`${pct}% fewer people-hours in the dark`), new TextRun(" than the status-quo rule. A solar-blind rotation of the same fairness leaves a "),
     B(`${sum(rot.shortfall_MW)} MW shortfall`), new TextRun(" because it cuts the solar-rich feeder at 3pm.")]),

  H1("1. Problem and who it serves"),
  P("Load-shedding is a daily reality in Pakistan. The decision of which feeder goes dark, and when, is made by the grid operator and distribution company control rooms. We identify three problems with today's schedule:"),
  bullet([B("Unfairness. "), new TextRun("Utilities prioritise cutting feeders with high losses or low bill recovery. This keeps cutting the same dense, low-income areas, while better-paying areas are spared.")]),
  bullet([B("Rooftop solar is invisible. "), new TextRun("Pakistan has seen a rapid rise in rooftop solar. Grid-tied inverters disconnect when their feeder is de-energised (anti-islanding protection), so what the grid saves by cutting a feeder is its net load, not its gross demand. At midday the net load of a solar-rich feeder can be zero or negative. A plan built on gross demand believes it has relieved the grid when it hasn't.")]),
  bullet([B("Backup changes the human cost. "), new TextRun("Homes with off-grid solar or batteries keep their lights on during a cut. An outage on a feeder with high backup hurts fewer people, which a fair schedule should take into account.")]),
  P([B("Who it serves: "), new TextRun("distribution company load-dispatch centres (a schedule that actually relieves the shortfall), regulators (an auditable fairness criterion) and residents, especially those in areas that are cut most often.")]),

  H1("2. Formulation"),
  H2("Decision variables"),
  P([MONO("x[f,t] ∈ {0,1}"), new TextRun(" = 1 if feeder f is shed during time block t. We use 3 sheddable feeders × 3 blocks = 9 binary variables. The hospital feeder is protected and therefore has no variable.")]),
  H2("Objective (minimise)"),
  ...code([
    "  Σ_f,t  recovery_f · max(net_f,t, 0) · x[f,t]     (paid energy the utility does not sell)",
    "+ Σ_f    pain_f · (Σ_t x[f,t])²                    (fairness: squared outage count per feeder)",
    "+ 3 · Σ_f Σ_t x[f,t]·x[f,t+1]                      (no back-to-back blocks on one feeder)",
    "",
    "  net_f,t = demand_f,t − solar_f,t",
    "  pain_f  = customers_f / 1000 × (1 − backup_f)    (people who actually lose power)",
  ]),
  P(""),
  P("Squaring each feeder's outage count makes piling outages on one area cost more than spreading them. This fairness term, and the back-to-back term, link pairs of variables, so the objective is naturally quadratic."),
  H2("Constraints"),
  ...code(["For every block t:   Σ_f net_f,t · x[f,t]  ≥  deficit_t      (the cut must relieve the shortfall)"]),
  P(""),
  P("The constraint uses net load, which is what makes the model solar-aware: cutting a feeder with net load ≤ 0 contributes nothing (or a negative amount) towards the shortfall."),
  H2("Test instance"),
  P("The feeders are fictional but realistically shaped. Numbers are small integers to keep the QUBO compact."),
  table(["Feeder", "Net load MW (11am / 3pm / 7pm)", "Solar MW", "Customers", "Backup", "Recovery"],
    [...F.map(f => [`${f.name} (${f.desc})`, net(f).join(" / "), f.solar.join(" / "), f.customers.toLocaleString(), `${Math.round(f.backup * 100)}%`, `${Math.round(f.recovery * 100)}%`]),
     ["City Hospital (protected)", "2 / 2 / 2", "0", "-", "-", "never shed"],
     ["Shortfall to cover", R.instance.deficit.join(" / "), "", "", "", ""]],
    [2900, 1900, 1100, 1100, 900, 1100]),
  P(""),
  P(`Of the 2⁹ = 512 possible schedules, ${ex.feasible_count} satisfy all three constraints.`),

  H1("3. Quantum approach and justification"),
  H2("Why QAOA"),
  P("The problem is a binary quadratic program: binary decisions, a quadratic objective and linear constraints. That maps directly onto an Ising Hamiltonian whose ground state is the best schedule. QAOA (Farhi et al., 2014) is the standard gate-model algorithm for this class. It alternates a cost layer exp(−iγH_C), built from the problem itself, with a mixer layer exp(−iβΣX), and a classical optimiser tunes the angles. Each binary variable becomes one qubit, and each quadratic term becomes an RZZ interaction between two qubits. The quantum circuit therefore does the actual search over schedules; it is not decoration."),
  H2("Representation in the circuit"),
  bullet([B("QUBO → Ising. "), new TextRun("qiskit-optimization's QuadraticProgram.to_ising() gives a 9-qubit SparsePauliOp H_C. Each fairness and back-to-back pair becomes a ZZ term.")]),
  bullet([B("Constraints without slack qubits. "), new TextRun(`The standard converter (QuadraticProgramToQubo) adds binary slack variables for each "≥" constraint, giving ${q.slack_encoding_qubits} qubits. We instead use unbalanced penalisation (Montañez-Barrera et al., 2022): with g = lhs − rhs, the penalty is −λ₁g + λ₂g², which is small when g ≥ 0 and large when g < 0. This keeps the problem at ${q.num_qubits} qubits, a 2^${q.slack_encoding_qubits - q.num_qubits}-fold smaller state space. We use λ = (${q.penalty.join(", ")}) and verify that the QUBO's global minimum is exactly the constrained optimum.`)]),
  bullet([B("CVaR objective. "), new TextRun("Instead of the mean energy, we minimise the average energy of the best 10% of outcomes (Barkoutsos et al., 2020). A scheduler uses the best sample, not the average one.")]),
  bullet([B("Linear-ramp initialisation. "), new TextRun("The angles start as a discretised anneal (β decreasing, γ increasing across layers), with several ramp lengths tried. With random starting angles, our early runs found the optimum in only 0.3–3% of shots.")]),
  H2("Assumptions"),
  P("We assume a noise-free statevector simulator, a one-day horizon with 3 two-hour blocks, a deterministic solar forecast per block, and that each feeder is cut entirely or not at all. Real hardware and quantum speedup were not goals, as the brief states."),

  H1("4. Architecture"),
  ...figure("docs/architecture.png", 620, 269, "Figure 1. Roshni pipeline: inputs → model → hybrid quantum-classical loop → decode and validation → outputs."),

  H1("5. Implementation"),
  P("The implementation is Python with Qiskit 2.x and qiskit-optimization. The full run takes about 40 seconds on a laptop, and all randomness is seeded."),
  table(["File", "Role"], [
    ["src/data.py", "Test instance: feeders, solar, backup share, shortfall, weights"],
    ["src/model.py", "Objective, constraints, QuadraticProgram, slack and unbalanced QUBO encodings"],
    ["src/qaoa_solver.py", "QAOAAnsatz → transpile → Statevector CVaR cost → COBYLA; StatevectorSampler (4096 shots); decoding"],
    ["src/baselines.py", "Exact brute force; worst-paying-first rule; solar-blind fair rotation; metrics"],
    ["run_demo.py", "Runs everything and writes results/ (JSON, table, four charts)"],
    ["make_demo_page.py", "Builds the animated city demo (demo/index.html) from the results"],
  ], [2600, 6400]),
  P(""),
  P([B("Decoding. "), new TextRun("Each measured bitstring is mapped back to a schedule (Qiskit's rightmost bit is qubit 0, which is variable 0). We check it against the original constraints, score it with the original objective (not the penalised one), and report the best feasible sample alongside the full distribution.")]),

  new Paragraph({ children: [new PageBreak()] }),
  H1("6. Results and classical comparison"),
  H2("Comparison with the exact optimum and current practice"),
  table(["Method", "Objective", "Unmet MW", "Wasted cuts", "People-hours dark", "Outages SUN/IND/OLD"], [
    ["Status quo: worst-paying first", sq.objective, sum(sq.shortfall_MW), sq.wasted_cuts, sq.people_hours_dark.toLocaleString(), Object.values(sq.outage_blocks).join("/")],
    ["Solar-blind fair rotation", rot.objective, sum(rot.shortfall_MW), rot.wasted_cuts, rot.people_hours_dark.toLocaleString(), Object.values(rot.outage_blocks).join("/")],
    ["Roshni (QAOA, p=4)", q.objective, sum(q.shortfall_MW), q.wasted_cuts, q.people_hours_dark.toLocaleString(), Object.values(q.outage_blocks).join("/")],
    ["Exact brute force (512 schedules)", ex.objective, sum(ex.shortfall_MW), ex.wasted_cuts, ex.people_hours_dark.toLocaleString(), Object.values(ex.outage_blocks).join("/")],
  ], [2900, 1000, 950, 1050, 1500, 1600], 2),
  P(""),
  bullet([B("QAOA = exact. "), new TextRun(`The best sampled schedule (${q.bitstring}) is identical to the brute-force optimum: ${sched(q)}. The gap is ${q.gap_to_exact_percent.toFixed(2)}%.`)]),
  bullet([B("Solar awareness matters. "), new TextRun(`The solar-blind rotation looks equally fair and scores ${rot.objective}, lower than the optimum. It only scores lower because it is infeasible: it cuts Sunview at 3pm, when solar covers that feeder's demand (net −1 MW), and leaves ${sum(rot.shortfall_MW)} MW uncovered. In practice, that gap would force unplanned emergency cuts. Roshni moves Sunview's cut to 7pm, when its solar is gone and its demand peaks.`)]),
  bullet([B("Fairness. "), new TextRun(`The status quo cuts Old Town, the area with the most customers and no backup, in all 3 blocks, for ${sq.people_hours_dark.toLocaleString()} people-hours in the dark. Roshni cuts no feeder more than twice and reduces that to ${q.people_hours_dark.toLocaleString()} (−${pct}%).`)]),
  ...figure("results/schedule_comparison.png", 620, 167, "Figure 2. Shedding schedules. Dark cells are cut blocks."),
  H2("Quantum output"),
  P(`The optimum is the most frequently measured outcome. The probability of measuring a feasible schedule is ${(q.p_feasible * 100).toFixed(0)}%; infeasible samples are discarded during decoding. The circuit has ${q.num_qubits} qubits, ${q.reps} QAOA layers and a transpiled depth of ${q.depth}, and the optimiser made ${q.optimizer_evals} evaluations for the best ramp.`),
  ...figure("results/qaoa_histogram.png", 600, 240, "Figure 3. QAOA measurement distribution (top 15 bitstrings, 4096 shots)."),
  H2("Effect of circuit depth"),
  table(["QAOA layers p", ...R.depth_sweep.map(s => String(s.reps))], [
    ["P(exact optimum)", ...R.depth_sweep.map(s => s.p_opt.toFixed(3))],
    ["P(feasible)", ...R.depth_sweep.map(s => s.feasible_mass.toFixed(3))],
  ], [2400, 1100, 1100, 1100, 1100, 1100, 1100]),
  P(""),
  P("The success probability rises steeply up to p = 3–4 and then levels off around 10%. We therefore use p = 4."),
  ...figure("results/depth_sweep.png", 600, 213, "Figure 4. Success probability versus QAOA depth. The dotted line is random guessing (1/512)."),
  ...figure("docs/demo_screenshot.png", 620, 337, "Figure 5. Demo view at 3pm: the solar-blind plan cuts the solar-rich feeder and relieves −1 of 4 MW, while Roshni covers the shortfall."),

  H1("7. Limitations (honest assessment)"),
  bullet([B("No quantum advantage. "), new TextRun("With 512 schedules, brute force is instant on a laptop. Our instance is a proof of concept for the modelling and the pipeline, not a speedup claim. At city scale (hundreds of feeders × 24 hours) the problem would need thousands of qubits, far beyond current hardware.")]),
  bullet([B("Penalty tuning was classical. "), new TextRun("We picked λ by enumerating all 512 schedules to confirm the QUBO minimum is the true optimum. That check is impossible at scale; poorly chosen penalties can make the QUBO favour infeasible schedules.")]),
  bullet([B("Success probability levels off. "), new TextRun("P(optimum) stops at about 10% beyond p = 4, and more than half of all shots are infeasible. We rely on sampling plus classical post-selection, which is standard for QAOA but means the quantum state alone is not a clean answer.")]),
  bullet([B("Simulator only. "), new TextRun(`The circuit is noise-free. A depth-${q.depth} circuit with many RZZ gates would lose fidelity on today's hardware, and error mitigation would be needed.`)]),
  bullet([B("Simplified physics and data. "), new TextRun("Our numbers are illustrative, not utility data. We ignore voltage limits, reverse power flow, partial curtailment of feeders and forecast uncertainty. The objective weights are value judgements that a regulator would need to set.")]),
  bullet([B("Ethical trade-off. "), new TextRun("Weighting pain by backup share means feeders with batteries are cut more readily. That can be fair (less suffering) or unfair (penalising people who invested in solar). We expose this as a policy parameter rather than hiding it.")]),

  H1("8. Future work"),
  bullet("Scale to more feeders and hours with decomposition (per-hour subproblems), warm-start QAOA, or a quantum-annealing comparison."),
  bullet("Run on IBM Quantum hardware with error mitigation, and compare noisy against ideal results."),
  bullet("Use real feeder data and solar forecasts, and add voltage and reverse-flow constraints."),
  bullet("Classical baselines at scale: MILP (e.g. CPLEX or HiGHS) and simulated annealing."),

  H1("9. Reproducibility"),
  ...code([
    "git clone https://github.com/ahmadraza2730/roshni-quantum-loadshedding.git",
    "cd roshni-quantum-loadshedding",
    "python -m venv .venv  &&  .venv\\Scripts\\activate      (macOS/Linux: source .venv/bin/activate)",
    "pip install -r requirements.txt",
    "python run_demo.py          # results/ : JSON, summary table, charts",
    "python make_demo_page.py    # demo/index.html",
  ]),
  P(""),

  H1("References"),
  P("[1] E. Farhi, J. Goldstone, S. Gutmann. A Quantum Approximate Optimization Algorithm. arXiv:1411.4028 (2014)."),
  P("[2] J. A. Montañez-Barrera, D. Willsch, A. Maldonado-Romo, K. Michielsen. Unbalanced penalization: a new approach to encode inequality constraints of combinatorial problems for quantum optimization algorithms. arXiv:2211.13914 (2022)."),
  P("[3] P. Kl. Barkoutsos, G. Nannicini, A. Robert, I. Tavernelli, S. Woerner. Improving Variational Quantum Optimization using CVaR. Quantum 4, 256 (2020)."),
  P("[4] Qiskit and qiskit-optimization, IBM Quantum. Code written for this hackathon with AI assistance; no code was copied from tutorials."),
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { font: FONT, size: 44, bold: true, color: "0B0B0B" }, paragraph: { spacing: { before: 0, after: 80 }, keepNext: true } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 30, bold: true, color: "1D4F8F" }, paragraph: { spacing: { before: 300, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 24, bold: true, color: "0B0B0B" }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Roshni · Qiskit Fall Fest 2026 · page ", size: 16, color: "8A8A85" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "8A8A85" })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.join(ROOT, "docs", "Roshni_Report.docx"), buf);
  console.log("Wrote docs/Roshni_Report.docx");
});
