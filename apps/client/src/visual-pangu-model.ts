import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { HERO_MODELS } from './hero-models.js';
import { createHeroModel, preloadHeroModel } from './visual-hero-model.js';

/** Bàn Cổ (h01B) through the shared hero-model loader; kept for existing imports and tests. */
const PANGU = HERO_MODELS.h01B;
export const PANGU_MODEL_URL = PANGU.url;
// Approximate visible body height of the existing sprite, excluding the raised axe.
export const PANGU_MODEL_HEIGHT = PANGU.height;

export function preloadPanguModel(scene: Scene): void { preloadHeroModel(scene, PANGU); }
export function createPanguModel(scene: Scene, parent: TransformNode, initiallyActive: boolean) {
  return createHeroModel(scene, parent, initiallyActive, PANGU);
}
