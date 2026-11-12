// Builds docs/Roshni_Project_Guide.docx  (node docs/build_guide.js)
// A team study guide: every idea in the project explained simply, then technically.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, LevelFormat,
  PageBreak, Footer, PageNumber, TableOfContents,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const R = JSON.parse(fs.readFileSync(path.join(ROOT, "results", "results.json")));
const img = (p) => fs.readFileSync(path.join(ROOT, p));
const FONT = "Arial";

const run = (t) => typeof t === "string" ? new TextRun(t) : t;
const P = (parts, opts = {}) => new Paragraph({ spacing: { after: 120, line: 290 }, ...opts,
  children: (Array.isArray(parts) ? parts : [parts]).map(run) });
const B = (t) => new TextRun({ text: t, bold: true });
const I = (t) => new TextRun({ text: t, italics: true });
const M = (t) => new TextRun({ text: t, font: "Consolas", size: 18 });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const bl = (parts, lvl = 0) => new Paragraph({ numbering: { reference: "b", level: lvl }, spacing: { after: 60, line: 280 },
  children: (Array.isArray(parts) ? parts : [parts]).map(run) });
let NLI = 1;
const nl = (parts) => new Paragraph({ numbering: { reference: "n", level: 0, instance: NLI }, spacing: { after: 60, line: 280 },
  children: (Array.isArray(parts) ? parts : [parts]).map(run) });
const code = (lines) => lines.map((l, i) => new Paragraph({
  spacing: { after: 0, before: i === 0 ? 60 : 0 }, shading: { type: ShadingType.CLEAR, fill: "F3F3F1" },
  children: [M(l || " ")] })).concat([new Paragraph({ spacing: { after: 100 }, children: [] })]);
const figure = (file, w, h, caption) => [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
    children: [new ImageRun({ type: "png", data: img(file), transformation: { width: w, height: h } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: caption, italics: true, size: 18, color: "52514E" })] }),
];

// Coloured call-out boxes: "In simple words" (green) and "Technical view" (blue)
function box(label, fill, border, parts) {
  const b = { style: BorderStyle.SINGLE, size: 6, color: border };
  return new Table({
    width: { size: 9500, type: WidthType.DXA }, columnWidths: [9500],
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      width: { size: 9500, type: WidthType.DXA },
      borders: { top: b, bottom: b, left: { style: BorderStyle.SINGLE, size: 24, color: border }, right: b },
      shading: { type: ShadingType.CLEAR, fill },
      margins: { top: 100, bottom: 100, left: 180, right: 180 },
      children: [
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: label, bold: true, color: border, size: 19 })] }),
        ...parts.map(p => Array.isArray(p) || typeof p === "string"
          ? new Paragraph({ spacing: { after: 80, line: 280 }, children: (Array.isArray(p) ? p : [p]).map(run) })
          : p),
      ] })] })],
  });
}
const simple = (...parts) => [box("IN SIMPLE WORDS", "ECF8F3", "1BAF7A", parts), new Paragraph({ spacing: { after: 120 }, children: [] })];
const tech = (...parts) => [box("TECHNICAL VIEW", "EEF4FC", "2A78D6", parts), new Paragraph({ spacing: { after: 120 }, children: [] })];
const tip = (...parts) => [box("SAY THIS TO THE JUDGES", "FDF1EC", "EB6834", parts), new Paragraph({ spacing: { after: 120 }, children: [] })];

const bd = { style: BorderStyle.SINGLE, size: 4, color: "C9C8C2" };
const borders = { top: bd, bottom: bd, left: bd, right: bd };
function table(headers, rows, widths, hl = -1) {
  const cell = (t, w, o = {}) => new TableCell({ borders, width: { size: w, type: WidthType.DXA },
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: String(t), bold: !!o.bold, size: 18 })] })] });
  return [new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { bold: true, fill: "E8F1FB" })) }),
      ...rows.map((r, ri) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], ri === hl ? { bold: true, fill: "FDF1EC" } : {})) }))] }),
    new Paragraph({ spacing: { after: 140 }, children: [] })];
}

const F = R.instance.feeders;
const net = (f) => f.demand.map((d, i) => d - f.solar[i]);
const q = R.qaoa, ex = R.exact, sq = R.status_quo_loss_based, rot = R.solar_blind_rotation;

const C = [];
const add = (...xs) => xs.flat().forEach(x => C.push(x));

// ---------------- Cover ----------------
add(
  new Paragraph({ spacing: { before: 1800 }, children: [] }),
  new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun("Roshni: The Complete Project Guide")] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: "Everything you need to understand, explain and defend our project, from the basic idea to the quantum circuit", size: 26, color: "52514E" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Qiskit Fall Fest 2026 Hackathon · Energy & Smart Infrastructure", size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Team: Muhammad Adeen Saghar · Muhammad Ahmad · Atta Ur Rehman", size: 22, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: "Live demo: roshni-quantum.vercel.app  ·  Code: github.com/ahmadraza2730/roshni-quantum-loadshedding", size: 18, color: "52514E" })] }),
  P([B("How to read this guide. "), new TextRun("Each idea is explained twice. A green box ("), B("In simple words"), new TextRun(") gives the everyday version you could tell a friend. A blue box ("), B("Technical view"), new TextRun(") gives the precise version for judges who ask deeper questions. Orange boxes ("), B("Say this to the judges"), new TextRun(") are ready-made lines. If you only have 15 minutes, read sections 1, 2, 3 and 14.")]),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Contents")] }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  P([I("If the contents list appears empty, right-click it in Word and choose Update Field.")]),
  new Paragraph({ children: [new PageBreak()] }),
);

