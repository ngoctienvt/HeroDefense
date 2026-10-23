import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import type { Scene } from '@babylonjs/core/scene.js';

/** Fallback look direction (battlefield camera beta .84 → elevation 42°) when no orbit camera is active. */
const FALLBACK_FORWARD = new Vector3(0, -.669, -.743);

/** Camera position → target (same read as `actorAlphaIndex`); undefined without an orbit camera or when degenerate. */
function lookVector(scene: Pick<Scene, 'activeCamera'>): Vector3 | undefined {
  const camera = scene.activeCamera as TargetCamera | null;
  if (!camera || typeof camera.getTarget !== 'function') return undefined;
  const look = camera.getTarget().subtract(camera.position);
  return look.lengthSquared() > 1e-6 ? look : undefined;
}

/**
 * Screen-up of the camera in world space: world Up with its component along the view direction removed.
 * Billboard planes stand along this vector, so offsets measured "up the sprite" must follow it, not world Y.
 */
export function screenUp(scene: Pick<Scene, 'activeCamera'>): Vector3 {
  const look = lookVector(scene);
  const forward = look ? look.normalize() : FALLBACK_FORWARD;
  const up = Vector3.Up().subtract(forward.scale(Vector3.Dot(Vector3.Up(), forward)));
  return up.lengthSquared() > 1e-6 ? up.normalize() : Vector3.Up();
}

/**
 * Centre of a camera-facing plane whose artwork touches the ground at `feet`: `anchorY` is the fraction of the
 * plane height (from the top) where the feet sit, so the centre is (anchorY − .5)·height above them along screen-up.
 * `lift` raises the whole sprite along the same axis.
 */
export function billboardCenter(feet: Vector3, height: number, anchorY: number, up: Vector3, lift = 0): Vector3 {
  return feet.add(up.scale((anchorY - .5) * height + lift));
}

/** Horizontal unit vector pointing away from the camera (the battlefield's far side); -Z when no camera is active. */
export function farDirection(scene: Pick<Scene, 'activeCamera'>): Vector3 {
  const look = lookVector(scene);
  if (look) {
    look.y = 0;
    if (look.lengthSquared() > 1e-6) return look.normalize();
  }
  return new Vector3(0, 0, -1);
}
