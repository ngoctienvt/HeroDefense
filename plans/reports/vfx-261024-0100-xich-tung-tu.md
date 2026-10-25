# Xích Tùng Tử h010 — red jade gourd and sweet dew

Status: DONE_WITH_CONCERNS. Source/assets complete; source art flags retained. No tests, typecheck, build, browser, game or runtime validation executed. Static source review and construction contact inspection only. No shared/gameplay edits or commits.

Summary: real painted solid gourd volume tips/pours, head-led amber nectar delivers to verified recipients, material dew rain/ground/droplets gives support contact, small side-weapon true fire follows actual5s state.

## Actual mechanics / four phases

Server chooses up to4 lowest-HP allies except caster withinR8.5. They receive heal, stun clear, gold shield5s and tierBuff.fire5s. Separate empower applies to all allied units: it MUST NOT become the four presentation recipients. Client performs no HP/range selection, heal, shield or state prediction.

| Phase | Real trigger | Presentation | Boundary |
|---|---|---|---|
| Charge | exact cast/event.windup and current caster | original red jade gourd rises at upper side arm, tips; personal shader uTime and size/fill/alpha grow | Torso/face clear, no aim heal circle. Hold last cast pose; watchdog windup+.3 cancels without receipts. |
| Delivery | exact ability/current caster + supportTargets | thick amber stream with original large +U droplet head accelerates to each provided ally; UV crop preserves lead/head and native thickness | ≤4 true recipients; .12–.48s travel based distance. No guessed self or empower recipients. Missing caster skips volume/path and gives only local true receipt. |
| Receipt | each provided recipient | source dew drops/rain→small pooled gold ring, warm gold droplets and small ground contact | .65s material receipt. Generic actual heal/shield display remains shared; no extra damage/cleanse circle or fake periodic healing. |
| State / exit | exact tierBuff.kind fire snapshot | small flame tongue at side hand/weapon, open torso | Actual remaining5s, missing marker curls/inward shrinks and uses source terminal flame frames12..15 over.32s. Gourd returns/tips back/shrinks over.34s; nectar tail retracts over.18s independently of rain. |

## Art / source caveats

Four active WebPs total731,286 bytes; original raw/prompt/output SHA256 and rect/anchor/source warnings in active-inventory.json. Processing and contact files live assets/vfx-source/xich-tung-tu/. Layout visual-xich-tung-tu-layout.json. Fifth raw true-fire-hit-sheet is deliberately excluded from ultimate: it belongs normal attacks carrying fire state; no true normal-attack integration was requested. excluded-inventory.json preserves its original manifest/hash/status/reason. No unused runtime texture copied.

Gourd original BLOCKED_ART contains a brown/orange gradient across cells and cannot be used as a clean full flipbook. Only first-frame solid red jade prop and tassel are used: measured rect123,54→269,242; closed manually measured contour follows solid ink outline, eroded1 original pixel inward before premultiplied resize384×492. No color key or invented matte over the animated haze, no liquid/background from this sheet. Original painted red lacquer, gold clouds, jade fastener and tassel remain. Source warning is NOT marked resolved.

Runtime builds two curved contour surfaces joined at their common edge, four contour rings, original projected UV skin on both sides, maximum depth.54 against body width.95/height1.22. Opposite face winding/culling keeps the opposite skin behind the shown surface. Body tilts and returns as volume; no flat colored primitive replaces its identity. One-pixel inward contour can trim outer ink detail; user must accept at actual size. No brown gradient should be used as a material.

Rain4×2 measured row cut454, row ground444/835; fire4×4 cuts0/314/627/940/1254, row floor299/599/920/1207. Common canvases preserve motion/anchors without fitting each frame. Both retain BLOCKED_ART warnings about margin/fringe; alpha-only support keeps strong alpha≥48 components≥24px plus2px original soft edge support, drops unsupported haze/noise. Original RGBA retained. Stream full retained-alpha crop keeps actual +U large droplet head; mesh length changes with UV(1-reveal)..1 while fixed native thickness prevents stretching.

Raw, body detail and packed contact-light/contact-dark viewed for construction. Packed gourd has clean red/gold identity and tassel, rain has discrete drops then foot pooling, fire flame has true changing tongues and a small terminal curl. Square contact thumbnails distort the long strip aspect; runtime reads native measured aspect. These are construction observations, not in-game acceptance.

## Root APIs and limits

- `new VisualXichTungTu(scene)` implements HeroVfx. Exact tier3-tier4-h010 cast/ability only. Keep basic attacks/shared status visuals unchanged.
- Forward only exact server recipient positions in `extra.supportTargets`; max4 copied in order. `extra.targets` is intentionally ignored, preventing mixed/enemy/empower inference. `extra.hasOrigin` controls actual current caster, with no cached cast fallback.
- `markFire(id,at,remaining,reduced)` before tick every live frame, only actual tierBuff.kind==='fire' recipients. Reconnect shows current fire state without replaying pour/heal; missing marker starts.32s exit. No client5s refresh timer.
- `replay(origin,aim,reduced,kind='ultimate'):boolean` constructs4 explicit client-only recipients, .25s cast and5s synthetic snapshot marker; other kinds/invalid vectors/cap return false.
- `tick(dt,time)` updates shader uTime, curved-gourd pose, real-recipient delivery/rain and state fire. Reduced uses uTime0, fixed pose/sheet frames, no stream travel/spray/coiling motion; local static receipt stays readable. Zero-length or camera-parallel stream hides rather than inventing axis. Current phases retry pooled mesh acquisition while textures cold.
- `clear()` clears pending bank callbacks/previews, charge/watchdog/gourd records, stream/rain/fire queues, pools and spray/bank work. Cached disabled meshes/materials are bounded/reused. Caps casts/gourds6, streams24, fire64, painted planes128. Logs visual.xich-tung-tu.* cover config, cast/resolve/receipt, fire birth/exit, gourd load/error, replay and clear.
- Action gourd/stream/rain/fire in skill1 under hero2/HP3; small shader charge and ground world0. Fire lives at side-hand region rather than a ring around the body. Snapshot shield lifetime remains shared5s.

## User checks (unrun)

Check exact4 recipients/self exclusion, empower allies without nectar, missing caster, canceled cast, gourd silhouette/UV and no brown halo, stream leading head/zero-distance, rain foot anchor, fire side-hand at actual size, source-state disappearance, reduced mode, cold art and clear/change-zone. Build/game/tests and visual acceptance remain with user.
