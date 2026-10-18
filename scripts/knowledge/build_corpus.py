"""
Builds the coach's searchable knowledge (src/knowledge/corpus.json) from the
raw sources in knowledge-src/:

  knowledge-src/x_posts.jsonl        {"id", "text"}            X posts
  knowledge-src/reels.jsonl          {"id", "caption", "url"}  reel captions
  knowledge-src/reel_transcripts.jsonl {"id", "text", "dur"}   what he says in each reel

Promotion ("watch my free training", "link in bio", ...) is stripped, near
duplicates are dropped, and items whose whole point is contempt for women or
a manipulation tactic are left out of what the coach searches (they stay in
knowledge-src). Usage: python3 scripts/knowledge/build_corpus.py
"""
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
SRC = os.path.join(ROOT, "knowledge-src")
OUT = os.path.join(ROOT, "src", "knowledge", "corpus.json")

PROMO = re.compile(
    r"[^.!?]*\b(free training|training in (bio|box)|in (my|the) bio|link in bio|click (the )?(link|like|on the bio)|full dating system|"
    r"master the game|mentorship|one-on-one|my (program|course|masterclass)|comment [\"“']?[A-Z]{2,}|dm me|book a call|guide here|"
    r"access my free|watch my free|apply (now|below))[^.!?]*[.!?]?",
    re.I,
)
# Items built around demeaning women or a manipulation tactic aren't searchable.
EXCLUDE = re.compile(
    r"weasel|slam (them|these|her)|insult(ing)? (them|her)|feel inferior|treat (women|her|them) (a little bit )?poorly|"
    r"dictator|stalin|put them (down|in their place)|put her in (her|line)|punish|creature|slaves? to their emotions|tattoo|"
    r"female delusion|punjabi|little brain|little bitty|capacity to think|born to be dominated|desire is to be dominated|"
    r"backups?\b|run, bro|she is cheating|it's a fucking dude",
    re.I,
)


def clean(t):
    t = re.sub(r"https?://\S+", "", t or "")
    t = re.sub(r"#\w+", "", t)
    t = PROMO.sub("", t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def load(name):
    path = os.path.join(SRC, name)
    if not os.path.exists(path):
        return []
    return [json.loads(l) for l in open(path, encoding="utf-8") if l.strip()]


def main():
    seen, out, dropped = set(), [], 0

    def add(kind, rid, text, min_len):
        nonlocal dropped
        t = clean(text)
        if len(re.sub(r"\W", "", t)) < min_len:
            return
        if EXCLUDE.search(t):
            dropped += 1
            return
        key = re.sub(r"\W+", "", t.lower())[:140]
        if key in seen:
            return
        seen.add(key)
        out.append({"id": rid, "k": kind, "t": t})

    for r in load("reel_transcripts.jsonl"):
        add("v", "ig" + r["id"], r["text"], 60)
    for r in load("x_posts.jsonl"):
        add("x", "x" + r["id"], r["text"], 25)
    for r in load("reels.jsonl"):
        add("c", "igc" + r["id"], r.get("caption", ""), 70)

    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    counts = {k: sum(1 for d in out if d["k"] == k) for k in "vxc"}
    print(f"{len(out)} items -> {OUT}  (videos {counts['v']}, posts {counts['x']}, captions {counts['c']}; {dropped} left out)")


if __name__ == "__main__":
    sys.exit(main())
