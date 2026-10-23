# Tier-six art processing

Status: DONE_WITH_CONCERNS

- Processed all 40 active candidate jobs for h01C/h01D/h01E/h01I/h01K/h014/h03Z, including review candidates as authorized. Original raw files, manifest statuses and source metadata unchanged.
- Outputs: 40 `apps/client/public/assets/vfx-tier6-*.webp`, `apps/client/src/visual-tier6-art-manifest.json`; total 11,428,352 bytes. Every entry has existing RGBA WebP and matching atlas/per-frame dimensions.
- Reproduce: `python assets/vfx-source/tier6-remaining/process-art.py` (Pillow + numpy). Provenance, original QA, SHA256, processing settings and warnings: `assets/vfx-source/tier6-remaining/provenance.json`. Log: `processing.log`; integrity: `asset-integrity.json`.
- Viewed all raw and processed contacts in five boards each, plus `previews/summary-dark-light.jpg`. Individual contacts show all frames on both battlefield tones. Corrected uneven source row gutters (stone rain, Bagua awakening, cauldron, others) using shared buffered canvas, preserving nominal source coordinates/one scale; no per-frame bbox fit. Alpha floor 6%, premultiplied Lanczos, 4% outer cell padding, WebP quality 90.
- Manifest: keys are asset names; columns/rows 4×4 for S16/P16, 4×2 for S8/L8; T/D/O single frames preserve proportion. `width/height` are actual frame dimensions, not atlas size. Runtime must honor aspect and `anchorY`. Sheet anchors follow requested source .72 transformed through buffering/padding; tree anchor follows lowest root. Anchors remain uncalibrated in game.

Concerns: source-edge clipping/overlapping art cannot be restored by repacking. Ten-crow count unclear; solar cores bright; primordial banner reads as ribbons; **bloodsea-ground center is filled crimson, not transparent** despite earlier source QA. Keep it below actors. Loop seams, world scale/depth, crowd readability, reduced motion and FPS need game review. All source statuses remain candidate statuses, not visual acceptance.

No npm test/typecheck/build, server, browser or game run. User must rebuild/restart and inspect the new runtime.

## Ground radius metadata calibration

Added `groundRadiusFactor` to all 40 manifest entries, measured from encoded runtime WebP alpha ≥16 across every processed frame. Center is the per-frame canvas center; maximum distance uses each occupied texel's farthest corner and rounds the normalized factor upward to six decimals. One common factor per sheet prevents frame-to-frame scale changes. `provenance.json` records every frame radius and the formula.

Ground sizing: plane width = requested diameter / factor; plane height = width × frameHeight / frameWidth. Ribbons skip this calibration at runtime. Reproduce without touching image bytes: `python assets/vfx-source/tier6-remaining/process-art.py --metadata-only`. All 40 existing image byte sizes preserved; no images regenerated and no test/build/game run.
