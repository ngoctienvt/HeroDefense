# Tinh Vệ h00M — delivery record, 2026-10-22

## Source/event evidence

`tier3-combat.ts` starts8 pulses over2s at aimR5.5. `tier-skill-pulses.ts` stores `state.tierPulses`; remaining is a count, interval=.25, timer is next-pulse delay. Warning seconds=max(0,timer)+max(0,remaining-1)*interval. Server skips an event when no candidates exist; otherwise one trait `tier3-tier4-pulse-h00M` carries focus x/z and all victims withinR1.25. Main ability targets are empty. Slow/third-hit slow+armor-break remain server-owned; no stun.

Six Codex raw artworks remain byte-identical; exact raw/prompt/hash/route/rect/common-canvas/origins in `assets/vfx-source/tinh-ve/active-inventory.json`. BLOCKED_ART metadata preserved. Input/extracted alpha>=16 counts match exactly: call260175, warning306805, boulder253976, trail285260, hit557776, crater661345. Every output frame has zero alpha>0 at the canvas border. Both final contact-light.jpg/contact-dark.jpg inspected; amber rock, coral feathers, sea foam and fractured impact remain readable. No missing silhouette found.

`process-art.py` uses measured blank row gaps, source floor alignment and premultiplied Lanczos. Call divider460/origins412/807; hit480/origins452/840; boulder origin1053 aligns its pointed bottom. One common canvas per asset, no per-frame fit/deformation. Trail head RIGHT, bounds include low-alpha fringes. Source impact frame0 is still falling, so runtime impact startsframe1 after the separate boulder trajectory. Stone particle48×48 retains a detached amber fragment from final impact frame with original pixels; no new art.

| Asset | Grid/cell | Output | Bytes | anchorY |
|---|---|---|---|---|
| call |4x2/384|1536x768|240196|0.89916|
| warning |1x1/768|768x768|136488|0.5|
| boulder |1x1/512|512x512|30188|0.899689|
| trail |1x1/1024|1024x1024|64798|0.5|
| hit |4x2/384|1536x768|346744|0.900398|
| crater |1x1/512|512x512|69188|0.5|

Six atlases+stone504bytes total888106bytes. Existing pack script quality90/alpha-quality95. Ground exact footprint includes all output alpha>0 and whole texel corners: warning packed radius/fullwidth0.4232271605 → metadata0.423228; crater0.4619832219 →0.461984 (rounded upward).

## Files/APIs

New runtime: `apps/client/src/visual-tinh-ve.ts`, `visual-tinh-ve-art.ts`, `visual-tinh-ve-charge.ts`, `visual-tinh-ve-timeline.ts`, `visual-tinh-ve-layout.json`. New test: `apps/client/test/visual-tinh-ve.test.ts`. New assets: `assets/vfx-source/tinh-ve/{process-art.py,active-inventory.json,raw-overview.jpg,contact-light.jpg,contact-dark.jpg}` plus call8/warning1/boulder1/trail1/hit8/crater1 frame PNGs; seven `apps/client/public/assets/vfx-tinh-ve-{call,warning,boulder,trail,hit,crater,stone}.webp`.

Narrow shared integration: six atlas entries; unique tinhve palette/spray; VisualEffects import/create/register/replay + markBarrage route; h00M replay ID and exact isModernTier3Pulse helper; Battlefield includes actual pulse traits in multiHit/area routing, and permits a pulse's actual viewed-zone point with no visible caster/victims. Tier3Snapshot reads real tierPulses and adds optional radius to `markTier3(heroId,kind,id,at,remaining,radius?)`, preserving existing five-argument guard. Identical concurrent barrage borders merge by max derived remaining, never by fabricated duration. Existing support helper and prior hero files preserved.

## Runtime/review

Cast uses realwindup and+0.3 watchdog; main ability call0.65s only. Snapshot warning keeps fixedradius and fades at last0.18s; removed snapshot removes warning. Only confirmed pulse creates one rock, with actual x/z mandatory. Fall0.26s from above/approach from caster when known; trail follows actual3D trajectory with stable height and proportional UV reveal. Impact0.5s stone/foam/spray plus crater0.8s. Foreground below heroes/HP; ground before actors. Reduced motion skips fall/trail/particles, holds art and uses actual pulse only. Caps8charge/8call/12warning/32stones/160painted; clear releases meshes, quaternions, shader layers, warnings, preview/timers and particles.

Pure timeline + snapshot + event-routing regressions authored. Includes count interpretation, one pulse→one rock despite multiple victims, main ability→no rocks, absent pulse point→no invented impact, missing caster support, overlap/death/clear warning behavior, sourcehead UV/stableheight, atlas/pass and cleanup contracts. `battlefield-effects.test.ts` adds pulse target preservation and actual-zone-point fallback. Test browser ambient location is explicitly provided for the existing debug logger. Controller runtime review reported no concrete issue.

No tests/typecheck/build/game/browser/server executed. Only image processing/asset packing and source readback done. User still needs focused tests/typecheck, launcher rebuild/refresh and battlefield image/FPS acceptance, especially crowded simultaneous barrages, missing actors, moving victims, reconnect, reduced motion and zone cleanup.

## Processing lessons for continuation

- Internal nominal-grid crossings do not prove missing art; measure real row gaps/floors, preserve all surviving pixels and inspect contact light/dark.
- Native RGBA fringe cleanup before premultiplied resize; fit ground footprints against every alpha>0 texel corner after packing.
- Record actual leading edge, reveal UV and mesh length together at constant natural motif height.
- Read state types before naming clocks: tierPulses.remaining is count; no tierBarrage exists. Event pulse is one physical impact even with many targets.
- Assets/tests/code complete at source level; never equate that with build or game acceptance.
