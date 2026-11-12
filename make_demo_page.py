"""Builds demo/index.html (animated city view for the pitch) from results/results.json.
Run after run_demo.py:   python make_demo_page.py   then open demo/index.html."""
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
res = json.load(open(os.path.join(ROOT, "results", "results.json")))
tpl = open(os.path.join(ROOT, "demo", "template.html"), encoding="utf-8").read()
out = tpl.replace("/*__DATA__*/null", json.dumps(res))
with open(os.path.join(ROOT, "demo", "index.html"), "w", encoding="utf-8") as fh:
    fh.write(out)
print("Wrote demo/index.html")
