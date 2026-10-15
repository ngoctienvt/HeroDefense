# Bàn Cổ sprite runtime

Outcome: replace h01B battlefield art with the generated top-down atlas; animate all four directions for idle, walk and attack.

Constraints: keep game-core/server authoritative; preserve other heroes; reduced motion remains supported; do not launch game or run build/tests without user request. Reuse existing texture/material lifecycle and debug buffer.

Non-goals: portraits, new gameplay, new cast/hit/death art.

Acceptance: 48 source frames resolve through JSON; idle/walk loop by duration; attack/cast use clamped action progress; remaining states fall back to idle with existing death cleanup; hit-stop freezes time; feet stay at declared origin. Add regression coverage and inspect callers without executing tests.

Plan reviewed against hero-motion, visual-sprites, visual-materials and animateActor: copy texture and manifest, add isolated frame resolver, route h01B through it, update focused tests and owning docs, review diff.

Status: implementation done; static review applied the geometry anchor fix for billboard rotation. User validation pending.

Delivered: runtime WebP and JSON resolver for 4 directions × 3 actions × 4 frames; duration-based idle/walk; attack/cast normalized to existing 0.38/0.3-second visual windows; hit/death idle fallback with existing cleanup; reduced-motion stills and attack impact; configuration/load debug logs. README and sprite documentation reflect 11 sample heroes.

Validation: static source review only. No typecheck, tests, build, game or browser executed. User commands:

```powershell
npm run typecheck
npm test -- apps/client/test/hero-motion.test.ts apps/client/test/pangu-motion.test.ts
npm run build
```

In-game acceptance remains pending: all directions/actions, feet under camera rotation, hit-stop, hit/death cleanup, reduced motion, texture fallback and visual quality/performance.

User feedback: idle must stand still; lateral facing was reversed. Runtime now holds idle frame 0. Fixed shared heroDirection screen-right projection to up × (target - camera), consistent with Babylon LookAtLH; added camera-matrix direction regression and time-invariant idle coverage. Updated debug configuration and owning docs. Static review only; user rerun pending.
