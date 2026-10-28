# Gear stats, attack routing, and regression coverage

Status: source updated; build/game/tests not run, per project instruction.

- Added `packages/game-core/src/gear-stats.ts`: normalized ratio modifiers, compatible-line filtering, item bases/enhancement, persistent absorption, and cache keyed by state/player identity, gear version, and hero ID. Shared empty result for units without gear.
- Replaced old equipment formulas in `stats.ts`; preserved HP fraction and Blood Pact recovery baselines. Added passive unique stats, cooldown/speed helpers, skill scaling, and temporary free-cast attack scaling.
- Geometry override bypasses native attack modules, on-hit traits, orbit and follow-up passives. Shared pierce/cleave geometry reads compatible modifiers. Slow/sunder duration reads cached modifiers.
- Added explicit native critical provenance for generic hits, blessed attacks, and custom Pangu/Douzhan/HauNghe/KimSi/LucNhi/HiênViên/ĐếTuấn basic attacks. Marker is active only while the main normal-attack wrapper runs; queue ownership remains in `gear-attacks.ts`.
- Luc Nhi delayed assault snapshots cast attack, retaining forty-percent power after free-cast scale clears.
- Applied user revision: removed block-cap modifier and existing test schema references; Sea Anchor no longer slows attacks. Physical surround remains under main-agent source ownership.
- Added `gear-stats.test.ts` and `gear-uniques.test.ts`, including all seventeen unique rules, effect limits, native/gear critical deduplication, delayed cast scaling, health-rescale protection, cache invalidation, and replacement attacks.
- Migrated commands, crafting, selling, and earned-economy tests to inventory items; final-wave assertion now follows `RUN_WAVES`. Earned-economy fixture uses only real run drops/resources.

Validation: read through changed source and test contracts; `git diff --check` on tracked owned changes found no whitespace errors. No test/typecheck/build/game/browser execution.

Integration notes:

- Main agent owns `GearRuntime.basicActive/nativeCritical`, assault `attackSnapshot`, and the wrapper that consumes one native marker per hit, combines critical sources, and queues a single bounded lightning chain.
- All runtime/simulation acceptance and balance outcomes remain unverified until the user executes checks.

Unresolved questions: none within assigned source scope.
