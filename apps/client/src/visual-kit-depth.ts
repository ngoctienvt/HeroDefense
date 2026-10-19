import type { Scene } from '@babylonjs/core/scene.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';

/**
 * Draw-order rules that keep heroes readable. Actor billboards are alpha-blended, write no depth
 * and sort by `alphaIndex = round(depth * 100)` (visual-actors.ts, depth along camera-facing XZ).
 * Anything drawn after an actor with alpha therefore veils it, so:
 * - ground decals (floors, ice, aura) use GROUND_ALPHA_INDEX: always before every actor;
 * - a shell around one actor uses actorAlphaIndex(...) - 1: right before that actor, which then
 *   paints crisply over the shell's centre and leaves only the rim visible.
 */
export const GROUND_ALPHA_INDEX = -1_000_000_000;

/** Same formula as animateActor: camera position − target, dotted with the actor's XZ. */
export function actorAlphaIndex(scene: Scene, x: number, z: number): number {
  const camera = scene.activeCamera as TargetCamera | null;
  if (!camera || typeof camera.getTarget !== 'function') return 0;
  const facing = camera.position.subtract(camera.getTarget());
  return Math.round((facing.x * x + facing.z * z) * 100);
}
