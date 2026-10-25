# Lý Tịnh h00W — short pagoda crush and exact ally guard receipts

Status: source/assets complete. No tests/typecheck/build/browser/game or runtime checks run; no new tests added, per user self-check instruction. Static source reading and construction-time contact viewing only. No shared-file/gameplay/contract changes or commits. Wait before h00X.

## Actual mechanics and four phases

Actual server: one aimR6 enemy hit, slow/attackWeak4.5s on surviving enemies; allies withinR8 of actual caster receive tierGoldShields5s. Event.targets mixes enemy then unit IDs. Root must dispatch ONE complete modern event with enemies in extra.targets and actual unit recipients in extra.supportTargets. Shield state/persistence belongs to existing shared shield code. No tall tower held for4.5s, no fabricated ally/self receipt outside support list.

| Phase | Trigger | Presentation | Boundary |
|---|---|---|---|
| Cast | exact cast, actual windup | small painted pagoda lifts/spins from upper palm, grows sparse aimR6 shader charge; uTime refreshed every frame | Source absent skips palm prop. Actual event x/z locks aim; fixedR6 bound, no R8 support circle. Last cast frame held, watchdog windup+.3 cancels without impact. |
| Action | exact ability resolve | source side-view pagoda/light cone descends with acceleration over.26s | Billboard, never flattened onto ground. Requires true event aim, not a cached caster position. Short body only. |
| Contact | actual tower arrival | source crush/light + painted gold/brick fragments and gravity debris + local imprint at every actual enemy; one R6 ground seal | Support list never treated as enemies. No invented aim victim; only actual targets get local contact. |
| Recovery/support | short one-shot art, actual support list | tower condenses/dissolves gold by.94s, seal shrinks/fades over1.2s; gold chime rays reach each provided ally, local receipt folds/fades.32s | No live tower/debuff timer or fake5s shield timer. Missing source gives local receipts only. Shared shield displays actual snapshot state immediately and independently. |

The guard ray is a brief delivery/receipt presentation; it neither delays authoritative shield feedback nor manufactures its duration. If caster itself is in supportTargets, self receipt is allowed; otherwise no self guard is guessed.

## Source art, cleanup and dimensions

Five exact h00W jobs used: pagoda-toss-sheet, pagoda-descent-sheet, pagoda-seal-ground, pagoda-crush-hit-sheet, pagoda-guard-ray. `assets/vfx-source/ly-tinh/process-art.py` reproduces5 WebPs totaling1,113,250 bytes (~1.06MiB), common-canvas frames/layout and active-inventory.json with raw/prompt/output hashes, rects, anchors and warnings.

Measured source origins: toss floor413/831; tower300/614/924/1216; hit425/807. Common canvases and alpha-valley column cuts retain full roof/banner/brick silhouettes rather than fitting each frame. Premultiplied Lanczos at384px/frame; alpha16 cleanup. Seal is truly top-down: radialEdge=.446113 measures every retained alpha pixel, including pagoda roof/brick/corner extrema; size=R6/radialEdge ensures the painted perimeter stays in actual area. It remains fullR6 initially then contracts inside, not larger than gameplay.

Tower/hit retain original BLOCKED_ART flags for haze/fringe and old cell-margin warnings. Alpha-only matte repair keeps strong alpha≥48 components≥24px, with2px support for original soft edges/colors; disconnected haze is removed and original source hashes retained. Common output canvases add enough measured padding. No raw regeneration/substitute art/new painted pixels. The light cone and painted brick fragments remain readable in packed contacts. Small disconnected unsupported motes can be removed by this repair; user should accept the result visually later.

Guard raw canvas is3:1, but the retained painted-alpha rectangle has measured aspect4.213992. Runtime preserves the actual chime/tassel's full bounding rect and correct height rather than stretching that cropped strip back to3:1. +U chime head is retained at moving front with UV crop plus physical length; native width remains fixed. Receipt crops only the rightmost chime portion. Square contact thumbnails squeeze long strips; actual runtime uses this measured aspect.

Raw/packed light+dark contacts were viewed solely for construction: toss rotates/lifts/disappears, tower roof and light cone arrive then condense to motes, local crush releases gold bricks/dust, seal keeps open center, chime head and tassel are complete. No runtime visual quality/overlap/FPS claim.

## Root integration APIs

- Register `new VisualLyTinh(scene)` as dedicated HeroVfx after legacy handlers. Claims only cast/ability tier3-tier4-h00W. Dispatch full mixed event once, not once per ally.
- Cast uses event.windup, real event aim and optional actual source. Ability cancels old charge and reads only actual enemy extra.targets and actual ally extra.supportTargets. hasOrigin gates support travel; no stale origin fallback or fixed-axis ray when source is absent.
- No persistent marker API is needed. Existing generic shared shields own actual5s tierGoldShields snapshot and existing slow/attackWeak marks own4.5s state. This module does not synthesize status lifetime or ally IDs.
- `replay(origin,aim,reduced,kind='ultimate'):boolean` previews one tower with two client-only enemy contacts and two actual synthetic ally positions. No self target is synthesized. Root registers it via existing replay facility. Other kinds/invalid points/cap return false.
- `tick(dt,time)` updates shader charge, actual recipient ray phases, tower/hits/seal and bank. Cold textures retry within their current real phase; beam orientation guards degenerate geometry and does not invent axes. Self/zero-length support routes directly to receipt.
- `clear()` drops pending replay callback, charge/watchdog, tower/contact/seal/ray entries and releases all pooled resources; no delayed cast or receipt fires into the next zone.
- Foreground pass1: palm/tower/light cone/crush/guard under hero2/HP3. Ground pass0: seal/charge/scars. Tower width7.2u and .75opacity, short body≤.94s, prevents a huge opaque tower camping over enemies throughout debuffs.
- Reduced: uTime0, fixed toss/tower/hit poses, no flight/drop/contraction/spray; static local material/region/receipt remains and fades. No simulated shield state.
- Caps: cast6, tower6, enemy targets24 and support targets24 per event, concurrent rays64, painted112; shared bank/spray separately bounded. Logs visual.ly-tinh.layout/cast/resolve/contact/guard.receive/replay, plus kit asset/error/pool logs. Direct Tier3Art URLs/layouts, no shared atlas manifest edits.

## Handoff

Source/assets only. User later checks full mixed-target routing, actual ally list/self membership, shield snapshot appearance, source death/absence, R6 aim/seal, pagoda body/cone readability, gold condensation, chime head orientation/receipt fold, reduced motion/cold load and zone cleanup. No tests or build were run.

Unresolved questions: user visual acceptance of alpha-cleaned tower/hit formerly marked BLOCKED_ART remains pending.
