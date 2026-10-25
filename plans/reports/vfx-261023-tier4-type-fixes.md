# Tier 4 validation: compile blockers

Status: DONE_WITH_CONCERNS

## Outcome and scope

Removed the six reported TypeScript errors in four owned files, preserving the current twenty-wave gameplay, hero-skinned enemy scales, and in-progress UI changes. No contract or game-core edits.

## Causes and changes

- `visual-actors.ts`: both Unit and Enemy have `rank`, but Unit uses a number. Narrow through the required Unit `heroId` discriminator before reading enemy rank. Hero lookup/fallback, scales, and rank-specific bars remain unchanged.
- `visual-enemy-telegraph.ts`: the shared shape contract includes `marks` and `none`, while this renderer only constructs circle/line/cone. Its pool and allocation types now describe those supported shapes. Guard unsupported shapes before eviction/allocation and log `visual.enemy.telegraph-skipped`, preventing an undefined-pool crash or accidental cone rendering.
- `visual-terrain-ground.ts`: error line 106 was a numeric placeholder player ID, not a material key. Replace it with a string placeholder matching `enemyRouteFor`'s current player-ID contract. The party branch uses only player count, so its route stays identical.
- `hero-skinned-enemy.test.ts`: update obsolete `interval`/`waypoint` fields to `attackInterval`/`pathIndex`; provide required `target` and `leak`. Add two regressions proving marks/none create no meshes or transform nodes and safely tick/clear.

## Validation

- Baseline errors retained in `plans/reports/vfx-261023-tier4-typecheck.log`.
- Final `npm run typecheck`: PASS, exit 0.
- Final `npx vitest run apps/client/test/hero-skinned-enemy.test.ts apps/client/test/enemy-skill-routing.test.ts`: PASS, 2 files / 7 tests.
- `git diff --check` on owned files: PASS; Git reports CRLF normalization warnings only.
- Manual source review: required Unit discriminator is independent of numeric rank; supported telegraph guard precedes cap eviction; pool acquire/release types agree; party route geometry unchanged; existing user UI changes preserved.
- No build, server, browser, or visual acceptance performed.

## Concerns / unresolved questions

- `marks` has no renderer in this module. This scoped repair skips it explicitly; rendering individual target marks would require a separate behavior decision and implementation. `none` intentionally draws nothing.
- Successful tests confirm type/domain handling and existing rank routing, not live visual quality or FPS.
