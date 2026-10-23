import type { GameState, Unit, Vec, GameEvent } from '../../contracts/src/types.js';
import { deploymentPosition, laneCenters } from './battlefield-layout.js';

export const RUN_WAVES = 20;
export const RANDOM_SUMMON_COST = 2;
export const SUMMON_PACKS = {
  phan: { cost: 2, wave: 1, success: 1, tiers: [1, 2] as const, tierChance: .85 },
  tien: { cost: 4, wave: 6, success: .45, tiers: [2, 3] as const, tierChance: .70 },
  thien: { cost: 8, wave: 15, success: .25, tiers: [3, 4] as const, tierChance: .65 },
} as const;
export const PELLET_PRICES = { 'chest-1': 2, 'chest-2': 5, 'embryo-3': 12, 'embryo-4': 25 } as const;
export const summonWave = (state: GameState): number => state.phase === 'preparation' ? state.wave + 1 : Math.max(1, state.wave);
export const equipmentCost = (level: number) => 80 * (level + 1) ** 2;
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);
export function random(state: GameState): number {
  let x = state.seed | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.seed = x >>> 0;
  return state.seed / 4294967296;
}
export function nextId(state: GameState, prefix: string): string { return `${prefix}${++state.serial}`; }
export function event(state: GameState, data: Omit<GameEvent, 'id'>): void {
  state.events.push({ ...data, id: ++state.serial, at: state.elapsed });
  if (state.events.length > 96) state.events.splice(0, state.events.length - 96);
}
export function laneX(state: GameState, owner: string): number {
  if (owner === 'party') return 0;
  return laneCenters(Object.keys(state.players).length)[Math.max(0, Object.keys(state.players).indexOf(owner))] ?? 0;
}
export function slotPosition(state: GameState, owner: string, slot: number): Vec {
  return deploymentPosition(Object.keys(state.players).length, Math.max(0, Object.keys(state.players).indexOf(owner)), slot);
}
export function walk(unit: Vec, destination: Vec, amount: number): boolean {
  const d = distance(unit, destination);
  if (d <= amount || d < .001) { unit.x = destination.x; unit.z = destination.z; return true; }
  unit.x += (destination.x - unit.x) / d * amount;
  unit.z += (destination.z - unit.z) / d * amount;
  return false;
}
export const isDeployed = (unit: Unit) => (unit.slot >= 0 || unit.summonDuration !== undefined) && unit.hp > 0 && unit.respawn <= 0;
