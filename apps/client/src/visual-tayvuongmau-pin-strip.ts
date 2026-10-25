import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { placeStrip } from './visual-de-tuan-strip.js';
import { foreshorten } from './visual-tayvuongmau-timeline.js';

/**
 * Puts a painted pin (needle tip on texture +X) with its tip at `tip`, flying along `direction`. The plane is
 * lengthened by the foreshortening of that line so the pin keeps the same apparent length falling, flying sideways or
 * toward the camera. `scale` shrinks/grows it about the tip. False for a degenerate direction.
 */
export function placePin(mesh: Mesh, tip: Vector3, direction: Vector3, look: Vector3, length: number, width: number,
  scale = 1): boolean {
  const factor = foreshorten(direction, look);
  return placeStrip(mesh, tip, direction, look, length * scale / factor, width * scale);
}
