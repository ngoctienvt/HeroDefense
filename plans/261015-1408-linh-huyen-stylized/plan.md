# Linh và Huyền — stylized sprite replacement

Outcome: replace all 8 Linh and 12 Huyền battlefield characters with a coherent Pangu-inspired hand-painted cel-shaded heroic style. Four camera-relative directions; static idle; complete walk cycle and attack windup/strike/recovery. Preserve gameplay, VFX, portrait identity and other tiers.

Art: builtin imagegen, one approved-by-visual-inspection turnaround/master per character, then separate walk and attack sheets referencing that master. User-selected sprite-sheet route overrides skill's video default; no video route configured. Four distinct directions, no mirror substitutes. HD alpha WebP + JSON with fixed feet anchor, separate source art/prompts/provenance and preview sheets. No body-sheet slash effects.

Steps: roster/style contract → turnaround masters → walk/attack action sheets → matte/slice/register/asset QA → runtime frame routing → static review and user validation. Keep existing accepted assets until replacements are packaged. User runs game/tests/typecheck/build per AGENTS.

Acceptance: 20 characters, 12 clips each; idle one frame; walk four distinct contact/passing/opposite-contact/passing poses; attack four distinct preparation/windup/strike/recovery poses; readable oversized weapons, simpler costume surfaces, consistent elevated camera and body scale; transparent background; no cropped weapons, no reversed facing, no animation bob during idle. Generated-art continuity and motion require visual review; no in-game quality/FPS claims before user checks.

## Progress

- All 20 four-direction masters generated; young black-haired Kim Tra and paired hook swords for Mộc Tra corrected. Ba Tiêu fan correction in progress.
- Thiên Lý Nhãn walk/attack sheets generated; attack bow-tip padding repair in progress. Asset packer produced a review bundle and detected source_outer_edge (0px, threshold2px) in the original attack row1/col2; do not publish that draft.
- Asset pipeline: `assets/sprites/linh-huyen-stylized/pack-sprites.py`; full-roster publication gate: `publish-sprites.py`. Source files/prompts in each hero/source; roster and prompt-contract JSON at asset root.
- New `stylized-motion.ts` and regression tests authored, deliberately not yet imported by live runtime until all 20 bundles are ready. Existing accepted assets still active.
- Remaining: finish corrections, generate the other 19 walk/attack sheet pairs, package and visually review all, publish together, integrate live runtime/portraits, update docs and static review. No game/test/typecheck/build execution.