// ---------------- 1. One-minute version ----------------
add(
  H1("1. The project in one minute"),
  ...simple(
    "When Pakistan doesn't have enough electricity, the power company switches off some areas for a couple of hours. That's load-shedding. Someone has to decide which area goes dark, and when.",
    "Today the rule is basically: cut the areas that pay their bills the least. So the same poor neighbourhoods go dark again and again.",
    "There's a new twist: rooftop solar. When an area is switched off, its solar panels switch off too, for safety. So cutting a solar-rich area at midday saves almost no electricity, because its homes were running on sunshine anyway.",
    [B("Roshni"), new TextRun(" (Urdu for light) is a scheduler that decides who gets cut, and when, so that the cuts really fix the shortage, are shared fairly, and use solar wisely. We wrote the problem in the language quantum computers understand and solved it with a quantum algorithm called QAOA, using IBM's Qiskit.")],
  ),
  ...tech(
    "We formulate day-ahead load-shedding as a binary quadratic program over 9 decisions (3 feeders × 3 time blocks). The objective combines lost revenue, a squared fairness penalty and a back-to-back penalty. The constraints require each block's cuts to cover the supply shortfall in terms of NET load (demand − rooftop solar).",
    "We convert it to a 9-qubit QUBO/Ising Hamiltonian using unbalanced penalisation (no slack qubits), solve it with QAOA (p = 4, CVaR α = 0.1, linear-ramp initialisation, COBYLA) on Qiskit's statevector simulator, and verify against brute force over all 512 schedules.",
  ),
  H2("Headline results"),
  ...table(["What we measured", "Result"], [
    ["Did QAOA find the best possible schedule?", "Yes: identical to brute force (0.00% gap)"],
    ["How often does the quantum circuit output it?", `${(q.p_optimum * 100).toFixed(1)}% of shots; the single most likely answer (about ${Math.round(q.p_optimum * 512)}× random guessing)`],
    ["Qubits used", `${q.num_qubits} (the textbook method would need ${q.slack_encoding_qubits})`],
    ["People-hours in the dark vs today's rule", `${sq.people_hours_dark.toLocaleString()} → ${q.people_hours_dark.toLocaleString()} (−47%)`],
    ["What happens if you ignore solar", `A "fair" plan leaves a ${rot.shortfall_MW.reduce((a, b) => a + b, 0)} MW gap at 3pm`],
  ], [4300, 5200]),
);

// ---------------- 2. Real-world problem ----------------
add(
  H1("2. The real-world problem"),
  H2("2.1 What is load-shedding?"),
  ...simple(
    "Imagine a water tank that can supply 100 buckets an hour, but the town wants 110. Someone must turn off taps for 10 buckets' worth. Electricity is the same, except it can't be stored cheaply, so supply and demand must match every second. When power plants can't produce enough, the utility has to switch off whole areas on purpose. If it doesn't, the grid's frequency drops and the whole system can collapse into a blackout.",
  ),
  ...tech(
    [B("Feeder: "), new TextRun("the medium-voltage line (typically 11 kV in Pakistan) that leaves a grid station and supplies one area. Load-shedding is done feeder by feeder, so a feeder is the smallest unit you can switch off. That's why our decisions are per feeder.")],
    [B("DISCO: "), new TextRun("a distribution company, such as IESCO in Islamabad or LESCO in Lahore. DISCOs build the shedding schedule.")],
    [B("AT&C losses: "), new TextRun("aggregate technical and commercial losses, meaning energy lost to wires, theft and unpaid bills. DISCOs shed high-loss feeders more because each megawatt there earns less. That is the status-quo rule we compare against.")],
  ),
  H2("2.2 Problem one: unfairness"),
  P("Cutting the worst-paying feeders first is financially logical for the utility, but it means the same dense, low-income areas lose power day after day, including honest bill-payers who happen to live there. Students can't study, small businesses close, and water pumps stop."),
  H2("2.3 Problem two: rooftop solar is invisible"),
  ...simple(
    "Lots of homes now have solar panels. During the day those homes barely use the grid. But here's the surprise: when the power company switches an area off, the solar panels on those homes switch off too. So cutting that area at noon saves almost nothing. You've caused a blackout for no benefit.",
  ),
  ...tech(
    [B("Anti-islanding protection: "), new TextRun("grid-tied inverters must disconnect when the grid voltage disappears. Otherwise they would keep the line live (an \"island\") and could electrocute line workers repairing it. This is a safety requirement in grid-connection standards.")],
    [B("Net load: "), new TextRun("what a feeder actually draws from the grid, which is demand minus local solar. Cutting a feeder removes its net load, not its gross demand. At noon a solar-rich feeder can have net load ≤ 0. Ours is −1 MW at 3pm, meaning it is exporting to the grid, so cutting it makes the shortage slightly worse.")],
    [B("Why planners miss this: "), new TextRun("a schedule built on gross (meter-side) demand believes a cut relieved 5 MW when it relieved −1 MW. The real gap then appears in real time and forces unplanned emergency cuts.")],
  ),
  H2("2.4 Problem three: backup changes who actually suffers"),
  ...simple(
    "Some homes have batteries or fully off-grid solar systems. When their area is cut, their lights stay on. So cutting an area where 40% of homes have backup hurts fewer people than cutting an area with no backup at all.",
  ),
  ...tech(
    [new TextRun("We model this with a "), B("backup share"), new TextRun(" per feeder, the fraction of homes that keep power during a cut. Each feeder's \"pain weight\" = customers/1000 × (1 − backup share). Fully off-grid homes draw nothing from the grid, so they affect neither the shortage nor the pain. Hybrid solar-plus-battery homes are grid-tied but ride through the cut, so they reduce pain without reducing net load.")],
  ),
  ...tip("“Solar didn't just reduce demand. It changed when each neighbourhood is worth cutting, and today's schedules don't know that.”"),
);

