# Linh và Huyền — stylized sprite replacement

Outcome: replace all 8 Linh and 12 Huyền battlefield characters with a coherent Pangu-inspired hand-painted cel-shaded heroic style. Four camera-relative directions; static idle; complete walk cycle and attack windup/strike/recovery. Preserve gameplay, VFX, portrait identity and other tiers.

Art: builtin imagegen, one approved-by-visual-inspection turnaround/master per character, then separate walk and attack sheets referencing that master. User-selected sprite-sheet route overrides skill's video default; no video route configured. Four distinct directions, no mirror substitutes. HD alpha WebP + JSON with fixed feet anchor, separate source art/prompts/provenance and preview sheets. No body-sheet slash effects.

Steps: roster/style contract → turnaround masters → walk/attack action sheets → matte/slice/register/asset QA → runtime frame routing → static review and user validation. Keep existing accepted assets until replacements are packaged. User runs game/tests/typecheck/build per AGENTS.

Acceptance: 20 characters, 12 clips each; idle one frame; walk four distinct contact/passing/opposite-contact/passing poses; attack four distinct preparation/windup/strike/recovery poses; readable oversized weapons, simpler costume surfaces, consistent elevated camera and body scale; transparent background; no cropped weapons, no reversed facing, no animation bob during idle. Generated-art continuity and motion require visual review; no in-game quality/FPS claims before user checks.

## Progress

- All 20 four-direction masters and 40 action sheets generated; corrected Kim Tra identity, Mộc Tra swords, Thiết Phiến banana leaf and Thiên Lý Nhãn bow padding. Sources and exact prompts retained.
- All 20 bundles published: 720 frames, 240 clips; WebP atlas/JSON and portraits installed in public/assets; ZIP exported. Asset QA has no source/alpha warning entries across the 20 final bundles. This is geometry/alpha evidence, not in-game motion approval.
- Runtime now routes all requested heroes to stylized sheets, holds idle still, loops four walk phases, holds cast windup and plays attack/recovery. Per-hero plane dimensions compensate long-weapon envelope reduction. Existing camera direction mapping and unrelated billboard changes preserved.
- Regression tests authored; README and source documentation updated. Spec compliance reviewed against roster, manifests, frame routing and local action review sheets. Independent static code review completed with no blocking concrete defects; see `reports/static-review.md`.
- User validation pending: test/typecheck/build and gameplay checks. Agent did not run those commands or launch the game, per AGENTS.
