import { HERO_BY_ID } from '../../../content/catalog.js';
import type { HeroAbility } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

/** Tier 3 presentation requires a real active skill; missing content is an explicit configuration error. */
export function tier3Ability(heroId: string): HeroAbility & { id: string } {
  const ability = HERO_BY_ID[heroId]?.ability;
  if (!ability?.id) {
    debug('visual.tier3.content.invalid', { heroId });
    throw new Error(`Missing active VFX ability for ${heroId}`);
  }
  return { ...ability, id: ability.id };
}