// ---------------- 3. Worked example ----------------
add(
  H1("3. Our test town: a fully worked example"),
  P("Everything in this project runs on one small, made-up but realistic town. Learn these numbers. Almost every judge question can be answered with them."),
  ...table(["Feeder", "Who lives there", "Net load MW (11am / 3pm / 7pm)", "Customers", "Backup", "Pays bills"], [
    ...F.map(f => [f.name, f.desc, net(f).join(" / "), f.customers.toLocaleString(), `${Math.round(f.backup * 100)}%`, `${Math.round(f.recovery * 100)}%`]),
    ["City Hospital", "protected", "2 / 2 / 2", "-", "-", "never cut"],
    ["Shortage to cover", "", R.instance.deficit.join(" / ") + " MW", "", "", ""],
  ], [1600, 2300, 2000, 1100, 1000, 1000]),
  P([new TextRun("Look at "), B("Sunview at 3pm: net load −1 MW"), new TextRun(". Its 6 MW of solar exceeds its 5 MW of demand. Cutting Sunview then is pointless, or slightly harmful.")]),
  H2("3.1 Three ways to build the schedule"),
  H3("Plan A: today's rule (cut the worst-paying first)"),
  P("Old Town pays least (60%), so it is cut first, every block. Industrial is added when Old Town alone isn't enough. Result: Old Town is dark in all three blocks, and two of those are back-to-back."),
  H3("Plan B: fair rotation that ignores solar"),
  P("This plan takes turns, cutting whoever has been cut least so far. It looks fair. But at 3pm it picks Sunview, using its gross demand of 5 MW, which is enough on paper. In reality Sunview's net load is −1 MW. The grid gets −1 MW of relief instead of 4 MW, leaving a 5 MW gap."),
  H3("Plan C: Roshni (found by the quantum algorithm)"),
  P("11am: cut Industrial (relieves 5 ≥ 4). 3pm: cut Old Town (relieves 4 ≥ 4). 7pm: cut Sunview and Industrial (relieves 7 + 5 = 12 ≥ 8). Sunview's cut moves to the evening, when its solar is gone and its demand peaks. No feeder is cut more than twice, and none back-to-back."),
  ...table(["", "Plan A: today", "Plan B: solar-blind fair", "Plan C: Roshni"], [
    ["Covers every shortage?", "Yes", "NO (5 MW gap at 3pm)", "Yes"],
    ["Old Town blocks cut", "3 of 3", "1", "1"],
    ["Most-hit vs least-hit feeder", "3 vs 0", "2 vs 1", "2 vs 1"],
    ["People-hours in the dark", sq.people_hours_dark.toLocaleString(), rot.people_hours_dark.toLocaleString(), q.people_hours_dark.toLocaleString()],
    ["Score (lower = better)", sq.objective, `${rot.objective} (invalid)`, q.objective],
  ], [2600, 2200, 2500, 2200], 4),
  ...figure("results/schedule_comparison.png", 620, 167, "The three schedules. Dark cells are cut blocks; 'wasted' marks a cut that relieves nothing."),
  H2("3.2 How the score is calculated: Roshni's 33.05, step by step"),
  P("Our score adds three kinds of cost. Lower is better. Here is the exact arithmetic for Roshni's schedule:"),
  ...table(["Cost term", "Calculation", "Value"], [
    ["Revenue lost", "Sunview 7pm: 7 × 0.95 = 6.65;  Industrial 11am: 5 × 0.90 = 4.50;  Industrial 7pm: 5 × 0.90 = 4.50;  Old Town 3pm: 4 × 0.60 = 2.40", "18.05"],
    ["Fairness (pain × cuts²)", "Sunview: 3.0×(1−0.4)=1.8 × 1² = 1.8;  Industrial: 2.0×0.9=1.8 × 2² = 7.2;  Old Town: 6.0×1.0=6 × 1² = 6.0", "15.00"],
    ["Back-to-back", "No feeder is cut in two neighbouring blocks", "0"],
    ["Total", "", "33.05"],
  ], [2000, 6200, 1300], 3),
  P([new TextRun("Compare today's rule (84.0). Old Town is cut 3 times, so its fairness cost is 6 × 3² = "), B("54"), new TextRun(", plus two back-to-back penalties of 3 each. The squaring is what punishes piling all the outages onto one area.")]),
  ...tip("“Cutting one area three times costs 9 units of pain; cutting three areas once each costs 3. Squaring makes the optimiser share the burden.”"),
);

