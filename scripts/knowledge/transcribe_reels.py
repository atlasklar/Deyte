"""Transcribe every downloaded reel with Whisper (runs locally). Resume-safe: appends to transcripts.jsonl."""
import json, os, subprocess, sys, time
import numpy as np
from faster_whisper import WhisperModel
AUDIO, OUT, MODEL = sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "small.en"
WORKER, WORKERS = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (0, 1)
LIMIT = int(os.environ.get("LIMIT", "0"))
done = set()
if os.path.exists(OUT):
    for line in open(OUT):
        try: done.add(json.loads(line)["id"])
        except Exception: pass
def load(path):
    """Decode any audio/video to 16 kHz mono float32 with ffmpeg."""
    raw = subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0

model = WhisperModel(MODEL, device="cpu", compute_type="int8", cpu_threads=int(os.environ.get("THREADS", "4")))
files = sorted(f for f in os.listdir(AUDIO) if f.endswith((".m4a", ".mp4")))
files = [f for i, f in enumerate(files) if i % WORKERS == WORKER]
n = 0; t0 = time.time(); audio_s = 0.0
with open(OUT, "a") as out:
    for f in files:
        rid = f.rsplit(".", 1)[0]
        if rid in done: continue
        try:
            segs, info = model.transcribe(load(os.path.join(AUDIO, f)), language="en", beam_size=1, vad_filter=True, condition_on_previous_text=False)
            text = " ".join(s.text.strip() for s in segs).strip()
            audio_s += info.duration
            out.write(json.dumps({"id": rid, "text": text, "dur": round(info.duration, 1)}) + "\n"); out.flush()
        except Exception as e:
            print(rid, "error", e, flush=True)
        n += 1
        if n % 20 == 0:
            el = time.time() - t0
            print(f"[{WORKER}] {n} files, {audio_s/60:.0f} min audio in {el/60:.1f} min ({audio_s/max(el,1):.1f}x realtime)", flush=True)
        if LIMIT and n >= LIMIT: break
el = time.time() - t0
print(f"[{WORKER}] DONE {n} files, {audio_s/60:.0f} min audio in {el/60:.1f} min ({audio_s/max(el,1):.1f}x)", flush=True)
