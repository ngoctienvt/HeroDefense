# Tôn Ngộ Không h00R — ultimate + real clone presentation

Status: source implemented; focused tests 9/9 pass; no game process, browser or build started by delegate. Root owns integration and visual acceptance.

## Material and timing

- Exact six Codex raw jobs for h00R, original hashes verified. Red lacquer/cloud-gold Ruyi differs from Douzhan bronze staff and Luc Nhi black-violet ink.
- Solid staff surface of revolution: 65 measured longitudinal radius stations ×20 radial segments, closed end caps, original painted skin mapped once along and around it. Babylon LH winding explicitly tested outward. No hammer substitute or flat staff card.
- Animated kitLink charge stays inside the actual9×3 lane; windup power grows alpha/length/width, uTime is refreshed from the registry absolute clock every frame, reduced time0 and size remain static. Charge has its own watchdog and is canceled on resolve/clear. No circular charge AOE.
- Cast raises the staff over actual windup (.25s live), holds if resolve is late; canceled cast cleans up after windup+.3 without impact. Resolve accelerates the same staff to contact in .12s, settles and fades by .62s. Targets hit once at contact; no imaginary splash at aim.
- Each actual target: painted cloud/rock burst foreground + earth debris spray + grounded scar/rim. Line crack starts at actual caster, length9 width3 along actual direction, reveals through UV cropping, then physically closes/fades by1.3s. Gameplay remains untouched.
- Foreground staff/action/clone smoke/sweep pass1, ground crack world pass0; heroes/HP remain above them. Reduced motion holds a static frame/pose and full line extent, omits spray and growth/swing/closing movement.

## Art evidence

`assets/vfx-source/ton-ngo-khong/process-art.py` reproduces six WebPs totaling1,594,178 bytes (~1.52MiB). `active-inventory.json` records raw+prompt/output hashes, processing, source row/column cuts and anchors, staff radius profile. Original raw and prompts remain in tier34-codex-art.

Measured row cuts: burst0/305/617/930/1254; puff0/433/887; sweep0/436/887; unravel0/435/887. Column cuts select actual alpha valleys near the nominal columns, preserving crossing lobes; common canvases389/504/534/486px respectively, downsampled premultiplied to384px. Ground anchors are stable across rows; no individual frame bbox fit. Sweep contact-to-tip vector is measured at(70,417)→(404,147), not an arbitrary rotation.

Viewed raw contact and both `contact-light.jpg` / `contact-dark.jpg` after packing: coherent burst buildup/recovery, puff opening to reveal center, crescent growth/fade, unravel shrink; no gross frame clipping or row-ground jumps visible in these sheets. In-game scale/draw order still requires root/user acceptance.

## Clone lifecycle and APIs for root integration

- Import `VisualTonNgoKhong` from `apps/client/src/visual-ton-ngo-khong.ts`, instantiate with scene, register HeroVfx after legacy tier handlers. Modern ultimate only claims exact `tier3-tier4-h00R`; no normal attack changes.
- Forward full confirmed monster target positions as AbilityExtra.targets and truthful `hasOrigin`. No target positions means no fabricated target impacts. Missing direction uses validated origin→aim only; missing geometry skips directional body while retaining actual target hits.
- Each render, before registry tick, call `markClone(id, at, remaining, reduced)` ONLY for true server units with `heroId==='h00R' && summonKind==='monkey-clone'`, passing real summonDuration. Tracker retains position/remaining and touched state. New remaining>=5.8s plays puff; existing/reconnected older clone enters silently. Missing end-frame marker unravels once at last actual position. No runtime VFX clone units or ±1.6 spawn guesses.
- Route exact attack event `monkey-clone-h00R` to `cloneSweep(event, origin:Vector3|undefined, targets:readonly Vector3[], reduced:boolean, aim:Vector3):boolean`. Pass every actual hit position; crescent aims toward real target. Registry ability() does not consume clone attacks.
- Replay API `replay(origin:Vector3, aim:Vector3, reduced:boolean, kind='ultimate'):boolean`. Caller provides direction through aim; degenerate aim returns false. Client replay synthesizes presentation targets/smoke only. Runtime snapshots exclusively own live clone bodies.
- `tick(dt,time)` ends touched frame, updates action/art/bank. `clear()` drops all casts/queued strikes/clone markers/art/delayed replay work and releases pools. No death puff during clear/zone switch.
- Caps: staff6, casts6, strikes8, painted80, clone records16, target effects24 per event; shared bank/spray also capped. `visual.ton-ngo-khong.*` logs loading/cast/resolve/contact/birth/reconnect/removal/sweep/replay.
- Direct `Tier3Art` + measured layout handles lazy texture/frame routing: no atlas manifest additions required.

## Verification

`npx vitest run apps/client/test/visual-ton-ngo-khong.test.ts`: 9 passed, report `vfx-261023-ton-ngo-khong-tests.log`. Tests cover timeline phase/hold/accelerated contact/lane bounds, reduced static state, missing/invalid direction, snapshot births/reconnect/removal, canceled cast and pending cleanup, exact event claims and no aim hit invention, solid geometry/UV/outward normals, source/output hashes and draw-pass source contracts. Initial geometry normal assertion exposed reversed winding and was fixed before passing.

Root review follow-up fixed cached source fallback: when extra.hasOrigin is false, the old cast staff/charge is canceled and only actual target impacts remain. No old origin/direction is resurrected. Added runtime uniform callback, lane bounds/static reduced/watchdog and dead/offzone regression tests; final focused count9/9.

Root must finish shared registry/Battlefield snapshot attack routing/replay/docs and run integration/typecheck/build at its authorized scope. Visual review remaining: actual staff texture wrap and volume, all aim quadrants, camera orbit, HP/hero visibility in dense fight, reduced motion, reconnect/replace/death/zone clear, light/dark battlefields. Do not call final image/FPS accepted until viewed.

Unresolved questions: none; visual acceptance pending.