// ---------------- 4. Optimisation basics ----------------
add(
  H1("4. Optimisation basics"),
  ...simple(
    "Optimisation means picking the best option out of many. Every optimisation problem has three parts: the choices you can make (variables), how you score a choice (objective), and the rules you can't break (constraints).",
    "Example: packing for a trip. Choices: which items to pack. Score: how useful the bag is. Rule: the bag can't weigh more than 20 kg.",
  ),
  H2("4.1 Our three ingredients"),
  ...table(["Ingredient", "In everyday words", "In our model"], [
    ["Variables", "For each area and time: cut it or not?", "x[f,t] ∈ {0,1}: 3 feeders × 3 blocks = 9 yes/no switches"],
    ["Objective", "How bad is this schedule?", "revenue lost + fairness penalty + back-to-back penalty"],
    ["Constraints", "The cuts must actually fix the shortage", "Σ net load of cut feeders ≥ shortage, for each block"],
  ], [1700, 3300, 4500]),
  H2("4.2 Why is this hard? The explosion of choices"),
  P("Each of the 9 switches can be on or off, so there are 2⁹ = 512 possible schedules. A laptop checks all of them in a blink, so we can verify our quantum answer exactly. A real city is different:"),
  ...table(["Size", "Decisions", "Possible schedules"], [
    ["Our test town (3 feeders × 3 blocks)", "9", "512"],
    ["10 feeders × 24 hours", "240", "≈ 1.8 × 10⁷²"],
    ["100 feeders × 24 hours (a real city)", "2,400", "≈ 10⁷²² (more than atoms in the universe, ~10⁸⁰)"],
  ], [4000, 1500, 4000]),
  ...tech(
    "This is a binary quadratic program, part of a family of problems that are NP-hard in general: no known algorithm solves every instance quickly. In practice, utilities would use classical solvers (MILP, heuristics). Quantum optimisation algorithms like QAOA are a research direction for such problems; at today's scale they don't beat classical methods. We say this openly.",
  ),
  H2("4.3 Why our problem is \"quadratic\""),
  ...simple("A linear cost just adds up item by item. A quadratic cost includes pairs: the cost of cutting Old Town at 3pm depends on whether you also cut it at 11am. Fairness and the back-to-back rule are both about pairs of decisions."),
  ...tech(
    "Expanding (x₁ + x₂ + x₃)² for one feeder gives x₁ + x₂ + x₃ + 2x₁x₂ + 2x₁x₃ + 2x₂x₃ (using x² = x for binary x). The cross terms xᵢxⱼ are the quadratic part. The back-to-back term x[f,t]·x[f,t+1] is quadratic too. Quadratic binary problems are exactly what QUBO and QAOA are designed for, which is our core reason for choosing a quantum approach.",
  ),
);

// ---------------- 5. Quantum basics ----------------
add(
  H1("5. Quantum computing basics (only what we need)"),
  H2("5.1 Bits vs qubits"),
  ...simple(
    "A normal bit is a light switch: on (1) or off (0). A qubit is more like a dimmer combined with a coin toss. Before you look, it holds a blend of 0 and 1 at the same time. When you look (measure), it snaps to 0 or 1 at random, with chances set by the blend.",
    "Nine qubits can hold a blend of all 512 schedules at once. The trick of a quantum algorithm is to shape that blend so that, when we look, good schedules come out much more often than bad ones.",
  ),
  ...tech(
    [B("Superposition: "), new TextRun("a 9-qubit state is |ψ⟩ = Σ cₓ|x⟩ over all 512 bitstrings x, with complex amplitudes cₓ. Measuring returns x with probability |cₓ|².")],
    [B("Interference: "), new TextRun("gates change the amplitudes so that some paths add up (constructive) and others cancel (destructive). QAOA uses this to boost low-cost schedules.")],
    [B("Measurement / shots: "), new TextRun("each run of the circuit gives one bitstring. We run it 4,096 times (shots) to see the probability distribution.")],
  ),
  H2("5.2 Gates we use"),
  ...table(["Gate", "Simple meaning", "Role in our circuit"], [
    ["H (Hadamard)", "Turns a definite 0 into a 50/50 blend", "Start: every schedule equally likely"],
    ["RZ(θ)", "Rotates the qubit's phase", "Encodes each single-variable cost (e.g. revenue of one cut)"],
    ["RZZ(θ)", "Rotates the phase of two qubits together", "Encodes each pair cost (fairness, back-to-back, constraints)"],
    ["RX(θ)", "Mixes 0 and 1", "The mixer: lets probability flow between schedules"],
  ], [1700, 3600, 4200]),
  H2("5.3 Simulator vs real hardware"),
  P("We run on Qiskit's statevector simulator, which computes the quantum state exactly on a normal computer. That works for small circuits (9 qubits = 512 amplitudes). Real IBM quantum hardware adds noise. The hackathon rules say hardware isn't required, and our code would run on hardware with minor changes, though with noisier results."),
);

