# Long Vương art processing — 2026-10-22

- Sources: existing Codex image_gen art, six h00Q jobs in `../tier34-codex-art/job-manifest.json`. SHA-256, exact raw/prompt paths, source dimensions and processing metadata are recorded in `active-inventory.json`; source files remain unchanged.
- Process: discard alpha below 16; preserve connected silhouettes across nominal grid boundaries; retain original offsets on one shared expanded canvas per asset; premultiplied alpha Lanczos resize; quality-90 WebP atlas with alpha-quality 95 via existing pack script. No per-frame fitting, mirroring or synthesized animation.
- Reviewed `contact-light.jpg` and `contact-dark.jpg`, all frames. Water body, foam and pearl are recognizable; no visible magenta/checkerboard contamination or cut crest. Churn remains distinct in all eight frames. No claim of game acceptance.
- Source caveats: source wave/hit baselines vary slightly between rows; late dissipation lifts above the shared base. These are original drawn poses. Common canvas preserves that evidence. Pearl frames 6–8 retain the pearl while releasing water, so runtime should fade or release at completion. Churn is a plausible cycle, but seam smoothness has not been played back.
- Lane is a 1024-square texture retaining original 3:1 strip inside alpha margins; use layout bounds to size visible coverage. Pool visible radius is `0.46325 * full image width`, measured from all surviving texels (alpha >=16), including outer droplets. Scale full pool plane to `radius / 0.46325` to fit R5.
- Shared ground anchors: wave 0.9425, hit 0.935729 (common full-crest floor). Pearl 0.705411 follows source nominal pivot after padding. Lane/pool/churn 0.5.
- Atlas output: pearl/churn/hit 4x2, 384px cells, 1536x768; wave 4x4, 320px cells, 1280x1280; lane 1x1 1024px; pool 1x1 768px. All six WebPs total 1,700,892 bytes.
- No game, server, tests, typecheck or build run. Static source review and image processing only. Phoenix files untouched.
