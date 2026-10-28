# Gear UI phases 1–2

Status: DONE_WITH_CONCERNS

Implemented shared 32/44/48px raster tiles using three versioned WebP URLs, lazy loading, accessible rarity/level/enhance/unique/wearing labels, empty slot glyphs, selected/pending state, SVG fallback logged once per failed URL.

Quick tray: 4×2, 8 unequipped items/page, total/page/collapse/I controls. Inventory: default bag/worn switch, slot/rarity filters, 40 items/page with snapshot clamp, stable selected item, one detail retaining all equip/unequip/enhance/reroll/salvage confirmation and white salvage queue. Five deployed target portraits plus existing roster bench route. Target state is independent of RTS selection.

Dock cards retain three 32px slots at 112px border-box. Badge148px includes wrapped bond counters; five cards and gaps preserve738px budget. Gear drawer340px below1366px, max460px above. Internal grid/detail scroll; all economic controls retained. Controller presentation styles included.

Integration API: gear-panel exports selectGearItem/getSelectedGearItemId, setGearTargetUnit/getGearTargetUnitId, getGearPresentationKey, subscribeGearPresentation, notifyGearPresentation. gear-tile exports configureGearTilePending. hud-gear-tray exports renderGearTray(ctx). Root owns mounting tray only while gear drawer closed and subscribing invalidation; wrapper .dock-layout has row sizing.

Source review performed. Pure tests authored for 300-item page reachability, 40/8 caps, snapshot page clamp/empty bag, accessible labels, independent target/item selection and subscriptions. No tests, typecheck, build, game, launcher or browser executed, per project instructions.

User validation: npm run typecheck; npm test -- apps/client/test/gear-ui.test.ts apps/client/test/gear-presentation.test.ts; stop old server and restart start-game.cmd then Ctrl+F5. Inspect1280×720/1366+, all slot sizes, tray visibility, filters/pagers, worn/bench gear actions, confirmations, raster fallback and long unique detail scrolling.

Concerns: no runtime/layout/image acceptance. Root integration needs internal grid/detail scroll and tile/control focus restoration on snapshot rebuild. Controller capture must preserve equipped tile open/filter callback, or replace it with equivalent location-aware behavior; notified root and drag owner. Raster creation/sources owned by root.

Unresolved questions: none.

## Additional pointer/pending review

Added gear-drag-pointer.test.ts using real Node EventTarget/Event at the input boundary and a minimal stable-root capture adapter. Cases: six-pixel threshold and begin/move order, one drop and synthetic-click suppression, short click, right-click order cancellation, pointercancel/lostcapture/blur/pagehide cleanup, unrelated pointer cancellation, lostcapture after commit, capture refusal, dispose/listener cleanup. These authored tests do not establish actual browser capture, hit testing, Babylon picking or in-game behavior. User QA still required. Nothing executed.

Added exported gearItemPending(id); detail economic buttons disable and recheck that live lock before send. Single salvage rechecks after confirmation; white salvage excludes pending at selection and again before queue. Stable data-gear-focus-key now identifies economic buttons, white salvage and bag/worn mode. Dedicated labeled32px bag-drop strips remain visible in tray (including collapsed mode) and full inventory, removing dependence on6px tile gaps; tray source count stays≤8.