// ---------------- 6. QUBO ----------------
add(
  H1("6. Turning the problem into quantum language: QUBO and Ising"),
  ...simple(
    "Picture all 512 schedules as places on a hilly landscape. Each place's height is its cost. The best schedule is the lowest valley. A QUBO is just that landscape written as a formula: every schedule gets a height, and the rules are built in by making rule-breaking schedules sit on high hills.",
  ),
  ...tech(
    [B("QUBO "), new TextRun("(Quadratic Unconstrained Binary Optimisation): minimise f(x) = Σᵢ aᵢxᵢ + Σᵢ<ⱼ bᵢⱼxᵢxⱼ + c over binary x, with no constraints. Constraints must be folded into f as penalties.")],
    [B("Ising form: "), new TextRun("substitute xᵢ = (1 − zᵢ)/2 with zᵢ ∈ {+1, −1}. Then f becomes a Hamiltonian H_C = Σ hᵢZᵢ + Σ Jᵢⱼ ZᵢZⱼ + const. Each binary variable becomes one qubit; each linear term becomes a Z (RZ gate) and each quadratic term becomes a ZZ (RZZ gate). The schedule with the lowest cost is the ground state (lowest energy) of H_C.")],
    [new TextRun("In code: "), M("qp.to_ising()"), new TextRun(` from qiskit-optimization produces a SparsePauliOp with 27 terms (9 Z terms + 18 ZZ terms) for our problem.`)],
  ),
  H2("6.1 Building the rules in: two ways to handle constraints"),
  P("Our rule is \"cuts must cover the shortage\", an inequality (≥). QUBO has no rules, only costs, so we add a penalty that is large when the rule is broken."),
  H3("Method 1: slack variables (textbook)"),
  P([new TextRun("Turn \"relief ≥ shortage\" into \"relief − slack = shortage\" by adding extra binary variables to represent the slack. That costs extra qubits: our problem would need "), B(`${q.slack_encoding_qubits} qubits`), new TextRun(" instead of 9. Every extra qubit doubles the size of the search space (2¹⁹ vs 2⁹ is 1,024 times bigger), making QAOA much harder.")]),
  H3("Method 2: unbalanced penalisation (what we use)"),
  ...simple("Instead of extra qubits, we use a lopsided penalty: almost no cost when the rule is satisfied, and a steeply growing cost when it is broken."),
  ...tech(
    [new TextRun("For a constraint g(x) = relief − shortage ≥ 0, add P(g) = −λ₁·g + λ₂·g², with λ₁ = 4 and λ₂ = 0.5 (Montañez-Barrera et al., 2022). No slack qubits are needed.")],
  ),
  P([B("Worked example (3pm block, shortage 4 MW). "), new TextRun("Penalty = −4g + 0.5g²:")]),
  ...table(["What we cut at 3pm", "Relief", "g = relief − 4", "Penalty", "Meaning"], [
    ["Nothing", "0", "−4", "16 + 8 = 24", "big penalty: rule broken"],
    ["Sunview only", "−1", "−5", "20 + 12.5 = 32.5", "even worse: makes the gap bigger"],
    ["Old Town only", "4", "0", "0", "exactly covered: no penalty"],
    ["Industrial + Old Town", "8", "4", "−16 + 8 = −8", "slight bonus for extra margin"],
  ], [2200, 1000, 1500, 1800, 3000]),
  P("We tested a grid of λ values and picked the smallest pair for which the lowest point of the QUBO landscape is exactly the true best valid schedule, confirmed by checking all 512."),
  ...tip("“A standard encoding needs 19 qubits; with unbalanced penalties we need 9, a search space 1,024 times smaller.”"),
);

// ---------------- 7. QAOA ----------------
add(
  H1("7. QAOA: the quantum algorithm, step by step"),
  ...simple(
    "QAOA is like tuning an old radio with a few knobs. The quantum chip is the radio; the knobs are angles. A normal computer turns the knobs, listens to how good the signal (the average schedule cost) is, and keeps adjusting until the radio plays the best schedules most loudly. Then we listen many times and write down what we hear.",
  ),
  H2("7.1 The recipe"),
  nl([B("Start fair. "), new TextRun("Apply H to all 9 qubits, so every one of the 512 schedules is equally likely.")]),
  nl([B("Cost layer, angle γ. "), new TextRun("Apply RZ and RZZ gates built from our cost formula. Schedules pick up a phase that depends on their cost; nothing is measured yet.")]),
  nl([B("Mixer layer, angle β. "), new TextRun("Apply RX to every qubit. This makes the phases interfere, moving probability towards low-cost schedules.")]),
  nl([B("Repeat p times. "), new TextRun(`We use p = ${q.reps} layers, so 8 angles in total (4 γ's and 4 β's).`)]),
  nl([B("Measure "), new TextRun("and compute a score from the results.")]),
  nl([B("A classical optimiser (COBYLA) "), new TextRun("adjusts the 8 angles and goes back to step 1, until the score stops improving.")]),
  nl([B("Final sampling. "), new TextRun("Run the tuned circuit 4,096 times and decode the most promising bitstrings into schedules.")]),
  ...figure("docs/qaoa_circuit_p1.png", 640, 110, "Our circuit with p = 1: H on all 9 qubits, then RZ (single costs) and RZZ (pair costs, the vertical links), then RX (mixer). Our real run repeats the middle part 4 times."),
  ...tech(
    [new TextRun("|ψ(γ,β)⟩ = Π_{k=1..p} e^{−iβₖH_M} e^{−iγₖH_C} |+⟩^⊗9, with mixer H_M = Σ Xᵢ. We minimise F(γ,β) = CVaR_α of the measured energies. As p → ∞, QAOA can approximate adiabatic quantum computing and reach the ground state; at small p it is a heuristic (Farhi, Goldstone and Gutmann, 2014).")],
    `Our transpiled circuit (p = 4) has depth ${q.depth}, using gates H, RZ, RZZ and RX. Each layer has 9 RZ, 18 RZZ and 9 RX gates.`,
  ),
  H2("7.2 Two improvements we added"),
  H3("CVaR: focus on the best results, not the average"),
  ...simple("Imagine judging a fisherman by his best 10% of catches rather than his average: you care that he can catch the big fish. We only need one great schedule, so we score the circuit by its best 10% of outcomes."),
  ...tech("CVaR_α (Conditional Value at Risk) = the average energy of the lowest α-fraction of outcomes; we use α = 0.1 (Barkoutsos et al., Quantum 2020). It gives the optimiser a sharper signal towards the ground state than the plain expectation value."),
  H3("Linear-ramp start: begin from a smart guess"),
  ...simple("Instead of starting the radio knobs at random positions, we start them in a pattern known to work well: slowly shifting from \"mixing\" to \"cost\", like gently cooling metal so it settles into its best shape."),
  ...tech("Initial angles: βₖ decreases and γₖ increases linearly across layers (a discretised quantum anneal / Trotterised adiabatic path). We try 4 ramp lengths and keep the best. In our early experiments with random starting angles, P(optimum) was only 0.3–3%; with the ramp it reached ~10%."),
  H2("7.3 Decoding: from bitstrings back to a schedule"),
  P([new TextRun("Each measurement is a 9-character bitstring. We read it in variable order: positions 1–3 are Sunview (11am, 3pm, 7pm), 4–6 Industrial, 7–9 Old Town. Our answer "), B(q.bitstring), new TextRun(" means:")]),
  ...table(["", "11am", "3pm", "7pm"], [["Sunview", "0", "0", "1 (cut)"], ["Industrial", "1 (cut)", "0", "1 (cut)"], ["Old Town", "0", "1 (cut)", "0"]], [2500, 2300, 2300, 2400]),
  P([B("Watch out: "), new TextRun("Qiskit prints bitstrings with qubit 0 on the right, so its raw output is reversed. Our code flips it (qubit 0 = variable 0). We then check every sampled schedule against the original rules and original score, not the penalised one, and keep the best valid one.")]),
);

