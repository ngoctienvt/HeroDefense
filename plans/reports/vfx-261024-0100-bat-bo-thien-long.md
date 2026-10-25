# Bát Bộ Thiên Long h03V — golden emerald dragon lane

Status: DONE_WITH_CONCERNS. Final hero source/assets complete; original art warnings retained. No tests, typecheck, build, browser, game or runtime validation executed. Static source review and construction contact viewing only. No shared/gameplay edits or commits; stop after this hero.

Summary: charged bow-side dragon coil, three native golden dragon spirits in one accelerating helix, original ground trail, actual local pillar impacts and small snapshot haste accent. Three dragons are one material motif, never three hit passes or lanes.

## Mechanics / four phases

Server one resolve strikes370% in line13×5.5 and applies slow2.2s; caster gets own haste4s/.5 tagged tier3-tier4-h03V. No root/cage or repeated hits. Shared slow ownership unchanged.

| Phase | Real trigger | Presentation | Contract |
|---|---|---|---|
| Charge | exact cast/current source/direction/event.windup | original coiled emerald/gold spirit draws tight by upper bow-side, shader uTime progresses with growing alpha/size and lane head | Direction from actual event, else actual source→event point. No fixed axis. Exact length13, grows within width5.5; holds final pose then watchdog windup+.3 removes without impact. |
| Travel | one actual ability | three original dragon bodies of maximum length3.8 accelerate down one axis over.44s; subtle helix side motion and original +U heads lead | Bodies never stretched to13. Tail and head bounded to0..13. Painted ground trail uses native thickness13/4.654545≈2.793, while shader region preserves true13×5.5 through.52s. |
| Contact | each actual target when front arrives | short original gold/emerald pillar, gold debris/earth fragments and small jade/earth ground contacts | Delay=.44*cbrt(clampedAlong/13), matching cubic head travel. One contact per provided record, up to48 presentation targets. Missing current source/direction keeps local actual contacts only. No fake endpoint hit. |
| Exit/state | one-shot exit / actual tagged haste | helix tightens, dragon rises, painted trail retracts toward head/narrows; small coiled spirit behind side arm follows caster | Lane ends.9s, pillar.5s. Haste4s snapshot only; missing marker coils inward/shrinks over.32s. No lasting golden ground zone. |

## Art / measured packing

Four WebPs645,910 bytes. Raw/prompt/output SHA256, flags/warnings, source rects and common anchors in assets/vfx-source/bat-bo-thien-long/active-inventory.json. process-art.py reproduces atlases/layout/contacts; inspect-art.py preserves source bounds inspection. No regeneration, recolor, replacement art or unused runtime art.

Bow and pillar4×2. Bow row cut480 in measured clear gap434..549; common center285/665, anchor.5. Pillar cut500 in clear gap474..533; ground anchors474/846, common anchor.860687. This avoids upper-row pillar tails leaking into lower-row contacts. Adaptive alpha-valley column cuts, common canvas and premultiplied Lanczos; no per-frame bbox fit.

Dragon retained-alpha native aspect3.792593; lane4.654545. Both true heads are +U. Runtime changing length crops U(1-reveal)..1, preserving leading head and transverse thickness. Dragon body planes are camera-oriented to the actual axis with upright normal; projected half-height plus.65 helix amplitude stays within2.75 half width. Head never beyond13, tail never behind0. Exit only changes vertical lift/helix radius/crop, not heading or range. Ground lane is authored top-down and remains ground-flat; bodies remain camera-facing.

Bow/pillar original BLOCKED_ART flags retained for tight cell margins/fringe and oversized source columns. Alpha-only support retains strong alpha≥48 components≥24px plus2px original soft edge, removes unsupported haze. Original RGBA retained with padded common canvases. No claim original flags are resolved. Packed source still needs user acceptance at actual game size.

Raw and both packed light/dark contacts viewed. Dragon retains horned +U head, emerald scales and gold mane; bow coil unfolds to forward projection; pillar has quick rise/burst/disperse. Square contact thumbnails distort long strips only in preview; runtime uses measured native aspect. No game readability/FPS acceptance is claimed.

## Root integration APIs

- `new VisualBatBoThienLong(scene)` implements HeroVfx. Exact tier3-tier4-h03V cast/ability; normal attack untouched. Current source requires `extra.hasOrigin===true`; no previous cast origin fallback. Root forwards real event.direction and real enemy extra.targets.
- `markHaste(id,at,remaining,reduced)` before tick only own haste.sourceSkillId h03V. Marker uses separate world material alias of original bow coil frames0–2, not attack projection frames, and actual remaining4s. Reconnect shows current small state without replaying lane.
- `replay(origin,aim,reduced,kind='ultimate'):boolean` creates explicit synthetic4 target positions inside one line and4s preview haste; .25s cast. Invalid/zero direction, unsupported kind or caps return false.
- `tick(dt,time)` updates charge/action shaders with actual time; reduced uses time0, fixed frames/static directional bodies/ground and immediate local contacts, no helix travel/orbit/spray or shared bank.ribbon. Current-phase pooled acquisition retries when textures cold.
- `clear()` cancels cast/watchdog, action/contact/haste entries, delayed replay callbacks/previews, painted planes, region shader layers and bank/spray work. Bounded disabled pools reused. Caps casts6, lanes8, targets48/resolve, hits96, haste64, planes192. Saturation skips presentation, never combat.
- Main bow/dragon/pillar foreground1 under hero2/HP3; native helix/charge/actual-region shader ground0 with ground alphaIndex; haste world0 behind hero. Camera-parallel direction hides strip; visibility guards survive callers. No opaque body fog.
- Logs visual.bat-bo-thien-long.*: layout/cast/resolve/contact/haste birth/coil/replay/clear; shared asset ready/error logs preserve asset identity.

## User checks (all unrun)

Check exact lane direction/13×5.5 bounds, native dragon proportions and leading head, one contact per enemy despite3 spirits, targets at near/far/side edge, missing/dead/offzone caster, canceled cast, haste provenance/expiry, reduced motion, camera rotation/parallel view, cold assets and clear/change-zone. Build/tests/game/visual acceptance left to user. No next scope started.
