# Na Tra h00V — ordered Qiankun ring and real Nezha form

Status: source/assets complete; no tests/typecheck/build/browser/game run or new QA work, per user steering. Only construction-time static reads and raw/packed contact viewing. No shared integration/gameplay/contract changes or commits. Root owns shared integration; user owns later checks. Wait before hero6.

## Four phases and actual mechanics

Server h00V selects real enemies around aimR6, cycles up to8 strike records, consumes any actual burn damage internally, then applies own tierBuff.kind='nezha'5.5s and empower separately. The emitted targets order can repeat an enemy. Renderer never deduplicates or pads that sequence, and no event data currently proves per-record consumed burn, so there is no extra burn-consumption explosion cue.

| Phase | Trigger | Presentation | Boundary |
|---|---|---|---|
| Cast | actual cast windup | thick painted fiery ring rises at side upper arm; rotating L8 body, small material shader charge attached to ring with growing alpha/scale and actual uTime | Personal ring charge, no damage circle at aim. Hold final cast pose when late; watchdog windup+.3 cleans without impact. Missing actual source skips cast body. |
| Action | one exact ability and actual ordered targets | one same ring accelerates along each actual leg, arcs slightly and trails short source-painted flame/embers | Records preserved including repeated positions. Zero-length repeated leg is a short in-place bounce, never a fixed direction. Missing source begins at first actual recipient; no aim recipient invented. |
| Contact | each record's ring arrival | source flame impact + hot debris + local small lava/ground scar, once per record | Repeated enemy records receive repeated presentation contacts. This is brief ring/flame material, not an unsupported extra burn-detonation event, and not8R6 area blasts. |
| Form/exit | exact tierBuff nezha remaining5.5s | source phantom arms/weapon silhouette behind open torso, low personal ring-wheel accents at feet, sustain frames0–11 | Marker only; no live client timer. Fresh mark unfolds; reconnect enters current open phase. Missing marker curls/folds/extinguishes through12–15 over.34s, wheels shrink. Clear simply releases. |

Normal boosted attack/passive R5 sweep/expanded-ground assets were read but deliberately excluded. Foot accents use two small copies of the actual painted ring ONLY during the temporary form; they do not create/replace existing passive circles or advertise an R5 gameplay area.

## Art, volume and matte repair

Raw6 jobs inspected: qiankun-ring-spin-sheet, qiankun-ring-trail, ring-detonate-burst-sheet, three-heads-six-arms-sheet, fire-wheel-sweep-sheet, fire-wheel-expanded-ground. Active runtime uses first4 only. L8 ring already shows a wide thick gold rim, red inside wall and full oblique/edge-on rotation poses; the exact painted body provides visible volume. No thin generic circle or primitive replacement was used.

`assets/vfx-source/na-tra/process-art.py` preserves original source/prompt hashes and generates source anchors/rects, common-canvas frames, light/dark contacts, layout and active-inventory.json. Four runtime WebPs total1,289,954 bytes (~1.23MiB). Ring canvas418px/hit358px/form368px, all downsampled premultiplied to384px; row cuts ring/hit0/444/887, form0/315/627/941/1254; measured origins retained. Trail keeps full alpha bbox and native aspect4.5714286; +U flame head stays attached to moving ring while UV span and length grow together.

Form source is BLOCKED_ART for detached red/gold alpha haze/noise. Processing repairs the matte only: retain strong alpha≥48 connected components≥24px, dilate2px to retain original soft edge colors/alpha, remove detached unsupported haze, then normal alpha16 cutoff. Original source file/hash and warning are preserved; no recoloring, generated replacement arms or new painted pixels. Packed contact sheets show a readable open-center arm/ring/spear motif with scattered haze removed, including distinct terminal dissolving poses. Small unsupported ember flecks can be removed by this matte repair; source status remains blocked pending user acceptance of the cleanup.

Raw/packed contacts light+dark viewed for construction: thick ring changes orientation with intact inner hole; hit bursts recover to near empty; cleaned form keeps torso/face opening and arm/weapon identity; trail remains saturated orange/red with dark ember tail. Runtime world scale, overlap and material appearance remain user checks, not claimed accepted.

## Root APIs

- `new VisualNaTra(scene)` implements HeroVfx; register dedicated handler after legacy exact tier4 routing.
- Cast/ability claim ONLY tier3-tier4-h00V and corresponding event kind. No normal attack or passive handlers. Ability cancels old charge first.
- Forward AbilityExtra.targets as ordered true records, including duplicates; preserveRepeatedEnemyHits must stay enabled for h00V. No Set/position dedup. True hasOrigin gates the first source body; no cached origin fallback. Empty targets produce no chain or aim effect.
- `markForm(id,at,remaining,reduced)` each render BEFORE registry tick, ONLY actual h00V tierBuff.kind==='nezha', with real remaining. Empower/shared attack-up remains separate existing feedback.
- `replay(origin,aim,reduced,kind='ultimate'):boolean` provides client-only ordered8-record replay from3 actual synthetic positions, deliberately repeats records to demonstrate sequence. Client form marker lasts5.5s; live sequence never makes up extra recipients. Other kinds/invalid points return false.
- `tick(dt,time)` updates personal charge shader, touched form lifecycle, chain/contact phases and kit bank. Every short chain/marker phase retries cold texture acquisition. `clear()` kills pending replay callbacks, preview marker records, casts, chains, hits/forms/wheels and pooled resources without exit bursts into the next zone.
- Main action/impact ring/trail are skill pass1 below heroes2/HP3. Form arms and low foot rings use separate world materials at pass0, before actors; transparent torso remains clear. The small charge shader surrounds the upper-arm ring, not the actor.
- Reduced motion: uTime0, fixed ring/form/hit phases, no links/arcs/trails/particles. All real contact records still present, then static material fades. Form exit fades without resizing.
- Caps: casts6, concurrent chains6,8records per chain, hit records72, action planes96, forms24 with72 world planes, pending+active replay6; kit bank/spray separately capped. Debug visual.na-tra.layout/cast/resolve/contact(record index)/form.seen/form.extinguish/replay, plus normal kit load/error/cap logs.
- Direct Tier3Art URLs and measured layouts; no shared atlas registry edits needed.

## Handoff

No test/compile/runtime results claimed. User explicitly chose to self-check; no tests were added/run for h00V. Root may finish registry, ordered-duplicate routing, snapshot mark, replay and docs by source review. Later user scenarios: single target repeated8times, multi-target order, source absent/dead, canceled cast, real form refresh/reconnect/expiry/zone switch, normal R5 attacks unaffected, reduced mode, ring volume/readability and cleaned source-art acceptance.

Unresolved questions: original form BLOCKED_ART stays a caveat until user visually accepts alpha-only cleanup.
