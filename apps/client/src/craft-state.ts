import { CRAFT_RECIPES, HERO_BY_ID } from '../../../content/catalog.js';
import type { Player, Unit } from '../../../packages/contracts/src/types.js';

/**
 * Heroes the player can craft right now, using the server rule in game-core roster.ts: every
 * ingredient is a 1★ copy outside dungeons, and at most one missing Phẩm 3 / Phẩm 4 ingredient
 * may be replaced by a Linh Phôi of the same tier.
 */
export function craftableHeroIds(units: readonly Unit[], ownerId: string, embryos: Pick<Player['embryos'], 'tier3' | 'tier4'> | undefined): Set<string> {
  const have = new Map<string, number>();
  for (const unit of units) if (unit.owner === ownerId && unit.rank === 1 && unit.zone === 0) have.set(unit.heroId, (have.get(unit.heroId) ?? 0) + 1);
  const result = new Set<string>();
  for (const recipe of CRAFT_RECIPES) {
    const need = new Map<string, number>();
    for (const id of recipe.ingredients) need.set(id, (need.get(id) ?? 0) + 1);
    const missing: string[] = [];
    for (const [id, count] of need) for (let i = have.get(id) ?? 0; i < count; i++) missing.push(id);
    if (!missing.length) { result.add(recipe.heroId); continue; }
    if (missing.length !== 1 || !embryos) continue;
    const tier = HERO_BY_ID[missing[0]]?.tier;
    if (tier === 3 && embryos.tier3 > 0 || tier === 4 && embryos.tier4 > 0) result.add(recipe.heroId);
  }
  return result;
}
