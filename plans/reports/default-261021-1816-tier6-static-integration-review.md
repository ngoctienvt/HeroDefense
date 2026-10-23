# Static integration review, remaining tier 6

Read-only source review; no edits outside this report, no tests/typecheck/build/server/browser executed. Current source includes parent edits in flight; findings refer to the inspected snapshot.

## Findings

- P2 — `apps/client/src/battlefield-tier6-snapshot.ts:75`: solar-burn marker attributes every burn from a Chúc Long caster to the ultimate. `packages/game-core/src/chuclong-combat.ts:23` also sets a caster-attributed burn from each normal breath. Consequently normal attacks gain the ultimate-only solar burn art and its 4s presentation configuration, beyond the accepted scope. Track confirmed summer event targets/source; do not infer ultimate merely from hero ID. Generic burn remains valid when provenance is unavailable.
- P2 — `apps/client/src/visual-hero-adapters-myth.ts:22`: `blood-general-h03Z` summon event still calls the legacy `attack()` torus. The snapshot `markGeneral` independently plays reviewed summon art, producing both the old claw/ring and new summon presentation. Consume the summon event without the legacy attack; let snapshot own its position/lifetime. Blood warriors are outside the upgrade scope.
- P2 — `apps/client/src/battlefield.ts:831` and `:860`: Chúc Long and Tướng Thần resolve target arrays discard cached actors with HP 0. Combat emits deaths while resolving damage, before the final ability event, so handleEvent has already set dying victims to HP 0 when it builds these lists. Lethal confirmed hits lose target-local ice/fire/blood impacts even though actor position remains available. Use cached same-zone actor positions for a confirmed resolve hit; do not require surviving HP. Persistent markers should retain their alive checks.

## Reviewed, no new blocker

- Current `prepareHero` now includes all three sage preload cases; the earlier missing-preload observation is already fixed.
- Chúc Long frozen markers missing after a fresh reconnect are a known provenance limit: frozen snapshot has no source and historical events are skipped. Generic shared freeze is deliberate; do not invent a source.
- Divine main-target point is passed separately through context and cloned. Nguyên Thủy and Đế Tuấn resolve lists keep cached dead actor coordinates. Mark/tick/clear signatures agree across registry, wrappers and integration.
- Snapshot Fuxi links use current alive endpoint groups and remaining. Primordial recipient markers use actual recipient snapshots, not caster radius.
- Tree billboard geometry bakes its foot anchor; HP reparents to the billboard and uses the matching local height. Static animated=true/setFrame noop is structurally compatible with existing sprite shape and suppresses generic breathing. Texture failure currently logs but leaves tree invisible because fallback parts are intentionally hidden; optional robustness follow-up, not a new integration blocker.
- Registry alias owner ticks/clears divine once. Effects clear clears replay, registry modules, pools and scheduled tasks. Replay unregistration is present. No duplicate module tick or newly orphaned process found.
- Shared art radius calibration and Tier6Area rings are being edited by parent and were intentionally excluded from this review.

