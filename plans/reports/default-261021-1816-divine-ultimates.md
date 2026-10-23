# Four remaining divine ultimates

Status: DONE_WITH_CONCERNS

- Added painted/kit ultimate classes for Chúc Long, Tướng Thần, Đế Tuấn, Nguyên Thủy. Existing wrappers delegate ultimate cast/resolve/tick/clear; basic attacks and unrelated divine behavior remain on their existing paths.
- Independent Chúc Long winter/summer target lists; no timer-created phase or false global radius. Removed ambient darkening. Winter and source-attributed burn markers consume remaining.
- Tướng Thần radius/remaining sea markers, inward blood ribbons, real summon event and ground marker; no invented summon coordinates or shield provenance.
- Đế Tuấn ten-crow charge, sword to explicitly resolved main target, separate splash intensity, source-event crow burst and berserk snapshot form.
- Nguyên Thủy banner and three direction-derived streams for one server resolve; per-target rend and ground scars. Boss-break accent only via explicit confirmed boss API. Recipient blessing/immortal markers have separate snapshot durations.
- Pure regressions added for primordial direction/degenerate endpoints, solar main-vs-splash routing, reconnect at release frames and independent Chúc Long burn endings.

## Integration APIs

`VisualChuclong`: prepare(); cast(event, at, reduced, origin?); winter(event, at, targets, reduced); summer(event, at, reduced, targets=[]); markWinter(id, at, remaining, reduced=false); markBurn(id, at, remaining, reduced=false).

`VisualTuongThan`: prepare(); markZone(id, at, radius, remaining, reduced=false); markGeneral(id, at, remaining, reduced=false); summon(event, at, reduced); generalHit(event, at, reduced). Existing attack/impact signatures preserved except readonly target array.

`VisualDivine`: prepareRemaining(heroId); cast(event, at, reduced, origin?); show(event, at, reduced, targets=[], origin?, main?); markSolar(id, at, remaining, reduced=false); markPrimordial(id, at, remaining, immortalRemaining, reduced=false); showPrimordialBreak(event, at, reduced).

Chúc Long/divine casts skip with debug when actual origin unavailable; event coordinates can be locked target. Resolve-only reconnect remains valid. Parent owns adapters, snapshot routing, art manifest and kit helpers.

## Verification and concerns

Source review only. No tests/typecheck/build/game/server/browser run, per repository instruction. User must run npm run typecheck, npm test, npm run build and restart launcher/refresh for visual acceptance.

- Art/source QA and packed atlas preparation belong to concurrent art owner; no claim of visual acceptance.
- Follow-up applied: Tướng Thần charge now uses blood palette and real blood spray; Nguyên Thủy charge uses chaos palette. Shared owner supplies blood spray preset.
- L8 blood-current ending animation is handled by shared Tier6Art; requested explicit closing motion rather than continued looping.
- Confirmed boss metadata must come from parent position cache; no speculative boss accent.

## Follow-up integration

- Added `VisualChuclong.timeGift(event, from, to, reduced)`: prepare reviewed ribbon/sheet; instant per eligible ally accent from a real ability resolve, no timed buff. Reduced motion keeps recipient glyph and omits moving ribbon.
- `markGeneral` plays summon art once per first-seen valid summon ID and clears its seen set with the module. Snapshot marker still owns its actual remaining/death position. Parent should use this path rather than also firing summon for the same ID.
- All target arrays remain uncapped by reduced mode; reduced motion omits secondary particles/ribbons. Shared pool is the resource cap and logs budget exhaustion.
- Re-read actual Tier6Art/Tier6Charge APIs and pure regressions; no test/typecheck/build/game commands run.
