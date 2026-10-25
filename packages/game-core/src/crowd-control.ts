import { HERO_BY_ID } from '../../../content/catalog.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';

/**
 * Hard crowd control (stun, freeze, root, silence, boss seal, taunt) succeeds
 * by chance, scaling with the caster's hero tier. Slows, attack slows,
 * knockback, pulls and armor break are not rolled.
 * Index 0 is tier 1 (Linh) … index 5 is tier 6 (Thần).
 */
export const CONTROL_CHANCE = {
  minion: [.05, .08, .11, .14, .17, .20],
  boss: [.005, .01, .02, .03, .04, .05],
} as const;

export type HardControl = 'stun' | 'frozen' | 'root' | 'silence' | 'sealed' | 'taunt';

/** Tier of the hero (or of the hero that created a summon); 0 when untiered. */
export function controlTier(unit: Pick<Unit, 'heroId'>): number {
  return HERO_BY_ID[unit.heroId]?.tier ?? 0;
}

export function controlChance(tier: number, boss: boolean): number {
  if (tier < 1) return 0;
  const table = boss ? CONTROL_CHANCE.boss : CONTROL_CHANCE.minion;
  return table[Math.min(table.length, Math.floor(tier)) - 1];
}

/** Independent xorshift stream so control rolls never shift crit or summon rolls. */
function controlRandom(state: GameState): number {
  let x = (state.controlSeed ?? ((state.seed ^ 0x9e3779b9) >>> 0)) | 0 || 1;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.controlSeed = x >>> 0;
  return state.controlSeed / 4294967296;
}

/** Roll once for one enemy; does not apply anything. */
export function rollHardControl(state: GameState, caster: Pick<Unit, 'heroId'>, enemy: Enemy): boolean {
  const chance = state.controlChanceOverride ?? controlChance(controlTier(caster), enemy.kind === 'boss');
  const success = chance >= 1 || (chance > 0 && controlRandom(state) < chance);
  const stats = (state.controlStats ??= {});
  const entry = (stats[caster.heroId] ??= { rolls: 0, hits: 0 });
  entry.rolls++;
  if (success) entry.hits++;
  return success;
}

/** Apply a timed hard control (or several paired fields) behind a single roll. */
export function tryHardControl(state: GameState, caster: Pick<Unit, 'heroId' | 'id'>, enemy: Enemy,
  kinds: HardControl | readonly HardControl[], seconds: number): boolean {
  if (seconds <= 0 || !rollHardControl(state, caster, enemy)) return false;
  for (const kind of typeof kinds === 'string' ? [kinds] : kinds) {
    if (kind === 'taunt') enemy.target = caster.id;
    else enemy[kind] = Math.max(enemy[kind] ?? 0, seconds);
  }
  return true;
}

/**
 * Ground effects refresh control every tick; roll only the first time each
 * enemy is touched and remember the outcome on the effect.
 */
export function zoneControlled(state: GameState, caster: Pick<Unit, 'heroId'>, enemy: Enemy,
  zone: { controlRolls?: Record<string, boolean> }): boolean {
  const rolls = (zone.controlRolls ??= {});
  return rolls[enemy.id] ??= rollHardControl(state, caster, enemy);
}
