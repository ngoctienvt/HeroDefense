# Phase 1 progress — Codex art pilot

Date: 2026-10-20  
Plan: [plan.md](../plan.md)  
Inventory source: [tier 5](../asset-tier5.md), [tier 6](../asset-tier6.md)  
Art contract: [art-contract.md](../art-contract.md)

## Result

**Superseded art direction:** this report records work under the previous Huyền painterly direction. The user subsequently selected Cong Cong stylized art and one shared shield style. The current manifest has143 jobs after the shared-status consolidation; previous ready assets require style review, and the nine hero-specific shield jobs have been replaced by two shared layers. Preserve this report and its source evidence; its old ready counts are not acceptance under the new direction.

The plan is in progress. The inventory-driven prompt generator emits 174 prompts and a resumable `job-manifest.json`. Thirteen newly generated images reached `raw-ready`; three existing sources passed visual review and are recorded as `reused-raw-ready`. Two jobs are `BLOCKED_ART`, and one dependent layer is `BLOCKED_DEPENDENCY`. The whole plan is not complete.

| Hero | `raw-ready` jobs |
|---|---|
| Chúc Dung h01H | `volcanic-eruption-sheet`, `lava-basin-ground`, `lava-ignite-sheet` |
| Hằng Nga h018 | `moon-frost-prison-sheet`, `moonshield-rear-sheet`, `moonshield-front-sheet` |
| Như Lai h01J | `five-finger-mountain-rear-sheet`, `five-finger-mountain-front-sheet`, `buddha-palm-descent-sheet` |
| Trương Đạo Lăng h040 | `beidou-painted-sword`, `beidou-painted-ground` (existing sources, unchanged) |
| Phượng Hoàng h041 | `phoenix-bird-master` (existing source, unchanged) |
| Hình Thiên h011 | `warfire-vortex-sheet`, `warfire-ground`, `berserk-wave`, `wave-impact-sheet` |

`buddha-shield-rear-sheet` is blocked because the generated results did not meet the required open-center rear-wall composition. `buddha-shield-front-sheet` was not generated because its matching rear source is unavailable. `unyielding-shell-sheet` is blocked because its initial image and two revisions retained an opaque red background instead of clean transparent alpha. Accepted raw files, rejected iterations, per-job provenance, source paths, and previews are recorded under `assets/vfx-source/tier56-codex-art/`.

## QA notes

- Square pilot sheets are 1254×1254 RGBA and visually reviewed as 4×4 grids on light/dark backgrounds. Grid rect bounds are `[0,314,627,940,1254]`; do not stretch the alternating 313/314 px cells. Hình Thiên's 4×4 vortex follows that grid; its ribbon and hit sheet retain their generated wide aspect ratios.
- The lava ground decal is 1254×1254 RGBA, top-down, and has more than 3% visible margin after two framing edits. Its actual alpha silhouette bounds are in its metadata.
- Chúc Dung's eruption final frame was edited to nearly clear. Hằng Nga's frost hold frames vary and retain an open center. Như Lai's rear/front mountain layers keep a central actor lane; the palm sheet's unrelated petals were removed.
- `raw-ready` means art-source QA only. No asset was processed, built, run in game, or approved in game.

## Source checks

The three pilot combat sources were checked against inventory: `packages/game-core/src/chucdung-combat.ts`, `packages/game-core/src/hangnga-combat.ts`, and `packages/game-core/src/divine-god-combat.ts`, plus their design files and contracts. The pilot prompts preserve the locked points, zone/status hooks, and recipient boundaries; this work changes no gameplay or renderer code.

## Remaining work

- Finish source/event/snapshot audit for the other 22 heroes before relying on generated prompts as integration evidence.
- Resolve the Như Lai shield rear-layer art before generating its dependent front layer.
- Continue the remaining inventory sequentially; manifest currently contains 155 `planned`, 13 `raw-ready`, 3 `reused-raw-ready`, 2 `BLOCKED_ART`, and 1 `BLOCKED_DEPENDENCY` jobs.
- Reconcile the pilot contact-sheet and depth requirements with the later runtime integration phase.

## Validation

Ran `python assets/vfx-source/tier56-codex-art/make-prompts.py`; it produced 174 prompts and validated declared per-hero job counts. Recorded three source reuses, four additional Hình Thiên assets, and the two blockers with original paths and visual QA. Updated special-case prompts for the phoenix rain loop and top-down lane ribbon. Checked manifest and metadata JSON parsing, prompt presence, PNG dimensions/modes/alpha, and light/dark static previews. Did not run `npm test`, typecheck, build, server, browser, or game, following project instructions.
