#!/usr/bin/env bash
# Shrinks runtime glb models without a runtime decoder:
# dedup -> resample keyframes -> KHR_mesh_quantization (scene volume keeps a shared skin shared) -> EXT_texture_webp (q90).
# Babylon's glTF loader supports both extensions natively. Meshopt/Draco are skipped on
# purpose: they need a decoder that Babylon fetches from its CDN by default.
# Sources: assets/models/<name>-runtime-original.glb  ->  apps/client/public/assets/models/<name>.glb
# Usage: bash tools/assets/optimize-glb.sh pangu round-one-pig
set -euo pipefail
G="npx --yes @gltf-transform/cli@4"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
for name in "$@"; do
  src="assets/models/${name}-runtime-original.glb"
  out="apps/client/public/assets/models/${name}.glb"
  [ -f "$src" ] || { echo "missing $src" >&2; exit 1; }
  $G dedup "$src" "$work/1.glb"
  $G resample "$work/1.glb" "$work/2.glb"
  $G quantize "$work/2.glb" "$work/3.glb" --quantization-volume scene
  $G webp "$work/3.glb" "$out" --quality 90
  echo "$name: $(stat -c %s "$src") -> $(stat -c %s "$out") bytes"
done
