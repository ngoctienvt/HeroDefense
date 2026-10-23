# Sage ultimate source implementation

Status: DONE_WITH_CONCERNS

- Updated `visual-nuwa.ts`, `visual-fuxi.ts`, `visual-shennong.ts`: separate ultimate art/charge/status from preserved normal attacks; preload selected source art; bounded particles, ribbons and pooled art; clear resets all local state.
- Nữ Oa: actual caster origin for windup, no all-lane radius, no invented impact point for empty target lists. Confirmed targets receive stone packet, localized hit, ground fragments and rock spray. Blessing/revive recipients use separate accents; shared shields are parent integration.
- Phục Hy: radius/remaining retained; awakening only event-resolved; snapshot current/link nodes and release frames from remaining. Caller must restrict link art to ultimate sharePercent=.6 (exported `isBaguaLink`), preserving normal .35 links. Live endpoint ribbons throttled to 12.5Hz.
- Thần Nông: actual medicine-vessel art, ground roots and leaf spray. Grove radius/remaining plus ending, current weakness, ally life-stream and actual summon-root markers. Root pose derives from remaining, including reconnect during hold and late closure. Life-stream throttled to 10Hz; caller owns same-zone eligibility independent of zone radius.
- Added `visual-fuxi-remaining.ts`, `visual-shennong-remaining.ts`, `visual-sage-remaining.test.ts` for authoritative radius, invalid snapshot rejection, link-source strength and reconnect-safe root frames.

## Integration owned by parent

- `VisualNuwa.cast(event, at, reduced, origin?)`; explicit caster origin preferred, legacy `at` already caster. Old `markShield` removed; parent routes shared shields.
- `VisualFuxi.markZone(id,at,radius,remaining,reduced=false)`, `markLink(id,from,to,remaining,reduced=false)`.
- `VisualShennong.markGrove(id,at,radius,remaining,reduced=false)`, `markTree(id,at,remaining,reduced=false)` (root accent only), `markWeakness(id,at,remaining,reduced=false)`, `markHeal(id,from,to,remaining,reduced=false)`.
- Replace actual ancient-tree summon prop in battlefield with `ancient-medicinal-tree` art; do not leave old primitive behind or create duplicate decorative trees.

## Verification

- Read changed code and shared helper source; `git diff --check` clean for three existing modules.
- Viewed source dark/light previews for stone rain, Bagua awakening, herbal vessel eruption and herbal mist. Parent asset owner handles complete packing/QA.
- No tests, typecheck, build, server, game or browser run, per AGENTS.md. New tests require user execution with project suite. In-game framing, ending, reduced-motion and crowded-scene performance remain unverified.

## Unresolved questions

None; parent integration/asset validation remains required before delivery.

## Follow-up static helper audit

- Fixed cast silhouettes that previously expired exactly at windup: `visual-nuwa-charge-art.ts` now holds each sage prepared pose until impact(source), bounded by the shared windup+1 cancellation watchdog. This adds no damage/impact timer. Pure tests cover delayed resolve and cancellation.
- Fixed periodically refreshed Thần Nông weakness (.1/.3 remaining) being stuck in release: keep actual remaining, hold frame7, compress disappearance ending to less than remaining. No fabricated lifetime.
- Static review of actual Tier6Art/Tier6Charge/timeline APIs confirms string|number IDs supported, bounded startFrame/endFrame supported, manifest has cell dimensions. No helper edits made.
- Parent helper concerns sent: marker resumed after one missed tick immediately recreates (potential pop and animation restart); existing marker mutation does not revalidate size/coordinates; pre-existing constructor preloads all hero art accepted by parent. No evidence of remaining integration blocker within owned modules.
- Tests/typecheck/build/game remain unrun.

## Deployment-driven preloading

- Moved all three hero art.prepare lists into public prepare() methods. Constructors no longer preload those art atlases; parent VisualEffects.prepareHero owns deployed-hero preloading. play/mark retain lazy fallback.
- Re-read current timeline/helper APIs against regression expectations: no obvious source type mismatch; string|number source keys and fixed startFrame=endFrame marker segments remain compatible. Parent has corrected marker resume to preserve the entry. No tests or typecheck executed.
