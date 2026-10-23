# Pilot direction review

Date: 2026-10-22. This snapshots the current processed direction master candidates and their saved `master.json` framing warnings. It is not game-size visual acceptance or user approval.

| ID | Direction | Current source revision | Frame height | Saved framing warning |
|---|---|---|---:|---|
| m001 | south | `directions/south/master-final/` | 615 px | none |
| m001 | west | `directions/west/master-final/` | 615 px | width-limited; source JSON says scaled to fit width |
| m001 | north | `directions/north/master-final/` | 615 px | none |
| m001 | east | `directions/east/master-final/` | 615 px | none |
| m004 | west/north/east | `directions/<view>/master/` | 650 px | none in saved master metadata |
| b001 | west/north/east | `directions/<view>/master/` | 820 px | none in saved master metadata |
| art-gold-horn | west/north | `directions/<view>/master/` | 700 px | none in saved master metadata |

At this report snapshot, the remaining seven directions were art-chaos-dijiang west/north/east, art-silver-horn west/north/east, and art-gold-horn east; it counted 17 of 24 pilot pairs including Dijiang. m001 west should retain its narrower framing envelope when action sheets are created. All processed directions still need a side-by-side identity/camera and actual game-size review before export.

Additional source candidate, 2026-10-22: Đế Giang west master-candidate-20261022-0352-west-attempt.png (SHA-256 217adf6c769a1d6b75147148da339f15dcaa7b866d42689697f63d488206b075) was generated from the 03:42 candidate using prompt-v2-0352.txt. It retains the faceless orb and layered appendages; direction is still close to three-quarter, so it remains a candidate rather than a processed/approved direction master. The 03:50 edit was rejected for introducing a head-like front. Neither candidate is exported. No fixed blank-margin percentage is required; the 03:52 full silhouette remains inside its canvas, with atlas padding checked against the actual motion envelope during packing.

Update after user direction, 2026-10-22: Dijiang is skipped for this production pass; it remains in the approved 40-ID roster but has no direction/action completion. Source-only candidates for Kim Giác east and Ngân Giác west/north/east were visually reviewed after processing. Ngân Giác west reads left-facing, north shows the back, and east reads right-facing; identity and palette are consistent, with flask/hair/sleeve placement changing between views. Kim Giác east reads right-facing and preserves the recognizable single-horn silhouette. Keep these as direction candidates pending full cross-view identity, game-size and motion-envelope review; they are not approved or exported.

The project uses static character sprite sheets. New Ngân Giác east walk/attack sheet candidates are now in the action source folders with their prompts, provenance, SHA-256 and QC outputs. Walk has no cross-cell pixels but fails gait/identity stability; attack crosses cells and fails QC. Neither closes action approval or runtime requirements. A fixed 7% (or other percentage) blank margin is not required: only actual clipping/cell crossing and sufficient atlas padding for the motion envelope are constraints.

