#!/usr/bin/env bash
# Generates ONE image with Codex CLI's built-in image tool and saves the untouched original.
# Usage: tools/vfx/codex-image.sh <asset-dir> <prompt-file relative to asset-dir> <out.png relative to asset-dir>
# Env: CODEX_IMAGE_MODEL (default gpt-5.6-sol; the config default gpt-6-sol is rejected for ChatGPT logins),
#      CODEX_IMAGE_RETRIES (default 2), CODEX_IMAGE_COOLDOWN seconds after a 429 (default 180).
# Run calls one after another: parallel runs hit 429. stdin is closed or `codex exec` waits for it forever.
# Exit: 0 saved, 2 Codex reported no image tool, 3 still rate-limited, 4 other failure. Log: $TMPDIR/codex-image-*.log
set -u
dir=$1; prompt=$2; out=$3
model=${CODEX_IMAGE_MODEL:-gpt-5.6-sol}
retries=${CODEX_IMAGE_RETRIES:-2}
cooldown=${CODEX_IMAGE_COOLDOWN:-180}
images="$HOME/.codex/generated_images"
log="${TMPDIR:-/tmp}/codex-image-$(basename "$out" .png).log"
cd "$dir" || exit 4
[ -f "$prompt" ] || { echo "missing prompt $prompt"; exit 4; }
mkdir -p "$(dirname "$out")"
for attempt in $(seq 1 "$retries"); do
  marker=$(mktemp)
  timeout 900 codex exec --skip-git-repo-check -m "$model" -C "$(pwd -W 2>/dev/null || pwd)" -s workspace-write \
    "$(cat "$prompt")" < /dev/null > "$log" 2>&1
  status=$?
  # Codex often flattens the alpha onto magenta when it "saves"; the original in generated_images keeps it.
  original=$(find "$images" -name '*.png' -newer "$marker" -type f 2>/dev/null | xargs -r ls -t | head -1)
  rm -f "$marker"
  if [ -n "$original" ]; then
    if magick identify -format '%[opaque]' "$original" 2>/dev/null | grep -q False || [ ! -f "$out" ]; then
      cp "$original" "$out"
    fi
  fi
  if [ -f "$out" ]; then
    echo "saved $out ($(magick identify -format '%wx%h %[channels] opaque=%[opaque]' "$out"))"
    exit 0
  fi
  if grep -aq 'IMAGE_GEN_UNAVAILABLE' "$log" && ! grep -aq '429' "$log"; then
    echo "codex has no image tool: $(grep -a 'IMAGE_GEN_UNAVAILABLE' "$log" | tail -1)"; exit 2
  fi
  if grep -aq '429' "$log"; then
    echo "attempt $attempt: 429 Too Many Requests"
    [ "$attempt" -lt "$retries" ] && sleep "$cooldown"
    continue
  fi
  echo "codex exit $status, no image; see $log"; exit 4
done
echo "still rate-limited after $retries attempts; see $log"; exit 3
