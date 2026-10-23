# Sa Ngộ Tịnh h00K — art and runtime, 2026-10-22

## Source evidence and processing

- Server: `packages/game-core/src/tier3-combat.ts` case h00K selects at most three same-owner allies within8, excluding caster, sorted by HP ratio. `affected` becomes ability.targets. Heal/cooldown reduction resolve immediately; ward.remaining belongs to server snapshot. Client never selects allies or creates a ward lifetime.
- Existing Codex source: five h00K jobs in `assets/vfx-source/tier34-codex-art/job-manifest.json`; exact paths, prompt, SHA-256 and generation route in `assets/vfx-source/sa-ngo-tinh/active-inventory.json`. Raw files and historical BLOCKED_ART flags preserved.
- `process-art.py` discards input alpha<16, recovers measured unequal rows, aligns shared row floor origins, uses one common canvas per sheet and premultiplied Lanczos resize. No per-frame bbox fitting or pose deformation. Chant dividers280/652/883, floor origins270/645/874/1078; pillar divider470/floors455/845; quicken divider450/floors393/827.
- Image-processing audit: input/extracted alpha>=16 counts match exactly: chant407105, ground635881, guidance355523, pillar494870, quicken269806. All final PNG frame outer borders contain zero nonzero-alpha pixels. No missing source silhouette found. Chant row2/3 approaches within a pixel near one column; contact shows no visibly severed staff or particle. Existing high-source-margin warnings alone did not justify new art.
- Final `contact-light.jpg` and `contact-dark.jpg` visually inspected. Sand body/grains, staff, skulls, pillar and opposing sand ribbons read against both backgrounds. Persistent final staff intentionally fades in runtime. Source staff/glow pose sizes vary naturally between phases; no attempt to disguise that with independent scaling.
- Guidance source has its large leading skull/ornament at LEFT, opposite prompt wording. Layout records `head:left`; runtime reverses U without reversing movement. Leading UV fraction and plane length reveal proportionally at stable natural height; source tails are never inflated from a tiny full picture.

| Key | Frames/grid | Cell | Output | Bytes | anchorY |
|---|---|---|---|---|---|
| chant |16/4x4|384|1536x1536|459888|0.899281|
| ground |1/1x1|768|768x768|217956|0.5|
| guidance |1/1x1|1024|1024x1024|75312|0.5|
| pillar |8/4x2|384|1536x768|276898|0.90081|
| quicken |8/4x2|384|1536x768|229950|0.89916|

Five WebPs total1,260,004bytes, packed with existing `tools/vfx/pack-flipbooks.ps1`, quality90/alpha-quality95. Ground radius/full-width0.464583 includes every nonzero-alpha texel and its complete square corner; independently measured packed value0.4645828954. Bounds use alpha>=16. Ground is top-down; chant/pillar/quicken remain billboard art.

## Files and runtime

New source files: `assets/vfx-source/sa-ngo-tinh/process-art.py`, `active-inventory.json`, `raw-overview.jpg`, `contact-light.jpg`, `contact-dark.jpg`, and frame PNGs under `{chant,ground,guidance,pillar,quicken}/frames/` (16/1/1/8/8 frames respectively).

New runtime files: `apps/client/src/visual-sa-ngo-tinh.ts`, `visual-sa-ngo-tinh-art.ts`, `visual-sa-ngo-tinh-charge.ts`, `visual-sa-ngo-tinh-timeline.ts`, `visual-sa-ngo-tinh-layout.json`; five `apps/client/public/assets/vfx-sa-ngo-tinh-{chant,ground,guidance,pillar,quicken}.webp`. New regression file: `apps/client/test/visual-sa-ngo-tinh.test.ts`.

Shared integration: append five atlas entries; add palette/spray `sangotinh`; import/create/register/replay in visual-effects; append h00K to modern tier3 roster; docs/tier3-vfx.md Sa section and plan h00K row. Controller separately owns support-recipient classification in Battlefield and its test. No Phoenix/Long Vương/Bát Giới private files edited.

Runtime flow: staff/cast-ground exact windup, held until resolve or windup+0.3 watchdog; motion.launch skull strand travels0.2–0.5s to each actual recipient; arrival0.7s pillar+reverse sand+grains/sparks+foot sand; caster trace0.85s. Missing caster uses direct recipient impacts; empty targets create no ally effects. Shared ward stays snapshot-owned. Foreground action remains below heroes/HP, ground behind actors. Reduced motion uses static source poses and direct arrival without travel or particles. Charge receives uTime each frame. Caps8 charge/8 chant/24 flights/24 arrivals/128 painted; clear removes pending replay, active meshes, quaternions, shader layers and particle queues. Replay fake positions are debug-only and log previewTargets:true.

## Validation status

Read back changed sources and checked event→targets→UV/pose→cleanup contracts. Authored regression coverage for target ordering/overlap/invalid points/no fallback, exact skill routing, windup hold, bounded motion/arrival, reversed leading UV reveal with stable height, phase frames/fade/reduced motion, atlas layout and resource cleanup wiring. No test, typecheck, build, game, browser or server execution. Asset Python processing and atlas packing only executed.

User checks: run `npm test -- apps/client/test/visual-sa-ngo-tinh.test.ts apps/client/test/battlefield-effects.test.ts` and `npm run typecheck`; stop old server, launch start-game.cmd, Ctrl+F5. Review0/1/3 actual recipients, recipients overlapping/moving, directions, absence of damage recoil, ward snapshot, reduced motion, crowded battle, clear/change zone and debug replay. No claim of battlefield image acceptance or FPS.
