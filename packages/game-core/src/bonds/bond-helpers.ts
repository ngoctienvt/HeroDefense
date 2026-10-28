import { SYNERGIES } from '../../../../content/catalog.js';
import type { Enemy, GameState, Player, Unit } from '../../../contracts/src/types.js';
import { isBondMember } from '../bond-mods.js';
import { distance, isDeployed, nextId } from '../rules.js';
import { createUnit } from '../unit-factory.js';
import type { BondContext } from './index.js';

export const membersOf = (bondId: number): readonly string[] => SYNERGIES.find(s => s.id === bondId)?.members ?? [];

/** Real, deployed, living heroes of the owner. */
export function deployedHeroes(state: GameState, owner: string): Unit[] {
  return Object.values(state.units).filter(u => u.owner === owner && u.slot >= 0 && isBondMember(u) && isDeployed(u));
}
export function deployedHero(state: GameState, owner: string, heroId: string): Unit | undefined {
  return deployedHeroes(state, owner).find(u => u.heroId === heroId);
}
/** The unit is a real hero listed in this bond's roster. */
export const isMember = (ctx: BondContext, unit: Pick<Unit, 'heroId' | 'summonDuration' | 'summonerId'>): boolean =>
  isBondMember(unit) && membersOf(ctx.bondId).includes(unit.heroId);
export const deployedMembers = (ctx: BondContext): Unit[] =>
  deployedHeroes(ctx.state, ctx.owner).filter(u => membersOf(ctx.bondId).includes(u.heroId));

export const isMinion = (enemy: Enemy): boolean => enemy.kind !== 'boss' && (enemy.rank === undefined || enemy.rank === 'minion');
export const isEliteOrChieftain = (enemy: Enemy): boolean => enemy.rank === 'elite' || enemy.rank === 'chieftain';
export const isBossLike = (enemy: Enemy): boolean => enemy.kind === 'boss' || enemy.rank === 'boss' || enemy.rank === 'chieftain';

export function enemiesIn(state: GameState, zone: number): Enemy[] {
  return Object.values(state.enemies).filter(e => e.zone === zone && e.hp > 0);
}
/** The enemy a skill was aimed at, or the closest one when it had no explicit target. */
export function castFocus(state: GameState, caster: Unit, targetId?: string): Enemy | undefined {
  const aimed = targetId ? state.enemies[targetId] : undefined;
  if (aimed && aimed.hp > 0) return aimed;
  return enemiesIn(state, caster.zone).sort((a, b) => distance(a, caster) - distance(b, caster))[0];
}
export function nearestTo(enemies: Enemy[], origin: { x: number; z: number }, limit: number, within: number): Enemy[] {
  return enemies.filter(e => distance(e, origin) <= within)
    .sort((a, b) => distance(a, origin) - distance(b, origin)).slice(0, limit);
}

/** First call per wave for `key` returns true; later calls false. Reset by bondOnWaveStart. */
export function oncePerWave(player: Player, key: string): boolean {
  const used = player.bondState.usedThisWave as Record<string, true>;
  if (used[key]) return false;
  used[key] = true;
  return true;
}

const timers = new WeakMap<Player, Map<string, number>>();
/** Accumulates `dt` for `key`; true once per `interval` seconds. Server-only, not part of snapshots. */
export function tickTimer(player: Player, key: string, dt: number, interval: number): boolean {
  const map = timers.get(player) ?? new Map<string, number>();
  timers.set(player, map);
  const total = (map.get(key) ?? 0) + dt;
  if (total < interval) { map.set(key, total); return false; }
  map.set(key, total - interval);
  return true;
}

/** Sets a cooldown on first use; false while the previous use is still cooling (game-time seconds). */
export function cooldownReady(state: GameState, player: Player, key: string, seconds: number): boolean {
  const map = cooldowns.get(player) ?? new Map<string, number>();
  cooldowns.set(player, map);
  if ((map.get(key) ?? -Infinity) > state.elapsed) return false;
  map.set(key, state.elapsed + seconds);
  return true;
}
const cooldowns = new WeakMap<Player, Map<string, number>>();

export const usesRage = (unit: Pick<Unit, 'energyType'>): boolean =>
  unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit';
/** Adds flat Nộ (not scaled by rage-gain) or shortens the cooldown for cooldown heroes. */
export function chargeSkill(unit: Unit, rage: number, cooldownSeconds: number): void {
  if (usesRage(unit)) {
    unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + rage);
    (unit.gearRuntime ??= {}).energySeen = unit.energy;
  } else unit.abilityCooldown = Math.max(0, unit.abilityCooldown - cooldownSeconds);
}
export function fillSkill(unit: Unit): void {
  if (usesRage(unit)) {
    unit.energy = unit.maxEnergy ?? 100;
    (unit.gearRuntime ??= {}).energySeen = unit.energy;
  } else unit.abilityCooldown = 0;
}

/** Bond summons stay until the wave ends (resetWaveCombat clears them); a finite number keeps snapshots valid JSON. */
export const UNTIL_WAVE_END = 3600;
/** Most bond summons of one kind a player keeps; a new one replaces the oldest. */
const MAX_SUMMONS_PER_KIND = 8;

/** A timed fighter that uses the normal hero AI, never counts toward bonds and is hidden from bench lists. */
export function summonBondUnit(state: GameState, summoner: Unit, heroId: string, seconds: number, attackRatio = .6, hpRatio = .5): Unit {
  const sameKind = Object.values(state.units).filter(u => u.summonKind === 'bond-summon' && u.owner === summoner.owner && u.heroId === heroId);
  while (sameKind.length >= MAX_SUMMONS_PER_KIND) delete state.units[sameKind.shift()!.id];
  const unit = createUnit(state, summoner.owner, heroId);
  const angle = (state.serial % 8) * Math.PI / 4;
  unit.id = nextId(state, 'bond');
  unit.slot = -99; unit.zone = summoner.zone;
  unit.x = summoner.x + Math.cos(angle) * 1.5; unit.z = summoner.z + Math.sin(angle) * 1.5;
  unit.summonKind = 'bond-summon'; unit.summonerId = summoner.id; unit.summonDuration = seconds;
  unit.attack = summoner.attack * attackRatio;
  unit.maxHp = Math.max(1, summoner.maxHp * hpRatio); unit.hp = unit.maxHp;
  // Summons never cast: a copied kit (clones, summons of its own) must not run for a stand-in.
  unit.abilityCooldown = 1e9;
  unit.armor = summoner.armor;
  unit.energyType = 'cooldown'; unit.energy = 0;
  state.units[unit.id] = unit;
  return unit;
}
