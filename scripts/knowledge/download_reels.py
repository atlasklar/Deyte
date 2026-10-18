"""Download every reel's audio (or video, when no audio track URL) before the signed links expire."""
import csv, json, os, sys, urllib.request, concurrent.futures as cf
csv.field_size_limit(10**9)
SRC = sys.argv[1]; OUT = sys.argv[2]
rows = list(csv.DictReader(open(SRC, encoding="utf-8-sig", errors="replace")))
jobs = []
meta = {}
for r in rows:
    url = r["audioUrl"] or r["videoUrl"]
    ext = ".m4a" if r["audioUrl"] else ".mp4"
    jobs.append((r["id"], url, os.path.join(OUT, r["id"] + ext)))
    meta[r["id"]] = {"url": r["url"], "caption": r["caption"], "views": r.get("videoPlayCount"), "duration": r.get("videoDuration"), "timestamp": r.get("timestamp")}
json.dump(meta, open(os.path.join(OUT, "..", "meta.json"), "w"))

def get(job):
    rid, url, path = job
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return rid, "skip"
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=60) as r, open(path + ".part", "wb") as f:
                while chunk := r.read(1 << 16):
                    f.write(chunk)
            os.replace(path + ".part", path)
            return rid, "ok"
        except Exception as e:
            err = str(e)
    return rid, "fail: " + err

done = fail = 0
with cf.ThreadPoolExecutor(12) as ex:
    for rid, status in ex.map(get, jobs):
        done += 1
        if status.startswith("fail"):
            fail += 1
            print(rid, status, flush=True)
        if done % 100 == 0:
            print(f"{done}/{len(jobs)} downloaded, {fail} failed", flush=True)
print(f"DONE {done}/{len(jobs)}, {fail} failed", flush=True)
