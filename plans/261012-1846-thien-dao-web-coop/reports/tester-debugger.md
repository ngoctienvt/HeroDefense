---
date: 2026-10-12
scope: authoritative game-core regression, full progression, stress and soak
status: verified
---
# Core tester/debugger report

## Summary

143 real core regression cases across three test files. Full 142-case suite passed, followed by five focused cases including a newly added lobby-seat regression. No production changes or test mocks. Tests cover all 70 extracted hero ability definitions, 27 distinct-member synergies, eight formations and eight dungeon unlocks. Separate server agent owns transport/session/security network testing.

## Commands and results

- `npm run typecheck`: PASS after concurrent client fixes. Initial run reported camera-input cast and nickname autofill errors; notified controller, then rerun passed.
- `npm run test:core`: default Windows sandbox fails Vitest worker `realpath` with EPERM for node_modules/vitest/dist/spy.js, before test collection.
- `npm run test:core` with approved `require_escalated`, npm prefix: PASS, 142/142 in 28.69s at 19:31:13. No failures skipped or weakened.
- After the final lobby-seat fix: `npm run test:core -- --testNamePattern "lobby and authority|injured health"`: PASS, five selected cases including the new regression; 138 cases excluded by the explicit focused filter. Suite now contains 143 cases; full-match behavior was unaffected by this lobby-only fix.

## Coverage evidence

- Lobby: empty/duplicate names, four-player capacity, host actions, readiness, disconnect host transfer, late join refusal, terminal freeze. Removing an earlier lobby seat must relocate remaining deployed heroes to their new lane and clear stale target/destination/saved position; post-start removal keeps units and only disconnects the owner.
- Commands: foreign-unit ownership and missing ids; failed commands preserve state. Finite movement and slot/category bounds. Host-only difficulty/speed gates.
- Economy/roster: random and shop costs, shop availability/removal, insufficient souls/gold, reroll, 20-unit bench, occupied-slot swaps, three-copy merge and best gear preservation, rank-two duplicate restriction, rank-three fixtures, all three gear groups at cap, sale refund.
- Team bonuses: all 27 synergies activate with distinct members, deactivate after bench, ignore duplicate identity. All eight formations charge points, enforce wave-40 cap unlock and apply their real effects. Two explicit injured-health regressions cycle health formation and health synergy activation/deactivation thirty times each; health fraction must remain unchanged, proving the reviewer-discovered healing exploit remains fixed.
- Combat: every hero casts its actual catalog handler, positive shared cooldown, heal/shield/AoE/slow effects, range/zone/dead/bench rejection, real kills and reward exactly once, lethal damage, shield absorption, death, timer and saved-position respawn.
- Dungeons: all unlock thresholds and supreme-only gate; reject foreign/duplicate/empty groups, two owners join same actual boss, actual combat victory, party reward once, return, failure cleanup, retry and timer expiry.
- Determinism: identical seeded input yields identical state; `.1` calls equal two `.05` calls at speeds 1/2/4. Invalid dt ignored. Server uses fixed `.05` calls.

## Full-match results

Every wave starts through real `stepGame`, automatic preparation countdown, spawn batches, combat, damage and completion/rewards. Tests assert every wave number occurs in sequence. No edits to wave, phase, enemy health, base health or damage during progression. Four separate undefended matches also lose their shared base through real attacks/leaks in every difficulty.

Fixture: four players, five distinct tier-six heroes each (`h040`, `h01K`, `h01G`, `h041`, `h01B`). Resources/shop endowed only while building the mature roster; rank three obtained with real nine-copy merge commands, all gear upgraded through real commands to legal level five, formation one upgraded three times. This proves complete endgame engine progression, not ordinary starting-economy balance.

| Difficulty | Waves | Simulation seconds | Base HP | Real kills | Stars | Peak enemies | .5s calls at 4x |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal | 45 | 1945.05 | 100 | 3464 | 5 | 24 | 973 |
| Nightmare | 45 | 1963.00 | 100 | 3464 | 5 | 24 | 982 |
| Hell | 45 | 1969.85 | 100 | 3464 | 5 | 24 | 985 |
| Supreme | 60 | 2834.25 | 84 | 5256 | 4 | 24 | 1418 |

Final measured call latency: normal p50 2.657ms/p95 4.984ms; nightmare 2.554/4.472ms; hell 2.557/4.115ms; supreme 2.589/4.587ms. Each .5s call at 4x performs up to forty internal .05s slices. Timing varies with parallel desktop work; this is local Node core timing, not browser/network latency or a production capacity guarantee.

## Saturation soak

Four players, twenty real rank-three defenders, 120 dense enemies, 36,000 real `.05` calls, 1800 simulation seconds. Focused saturation fixture holds preparation at 1801s and gives enemies HP 1e12/attack zero/speed zero to keep 120 resident targets while real combat, abilities, RNG, cooldowns and events continue. It is explicitly a load fixture; it does not claim a natural wave creates 120 simultaneous enemies. Full progression separately exercises more than 30 real waves per difficulty.

Final measurement: 15,870ms wall; p50 .363ms/p95 .733ms per .05 call. End: 120 enemies and 20 live defenders retained, base 100, no NaN HP, all owners deal real damage, events capped at 96 despite thousands of emitted events. The saturation scenario also exercises twelve deaths/respawns: zero attack still inflicts the game's minimum one damage. An added no-death assertion failed because that assumption was wrong; corrected the expectation to require real death/respawn and twenty live units at the end. No implementation changes made for that test-fixture correction.

## Findings and limitations

No confirmed functional core defects remain in tested contracts. Strongest mature roster survives Supreme with 16 base HP lost, showing real leaks still matter. Starting economy, summon luck, ordinary progression strategies and human difficulty are not balanced by this fixture and need playtesting. Ability identities are all exercised, but shared adaptation handlers do not prove Warcraft parity.

The deterministic contract is fixed-step authoritative server replay. Arbitrary fractional frame partition equivalence (for example .02+.03 versus .05) is not asserted: core subdivides each external call and does not accumulate partial .05 slices. Current server fixed .05 usage satisfies the tested contract.

## Recommendations

Keep these tests as regression gates. Review browser controls/selection and network recovery in their assigned validation lanes. Tune player economy and difficulty using human playtest evidence before claiming parity or balanced end-to-end progression from starting resources.

## Unresolved questions

None blocking core delivery. Browser/network evidence remains controller/server-agent responsibility.
