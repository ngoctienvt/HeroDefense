# Client gear UI

Status: DONE_WITH_CONCERNS

- Added Kho Đồ [I] with five deployed heroes, all owned non-summoned heroes as equipment targets, slot/rarity filters, rarity → level → enhancement sorting, 40-item incremental rendering, dust/stone totals and unlimited inventory.
- Item cards show scaled bases, enhanced affixes, compatibility reasons, common-stat deltas, full unique descriptions, equipped owner, enhance/reroll prices and salvage returns. Buttons explain disabled states. Salvage is confirmed; equipped items cannot be salvaged.
- Dock and roster slots use rarity borders and open the selected slot in inventory. Added gear tooltips, all unique options to Admin [K], owner-only gear-drop notifications with reconnect history suppression, and client.gear-* logs.
- Cooldown HUD/tooltip paths call shared abilityCooldownFor with snapshot state. Main.ts HUD guard preserved; drawer selects resist snapshot rebuilds.
- White salvage is paced at 150 ms per item, deduplicates ids, rechecks latest inventory and cancels on drop/leave/dispose. Server currently allows 30-command bursts / 20 per second, so a raw loop would fail for larger inventories.
- Followed user override removing block-cap and Bát Giới blockBonus snapshot marker. Sea-anchor text comes from shared immunity-only design.

Tests added/updated, not executed: gear-ui, gear-rewards, hud-helpers, hud-icons-keymap, game-session, visual-bat-gioi. Source reread and git diff --check completed. No test, typecheck, build, server, launcher, game or browser run.

Files: new gear-ui.ts, gear-panel.ts, gear-admin.ts, gear-rewards.ts and styles/gear.css; routing/context/keymap/roster/dock/tooltips/hero status/action bar/main/game-session adapted.

Remaining validation: user runs npm run typecheck, targeted client tests and build; restart start-game.cmd and Ctrl+F5. Check slot keyboard activation, selecting heroes during combat, large white inventory salvage, all17 Admin uniques, owner-only purple/gold drops and reconnect without repeated history. No visual acceptance claimed.

Comparison intentionally labels percentage-point gear stat deltas; unique descriptions are shown separately because nonlinear unique effects are not simulated in client previews.

Unresolved questions: none.
