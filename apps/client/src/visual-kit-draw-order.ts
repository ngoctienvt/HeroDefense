import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';

/** Four Babylon passes: terrain/enemies → foreground skill art → heroes → health/mana. */
export const COMBAT_DRAW_GROUP = { world: 0, skill: 1, hero: 2, health: 3 } as const;
const configured = new WeakSet<object>();

export function configureCombatDrawOrder(scene: Pick<Scene,'setRenderingAutoClearDepthStencil'>): void {
  if (configured.has(scene)) return;
  // Preserve terrain depth for heroes; foreground VFX materials explicitly opt out of depth testing.
  scene.setRenderingAutoClearDepthStencil(COMBAT_DRAW_GROUP.skill,false);
  scene.setRenderingAutoClearDepthStencil(COMBAT_DRAW_GROUP.hero,false);
  scene.setRenderingAutoClearDepthStencil(COMBAT_DRAW_GROUP.health,true,true,true);
  configured.add(scene);
  debug('visual.kit.draw-order',{ groups:COMBAT_DRAW_GROUP });
}

type DrawMesh = { renderingGroupId: number };
export function assignActorDrawGroups(hero: boolean, body: readonly DrawMesh[], health: readonly DrawMesh[]): void {
  for (const mesh of body) mesh.renderingGroupId = hero ? COMBAT_DRAW_GROUP.hero : COMBAT_DRAW_GROUP.world;
  for (const mesh of health) mesh.renderingGroupId = COMBAT_DRAW_GROUP.health;
}