// ---------------- 8. Results ----------------
add(
  H1("8. Results and how to read each chart"),
  H2("8.1 The QAOA output histogram"),
  ...figure("results/qaoa_histogram.png", 600, 240, "Top 15 measured schedules out of 4,096 shots."),
  bl([B("Orange bar "), new TextRun(`= the exact best schedule. It is the tallest bar, measured ${(q.p_optimum * 100).toFixed(1)}% of the time.`)]),
  bl([B("Blue bars "), new TextRun("= valid schedules that are not the best.")]),
  bl([B("Grey bars "), new TextRun(`= schedules that break a rule; we throw these away. About ${Math.round((1 - q.p_feasible) * 100)}% of all shots are invalid.`)]),
  bl([B("Dotted line "), new TextRun("= random guessing (1/512 ≈ 0.2%). The orange bar is about 52× higher.")]),
  H2("8.2 Does a deeper circuit help?"),
  ...figure("results/depth_sweep.png", 600, 213, "Success probability vs number of QAOA layers p."),
  ...table(["Layers p", ...R.depth_sweep.map(s => String(s.reps))], [
    ["P(best schedule)", ...R.depth_sweep.map(s => (s.p_opt * 100).toFixed(1) + "%")],
    ["P(valid schedule)", ...R.depth_sweep.map(s => (s.feasible_mass * 100).toFixed(0) + "%")],
  ], [2300, 1200, 1200, 1200, 1200, 1200, 1200]),
  P("More layers help a lot up to p = 3–4, then level off at about 10%. So p = 4 gives the best balance between quality and circuit size."),
  H2("8.3 The training curve"),
  ...figure("results/convergence.png", 460, 245, "COBYLA improving the circuit angles; lower is better."),
  P("This shows the classical optimiser steadily lowering the CVaR energy as it tunes the angles. That is the hybrid quantum-classical loop working."),
  H2("8.4 The live demo"),
  ...figure("docs/demo_screenshot.png", 620, 337, "roshni-quantum.vercel.app at 3pm with “Compare: solar-blind rotation” switched on."),
  P("The left panel shows a plan that ignores solar: it cuts Sunview at 3pm and gets −1 of the 4 MW needed (red). The right panel shows Roshni covering the shortage. Click Play day to animate all three blocks, and the 3pm button for this key moment."),
);

// ---------------- 9. Architecture ----------------
add(
  (NLI = 2, H1("9. System architecture")),
  ...figure("docs/architecture.png", 640, 277, "The Roshni pipeline."),
  nl([B("Inputs: "), new TextRun("feeder demand, solar, customers, backup share, bill recovery; the shortage per block; policy (protect the hospital, weights).")]),
  nl([B("Model (classical): "), new TextRun("compute net load, build the QuadraticProgram, convert to the 9-qubit unbalanced-penalty QUBO.")]),
  nl([B("Quantum core (hybrid loop): "), new TextRun("Ising Hamiltonian → QAOA circuit → simulate → CVaR score → COBYLA updates the angles → repeat; then sample 4,096 shots.")]),
  nl([B("Decode and validate: "), new TextRun("bitstrings → schedules; keep the best valid one; compare with brute force and the two status-quo plans.")]),
  nl([B("Outputs: "), new TextRun("the schedule, metrics, charts and the animated demo page.")]),
);

// ---------------- 10. Code walkthrough ----------------
add(
  H1("10. Code walkthrough"),
  ...table(["File", "What it does", "Key functions"], [
    ["src/data.py", "The test town: feeders, solar, backup, shortage, weights", "net_load(), pain_weight()"],
    ["src/model.py", "Builds the objective and constraints; makes both QUBO versions", "objective_terms(), constraint_rows(), evaluate(), build_quadratic_program(), unbalanced_qubo()"],
    ["src/qaoa_solver.py", "The quantum part: circuit, CVaR scoring, angle tuning, sampling", "tune_penalty(), QAOARunner.energy(), .optimise(), .sample(), solve()"],
    ["src/baselines.py", "Brute force over all 512 schedules + the two status-quo plans + metrics", "exact_bruteforce(), status_quo_loss(), solar_blind_rotate(), describe()"],
    ["run_demo.py", "Runs everything, prints the table, saves results and charts", "main()"],
    ["make_demo_page.py", "Puts the results into the animated demo page", "-"],
    ["setup_windows.bat / run_windows.bat", "One-click install and run on Windows", "-"],
  ], [2300, 3800, 3400]),
  H2("10.1 The heart of the quantum code"),
  ...code([
    "op, offset = qp.to_ising()                  # QUBO -> Hamiltonian (27 Pauli terms)",
    "ansatz = QAOAAnsatz(op / scale, reps=4)      # the QAOA circuit with 8 angles",
    "circ = transpile(ansatz, basis_gates=['h','rx','rz','rzz'])",
    "",
    "def energy(params):                          # what COBYLA minimises",
    "    probs = Statevector(circ.assign_parameters(params)).probabilities()",
    "    return cvar(probs, diag, alpha=0.1)      # average of best 10% outcomes",
    "",
    "res = minimize(energy, x0=linear_ramp, method='COBYLA')",
    "counts = StatevectorSampler().run([circ_with_measure], shots=4096)",
  ]),
  H2("10.2 How to run it"),
  bl([B("Windows: "), new TextRun("double-click setup_windows.bat once (installs everything), then run_windows.bat any time.")]),
  bl([B("Any OS: "), M("pip install -r requirements.txt"), new TextRun(", then "), M("python run_demo.py"), new TextRun(" (about 40 s) or "), M("python run_demo.py --quick"), new TextRun(" (about 10 s).")]),
  bl([B("Change the town: "), new TextRun("edit numbers in src/data.py and re-run; everything (brute force, QAOA, charts, demo) updates automatically.")]),
  bl("Results are reproducible: all random seeds are fixed."),
);

