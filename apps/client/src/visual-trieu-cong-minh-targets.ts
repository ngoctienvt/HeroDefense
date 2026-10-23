import type { GameState } from '../../../packages/contracts/src/types.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
interface RecipientActor { heroId?: string; zone: number; root: { position: Vector3 } }
/** Server membership plus actor kind, never distance/block/HP heuristics. Dead monster actors can outlive snapshot removal. */
export function splitCoinRecipients(ids: readonly string[], state: (Pick<GameState,'units'> & Partial<Pick<GameState,'enemies'>>) | undefined,
  actors: ReadonlyMap<string,RecipientActor>, zone: number): { hits: Vector3[]; support: Vector3[] } {
  const hits: Vector3[]=[],support: Vector3[]=[];
  for (const id of new Set(ids)) {
    const actor=actors.get(id);
    if (!actor || actor.zone!==zone) continue;
    const unit=state?.units[id],enemy=state?.enemies?.[id];
    if (unit && unit.zone===zone && actor.heroId) support.push(actor.root.position.clone());
    else if (!unit && !actor.heroId && (!enemy || enemy.zone===zone)) hits.push(actor.root.position.clone());
  }
  return {hits,support};
}
