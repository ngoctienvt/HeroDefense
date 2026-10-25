# Asset inventory snapshot

Date: 2026-10-22. Source of truth: filesystem under `assets/sprites/monster-motion/` and runtime asset directory. This is a dated snapshot, not a completion claim.

| Evidence | Current count | Meaning |
|---|---:|---|
| Roster asset folders | 40 | Matches the approved roster count. |
| IDs with at least one processed `master_rgba.png` | 9 | m001, m002, m003, m004, b001, art-chaos-dijiang, art-frost-wyrm, art-gold-horn, art-silver-horn. Candidates/revisions do not imply approval. |
| Processed master `master_rgba.png` files | 36 | Includes alternate revisions and directions; not 36 distinct approved characters. |
| Processed direction master PNG files | 50 | `master.png` + `master_rgba.png` across 25 unique asset/direction folders, including multiple revisions. |
| Raw action sheet PNGs under `source/actions/` | 41 | Across 6 IDs: m001, m004, art-gold-horn, art-silver-horn, art-frost-wyrm and art-storm-ray. Separate from QC/preview PNGs. All remain candidates or failed inputs. |
| `source/export-manifest.json` files | 0 | No source bundle is ready for the manifest packer. |
| Files under asset `web/` directories | 0 | No packaged art/QA/preview bundle exists yet. |
| Runtime `monster-motion-*.json` manifests | 0 | The runtime foundation has no new authored asset to consume. |

The prompt inventory is ahead of the art inventory: all 40 IDs have a master prompt/legacy master source and direction/action prompts or direction masters, but prompt coverage is not generated art. The filesystem currently has processed master candidates for 9 IDs and raw action sheets for 5 IDs; no complete four-direction walk/flight+attack bundle has passed visual QA or export.







Raw master candidate mới sau snapshot: art-storm-ray có source/master-candidate-v1.png, prompt, route/hash và rà nền sáng/tối; chưa có direction/action bundle hoặc runtime art.

Direction candidates mới sau snapshot: art-storm-ray có east/north/west độc lập ngoài south master, prompt/hash/alpha sidecar và contact sheet sáng/tối. Đây mới là source reference, chưa tính là bộ art hoàn chỉnh.


Art-storm-ray flight south remains a failed/diagnostic action candidate, with two still sheets and an 8-frame preview under source/actions/flight/south/. The body drifts across the two halves; no final flight loop or export.



- Art-storm-ray added two static south-attack pose sheets, prompts, hashes and light/dark reviews. Both remain unapproved: rigid cell cropping would lose parts, so preserve each full image pending segmentation/registration or replacement. No runtime art added.



- 2026-10-23 update: art-storm-ray now has eight registered attack-south full-canvas still candidates with source/prompt/hash and light/dark contact sheets. They are not a complete creature bundle or runtime package.