// ---------------- 11. Limitations ----------------
add(
  H1("11. Limitations, and how to talk about them"),
  P("The brief says honesty about limitations counts in our favour. Own these confidently."),
  ...table(["Limitation", "Plain explanation", "What we'd do next"], [
    ["No quantum speedup", "512 schedules is tiny; a laptop checks them all instantly. Our project shows the method works, not that it's faster.", "Larger instances, decomposition by hour, comparison with classical MILP solvers"],
    ["Penalty weights tuned classically", "We picked λ by checking all 512 schedules, which isn't possible for big cities.", "Adaptive or heuristic penalty tuning"],
    ["~10% success ceiling", "QAOA's best answer comes out 1 time in 10; over half the shots break a rule and are discarded.", "Constraint-preserving mixers, warm-start QAOA"],
    ["Simulator only", "No noise. Real chips would blur the result at our circuit depth of 37.", "Run on IBM hardware with error mitigation"],
    ["Illustrative data", "The town is made up (realistic shape, not utility data).", "Partner with a DISCO for real feeder and solar data"],
    ["Simplified physics", "No voltage limits, partial cuts or forecast uncertainty.", "Add network constraints and uncertainty"],
    ["Ethical weighting", "Discounting pain for battery owners can look like penalising people who invested in solar.", "Make it an explicit policy setting for regulators"],
  ], [2000, 4300, 3200]),
  ...tip("“At 9 qubits a laptop is faster, and we say so. The value is the model: solar-aware and auditable for fairness, ready to scale as quantum hardware grows.”"),
);

// ---------------- 12. Q&A ----------------
add(
  H1("12. Judge questions: practice answers"),
  ...[
    ["Why use quantum at all if a laptop solves it?", "The hackathon asks us to show quantum doing real work on a meaningful problem, not to beat classical computing. Our circuit genuinely produces the schedule distribution, and we verify it against the exact answer. The model is the contribution; quantum is a research path for when these problems get huge."],
    ["Why QAOA and not VQE or Grover?", "Our problem is a QUBO, whose cost is diagonal. QAOA's cost layer is built directly from that cost, making it the standard gate-model choice for combinatorial optimisation. VQE is general-purpose and better suited to chemistry; Grover search needs an oracle and much deeper circuits."],
    ["Where exactly is the quantum part doing work?", "The 9-qubit QAOA circuit creates the probability distribution over all 512 schedules. The best schedule is its single most likely output. Classical code only tunes the angles and checks validity."],
    ["What does one qubit represent?", "One yes/no decision: is this feeder cut in this time block? Qubit 0 is Sunview at 11am, through to qubit 8, Old Town at 7pm."],
    ["Why 9 qubits and not 19?", "Unbalanced penalisation encodes the ≥ constraints without slack qubits. Fewer qubits means a 1,024× smaller search space and a shallower circuit."],
    ["How did you check the answer is right?", "Brute force: we evaluated all 512 schedules classically. QAOA's answer matched the exact optimum with a 0.00% gap."],
    ["What is CVaR and why use it?", "It scores the circuit by its best 10% of outcomes instead of the average. We only need one excellent schedule, so this targets what matters."],
    ["Why square the outage count?", "Squaring makes concentrated outages expensive: one area cut three times costs 9, while three areas cut once each cost 3. That's how fairness enters the maths, and it is also what makes the problem quadratic."],
    ["How do off-grid and battery homes fit in?", "Through the backup share. Those homes keep power during a cut, so cutting their feeder causes less pain. Pain weight = customers × (1 − backup share)."],
    ["Why does cutting a solar area at noon not help?", "Anti-islanding: grid-tied inverters switch off when the feeder is cut, so you lose their solar along with their demand. What the grid saves is net load, which can be zero or negative at midday."],
    ["Would this run on real IBM hardware?", "Yes, the circuit only uses standard gates. But at depth 37 noise would reduce quality, so we'd add error mitigation; that's our next step."],
    ["How would this scale to a real city?", "Directly, it wouldn't on today's hardware (thousands of qubits). We'd decompose by hour or region, warm-start from classical solutions, and benchmark against MILP solvers."],
    ["Is your data real?", "No, it's an illustrative town with realistic shapes: midday solar peaks, evening demand peaks, and different payment rates. The model takes real feeder data as-is."],
    ["Who would use this?", "DISCO load-dispatch centres to build schedules, regulators to audit fairness, and residents who could see why their area was chosen."],
  ].map(([qq, a]) => [
    new Paragraph({ spacing: { before: 160, after: 40 }, keepNext: true, children: [new TextRun({ text: "Q: " + qq, bold: true, color: "1D4F8F" })] }),
    P([B("A: "), new TextRun(a)]),
  ]).flat(),
);

