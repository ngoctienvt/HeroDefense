import { HEROES } from '../../../content/catalog.js';
import type { Command, Difficulty, Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { addPlayer, createGame, handleCommand } from '../src/index.js';
import { createUnit } from '../src/unit-factory.js';
import { rollGearItem, grantGearItem } from '../src/gear-items.js';

export function game(players = 2, difficulty: Difficulty = 'normal'): GameState {
  const state = createGame('TEST01', 123456, difficulty);
  for (let n = 1; n <= players; n++) addPlayer(state, `p${n}`, `Player ${n}`);
  // Skill tests assert what a landed control does; crowd-control.test.ts covers the chances.
  forceControl(state, 1);
  return state;
}
/** Force every hard-control roll to `chance`; pass undefined to use the real tier table. */
export function forceControl(state: GameState, chance: number | undefined): void {
  state.controlChanceOverride = chance;
}
export function command(state: GameState, value: Command, owner = 'p1') {
  const result = handleCommand(state, owner, value);
  if (!result.ok) throw new Error(`${value.type}: ${result.message}`);
  return result;
}
export function start(state: GameState): void {
  for (const id of Object.keys(state.players)) command(state, { type: 'ready', ready: true }, id);
  command(state, { type: 'start' });
}
// Focused fixtures create a specific roster without relying on random summons.
export function summon(state: GameState, heroId = HEROES[0].id, owner = 'p1'): Unit {
  const unit = createUnit(state, owner, heroId);
  state.units[unit.id] = unit;
  return unit;
}
export function deployed(state: GameState, heroId = HEROES[0].id, slot = 0, owner = 'p1'): Unit {
  const unit = summon(state, heroId, owner);
  command(state, { type: 'deploy', unitId: unit.id, slot }, owner);
  return unit;
}
export function enemy(state: GameState, unit: Unit, overrides: Partial<Enemy> = {}): Enemy {
  const target: Enemy = {
    id: `fixture-enemy-${Object.keys(state.enemies).length}`, owner: unit.owner, name: 'Test enemy',
    kind: 'melee', zone: unit.zone, x: unit.x + 1, z: unit.z, hp: 100000, maxHp: 100000,
    attack: 1, armor: 0, speed: 0, cooldown: 0, target: null, leak: 2, slow: 0,
    ...overrides,
  };
  state.enemies[target.id] = target;
  return target;
}
export function rankThree(state: GameState, heroId: string, slot: number, owner: string): Unit {
  const copies = Array.from({ length: 9 }, () => summon(state, heroId, owner));
  for (let i = 0; i < 9; i += 3) command(state, { type: 'merge', unitId: copies[i].id }, owner);
  const unit = copies[0];
  command(state, { type: 'merge', unitId: unit.id }, owner);
  command(state, { type: 'deploy', unitId: unit.id, slot }, owner);
  state.players[owner].gold = 100000;
  for (const slot of ['weapon', 'armor', 'talisman'] as const) {
    const item = rollGearItem(state, { slot, rarity: 'purple', level: 20 });
    grantGearItem(state, owner, item, 'admin');
    command(state, { type: 'equip-item', itemId: item.id, unitId: unit.id }, owner);
    for (let level = 0; level < 10; level++) command(state, { type: 'enhance-item', itemId: item.id }, owner);
  }
  return unit;
}
