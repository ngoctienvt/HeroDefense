import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { VisualActor } from './visual-actors.js';

export type NhuLaiReplayTarget = { replayNhuLai(kind: string, at: Vector3): boolean };

/**
 * `?debug=1` only: `__vfxReplay('h01J')` replays Như Lai's palm, five-finger mountain and shield on the first Như Lai
 * in view (or the camera focus point); `('h01J', 'trait')` one basic strike, `('h01J', 'shield')` the shell alone,
 * `('h01J', 'skill', x, z)` the palm at that point.
 */
export function replayNhuLai(actors: Map<string, VisualActor>, zone: number, effects: NhuLaiReplayTarget,
  focus: (x: number, z: number) => void, camera: Vector3, kind?: string, x?: number, z?: number): boolean {
  const actor = [...actors.values()].find(a => a.heroId === 'h01J' && a.zone === zone && a.hp > 0 && !a.dying);
  const at = x === undefined || z === undefined ? (actor?.root.position ?? camera).clone() : new Vector3(x, 0, z);
  at.y = 0;
  focus(at.x, at.z);
  return effects.replayNhuLai(kind ?? 'skill', at);
}