// ---------------- 13. Glossary ----------------
add(
  H1("13. Glossary"),
  ...table(["Term", "Meaning"], [
    ["Anti-islanding", "Safety feature that switches off solar inverters when the grid goes down"],
    ["Ansatz", "The template (shape) of a quantum circuit with adjustable angles"],
    ["AT&C losses", "Electricity lost to wires, theft and unpaid bills"],
    ["Backup share", "Fraction of homes that keep power during a cut (battery or off-grid solar)"],
    ["Brute force", "Checking every possible answer; the exact baseline"],
    ["COBYLA", "A classical optimiser that tunes the angles without needing gradients"],
    ["CVaR", "Conditional Value at Risk: average of the best α-fraction of outcomes"],
    ["DISCO", "Distribution company (e.g. IESCO, LESCO)"],
    ["Feasible", "A schedule that satisfies every rule"],
    ["Feeder", "One power line supplying one area; the unit that gets switched off"],
    ["Hamiltonian", "The energy formula of a quantum system; ours encodes schedule cost"],
    ["Ising model", "Spin (+1/−1) form of a QUBO; maps directly onto qubits"],
    ["Mixer", "The RX layer that moves probability between schedules"],
    ["Net load", "Demand minus local solar: what the grid actually supplies"],
    ["Objective", "The score we minimise"],
    ["p (layers / reps)", "Number of cost+mixer layer pairs in QAOA (we use 4)"],
    ["Penalty", "Extra cost added for breaking a rule"],
    ["QAOA", "Quantum Approximate Optimisation Algorithm"],
    ["Qiskit", "IBM's open-source quantum computing toolkit (Python)"],
    ["QUBO", "Quadratic Unconstrained Binary Optimisation"],
    ["Qubit", "Quantum bit: can be in a blend (superposition) of 0 and 1"],
    ["Shot", "One run and measurement of the circuit"],
    ["Slack variable", "Extra variable that turns ≥ into =; costs extra qubits"],
    ["Statevector simulator", "Exact simulation of a quantum circuit on a normal computer"],
    ["Unbalanced penalisation", "Lopsided penalty for ≥ rules that needs no slack qubits"],
  ], [2600, 6900]),
);

// ---------------- 14. Cheat sheet ----------------
add(
  H1("14. One-page cheat sheet"),
  ...table(["Number", "What it is"], [
    ["9", "qubits = 3 feeders × 3 time blocks"],
    ["19", "qubits a textbook slack encoding would need"],
    ["512", "possible schedules (2⁹); 80 of them are valid"],
    ["33.05", "best score (revenue 18.05 + fairness 15.00 + back-to-back 0)"],
    ["84.0", "today's rule's score"],
    [q.bitstring, "Roshni's schedule: Sunview 7pm; Industrial 11am & 7pm; Old Town 3pm"],
    [`${(q.p_optimum * 100).toFixed(1)}%`, "probability QAOA outputs the best schedule; its most likely outcome"],
    ["~52×", "better than random guessing (0.2%)"],
    ["p = 4", "QAOA layers; 8 angles; circuit depth 37"],
    ["λ = (4, 0.5)", "unbalanced penalty weights"],
    ["α = 0.1", "CVaR: score by the best 10% of shots"],
    ["4,096", "shots in the final sampling"],
    ["−1 MW", "Sunview's net load at 3pm (solar > demand)"],
    ["5 MW", "gap left by the solar-blind plan at 3pm"],
    ["−47%", "people-hours in the dark vs today (43,200 → 22,800)"],
  ], [2000, 7500]),
  ...tip(
    "Problem → “Load-shedding is unfair and ignores rooftop solar.”",
    "Insight → “Cutting a solar area at noon saves nothing, because the panels switch off too.”",
    "Method → “9 yes/no decisions, a fairness-squared cost, net-load rules, solved with QAOA in Qiskit.”",
    "Proof → “Matches the exact best of all 512 schedules; 47% fewer people-hours in the dark.”",
    "Honesty → “No speedup at this size; the model is the contribution.”",
  ),
  H2("References"),
  P("[1] E. Farhi, J. Goldstone, S. Gutmann. A Quantum Approximate Optimization Algorithm. arXiv:1411.4028 (2014)."),
  P("[2] J. A. Montañez-Barrera, D. Willsch, A. Maldonado-Romo, K. Michielsen. Unbalanced penalization: a new approach to encode inequality constraints of combinatorial problems for quantum optimization algorithms. arXiv:2211.13914 (2022)."),
  P("[3] P. Kl. Barkoutsos, G. Nannicini, A. Robert, I. Tavernelli, S. Woerner. Improving Variational Quantum Optimization using CVaR. Quantum 4, 256 (2020)."),
  P("[4] Qiskit and qiskit-optimization, IBM Quantum."),
);

const hs = (size, color, before, after, lvl) => ({ run: { font: FONT, size, bold: true, color }, paragraph: { spacing: { before, after }, keepNext: true, outlineLevel: lvl } });
const doc = new Document({
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", ...hs(44, "0B0B0B", 0, 120, undefined) },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, ...hs(32, "1D4F8F", 360, 140, 0) },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, ...hs(25, "0B0B0B", 240, 100, 1) },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, ...hs(22, "52514E", 180, 80, 2) },
    ],
  },
  numbering: { config: [
    { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 320 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1150, bottom: 1150, left: 1150, right: 1150 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Roshni Project Guide · page ", size: 16, color: "8A8A85" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "8A8A85" })] })] }) },
    children: C,
  }],
});
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.join(ROOT, "docs", "Roshni_Project_Guide.docx"), buf);
  console.log("Wrote docs/Roshni_Project_Guide.docx");
});
