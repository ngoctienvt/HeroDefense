import type { GameState, HeroDef, Unit } from '../../../packages/contracts/src/types.js';
import { abilityCooldownFor } from '../../../packages/game-core/src/gear-stats.js';

/**
 * HP and skill-energy readouts shared by the dock, action bar, tooltip and battlefield bars.
 * Mirrors server energy and the shared gear cooldown calculation.
 */
export type HpLevel = 'high' | 'mid' | 'low';
export interface HpState { percent: number; level: HpLevel }
export interface EnergyState {
  kind: 'rage' | 'cooldown' | 'none';
  /** 0-100: rage fill, or how far the cooldown has recharged. */
  percent: number;
  ready: boolean;
  current: number;
  max: number;
  /** Seconds left on the cooldown (0 for rage heroes). */
  remaining: number;
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function hpState(hp: number, maxHp: number): HpState {
  const percent = clampPercent(maxHp > 0 ? (hp / maxHp) * 100 : 0);
  return { percent, level: percent > 70 ? 'high' : percent > 35 ? 'mid' : 'low' };
}

export function isRageHero(unit: Pick<Unit, 'energyType'>): boolean {
  return unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit';
}

export function abilityCooldownMax(hero: Pick<HeroDef, 'ability'>, unit: Unit, state?: GameState): number {
  return hero.ability ? abilityCooldownFor(unit, hero.ability.cooldown, state) : 0;
}

export function energyState(
  unit: Unit,
  hero: Pick<HeroDef, 'ability'> | undefined,
  state?: GameState,
): EnergyState {
  if (!hero?.ability) return { kind: 'none', percent: 0, ready: false, current: 0, max: 0, remaining: 0 };
  if (isRageHero(unit)) {
    const max = unit.maxEnergy ?? 100, current = Math.max(0, unit.energy ?? 0);
    return { kind: 'rage', percent: clampPercent((current / Math.max(1, max)) * 100), ready: current >= max, current, max, remaining: 0 };
  }
  const max = abilityCooldownMax(hero, unit, state), remaining = Math.max(0, unit.abilityCooldown ?? 0);
  return { kind: 'cooldown', percent: max > 0 ? clampPercent((1 - remaining / max) * 100) : 100, ready: remaining <= 0, current: max - remaining, max, remaining };
}

/** Short status line for buttons and tooltips: "Sẵn sàng", "Còn 4s" or "Nộ 62/100". */
export function energyLabel(energy: EnergyState): string {
  if (energy.kind === 'none') return 'Bị động';
  if (energy.ready) return 'Sẵn sàng';
  return energy.kind === 'rage' ? `Nộ ${Math.floor(energy.current)}/${energy.max}` : `Còn ${Math.ceil(energy.remaining)}s`;
}
