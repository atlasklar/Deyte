import "server-only";
import corpus from "@/knowledge/corpus.json";

/*
 * Finds the source posts most relevant to what he's asking (BM25 keyword
 * ranking). The distilled playbook is always in the prompt; these add the
 * coach's original wording and examples for the situation at hand.
 */

type Doc = { id: string; t: string };

const STOP = new Set(
  "a an the and or but if then so to of in on at by for with from as is are was were be been being it its this that these those i me my you your he him his she her they them their we us our do does did doing have has had having not no yes just very really can could would should will shall may might must about into over after before again more most some such only own same than too also up down out off what which who whom when where why how all any both each few other here there im youre shes hes dont doesnt didnt cant wont isnt arent wasnt get got go going like know want think one".split(
    " ",
  ),
);

/** Light stemming so "texting", "texts" and "texted" meet. */
function stem(w: string) {
  return w.replace(/(ingly|edly|ing|ed|es|s|ly)$/, "").slice(0, 12);
}

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(stem);
}

const docs = corpus as Doc[];
const tf: Map<string, number>[] = [];
const df = new Map<string, number>();
const lens: number[] = [];
for (const d of docs) {
  const m = new Map<string, number>();
  const toks = tokens(d.t);
  for (const w of toks) m.set(w, (m.get(w) ?? 0) + 1);
  for (const w of m.keys()) df.set(w, (df.get(w) ?? 0) + 1);
  tf.push(m);
  lens.push(toks.length);
}
const avgLen = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);

export function retrieve(query: string, k = 8): Doc[] {
  const q = [...new Set(tokens(query))];
  if (!q.length) return [];
  const N = docs.length;
  const k1 = 1.4;
  const b = 0.75;
  const scored: { i: number; s: number }[] = [];
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (const w of q) {
      const f = tf[i].get(w);
      if (!f) continue;
      const n = df.get(w) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * lens[i]) / avgLen)));
    }
    if (s > 0) scored.push({ i, s });
  }
  scored.sort((x, y) => y.s - x.s);
  return scored.slice(0, k).map(({ i }) => docs[i]);
}
