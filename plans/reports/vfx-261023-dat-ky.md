# Đát Kỷ h00X — ordered heart foxfire and folding nine tails

Status: source/assets complete; no tests/typecheck/build/browser/game or runtime validation, per user self-check instruction. Static source reading and construction-time raw/packed contact viewing only. No shared changes/gameplay/contracts/commits. Wait before h00Y.

## Actual mechanics and four phases

Server chooses up to7 real enemies inside caster.range+5, boss priority then near aim, preserving that order in targets. One resolve deals damage/knockback1.8/slow1.8s/sunder4s/vulnerability4s. Snapshot has no dedicated charm state: this module creates no charm cage, charm marker, lingering control or guessed debuff provenance. Shared actual status visuals remain responsible for those states.

| Phase | Trigger | Presentation | Boundary |
|---|---|---|---|
| Cast | exact cast and actual windup | pink-white nine-tail fan unfolds behind source, torso clear; personal shader has actual uTime and growing width/alpha | No ground damage radius around aim. Last cast frame held; watchdog windup+.3 cancels without impact. |
| Action | exact ability and ordered real targets | one dense heart-shaped foxfire orb accelerates and zigzags/curls along each true recipient leg; short painted pink/green trail follows actual velocity | No client boss/range selection, no padded target list or aim recipient. Missing current source skips all directional body/chain/tails and keeps only local actual contacts. |
| Contact | each actual recipient arrival | source foxfire bloom/smoke, pink/purple hot particles and small local dark ink-char decal | One local contact per true record, not radius blasts from aim. Plume drifts a small distance along actual caster→target direction; actors/gameplay never move in VFX. |
| Exit | short presentation recovery | nine tails curl inward through8–15 over.45s; orb shrinks, flame ribbon unspools/coils down in length and width over.34s | Separate one-shot exit motion, no invented charm timer. Slow/sunder/vulnerability remain common actual-state cues. Clear releases immediately without exit callbacks. |

## Source and construction

Four exact jobs: nine-tails-unfurl-sheet, fox-fire-orb-sheet, fox-fire-zigzag-trail, charm-burst-hit-sheet. The last file's historic name does not imply an implemented charm status.

`assets/vfx-source/dat-ky/process-art.py` reproduces4 WebPs totaling1,033,920 bytes (~1MiB), common-canvas frames, contact-light/dark, layout and active-inventory.json with original source/prompt/output hashes, measured rects/anchors/status warnings.

Tails nominal grid crosses body pixels near row627/940: measured cuts0/315/638/945/1254, row floor315/638/945/1210; orb/hit4×2 keep real row separation and common anchors. Alpha-valley columns preserve whole visible fan. Premultiplied Lanczos, alpha16, no per-frame bbox fitting. Trail native retained-alpha aspect4.970874; +U painted head always leads with UV range(1-reveal)..1 and length change, preserving height rather than stretching a ribbon over the full leg.

Tails retain BLOCKED_ART for original broad pink/purple haze and cell crossings. Alpha-only repair retains strong alpha≥48 connected components≥24px plus2px original soft-edge support, removes detached unsupported haze; common canvases pad full retained shapes. No raw regeneration, recolor or replacement painted pixels. Original warning/hash is preserved; tiny unsupported loose motes may be removed. User should accept this cleanup visually later.

Raw and packed light/dark contacts viewed for construction: tails have a clear torso opening, fan opens then folds to loose motes; actual orb has thick heart core and changing flame tongues; short hit source resolves into pink plume/fragments; trail has a distinctive zigzag pink/green flame profile. Square contact thumbnails distort long strip aspect, while runtime honors measured aspect. No in-game readability/overlap/FPS acceptance is claimed.

## Root APIs

- `new VisualDatKy(scene)` implements HeroVfx; register dedicated module after legacy routing. Exact cast/ability tier3-tier4-h00X only. No normal attack handler or persistent marker API.
- Root forwards true ordered enemy positions in extra.targets and truthful hasOrigin. The module copies up to7 records in order without selecting by aim or inventing recipients. Root's normal unique-target behavior is compatible with server-unique h00X.
- Missing caster cancels stale cast and only creates immediate local true-target contacts; no cached cast origin, synthetic source, fixed heading or follow-on path is used. Zero horizontal legs have no sideways offset; zero velocity/camera-parallel trail skips geometry rather than inventing orientation.
- `replay(origin,aim,reduced,kind='ultimate'):boolean` makes7 explicit client-only synthetic targets and the complete one-shot path/exit. Other kinds/invalid points/cap return false. Root registers normal replay hook.
- `tick(dt,time)` drives personal shader uniforms, true-recipient travel/contacts, short tail exit, ribbon contraction and kit bank. Texture acquisition retries within current actual phase; no late strike from canceled cast.
- `clear()` clears pending delayed replay, charge/watchdog, chains, hit and exit records, then releases all planes/layers/spray/bank resources. No callback crosses a zone change.
- Tails + personal charge world0 behind actor, with actual fan's empty center; orb/trail/hit foreground1, below hero2/HP3. Local char/decal world0. No broad bloom fog across bodies.
- Reduced: shader time0, fixed fan/orb/hit frames, no zigzag/jitter/trail/particle or scaling motion; true local contacts remain and fade. Tail exit is a fixed pose/fade. No fake status timer.
- Caps: cast6, chains6, contacts64, tail exits12, total painted112; kit bank/spray separately capped. Logs visual.dat-ky.layout/cast/resolve/contact/replay and kit asset/error/pool logs. Tier3Art direct URLs, no shared atlas manifest changes required.

## Handoff

No tests added or run. Root integrates source/replay/docs only; user later checks boss-first actual order, seven unique recipients/partial lists/empty list, source absent or dead, chain zero-distance/camera angles, pink heart body and trail head, fan/torso separation and alpha cleanup, fold/curl exits, reduced mode and zone clear. Shared actual debuffs must not be replaced with invented charm.

Unresolved questions: user visual acceptance of repaired tails remains pending; original BLOCKED_ART flag stays recorded.
