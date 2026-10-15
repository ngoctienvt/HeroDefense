# Khai Thiên Tổ Thần

Outcome: implement supplied Pangu stats, third-strike line attack, dual rage, invulnerable windup, blast/rift/global shock and owner army empower; render four authored VFX layers from server events and snapshots.

Confirmed: bleed amplifies physical damage 10% for 3s; knockback 0.6; crit grants total 24 rage. Recipe already matches map evidence. Skills are explicit web adaptations, not verified Warcraft originals.

Scope: catalog source override, authoritative combat module, optional snapshot/event fields, bounded Babylon VFX, UI descriptions, regression tests and docs. Preserve other heroes and network command permissions. No game, tests, typecheck, build or launcher execution by agent.

Steps: inspect existing contracts/combat/VFX → implement server mechanics → author textured geometry/astral-avatar/slash/rift and snapshot cleanup → update UI/tests/docs → static review. User validates build, gameplay and visual quality.

Acceptance: exact stated stats and radii/durations; one rage grant per swing; no damage during .35s windup; crit condition checked before stun; true damage ignores armor and bleed; rift rectangular14×4.5 for5s; cataclysm hits main lanes across owners; empower only caster owner's deployed army; client effects never apply damage. Reduced motion keeps boundaries; effects bounded/disposed across zone changes. Animation idle remains still.

## Delivery state

Code and docs authored; static spec/quality review completed. Review found and fixed automatic cast falling through to an attack during windup and a 90-degree normal slash orientation error. Critical-triggered follow-ups now retain allied attacker attribution. Regression coverage authored for these paths plus requested mechanics.

Verification pending with user: typecheck, focused tests (including pangu-vfx.test.ts), build, visual/gameplay/FPS checks. No test/build/game/server/browser was executed by the agent. No new external assets or licenses introduced.
