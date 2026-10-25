import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent, GameState } from '../../../packages/contracts/src/types.js';
import type { AbilityExtra } from './visual-kit-hero.js';

type Actor = { heroId?: string; zone: number; dying: boolean; root: { position: Vector3 } };

/** Resolve presentation metadata against real membership, without choosing recipients on the client. */
export function tier4Presentation(event: GameEvent, state: Pick<GameState, 'units'> | undefined, zone: number,
  actor: (id: string) => Actor | undefined): Pick<AbilityExtra, 'resourceTarget' | 'displacements'> {
  const result: { resourceTarget?: Vector3; displacements?: { from: Vector3; to: Vector3 }[] } = {};
  if (event.skillId === 'tier3-tier4-h03U' && event.resourceTarget) {
    const unit = state?.units[event.resourceTarget], visual = actor(event.resourceTarget);
    if (unit && unit.zone === zone && unit.hp > 0 && unit.respawn <= 0
      && (unit.slot >= 0 || unit.summonDuration !== undefined) && visual?.heroId
      && visual.zone === zone && !visual.dying
      && [visual.root.position.x, visual.root.position.y, visual.root.position.z].every(Number.isFinite))
      result.resourceTarget = visual.root.position.clone();
  }
  if (event.skillId === 'tier3-tier4-h03T' && event.zone === zone) {
    const confirmed = new Set(event.targets ?? []), seen = new Set<string>();
    result.displacements = [];
    for (const move of event.displacements ?? []) {
      const visual = actor(move.id);
      if (!confirmed.has(move.id) || seen.has(move.id) || !visual || visual.heroId || visual.zone !== zone
        || ![move.from.x, move.from.z, move.to.x, move.to.z].every(Number.isFinite)) continue;
      seen.add(move.id);
      result.displacements.push({ from: new Vector3(move.from.x, 0, move.from.z), to: new Vector3(move.to.x, 0, move.to.z) });
    }
  }
  return result;
}
