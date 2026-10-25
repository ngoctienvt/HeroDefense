# Bát Giới h00J — asset processing, 2026-10-22

## Delivered

Five existing Codex RGBA artworks processed without new art. `assets/vfx-source/bat-gioi/process-art.py` verifies raw SHA-256 against the tier34 manifest and saves exact provenance, source rects, row origins and shared canvas sizes in `active-inventory.json`. Raw bytes, global art manifest flags and other heroes remain unchanged.

Existing BLOCKED_ART reports describe nominal-cell edges and faint alpha haze. Inspection found no alpha>=16 reaching any outer source boundary and no visibly missing foam, silver tine or ice shard. Measured blank row gaps recover intact shapes; all original surviving pixels belong to one extracted cell. Alpha below16 is discarded before premultiplied Lanczos resizing. No per-frame bbox fit, warping, mirroring or synthesized animation.

The first nominal-grid contact exposed rupture droplets/splash being assigned to adjacent rows. Final extraction uses measured separators, including distinct first-row cuts per rupture column (281/281/292/313), later cuts585/841, and common row floor origins282/574/804/982. Burst and guard use shared per-row ring centres to avoid row-dependent vertical jumps. No individual frame is fitted or independently moved to its bbox.

Both final contacts `assets/vfx-source/bat-gioi/contact-light.jpg` and `contact-dark.jpg` were inspected. Water, foam, silver tine fragments and cracked shell remain readable; silhouettes have transparent margins and no visible rectangular cuts. Guard hold poses5–12 visibly change rather than being duplicated; runtime should use the source P16 grow/hold/dissolve phases.

| Key | Frames/grid | Cell | Atlas | Bytes | anchorY |
|---|---|---|---|---|---|
| burst | 16 /4x4 |320|1280x1280|326320|0.650118|
| ground |1 /1x1|768|768x768|151386|0.5|
| guard |16 /4x4|320|1280x1280|432550|0.679191|
| rupture |16 /4x4|384|1536x1536|494478|0.899038|
| hit |8 /4x2|384|1536x768|251536|0.89916|

Total WebP: 1,656,270 bytes, quality90 alpha-quality95 via `tools/vfx/pack-flipbooks.ps1`.

## Footprint and interpretation

- Ground is the only top-down decal. Burst/guard depict oblique rings and airborne crest volume; rupture/hit are camera-angle splash/shell sheets. Their anchors reference the ring centre (burst/guard) or common floor (rupture/hit). Avoid projecting the camera-angle sheets flat a second time.
- Ground `radialEdge=0.458513` is radius/full image width, measured from centre383.5,383.5 in the final768px image. Includes **all nonzero alpha**, faint resampling fringes and farthest texel corners; rounded upward. Packed WebP independently gives0.4585127046, so this layout conservatively fits every texel inside a gameplay circle. Full plane side for R5 =5/0.458513 (~10.905u). Bounds are measured at alpha>=16.
- The cracked dome is a rupture phase only; it must not replace the shared live shield. Guard is the low ring while blockBonus is present, with silver rake fragments; no taunt art was introduced.

## Limitations

Static image processing and source review only. No game/server/browser, build, typecheck or tests run. Source has modest natural pose variation; actual P16 hold-loop smoothness, feet anchoring, depth pass, R5 sizing, crowded battle readability and reduced motion require runtime review. Final faint droplets intentionally persist before runtime fade; no fabricated empty terminal frame was inserted.
