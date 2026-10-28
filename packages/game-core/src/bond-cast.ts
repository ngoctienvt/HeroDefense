import type { GameState, Unit } from '../../contracts/src/types.js';
import { castAbility } from './combat.js';
import { isDeployed } from './rules.js';

/**
 * Makes `unit` cast its own skill now, without needing full Nộ or a finished cooldown and without
 * spending either. Windup heroes enter the normal pendingAbility flow; the `bondTriggered` marker travels
 * with that pending cast so its later resolution cannot trigger further bond casts.
 * Returns false when the hero cannot cast right now (already winding up, dead, no valid target...).
 */
export function forceCast(state: GameState, unit: Unit, targetId?: string, scale = 1): boolean {
  if (!isDeployed(unit) || unit.pendingAbility || unit.phoenixEgg) return false;
  const energy = unit.energy, cooldown = unit.abilityCooldown, energySeen = unit.gearRuntime?.energySeen;
  if (unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit') unit.energy = unit.maxEnergy ?? 100;
  else unit.abilityCooldown = 0;
  const cast = castAbility(state, unit, targetId, true, scale);
  // The cast spends Nộ or starts the cooldown; a bond cast is free, so put both back.
  if (energy !== undefined) unit.energy = energy;
  unit.abilityCooldown = cooldown;
  if (energySeen !== undefined && unit.gearRuntime) unit.gearRuntime.energySeen = energySeen;
  return cast;
}
