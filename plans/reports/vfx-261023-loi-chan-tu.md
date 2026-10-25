# Lôi Chấn Tử h00T — actual thunder pulses and electric residue

Status: source implemented; focused tests9/9 pass. Delegate made no shared-file, gameplay, contract or commit changes and started no game/browser/build process. Root owns shared integration and visual acceptance. Wait for root before hero4.

## Actual combat and four phases

Verified in tier4-combat.ts and tier-skill-pulses.ts: ability starts R6.5 barrage,10 candidate-dependent pulses over2.5s. Initial ability targets empty, no damage presentation. A real trait tier3-tier4-pulse-h00T carries focus x/z and clustered targets withinR1.5; each surviving victim receives true-damage burn3s. No stun or persistent electrical ground field.

| Phase | Authority | Presentation | Boundary |
|---|---|---|---|
| Cast | exact cast and actual windup | purple feather cloud gathers above actual aim; fixedR6.5 charge rim, fill/alpha/scale grows and shader uTime advances | Hold final cast frame; watchdog windup+.3 cleans without impact. Actual event coordinates beat adapter caster position. |
| Barrage canopy | true tierPulses snapshot marker | dark wing-shaped cloud loops above aim, hollow feather warning on ground | Marker radius/remaining only. Initial ability merely cancels charge and never schedules live strikes. Reconnect enters current phase silently. |
| Pulse action/contact | each exact trait pulse event | feather-shaped gold/violet bolt accelerates vertically to actual focus in.14s, one hit flipbook/rock debris/scarR1.5 | One bounded focus impact regardless of victim count; only small sparks at actual additional targets. Works without caster position, including a confirmed late pulse after source disappearance. No fixed horizontal direction or cast-origin fallback. |
| Residue/exit | true burn snapshot with h00T provenance; actual marker removal | two thin electric side-arcs/foot crackles sustain frames0–11; removal discharges/coils through12–15 over.32s | No fog across body, no generic fire substitution. Barrage border disappears immediately on removal; cloud coils/lifts/fades.38s. Clear releases without discharge. |

Reduced motion uses shader time0, fixed cloud/burn/contact frames and scale, no descending bolt, collapse motion or spray. Static warning/material/status locations remain, then fade.

## Art evidence and existing warnings

Five original h00T Codex jobs used without replacements: storm-wing-cloud-sheet, storm-warning-ground, wingfeather-bolt, thunder-strike-hit-sheet, static-burn-sheet. `assets/vfx-source/loi-chan-tu/process-art.py` reproduces all runtime assets; `active-inventory.json` records original source/prompt hashes, raw status/warnings, source rects/anchors, common canvases, output hashes and bytes.

Packed five WebPs total1,377,026 bytes (~1.31MiB). Cloud4×2, hit4×2, burn4×4 have their actual blank row boundaries preserved; alpha-valley column cuts retain full feather tips. All frames use a common canvas and row anchors, alpha threshold16, premultiplied Lanczos; no per-frame bbox fitting. Warning radialEdge=.493968 measures EVERY retained pixel's radial distance, including corner feather extrema; runtime radius/radialEdge keeps it bounded. Bolt is cropped to true alpha and preserves measured aspect4.302521; source right-hand tip maps down toward actual focus. Runtime does not use the square contact-sheet thumbnail's distortion.

Manifest still has BLOCKED_ART on warning/bolt/burn with generic previous-job warning, and this status is deliberately preserved. Exact previous visual-rejection report was not found by scoped search. Current raw and packed contact sheets were inspected on light/dark: warning is an intact hollow violet-feather ring, bolt has complete gold/violet branching and head, burn is two recognizable side strips with a clear center and terminal fragmentation frames. No wrong subject/missing identity/visible crop requiring substitute art was seen. Root/user should visually assess these specific prior flags; this is an implementation review judgment, not a rewrite of the source manifest's acceptance status.

