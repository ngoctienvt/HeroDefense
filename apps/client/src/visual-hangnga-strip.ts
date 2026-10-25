import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { placeStrip } from './visual-de-tuan-strip.js';
import { foreshorten } from './visual-hangnga-timeline.js';

/**
 * Puts the silk (crescent head on texture +X) with its head at `head`, heading along `direction`. The plane is
 * lengthened by the foreshortening of that line so the ribbon keeps the same apparent length on any heading.
 * False for a degenerate direction (heading along the view), in which case the caller skips the frame.
 */
export function placeSilk(mesh: Mesh, head: Vector3, direction: Vector3, look: Vector3, length: number, width: number): boolean {
  return placeStrip(mesh, head, direction, look, length / foreshorten(direction, look), width);
}
