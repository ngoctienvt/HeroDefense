# Independent code review — 2026-10-12

Status: DONE
Verdict: no confirmed blocking defect remains in reviewed source. Three concrete findings were sent to the controller and fixed during review. Public deployment is not verified.

## Scope and acceptance

Read README, gameplay specification, implementation contract, contracts, core simulation/commands/combat/dungeons/stats, server admission/session/validation, client session/renderer/HUD/panels/styles, deployment files and regression sources. Review used the installed `ak-code-review` skill, including spec-compliance and edge-case guidance. No implementation files were modified by this reviewer.

| Accepted contract | Review result |
|---|---|
| Real authoritative 2–4-player co-op, optional solo | Room reservations and real SDK transport; no synthetic multiplayer. Player identity comes from the reserved session rather than command fields. |
| 70 heroes, 27 source relationships, 8 formations, 3 gear categories | Catalog and source-evidence tests cover identities and memberships. Adapted ability/stat implementations are explicitly documented. |
| Summon/deploy/bench/merge/sell and economy | Server owns mutations, resource costs, bench/deployment bounds, merge ranks and gear retention. Ownership checked before unit commands. |
| Combat, shared skills/cooldowns, death/respawn, waves, bosses, rewards/stars | Real core paths present. Four difficulty lengths and eight dungeon gates match documented adaptation. Full progression evidence is in tester report. |
| Invitations, reconnect, host transfer, lifecycle safety | Private admission tickets, consumed reservation, no late joins, 60-second reconnect, host transfer, bounded command history; closed-transport leave fixed below. |
| Desktop UI and client/server command consistency | Visible controls map to command variants. Review covered selection, orders, roster/gear, formations, dungeons and result paths; browser interaction verification remains the controller's evidence lane. |
| Network/input/resource bounds | 4KB bodies and WebSocket payloads, typed finite/identifier bounds, command rate limits, host/ownership gates, 4 seats/32 rooms, expiring invitations, blocked default matchmaking paths, bounded ack/events/rosters. No hardcoded secret found in scoped source scan. |

## Findings and resolutions

### P2 — Health bonus toggles supplied unlimited healing — resolved

Original owner: `packages/game-core/src/stats.ts`, health update now at line 33. Increasing max HP previously added the full max-HP difference, while decreasing max HP only clamped current HP. Upgrading formation 6 once then switching formation 1 → 6 twenty times healed an injured unit from **1/214 to 201/214**, without spending gold or additional formation points. Deploy/bench changes to health synergies used the same path.

Fix preserves HP fraction across max-HP changes. Independent repeat of the same reproduction on final source produced **0.9999999999999999/214**, with unchanged gold/points. Regression cases at `packages/game-core/test/commands.test.ts:176` and `:190` exercise repeated formation and health-synergy activation/deactivation.

### P2 — Dungeon panel retained stale roster closures — resolved

Original owners: `apps/client/src/main.ts` panel signature and `apps/client/src/panels.ts` dungeon actions. The cached panel omitted unit id/slot/alive/zone. Deploying, benching, merging or losing a unit while the panel was open could leave stale checkboxes, enabled state and submitted expedition ids until a currency/dungeon/tab change.

Final `apps/client/src/main.ts:80` scopes signatures by panel and includes own roster id/slot/alive/zone for dungeons. Changes affecting eligibility rebuild the closures. Checkbox selection survives redraw through the existing selection set. Source re-review confirms the fix covers the stale data dependencies; controller owns browser verification.

### P2 — Returning to lobby after a closed socket could wait forever — resolved

Original owner: `apps/client/src/game-session.ts`, leave path now at lines 66–76. Installed SDK `Room.leave()` sends a leave frame and waits for a future leave signal. Calling it after transport closure silently discarded the frame and left the promise pending. An independent real local SDK/server reproduction reported **connectionOpen=false; leaveResult="still pending after 1000ms"**. The UI's return-to-lobby and create/join paths awaited that promise.

Fix disables SDK automatic retries immediately in `attach()` at line 40 and awaits network leave only while `room.connection.isOpen` at line 73. This keeps the existing manual reconnect path and prevents an abandoned automatic retry from reclaiming a seat. Sequence state remains available during reconnect and is cleared when abandoning the room. `apps/client/test/game-session.test.ts` adds three real SDK/server cases for closed-transport leave, creating another room after a drop, and refreshed reconnect with preserved identity/resources/command sequence. Only browser storage/location/fetch-path adapters are substituted; sockets and rooms are real.

## Final touchpoint review

- HUD caching includes phase/wave/timer, difficulty/speed, visible player state, own roster health/cooldowns/equipment/zone/orders and dungeon state. Scoped panel signatures avoid resetting roster search on unrelated currency/combat updates.
- Synergy progress counts distinct deployed members even below activation threshold; it no longer displays zero for one member.
- Server uses monotonic elapsed time with fixed 0.05-second core calls and bounded catch-up; snapshots broadcast at 10Hz. Core deterministic tests target this fixed-step contract.
- Deployment trust-proxy setting is implemented behind the documented single Caddy hop. Static serving uses a fixed client distribution root. Reconnect/admission tokens are randomly generated and omitted from application debug logs.
- Snapshot growth is bounded by four players, five deployed plus twenty bench units per player, capped main-wave spawn budget, finite dungeon encounters and 96 retained events. Acknowledgement replay cache is capped at 128 per session.

## Verification evidence and limits

Independently executed:

- `npm run typecheck`: **PASS**, including final HUD/session changes.
- Health-toggle reproduction before and after fix: **confirmed failure then confirmed repair**, values above.
- Temporary real SDK/server closed-socket reproduction: **confirmed original failure**. Temporary server disposed; process exited.
- Scoped secret-pattern scan of apps/packages/deploy/content: no matching token/private-key patterns.

Independent Vitest attempt was stopped before collection by Windows sandbox `EPERM` resolving `node_modules/vitest/dist/spy.js`. Its escalation did not execute because automatic approval review hit an account usage limit; this was a review-service failure, not an unsafe-action determination. No failing test was suppressed or represented as passed.

Controller-reported final evidence, separate from reviewer execution: **161 tests passed**, typecheck and production build passed; real client-session regressions passed. Read their test sources and the tester report. Core tester report documents complete 45/45/45/60-wave runs with legal mature-roster fixtures and a 30-minute simulated saturation soak. Those fixtures do not prove ordinary starting-economy balance.

Remaining limits: public hostname/TLS/container deployment has not been exercised by this reviewer; ordinary-start balance and human difficulty need playtesting. Warcraft-native/pixel-perfect parity is outside the accepted adaptation contract and is not claimed. No unresolved source finding blocks local/LAN delivery on the reviewed evidence.
