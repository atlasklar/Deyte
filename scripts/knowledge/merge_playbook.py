"""
Merges distilled notes (Markdown files with the standard headings, one bullet
per principle, source ids in brackets) into src/knowledge/playbook.md.
Video notes come first so his spoken teaching leads. Usage:
  python3 scripts/knowledge/merge_playbook.py notes1.md notes2.md ...
"""
import os, re, sys
from collections import OrderedDict

ORDER = ["Core beliefs & mindset", "Attraction & frame", "Texting", "Dating apps & profiles", "Setting and running dates",
         "Escalation & leading", "Reading her signals (interest vs. disinterest)", "Tests, pushback & conflict",
         "Relationships & long-term", "Breakups, rejection & moving on", "Self-improvement & lifestyle",
         "Common mistakes men make", "Example lines & scripts", "Scenario → advice", "How he talks"]
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "src", "knowledge", "playbook.md")
BANNED = re.compile(r"weasel|creature|slam (them|her)|insult (them|her)|inferior|dictator|punish", re.I)

def norm(b):
    return re.sub(r"[^a-z0-9]+", "", b.lower())[:80]

sec = OrderedDict((h, []) for h in ORDER)
seen = set()
for path in sys.argv[1:]:
    cur = None
    for line in open(path, encoding="utf-8"):
        m = re.match(r"^##\s+(.*)", line)
        if m:
            cur = m.group(1).strip() if m.group(1).strip() in sec else None
            continue
        if cur and line.startswith("- "):
            b = re.sub(r"\s*\[(?:v|x|ig)[\w, \-]*\]\s*$", "", line.strip())
            b = re.sub(r"\s*\[(?:v|x|ig)\d[^\]]*\]", "", b)
            if len(b) < 12 or BANNED.search(b):
                continue
            k = norm(b)
            if k in seen:
                continue
            seen.add(k)
            sec[cur].append(b)

out = ["# Deyte coaching playbook", "",
       "Distilled from @thereallgame's video transcripts, X posts and reel captions. His voice and his teaching about the man's own behavior. Respectful, honest, confident: no manipulation, no contempt.", ""]
n = 0
for h, bs in sec.items():
    if bs:
        out += [f"## {h}", *bs, ""]
        n += len(bs)
open(OUT, "w", encoding="utf-8").write("\n".join(out))
print(f"{n} principles, {len(chr(10).join(out))} chars -> {OUT}")
for h, bs in sec.items():
    print(f"  {len(bs):4} {h}")
