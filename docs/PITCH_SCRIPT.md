# Roshni: 3-minute pitch and demo script

About 420 spoken words, which fits 3:00 at a calm pace. Three speakers (A, B, C). Rehearse once with a timer.

| Time | Speaker | On screen | Say |
|---|---|---|---|
| 0:00–0:25 | A | Dark title card: "Two students. Same exam tomorrow. Only one will have electricity tonight." | "Every evening in Pakistan, someone in a control room decides which neighbourhoods go dark. Today that decision follows one rule: cut the areas that pay the least. So the same people lose power again and again. We asked: can we make that decision fair, and actually correct?" |
| 0:25–0:55 | A | Demo page, block **3pm–5pm**, **Compare: solar-blind rotation** toggled on | "Here's the twist nobody plans for: rooftop solar. When a feeder is cut, its solar panels switch off too, for safety. So cutting this solar-rich sector at 3pm saves nothing. Look: minus one out of four megawatts needed. A plan that ignores solar *thinks* it fixed the shortage. It didn't." |
| 0:55–1:40 | B | Architecture diagram, then the formulation from the README | "We built Roshni, meaning 'light'. Each choice, cut this feeder in this block or not, is one qubit: 9 qubits for 3 feeders across 3 blocks. We score every schedule on revenue lost, on fairness (squared, so piling outages on one area is expensive), and on back-to-back cuts. Homes with off-grid solar or batteries count as less pain. The hospital is never cut. The hard rule is that each cut must cover the shortfall using *net* load, demand minus solar. We encoded those rules with unbalanced penalties, so we need 9 qubits instead of 19, and solved it with QAOA in Qiskit." |
| 1:40–2:20 | C | Terminal running `python run_demo.py --quick`, then `qaoa_histogram.png` | "The quantum circuit searches all 512 schedules at once, and a classical optimiser tunes it. The orange bar is the true optimum, which we checked by brute force over all 512. It is QAOA's most likely answer, about 52 times better than guessing." |
| 2:20–2:40 | C | Demo page, **Play day** with the worst-paying-first rule on the left | "Compared with today's rule, every shortfall is still covered, with 47% fewer people-hours in the dark, and no area is cut three times in one day." |
| 2:40–3:00 | B | Limitations slide (3 bullets) then the closing card | "Honestly: at 9 qubits a laptop is faster, and we tuned the penalties classically. The value is the model: solar-aware, fairness you can audit, and a path to scale as quantum hardware grows. Solar didn't just reduce demand. It changed *when* each neighbourhood is worth cutting. Roshni is the first scheduler that knows it." |

## Recording tips
- Screen-record `demo/index.html` full screen in a browser. Click **3pm–5pm**, then **Compare: solar-blind rotation**, for the key moment.
- Keep the terminal font large; `--quick` finishes in about 10 seconds.
- Export at 1080p and keep it under 3:00. Upload to Google Drive and set sharing to **Anyone with the link**. Check that the link opens in a private window.

## Likely judge questions
- **Why QAOA rather than VQE or Grover?** Our problem is diagonal (a QUBO); QAOA's cost layer is built directly from it, and it is the standard gate-model method for this class.
- **Where does the quantum computer do real work?** The 9-qubit circuit produces the schedule distribution; we only post-select the best feasible sample from it.
- **Why unbalanced penalties?** Each ≥ constraint would need slack qubits: 19 qubits instead of 9, a state space 1,024 times larger.
- **Why does the solar-blind plan score lower than the optimum?** It breaks the constraint by leaving 5 MW uncovered, so it isn't a valid schedule.
- **What about hardware?** A depth-37 circuit is noisy on today's devices; error mitigation is listed as next step.
