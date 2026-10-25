# Round-one pig delivery

- Source: supplied Walking.fbx and Zombie Attack.fbx; combined into one 5.3 MB GLB, 23,594 polygons, shared geometry/materials and independent rig/clip state per actor.
- Client routing only: m001 minion created wave 1, zone 0. Other waves/hero skins preserved; no gameplay/network edits.
- Manual animation uses movement and existing windup/strike progress, static idle; root motion removed offline. Picking/HP/overlay and async disposal integrated. visual.pig.* debug logs and procedural fallback.
- Conversion completed with Blender 5.2. Exporter uses four strongest bone influences per vertex; original FBX retained. Runtime image/clip shape and dimensions inspected from file metadata, no gameplay verification.
- Static reviewer found no concrete API/type blocker. Regression tests added for route scope, clip phase, idle/reduced motion and embedded clips/rig/textures.
- Not run: test, typecheck, build, server/game/browser. User restriction honored. Visual acceptance and FPS pending.
- User checks: npm run typecheck; npm test -- apps/client/test/visual-pig-model.test.ts; stop old server, run start-game.cmd, Ctrl+F5. Inspect wave1 walking/attack/facing/feet/HP/picking/death, reduced motion, wave2 wolf sprites. Debug console window.__thienDaoDebug().
- Docs owner: docs/monster-boss-sprites.md. No unresolved implementation decisions.
