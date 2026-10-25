---
title: Round-one pig 3D integration
date: 2026-10-24
summary: Source and GLB delivered; user verification pending.
---

Supplied Walking/Zombie Attack FBX merged into a 5.3 MB GLB. Client uses it only for m001 minions created in wave 1, zone 0; other waves and gameplay preserved. Shared geometry/materials, independent animation/rig, server-event attack sampling and async cleanup added.

Static review complete, regression tests authored. No tests, typecheck, build or game executed per user rules. Next: user restarts launcher, checks facing/grounding/deformation/picking/HP and wave-two sprites. Details in ../reports/implementation-261024-0111-round-one-pig.md.

Persistence fallback: `ak journal create --stdin --no-interactive --verbose` failed with Windows `journals: rename: An invalid HANDLE was specified`; saved directly within project plans. AgentWiki publish skipped.
