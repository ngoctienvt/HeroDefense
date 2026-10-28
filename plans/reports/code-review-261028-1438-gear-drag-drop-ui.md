# Static review: gear drag/drop UI

Status: IN_PROGRESS — main/Battlefield wiring awaits controller review signal.

Scope: approved gear UI plan, controller/pointer/presentation/policy/pending, tiles, tray/panel, session receipts. Existing gameplay/Bond changes excluded.

## Findings sent to controller

- **P2 — populated equipped slots lose their open-inventory action.** `gear-drag-controller.ts:143` consumes tile clicks before `gearSlots` callbacks. Its item-selection callback does not itself preserve the dock/roster slot callback that sets target/filter and opens Kho Đồ (`hud-dock.ts:96`, `panel-roster.ts:20`). Empty slots still take the ordinary path. Final confirmation depends on main wiring.
- **P2 — roster actions are interpreted as equip targets while an item is armed.** Whole roster articles carry `data-gear-target-unit-id` (`panel-roster.ts:55`, `:70`). `gear-drag-presentation.ts:16` / `:28` resolves an action button's ancestor as a target; `gear-drag-controller.ts:140` consumes that click and equips instead of letting Deploy/Merge/Sell/Bench act. Restrict target elements or exclude unrelated nested controls.
- **P2 — populated bag has no clear unequip drop surface.** Full tray leaves only 6px grid gaps; full inventory leaves gaps and 4px padding. Tile/button pixels are explicitly excluded by `gear-drag-presentation.ts:20`. A visible persistent empty area or labeled drop surface is required by phase 3; empty-state text alone does not cover full bags.

## Verification notes

- No extra high-confidence policy/store receipt defect found in the static pass: source/destination/displaced-item locks, rejected acknowledgements, snapshot-before-ack, stale generations and one-shot timeout sync have explicit paths.
- Existing `gear-drag-controller.test.ts` currently covers policy and pending store, not controller/pointer event integration. Capture, click suppression, rendering during gestures and keyboard behavior remain coverage gaps unless later tests cover them.
- Read-only source/diff review only. No tests, typecheck, build, browser, server or game launched, as required by AGENTS. Visual quality, device layout, hit picking and FPS are unverified.

## Unresolved

Await integrated main/Battlefield source and fixes/re-review; user runtime QA remains necessary.
