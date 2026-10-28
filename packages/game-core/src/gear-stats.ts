import { HERO_BY_ID } from '../../../content/catalog.js';
import { GEAR_BASE_STATS, gearEnhanceScale, gearLevelScale, gearLineFits,
  gearLineValue } from '../../../content/gear-design.js';
import { bondStatsOf } from './bond-mods.js';
import type { Enemy, GameState, GearStatId, GearUniqueId, Player, Unit } from '../../contracts/src/types.js';

/** Ratios are normalized here; armor remains an absolute value. */
export type GearMods = Readonly<Record<GearStatId, number>> & {
  readonly uniques: ReadonlySet<GearUniqueId>;
  readonly absorbedAttack: number;
  readonly absorbedHp: number;
  /** Movement speed bonus from bonds, as a ratio. */
  readonly moveSpeed: number;
};
function emptyStats(): Record<GearStatId, number> {
  return {
    'attack-percent': 0, 'crit-chance': 0, 'crit-damage': 0, 'armor-pierce': 0,
    'boss-damage': 0, 'execute-damage': 0, lifesteal: 0, 'pierce-length': 0,
    'cleave-radius': 0, 'health-percent': 0, 'armor-flat': 0, 'damage-reduction': 0,
    'health-regen': 0, 'respawn-reduction': 0, 'wave-shield': 0, 'melee-reflect': 0,
    'attack-speed': 0, 'skill-damage': 0, 'cooldown-reduction': 0,
    'rage-gain': 0, 'status-duration': 0, 'dot-damage': 0, 'summon-duration': 0,
  };
}
const EMPTY_MODS: GearMods = Object.freeze({ ...emptyStats(), uniques: new Set<GearUniqueId>(),
  absorbedAttack: 0, absorbedHp: 0, moveSpeed: 0 });
const cache = new WeakMap<Unit, { state: GameState; player: Player; version: number; bondVersion: number; slot: number;
  heroId: string; mods: GearMods }>();
const asStatValue = (stat: GearStatId, value: number): number =>
  stat === 'armor-flat' ? value : value / 100;

export function gearModsOf(state: GameState, unit: Unit): GearMods {
  const player = state.players[unit.owner];
  if (!player) return EMPTY_MODS;
  const cached = cache.get(unit);
  // Snapshot clients may reuse units while replacing their owning player object.
  if (cached?.state === state && cached.player === player && cached.version === player.gearVersion
    && cached.bondVersion === player.bondVersion && cached.slot === unit.slot && cached.heroId === unit.heroId)
    return cached.mods;
  const equipped = player.gear.filter(item => item.unitId === unit.id);
  let mods: GearMods = EMPTY_MODS;
  if (equipped.length) {
    const stats = emptyStats(), uniques = new Set<GearUniqueId>();
    let absorbedAttack = 0, absorbedHp = 0;
    for (const item of equipped) {
      const baseScale = gearLevelScale(item.level) * gearEnhanceScale(item.enhance);
      for (const line of GEAR_BASE_STATS[item.slot]) stats[line.stat] += asStatValue(line.stat, line.value * baseScale);
      for (const line of item.lines) {
        if (gearLineFits(line.stat, unit.heroId) !== false)
          stats[line.stat] += asStatValue(line.stat, gearLineValue(line, item.enhance));
      }
      if (item.unique) uniques.add(item.unique);
      if (item.unique === 'star-absorption') stats['attack-percent'] += Math.min(.6, Math.max(0, item.stacks ?? 0) * .0025);
      absorbedAttack += item.absorbedAttack ?? 0;
      absorbedHp += item.absorbedHp ?? 0;
    }
    mods = Object.freeze({ ...stats, uniques, absorbedAttack, absorbedHp, moveSpeed: 0 });
  }
  // Bond mods are layered outside the equipped branch so ungeared heroes receive them too.
  const bond = bondStatsOf(player, unit);
  if (bond) {
    const merged: Record<GearStatId, number> = { ...emptyStats() };
    for (const stat of Object.keys(merged) as GearStatId[]) merged[stat] = mods[stat] + (bond[stat] ?? 0);
    mods = Object.freeze({ ...merged, uniques: mods.uniques, absorbedAttack: mods.absorbedAttack, absorbedHp: mods.absorbedHp,
      moveSpeed: bond['move-speed'] ?? 0 });
  }
  cache.set(unit, { state, player, version: player.gearVersion, bondVersion: player.bondVersion, slot: unit.slot,
    heroId: unit.heroId, mods });
  return mods;
}

/** Callers without state use the cache populated by refreshStats or gearModsOf. */
export function peekGearMods(unit: Unit): GearMods {
  const cached = cache.get(unit);
  return cached?.heroId === unit.heroId ? cached.mods : EMPTY_MODS;
}

export function abilityCooldownFor(unit: Unit, base: number, state?: GameState): number {
  const mods = state ? gearModsOf(state, unit) : peekGearMods(unit);
  return Math.max(0, base * (1 - Math.min(1, mods['cooldown-reduction'])));
}

export function unitSpeed(unit: Unit): number {
  const mods = peekGearMods(unit);
  return HERO_BY_ID[unit.heroId].speed * (mods.uniques.has('wind-fire-wheels') ? 2 : 1) * (1 + mods.moveSpeed);
}

/** Attach crit provenance to the immediately following normal hit, never passive or skill damage. */
export function markGearNativeCrit(unit: Unit, target: Enemy, damage: number): void {
  if (unit.gearRuntime?.basicActive) unit.gearRuntime.nativeCritical = { targetId: target.id, damage };
}
