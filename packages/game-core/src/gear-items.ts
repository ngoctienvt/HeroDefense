import {
  GEAR_DROUGHT_WAVES, GEAR_KILL_DROP_CHANCE, GEAR_LINE_COUNTS, GEAR_LINE_POOLS,
  GEAR_LINES, GEAR_RARITY_NAMES, GEAR_UNIQUE_POOLS, GEAR_UNIQUES, gearItemName, gearLevelScale,
} from '../../../content/gear-design.js';
import { DUNGEONS } from '../../../content/catalog.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { GEAR_SLOTS, type GearItem, type GearLine, type GearRarity, type GearSlot, type GearSource, type GearStatId, type GearUniqueId } from '../../contracts/src/gear-types.js';
import { event, nextId } from './rules.js';

/** Separate xorshift stream: rolling loot must never change summon/control/combat rolls. */
export function gearRandom(state: GameState): number {
  let x = (state.gearSeed ?? ((state.seed ^ 0x85ebca6b) >>> 0)) | 0 || 1;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.gearSeed = x >>> 0;
  return state.gearSeed / 4294967296;
}
export interface GearRollOptions {
  source?: GearSource; slot?: GearSlot; rarity?: GearRarity; unique?: GearUniqueId;
  level?: number; quality?: number; dungeonId?: number;
}
function choose<T>(state: GameState, entries: readonly T[]): T {
  return entries[Math.floor(gearRandom(state) * entries.length)];
}
function weightedRarity(state: GameState, weights: readonly (readonly [GearRarity, number])[]): GearRarity {
  let roll = gearRandom(state) * weights.reduce((sum, [, value]) => sum + Math.max(0, value), 0);
  for (const [rarity, weight] of weights) {
    roll -= Math.max(0, weight);
    if (roll < 0) return rarity;
  }
  return weights[weights.length - 1][0];
}
function rarityFor(state: GameState, source: GearSource, level: number, dungeon: number): GearRarity {
  if (source === 'dungeon') return weightedRarity(state, [['gold', 10 + 7 * (dungeon - 1)], ['purple', 90 - 7 * (dungeon - 1)]]);
  if (source === 'boss') {
    const progress = Math.min(9, Math.max(0, level * 9 / 20));
    return weightedRarity(state, [['gold', 8 + 2.5 * progress], ['purple', 40 + 2 * progress], ['blue', 52 - 4.5 * progress]]);
  }
  const legacyWave = Math.min(45, Math.max(1, level) * 45 / 20);
  return weightedRarity(state, [
    ['white', source === 'drought' ? 0 : 55 - .8 * legacyWave], ['blue', 35],
    ['purple', 9 + .5 * legacyWave], ['gold', 1 + .3 * legacyWave],
  ]);
}
export function rollGearLine(state: GameState, stat: GearStatId, level: number, quality = 1): GearLine {
  const design = GEAR_LINES[stat];
  const rolled = design.min + (design.max - design.min) * gearRandom(state) ** (1 / Math.max(1, quality));
  const value = rolled * gearLevelScale(level);
  return { stat, value: design.integer
    ? Math.max(Math.ceil(design.min * gearLevelScale(level)), Math.min(Math.floor(design.max * gearLevelScale(level)), Math.round(value)))
    : value };
}
export function rollGearItem(state: GameState, options: GearRollOptions = {}): GearItem {
  const source = options.source ?? 'kill';
  const dungeon = Math.max(1, Math.min(8, options.dungeonId ?? 1));
  const level = Math.max(1, Math.floor(options.level ?? state.wave));
  const slot = options.slot ?? (options.unique ? GEAR_UNIQUES[options.unique].slot : choose(state, GEAR_SLOTS));
  const rarity = options.unique ? 'gold' : options.rarity ?? rarityFor(state, source, level, dungeon);
  const quality = options.quality ?? (source === 'boss' ? 1 + .15 * Math.min(9, level * 9 / 20) : source === 'dungeon' ? 1.5 + .2 * dungeon : 1);
  const [min, max] = GEAR_LINE_COUNTS[rarity];
  const count = source === 'dungeon' && dungeon >= 5 && rarity === 'purple' ? 4 : min + Math.floor(gearRandom(state) * (max - min + 1));
  const pool = [...GEAR_LINE_POOLS[slot]], lines: GearLine[] = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(gearRandom(state) * pool.length);
    const [stat] = pool.splice(index, 1);
    lines.push(rollGearLine(state, stat, level, quality));
  }
  return {
    id: nextId(state, 'g'), slot, rarity, level, enhance: 0, rerolls: 0, lines, unitId: null,
    ...(rarity === 'gold' ? { unique: options.unique ?? choose(state, GEAR_UNIQUE_POOLS[slot]) } : {}),
  };
}
export function gearStats(state: GameState) {
  return state.gearStats ??= { drops: {}, sources: {}, uniques: {}, commands: {} };
}
export function grantGearItem(state: GameState, owner: string, item: GearItem, source: GearSource): boolean {
  const player = state.players[owner];
  if (!player || player.gear.some(existing => existing.id === item.id)) return false;
  item.unitId = null;
  player.gear.push(item);
  player.gearVersion++;
  if (source !== 'admin') {
    player.gearDrought = 0;
    player.gearLastDropWave = state.wave;
  }
  const stats = gearStats(state);
  stats.drops[item.rarity] = (stats.drops[item.rarity] ?? 0) + 1;
  stats.sources[source] = (stats.sources[source] ?? 0) + 1;
  event(state, { kind: 'reward', owner, target: item.id, skillId: 'gear-drop', text: `Nhặt được [${GEAR_RARITY_NAMES[item.rarity]}] ${gearItemName(item)}` });
  return true;
}
export function onGearKillDrop(state: GameState, killer: Unit, enemy: Enemy): void {
  if (!state.players[killer.owner]) return;
  const boss = enemy.kind === 'boss' && enemy.zone === 0 && enemy.rank !== 'chieftain' && enemy.rank !== 'elite';
  if (!boss && gearRandom(state) >= GEAR_KILL_DROP_CHANCE) return;
  const source = boss ? 'boss' : 'kill';
  grantGearItem(state, killer.owner, rollGearItem(state, { source }), source);
}
export function onWaveEndDrought(state: GameState): void {
  for (const player of Object.values(state.players)) {
    player.gearDrought = player.gearLastDropWave === state.wave ? 0 : player.gearDrought + 1;
    if (player.gearDrought >= GEAR_DROUGHT_WAVES)
      grantGearItem(state, player.id, rollGearItem(state, { source: 'drought' }), 'drought');
  }
}
/** Kept for a future dungeon caller; the current twenty-wave game has no active dungeon mode. */
export function onDungeonGearReward(state: GameState, dungeonId: number, participants: readonly string[]): void {
  const dungeon = DUNGEONS.find(entry => entry.id === dungeonId);
  if (!dungeon) return;
  for (const owner of new Set(participants)) {
    if (!state.players[owner]) continue;
    grantGearItem(state, owner, rollGearItem(state, { source: 'dungeon', dungeonId, level: dungeon.wave }), 'dungeon');
  }
}