Viewed `raw-contact.jpg`, `contact-light.jpg`, `contact-dark.jpg`: visible feather-cloud loop and first/last similarity; coherent electric hit→smoke settling; burn side strips sustain then fragment; no gross clipped limbs/tips or ground-anchor row jumps. In-game scale, camera and overlaps remain unverified.

## Integration APIs for root

- Constructor `new VisualLoiChanTu(scene)` implements HeroVfx. Root registers dedicated module after legacy routing.
- `cast(event,at,reduced,origin?)` claims only exact cast tier3-tier4-h00T; actual event x/z locks aim. Uses actual finite positive event.windup.
- `ability(event,origin,at,reduced,extra?)` claims ability tier3-tier4-h00T AND trait tier3-tier4-pulse-h00T. Initial ability only cancels charge. Trait uses actual event focus and full confirmed targets, independent of hasOrigin; caster may be absent/dead. Do not map pulse to attack or require a caster to resolve local contacts.
- `markBarrage(id,at,radius,remaining,reduced)` every render BEFORE tick, only real tierPulses h00T. Root computes remaining seconds `timer+(remaining-1)*interval`, passes actual radius and stable record/source key. Do not mark a synthetic field on ability.
- `markBurn(id,at,remaining,reduced)` every render BEFORE tick, only real enemy burn whose `burn.casterId` resolves to h00T (and actual trueDamage if root uses that evidence). Root suppresses universal fire presentation ONLY for those exact burns; every other source keeps universal behavior.
- `replay(origin,aim,reduced,kind='ultimate'):boolean` drives client-only synthetic snapshots and10 preview pulses; scheduling is isolated in tickReplay and never used by live ability. Cap counts pending+active previews;3s electric residue outlives the2.5s canopy. Other kinds/invalid points return false.
- `tick(dt,time)` updates preview-only sequence, charge/barrage shader clocks, burn state and pulse art/bank. `clear()` kills pending replay work/preview list, cast watchdog state, all marker records/pulse records and pooled planes/layers. Cold textures are retried every frame within their actual phase/lifetime.
- Tier3Art owns five direct lazy texture URLs/layouts; no atlas manifest edits needed.

Draw passes: cloud/bolt/hit/burn skill1, under heroes2/HP3; warning and shader charge/region rim world0. Actual impact has painted strike/smoke + earth spray + grounded fracture/scar and rim. Target-only accent uses two tiny gold sparks per actual target away from focus, not repeated area blasts. Logs visual.loi-chan-tu.layout/cast/resolve/pulse/pulse.contact/barrage.seen/barrage.close/burn.seen/burn.discharge/replay; kit handles texture/shader errors and pool cap logs. Caps: cast6, barrage12, burn64, pulse24, target accents24, total painted128, client previews8; shared bank/spray separately capped.

## Verification

`npx vitest run apps/client/test/visual-loi-chan-tu.test.ts`:9 passed; output in `plans/reports/vfx-261023-loi-chan-tu-tests.log`. Covers actual aim and initial-no-hit/no-schedule contract, exact trait claims with absent caster, charge uTime and fixedR6.5/growth/watchdog/reduced, acceleration/contact/cleanup, authoritative barrage marker/no reset/cold texture retries/immediate border removal, burn refresh and independent terminal frames, one focus blast plus small actual-target sparks, bolt aspect/local placement, source/output hashes and preserved flags, pass contracts and pending clear.

Root must integrate registry/trait routing/snapshot provenance/universal-burn suppression/replay/docs, then run its authorized integration/typecheck/build checks. No browser/FPS/image acceptance claimed. Review prior art flags, actual canopy occlusion, all pulse focus positions nearR6.5 edge, bolt/wing scale under camera orbit, dense fights, reduced mode, burn refresh/reconnect/expiration, caster death/zone change and simultaneous casters.

Unresolved questions: previous BLOCKED_ART report reason unavailable; current raw appears usable, root visual acceptance pending.
