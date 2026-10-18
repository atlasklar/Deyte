#!/usr/bin/env bash
# Bakes the Higgsfield homepage videos into frame sequences for buttery scroll
# scrubbing on phones. Needs curl + ffmpeg. Run from the project folder:
#   bash scripts/fetch-media.sh
set -euo pipefail
CDN="https://d8j0ntlcm91z4.cloudfront.net/user_32mz0W7AAgZBsJu1VXh0Yle7wRM"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

bake() {
  local name="$1" file="$2" width="${3:-900}"
  local out="public/seq/$name"
  echo "→ $name"
  curl -fsSL "$CDN/$file" -o "$TMP/$name.mp4"
  rm -rf "$out" && mkdir -p "$out"
  # 24 fps keeps motion smooth while staying light (~120 frames for 5 s).
  ffmpeg -v error -i "$TMP/$name.mp4" -vf "fps=24,scale=${width}:-1:flags=lanczos" -c:v libwebp -quality 72 "$out/%04d.webp"
  local count
  count=$(ls "$out" | wc -l | tr -d ' ')
  printf '{ "count": %s, "ext": "webp" }\n' "$count" > "$out/manifest.json"
  echo "  $count frames, $(du -sh "$out" | cut -f1)"
}

bake rose  hf_20261018_162343_60b674ae-d396-434a-9686-a838a0c99283.mp4
bake toast hf_20261018_162356_ad371d32-16ca-4035-9441-c37405d6427a.mp4
echo "Done. The homepage uses public/seq/* automatically."
