import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';

/** Fallback look direction (battlefield camera beta .84) when no orbit camera is active. */
const FALLBACK_LOOK = new Vector3(0, -.669, -.743);

/** Camera view direction (position → target), unit length. */
export function cameraLook(scene: Pick<Scene, 'activeCamera'>): Vector3 {
  const camera = scene.activeCamera as TargetCamera | null;
  if (camera && typeof camera.getTarget === 'function') {
    const look = camera.getTarget().subtract(camera.position);
    if (look.lengthSquared() > 1e-6) return look.normalize();
  }
  return FALLBACK_LOOK.clone();
}

/**
 * Rotation of a unit plane whose texture +X runs along `direction` while the plane still faces the camera:
 * local +Z is the view direction (the front face looks back along -Z), +Y completes the right-handed basis,
 * so the strip's art is never mirrored. Undefined when the direction is degenerate or runs along the view.
 */
export function stripRotation(direction: Vector3, look: Vector3): Quaternion | undefined {
  if (direction.lengthSquared() < 1e-8) return undefined;
  const x = direction.normalize();
  const z = look.subtract(x.scale(Vector3.Dot(look, x)));
  if (z.lengthSquared() < 1e-4) return undefined;
  z.normalize();
  return Quaternion.RotationQuaternionFromAxis(x, Vector3.Cross(z, x), z);
}

/** Puts a painted strip (head on texture +X) with its head at `head`, trailing `length` behind it. */
export function placeStrip(mesh: Mesh, head: Vector3, direction: Vector3, look: Vector3, length: number, width: number): boolean {
  const rotation = stripRotation(direction, look);
  if (!rotation) return false;
  const x = direction.normalize();
  mesh.billboardMode = 0; // BILLBOARDMODE_NONE: the quaternion below already faces the camera
  mesh.rotationQuaternion = rotation;
  mesh.position.copyFrom(head.subtract(x.scale(length / 2)));
  mesh.scaling.set(length, width, 1);
  return true;
}

/** Pooled planes keep their quaternion: hand them back as plain billboards. */
export function resetStrip(mesh: Mesh | undefined): void {
  if (mesh) mesh.rotationQuaternion = null;
}
