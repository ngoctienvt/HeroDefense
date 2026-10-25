# Dương Tiễn h00U — Heaven Eye and own-source War God form

Status: source/assets complete. Per latest user instruction, NO tests, typecheck, build, game, browser or runtime validation were run for this hero. Four concise regression test sources were written for later user execution, without executing them. Static source review and contact-sheet inspection were used only to construct the assets correctly. Root owns shared integration and user owns acceptance. Wait before hero5.

## Scope and authority

Verified server: one line12×3 true-damage resolve; self berserk6s gives attackSpeed.9 and own empower6s armorPierce.4, clears self stun. No ally cleanse. Normal crescent/multishot attacks and pet-h00U are outside this ultimate scope and remain unchanged. Root adds optional berserk.sourceSkillId metadata so form markers can require exact own skill provenance; no threshold heuristic or client live timer.

| Phase | Trigger | Implementation | Guard |
|---|---|---|---|
| Anticipation | exact cast + actual windup | vertical Heaven Eye opens above/side shoulder, clear of face; animated kitLink lane charge uses real uTime, growing power/alpha/width/head within12×3 | Actual cast x/z/direction, no fixed fallback axis. Last frame held; watchdog windup+.3 cancels without impact. |
| Action | exact ability resolve | gold solid-core eye-light blade accelerates along actual direction, length + cropped UV reveal over.18s (right-hand +U head stays at the moving front); camera-oriented strip keeps source upright | Full-length native aspect sets width≤3. Directional body requires actual current caster supplied via hasOrigin; never cached cast origin. |
| Contact | beam front reaches each actual target | one short glint cut from the actual beam head + gold debris + local gold flash and dark ground scorch | Timing follows cubic reveal distance. Missing caster retains immediate real contacts, without line body. No imaginary aim target. |
| Aftermath | short actual line trace + exact own-source berserk marker | scorched lane etches open then recedes from tail/contracts width before fading; silver sword aura unfolds, sustains by remaining, folds through terminal frames12–15 | Aura open torso and face, world-behind actors. Reconnect mid-duration enters unfolded, no fake cast. Marker missing starts short fold, clear simply releases. |

## Preserved art

Six h00U jobs were read and inspected in raw contact: heaven-eye-open-sheet, heaven-eye-beam, eye-beam-scorch-lane, war-god-aura-sheet plus normal-attack crescent-blade-wave/crescent-blade-hit-sheet. Only the four ultimate assets enter runtime; crescent files are deliberately excluded from this scope.

`assets/vfx-source/duong-tien/process-art.py` reproduces four WebPs totaling868,546 bytes (~848KiB), measured layout JSON and `active-inventory.json` with raw/prompt/output SHA256, source rects/anchors, common canvas and warnings. Eye4×2, aura4×4 use alpha-valley column cuts, common canvases and measured row anchors: eye centers235/665; aura floor282/599/909/1196. Premultiplied Lanczos, alpha threshold16, no per-frame bbox fit. Beam/scorch crop to full retained alpha rectangle with both ends preserved. Runtime honors actual aspect for beam strip and top-down12×3 bounds for scorch.

Raw/packed light+dark contacts were viewed for construction: eye cleanly opens/holds; four thin silver/gold aura blades surround a clear torso and terminal frames dissolve; source beam is a saturated gold core with orange/dark edges rather than a white opaque stripe; scorch contains dark ash plates and gold cuts. Square contact thumbnails squeeze long strips, but runtime uses measured long aspect/rects. No regen or substitute art used.

Scorch retains its original BLOCKED_ART status/generic old warning in inventory. Current raw appears intact with complete ends and readable material; no old detailed rejection report was located. This is a source caveat pending user visual acceptance, not an override of original manifest status.

## Root integration

- Import/register `VisualDuongTien(scene)` as dedicated HeroVfx after legacy tier4 routing. Exact cast/ability tier3-tier4-h00U only; no normal attack or pet handlers.
- Root forwards full actual enemy positions in AbilityExtra.targets, truthful hasOrigin, actual event direction/aim. Missing current caster cancels old charge and skips the directional line/eye/scorch body while retaining target contacts. No cast-origin fallback exists.
- `markForm(id, at, remaining, reduced)` called each render BEFORE registry tick ONLY when actor h00U has own-source berserk.sourceSkillId equal tier3-tier4-h00U. Pass actual remaining; do not mark generic/Ngũ Đạo berserk or infer provenance from strength. Mid-duration reconnect does not replay unfold.
- Existing shared armor-pierce status remains source of empower feedback. This module emits no ally cleanse or haste buff cue.
- `replay(origin, aim, reduced, kind='ultimate'):boolean` provides client-only synthetic targets and6s form marker for later user review. Invalid/degenerate direction or other kind returns false. Root registers existing replay hook.
- `tick(dt,time)` refreshes charge uTime every frame, form touched lifecycle, beam contacts/UV/scorch and bank. `clear()` drops all pending delayed replay callbacks, preview marker records, cast/beam/contact/form records and releases pools, without fold-on-zone-change.
- Direct lazy Tier3Art URLs/layouts; no shared atlas manifest changes required.

Passes: eye/beam/glints skill1, below hero2/HP3; aura behind actors/world0 with empty center, scorch/telegraph world0. Reduced: uTime0; fixed eye/form frames, full static beam/trace, no reveal/closing movement or particles; static hints fade at cleanup. Cold textures retry acquire within each actual phase/marker lifetime. Caps: charge6, beams8, targets24 per event, form24, painted96, pending+active replay6; bank/spray separately capped. Logs visual.duong-tien.layout/cast/resolve/contact/form.seen/form.fold/replay; kit owns asset/error/pool logs.

## Handoff

Regression sources: `apps/client/test/visual-duong-tien.test.ts` (direction/cubic arrival/cropped reveal/contracting bounded scorch, late cast/reduced/unfold-fold, runtime charge-uniform callback/watchdog, absent caster preserving actual targets). NOT RUN, including no typecheck/build/browser/game, in accordance with current user instruction. No result or image/FPS acceptance is claimed. Root static review confirmed the raw beam leading head is +U; reveal UV now uses (1-reveal)+U*reveal so the head remains visible throughout accelerated travel, rather than appearing only at full length.

Root integrates registry, true-provenance marker, replay and docs by source review only. User can later check actual camera quadrants/beam strip orientation, Heaven Eye shoulder/face alignment, real target contact timing, scorch recession, own vs external berserk, reconnect/expiration/zone clear, reduced motion and dense scenes.

Unresolved questions: old scorch BLOCKED_ART reason unavailable; user visual acceptance pending.

