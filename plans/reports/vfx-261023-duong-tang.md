# Đường Tăng h00S — fillet, chant and snapshot pure land

Status: source complete; focused tests8/8 pass. No shared files, gameplay, contracts, commits, game processes or browsers changed by delegate. Root owns integration and visual acceptance.

## Four phases, grounded in actual events

| Phase | Trigger/timing | Presentation | Safety boundary |
|---|---|---|---|
| Anticipation | exact cast, actual event.windup; hold until resolve or watchdog windup+.3 | fixed R6 aim rim, shader uTime refreshed each tick, growing gold fill/alpha; beads/sutra chant grows above caster shoulder | Locked event x/z beats adapter caster position. Missing source position skips shoulder art. Watchdog never impacts. |
| Action | one exact tier3-tier4-h00S ability | actual painted golden fillet descends3.2u with acceleration and contracts through frames0–9 over.28s | Aim comes from actual event; no old caster origin reused. Empty confirmed targets means no invented victim impacts. |
| Contact | single presentation contact at.28s after resolve, immediate static cue if reduced | each actual target gets squeeze art + gold particulate + small grounded imprint | Actual combat damage is one 290%+120% resolve; stun1.2s is only attempted by server. Module never creates stun/cage/persistent target restraint cues or damage. |
| Aftermath | exact source-owned tier-gold marker radius/remaining | top-down Dharma glyph, exact region rim, two low gentle bell ripples phased by real remaining | Server state solely keeps the area alive. Border disappears immediately when marker disappears; inner seal contracts/fades over.36s. Fillet recovery skips contact flash frame9, so it cannot imply another hit. |

Ground lifetime4.5s, R6, slow50% are verified in tier4-combat.ts. The code does not create a timer-based live region on ability; only replay uses synthetic markers. Existing shared stun/status presentation remains responsible for actual hard-control success/immunity feedback.

## Preserved source art and caveats

Five exact h00S jobs from tier34-codex-art used; no substitutions. `assets/vfx-source/duong-tang/process-art.py` preserves source pixels/hashes and writes `active-inventory.json`, frames, contact-light/dark and five runtime WebPs totaling1,542,332 bytes (~1.47MiB).

Measured boundaries: chant rows0/426/887, fillet0/340/641/928/1254, bell0/444/887, hit0/444/887. Nominal fillet4×4 cuts314/627/940 would split real rings across rows. Processing uses actual alpha valleys near column borders and common canvas/row anchors, with premultiplied Lanczos and alpha threshold16; no per-frame fitting.

Dharma ground radialEdge=.487511 is maximum distance of EVERY retained alpha pixel from centered canvas, including corners/petal extremities. Runtime size=radius/radialEdge, so all retained art stays within actual radius. An independent shader border stays exactly at R6. Fillet initial horizontal half-width=.4296875 maps first ring diameter to12u; later contraction is from real painted frames.

Source bell rings already contain the camera's42-degree ellipse; they are low world billboards, not flattened again. Dharma is truly top-down and uses a ground plane. This is deliberate to preserve the painted material proportions. Chant source is wood beads + sutra papers/chant rings, not a literal book or staff. Both packed contact sheets were visually inspected: coherent shape growth/recovery, retained edges, no obvious cross-cell debris or baseline jump. Runtime overlap/scale/camera orbit still awaits browser review.

## Integration APIs for root

- `new VisualDuongTang(scene)` implements HeroVfx. Register after legacy tier handlers and include h00S only in modern tier4 exact ultimate routing. No ordinary attack changes.
- cast(event,at,reduced,origin?) claims only cast tier3-tier4-h00S. Actual event x/z locks aim; event.windup must be finite positive.
- ability(event,origin,at,reduced,extra?) claims only ability tier3-tier4-h00S. Always cancels previous charge; consumes only actual `extra.targets`. No cached origin state is used after root withholds it. Root should forward full actual target positions, truthful hasOrigin and real aim event coordinates.
- `markGround(id,at,radius,remaining,reduced)` must be called every render BEFORE registry tick, only for the true ground tier-gold owned by h00S (root supplies provenance). Validate exact source hero in snapshot. Pass stable ground key, actual radius/remaining. The tracker enters mid-duration silently on reconnect and does not replay cast/contact.
- `replay(origin,aim,reduced,kind='ultimate'):boolean` creates one client presentation resolve and synthetic4.5s region. Pending replay requests are counted in the cap. Root registers it through existing replay facility. Other kinds return false.
- `tick(dt,time)` drives per-frame shader uniforms, snapshot tracker, art and delayed queue. `clear()` releases charges/ground border/planes, kills all queued strikes/hits/replay work and previews. No closing burst is fired during clear/zone switch.
- Direct Tier3Art URLs handle frame routing; no visual-kit-atlases.json changes needed.

Rendering: action/chant/contact in skill pass1 under hero2/HP3; main Dharma/bells/rim/telegraph world0. Reduced: uTime0, fixed chant/frame/size, no fillet flight/contraction or particles; static material/region information remains and fades on cleanup. Caps: charge6, fillet6, planes96, region12, target accents24 per resolve; shared bank/spray separately capped. Logs visual.duong-tang.layout/cast/resolve/impact/ground.seen/ground.close/replay; kit owns texture-error/pool logs.

## Verification and remaining checks

`npx vitest run apps/client/test/visual-duong-tang.test.ts`:8 passed; output in `plans/reports/vfx-261023-duong-tang-tests.log`. Coverage: phase hold/contact/recovery, reduced static, immediate border loss with inner collapse, closing skips impact frame9, radial scale, actual aim over caster adapter, truthful missing source, exact event claims, runtime uTime updates/constant aimR6/growing chant/watchdog, snapshot reconnect/remaining/no-reset/touched removal and plane release, exactly one material+spray+ground contact per actual target, pending cleanup, hashes/source measurement/draw-pass contracts.

Root still owns shared source routing, snapshot provenance, replay registration, docs and authorized typecheck/build/integration checks. No runtime visual/FPS acceptance claimed. Review actual R6 fillet silhouette, enemy readability under golden flash, shoulder/face separation, bright/dark battlefields, reduced mode, multiple simultaneous casters, ground expiration/early removal/reconnect/zone transition, and ellipse appearance under camera orbit.

Unresolved questions: none; visual acceptance pending. Do not begin hero3 until root authorizes.
