# Kim Thân La Hán h03U — sarira compassion and deathless vow

Status: DONE_WITH_CONCERNS. Source/assets complete; original back-shell warning retained. No tests/typecheck/build/browser/game or runtime validation executed. Static source read and raw/packed contacts only. No shared/gameplay edits or commits.

Summary: nine solid painted amber relics, true-recipient compassion delivery, distinct exact resource recipient, split open bell vow4s and actual deathless body2s. Activation accent is event-only; snapshot reconnect never replays activation. This is HP clamp1, not resurrection or generic invulnerability.

## Mechanics and four phases

Server selects ≤4 lowest-HP allies except casterR8.5: heal and tierImmortal{remaining4,activeRemaining0}. Server now emits exact resourceTarget for strongest ally's rage/cooldown reward, possibly outside the four. Client never picks strongest or recipients. When a blessed unit would die, HP clamps1, remaining0/activeRemaining2, trait immortal-h03U source is that blessed unit. Body duration belongs actual snapshot.

| Phase | Trigger | Presentation | Limits |
|---|---|---|---|
| Warning | exact cast/actual windup/current caster | nine original amber beads on actual spherical meshes around upper side silhouette; soft compassion flare behind hero; personal shader uTime/size/alpha/fill grow | Last pose held, watchdog windup+.3 cancels without receipts. Missing source has no cast geometry. Nine is a visual motif, not hit count. |
| Delivery | exact ability/supportTargets and independent resourceTarget | +U relic-head compassion strips accelerate to each real ally; resource ray is shorter/thinner and finishes as a small high relic glyph | Max4 support +1 resource. Travel .13–.42s, native strip thickness with UV head crop; missing current caster skips rays and keeps local receipts. |
| Receipt/activation | true recipient / exact immortal-h03U trait | soft gold compassion material, small ground glint, warm droplets; activation adds ONE small .36s material accent/ground/particles at blessed unit | No false revive, damage, predicted HP clamp, or activation on snapshot birth. Resource receipt has no bell/body state or assumed healing. |
| State/exit | actual tierImmortal clocks | armed4s split bell, back world / thin front rim before HP; active2s bronze shoulder/foot plates with face/torso opening | Separate touched channels let bell fold as real body unfolds. Missing state .34s fold and source terminal frames12–15. Charge beads spiral inward/shrink and flare settles over.36s; rays retract .16s then receipt .52s. |

## Source, measured packing and caveat

Six WebPs1,414,240 bytes. Original raw/prompt/output SHA256, source flags, rects, anchors and processing kept in assets/vfx-source/kim-than-la-han/active-inventory.json and process-art.py. inspect-art.py retains raw alpha bounds. No raw regeneration/recolor or replacement art.

Compassion cast4×2 uses measured y430 gap after upper content ends408 and before lower starts444; center anchors230/650. Deathless4×4 raw1264×1244 uses y0/311/622/915/1244 (third gap890–927), row ground294/595/891/1178; common anchor .858896. Measured cuts avoid next-row speckles masquerading as feet. No per-frame fit, premultiplied Lanczos.

Bell back/front4×4 share384 common canvas, identical raw row ground307/605/901/1204 and anchor .880208. Original shared source coordinates preserved across both layers; last front frame is actually transparent and retained. Back source BLOCKED_ART for center mist/speckles is preserved. Alpha-only support keeps strong alpha≥48 connected components≥24px plus2px original edge support; no full-body fog or generated shell is added. Construction contacts show a clear center, but user still needs to accept the cleanup in game. Other five source assets are raw-ready.

Ray retained-alpha aspect6.206061 with painted +U relic head. Short reveal maps U(1-reveal)..1 while changing mesh length, preserving head and native transverse height. Bead retained aspect1.015873; original full-color amber skin is projected through spherical XY coordinates onto real12-segment spheres, sampling3% inside texture edge to avoid fringe at the silhouette. Sphere volume and original dark outline/core remain readable in source; no claim of runtime appearance.

Raw and both packed contact-light/contact-dark viewed for construction. Bronze body consists shoulder/foot pieces with empty face/torso; bell layers are separate thin arcs. Square contact thumbnails distort long ray aspect only in construction preview; runtime uses measured aspect.

## Root APIs / cleanup

- `new VisualKimThanLaHan(scene)` implements HeroVfx. Exact tier3-tier4-h03U cast/ability. `extra.supportTargets` only four true heal/vow allies, `extra.resourceTarget` only exact verified server reward recipient. They may overlap; resource still has its own small receipt.
- `markImmortal(id,at,remaining,activeRemaining,reduced)` before tick every actual frame, including both clocks. activeRemaining>0 chooses body; otherwise remaining>0 chooses vow. No state inferred from ability receipt, HP, generic shields or timers.
- Early-route trait `immortal-h03U` to ability without replaying unit attack. Actual event.x/z (or validated local targets) supplies one activation point. Event source is blessed unit; it need not be the h03U caster. Trait does not start a2s timer or create marker state.
- `replay(origin,aim,reduced,kind='ultimate'):boolean` makes4 explicit synthetic allies and one exact preview resource recipient, .25s cast; first ally synthetically activates at3s and gets2s body, others vow4s. Preview only. Unsupported kind/invalid vectors/caps return false.
- `tick(dt,time)` advances actual shader clock and current material phases; current phases retry pooled acquisition during cold loads. Reduced time0/fixed poses/frames, no ray travel/orbit/spray/coil movement; static support receipt remains clear.
- `clear()` cancels casts/watchdogs, delayed replay callbacks/previews, delivery/activation queues, both snapshot channels, beads/planes/layers and bank/spray work. Disabled bounded caches reused. Caps casts6, beads54, rays30, states96, accents24, planes192.
- Back/compassion ground in world0, bead/ray/body action1 under hero2; only thin original front rim uses health pass with ground alphaIndex before HP3. No interior front fog. Logs visual.kim-than-la-han.* cover config/cast/resolve/receipt/activation/state birth/fold/bead load/error/replay/clear.

## User checks (unrun)

Check exact4 allies/self exclusion, resource recipient outside/inside four, missing caster, vow expiration vs activation, true blessed-unit trait, reconnect already-active without large flash, face/torso opening, paired bell alignment, thin front rim before HP, reduced motion, cold assets and clear/change-zone. Tests/build/game and visual acceptance remain with user.
