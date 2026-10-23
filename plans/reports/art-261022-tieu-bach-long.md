# Tiểu Bạch Long h00L — art and runtime, 2026-10-22

## Delivered/source evidence

- `tier3-combat.ts` h00L confirms one line12×3.5; affected monster IDs become ability.targets. Slow60%/2s only when target was already poisoned/slowed; no root. `content/tier3-tier4-design.ts` matches lane dimensions. No gameplay/server/contract changes.
- Four existing Codex raw artworks preserved; SHA-256, prompt paths, source route/dimensions and original surviving-pixel counts in `assets/vfx-source/tieu-bach-long/active-inventory.json`. Historical BLOCKED_ART flags unchanged.
- Charge nominal x cuts cross leaf/wind silhouettes. `process-art.py` keeps connected shapes, assigns them to nominal cells, uses common source-row centres260/665 and an expanded common canvas. Hit uses blank divider470 and shared floor430/840. No per-frame bbox fitting, synthesis, mirroring or independent scaling. Alpha<16 removed; premultiplied Lanczos resize.
- Alpha>=16 counts before assignment: charge370414, dragon401674, lane354650, hit458041; inventory records assigned counts as evidence. No frame output has any nonzero alpha at its outer border. Both light/dark contacts inspected: clear horned head, jade/white wind, leaf silhouettes, intact hit slashes. Charge has natural phase-scale variation and sparse trailing leaves; connected component ownership for isolated small leaves follows nominal centres.
- Dragon head RIGHT; lane lead RIGHT, measured from source rather than prompt. Bounds on these static strips include alpha>0 fringes. Stable full motif height plus proportional UV/plane reveal avoids whole-picture inflation; +X source head follows world event direction via existing camera-facing strip helper, with resetStrip on release/clear.
- Leaf particle is one real detached leaf from final hit cell, largest connected component, retained original pixels and padded70×70. Derived crop/component/hash provenance retained. No additional generated art.

| Key | Frames/grid | Cell | Atlas | Bytes | anchorY |
|---|---|---|---|---|---|
| charge |8/4x2|384|1536x768|167576|0.5|
| dragon |1/1x1|1024|1024x1024|81800|0.500227|
| lane |1/1x1|1024|1024x1024|78048|0.5|
| hit |8/4x2|384|1536x768|311836|0.829615|

Four atlases plus leaf1918bytes total641178bytes. Existing pack script, quality90/alpha-quality95. Source/processed assets stay separate.

## New files and integration

- Runtime: `apps/client/src/visual-tieu-bach-long.ts`, `visual-tieu-bach-long-art.ts`, `visual-tieu-bach-long-charge.ts`, `visual-tieu-bach-long-timeline.ts`, `visual-tieu-bach-long-layout.json`.
- Regression: `apps/client/test/visual-tieu-bach-long.test.ts`.
- Art source: `assets/vfx-source/tieu-bach-long/process-art.py`, `active-inventory.json`, raw-overview.jpg, contact-light.jpg, contact-dark.jpg; charge8/dragon1/lane1/hit8 PNG frames.
- Runtime art: `apps/client/public/assets/vfx-tieu-bach-long-{charge,dragon,lane,hit,leaf}.webp`.
- Shared narrow edits: append atlas entries, unique palette/spray tieubachlong, import/create/register/replay in visual-effects, h00L modern roster entry, docs/tier3-vfx.md section and plan h00L state. Support classification helper and completed hero files preserved; no Battlefield change.

## Runtime contracts

Exact windup +0.3 watchdog;0.72s monotonic settle(launch(t)) flight; echo85ms behind; server line12×3.5; target hit delays are inverse head progress, confirmed IDs only, cap48; hit0.5s with material art+leaf spray+ground mark; trailing lane fades0.4s. Caster release frames4–7 face real direction. No direction => stationary short charge fade, immediate confirmed hits; no origin => hits only. No client root/slow state. Reduced motion uses static art/lane/hits without travel/echo/particles. Shader uTime updates every charge tick. Caps8charges/8flights/48hits/112painted; clear releases quaternions/meshes/layers/particles and drops pending replay.

## Review and validation

Source readback covered dispatch, exact target list, direction validation, camera/world strip basis, UV reveal/natural height, lane geometry, inverse hit timing, pooling and clear. Controller reviewer reported no concrete runtime issue before final docs/tests.

Authored tests for exact dimensions/IDs/support separation; absent/invalid/zero direction; windup hold/reduced pose; inverse target timing; delayed echo; head-right UV reveal and stable height; cardinal lane geometry/endpoints/truewidth; cap sampling only real targets; atlas/pass/cleanup wiring. **Not executed.** No tests/typecheck/build/game/browser/server run; only asset processing/packing executed.

User should run the documented focused tests/typecheck and restart launcher+Ctrl+F5. Still unverified in game: moving targets, left/right/depth directions, R12×3.5 alignment, read under crowded heroes/monsters, reduced motion, leaf particle motion and clear when changing zone. No battlefield visual/FPS acceptance claimed.
