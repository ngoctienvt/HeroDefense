# Final static review: gear drag/drop UI

Status: DONE_WITH_CONCERNS — no remaining high-confidence source defect found in the reviewed gear scope; execution and visual acceptance remain outstanding.

## Scope and result

Reviewed the approved plan and phases 3/4 against gear policy, pending store, controller, pointer/presentation, tiles, inventory/tray, HUD state preservation, main/Battlefield integration and GameSession command receipts. Read README/AGENTS and the earlier review. Existing unrelated Bond/VFX/gameplay changes excluded.

- Server contracts remain `equip-item` / `unequip-item`; client policy and previews do not mutate authoritative equipment or RTS selection.
- Source/destination/displaced-item locks, snapshot-before/after-ack, rejection, generation cleanup and one-shot timeout synchronization have explicit source paths. Dead/reserve owned heroes remain valid through DOM targets; summons and mismatched slots are rejected.
- Inventory/tray render bounded pages of 40/8 items. Equipped slots retain inventory-opening behavior, and persistent labeled bag strips support unequip even with a full bag.
- Re-read final fixes: nested roster action controls no longer resolve as equip targets; ordinary controls cancel arming before acting; compact preview retains replacement text and incompatible-affix warning; pending destination slots are painted; paced salvage rechecks live pending state.
- Identified a focus defect during this pass: local inventory `changed()` replaced focused controls before main could capture their identity. Final source now captures/restores around that local update as well as the complete HUD rebuild. Pager/tray/action keys and detail-item identity support focus and nested-scroll preservation.

## Verification limits

- Static source review only. No tests, typecheck, build, browser, launcher, server or game executed, per project instructions. Strict TypeScript correctness is not certified by this review.
- Read the policy/store regressions, real-SDK session tests and new `gear-drag-pointer.test.ts`. Pointer tests exercise a real EventTarget boundary with an explicit capture adapter; they do not establish native browser event propagation, DOM hit targeting, actual pointer capture or Babylon picking.
- Controller/presentation DOM integration, focused controls becoming disabled at a page boundary, snapshot rebuilds during real input, three desktop resolutions, zoom/DPR, alpha/art readability, co-op targeting and FPS still require user QA from phase 4. No runtime or visual acceptance claim is made.

## Unresolved

User-run typecheck/tests/build and in-game acceptance remain pending. The focused Vitest command should include `apps/client/test/gear-drag-pointer.test.ts` alongside the phase-4 files.

## Bounded follow-up: drawer height and pending regressions

- Re-read `panels.ts`, drawer/shared panel CSS and final gear CSS. `renderPanel('gear')` owns the `.panel-content.panel-gear` wrapper. Its explicit `height: 100%; min-height: 0; padding: 0; gap: 0` now overrides the shared padded auto-height panel rule; gear CSS loads after shared panel CSS. This supplies the bounded height needed by the inner flex panel, scrolling grid and scrolling detail inside the drawer's hidden overflow.
- Compact squad portraits, 28px filter controls, 80px minimum detail height and nonshrinking fixed controls are consistent with that layout approach. No additional high-confidence static defect found. Actual 1280×720 fit, long labels and browser zoom remain user visual QA.
- Read the added `gearSlotPending` regression and the extended real-server salvage test. The latter changes its live pending predicate after enqueueing and verifies the corresponding item is preserved before later salvage; assertions exercise the intended queue-time recheck. Tests remain unexecuted.
