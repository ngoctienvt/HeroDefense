import { describe, expect, it } from 'vitest';
import { CRAFT_RECIPES, HERO_BY_ID } from '../../../content/catalog.js';
import { gearEnhanceSpent, gearRerollCost } from '../../../content/gear-design.js';
import type { GearItem, GearSlot, GearUniqueId } from '../../contracts/src/gear-types.js';
import type { GameState } from '../../contracts/src/types.js';
import { gearCommand, releaseUnitGear } from '../src/gear-commands.js';
import { grantGearItem, rollGearItem } from '../src/gear-items.js';
import { refreshStats } from '../src/stats.js';
import { command, game, summon } from './fixtures.js';

function item(state: GameState, slot: GearSlot = 'weapon', owner = 'p1', unique?: GearUniqueId): GearItem {
  const result = rollGearItem(state, { slot, rarity: unique ? 'gold' : 'purple', level: 20, unique });
  grantGearItem(state, owner, result, 'admin');
  return result;
}
describe('inventory commands', () => {
  it('equips, replaces a slot, transfers between units and unequips', () => {
    const state = game(), a = summon(state), b = summon(state), first = item(state), second = item(state);
    command(state, { type: 'equip-item', unitId: a.id, itemId: first.id });
    command(state, { type: 'equip-item', unitId: a.id, itemId: second.id });
    expect(first.unitId).toBeNull(); expect(second.unitId).toBe(a.id);
    command(state, { type: 'equip-item', unitId: b.id, itemId: second.id });
    expect(second.unitId).toBe(b.id);
    command(state, { type: 'unequip-item', itemId: second.id });
    expect(second.unitId).toBeNull();
    expect(state.players.p1.gearVersion).toBeGreaterThanOrEqual(6);
  });
  it('rejects foreign items, foreign units, summons, insufficient currency and equipped salvage', () => {
    const state = game(), own = summon(state), foreign = summon(state, undefined, 'p2');
    const loot = item(state), otherLoot = item(state, 'weapon', 'p2');
    expect(gearCommand(state, 'p1', { type: 'equip-item', unitId: own.id, itemId: otherLoot.id })?.ok).toBe(false);
    expect(gearCommand(state, 'p1', { type: 'equip-item', unitId: foreign.id, itemId: loot.id })?.ok).toBe(false);
    own.summonDuration = 3;
    expect(gearCommand(state, 'p1', { type: 'equip-item', unitId: own.id, itemId: loot.id })?.ok).toBe(false);
    delete own.summonDuration;
    command(state, { type: 'equip-item', unitId: own.id, itemId: loot.id });
    expect(gearCommand(state, 'p1', { type: 'salvage-item', itemId: loot.id })?.ok).toBe(false);
    state.players.p1.gold = 0;
    expect(gearCommand(state, 'p1', { type: 'enhance-item', itemId: loot.id })?.ok).toBe(false);
  });
  it('keeps current HP fraction when changing armor including during combat', () => {
    const state = game(), unit = summon(state), armor = item(state, 'armor');
    refreshStats(state, 'p1');
    const oldMax = unit.maxHp;
    unit.hp = oldMax * .4;
    state.phase = 'combat';
    command(state, { type: 'equip-item', unitId: unit.id, itemId: armor.id });
    expect(unit.maxHp).toBeGreaterThan(oldMax);
    expect(unit.hp / unit.maxHp).toBeCloseTo(.4);
    command(state, { type: 'unequip-item', itemId: armor.id });
    expect(unit.hp / unit.maxHp).toBeCloseTo(.4);
  });
  it('charges every enhancement once, caps at +10, salvages dust and half the investment', () => {
    const state = game(), loot = item(state), player = state.players.p1;
    player.gold = 10_000;
    for (let level = 0; level < 10; level++) command(state, { type: 'enhance-item', itemId: loot.id });
    expect(player.gold).toBe(10_000 - gearEnhanceSpent(10));
    expect(gearCommand(state, 'p1', { type: 'enhance-item', itemId: loot.id })?.ok).toBe(false);
    command(state, { type: 'salvage-item', itemId: loot.id });
    expect(player.gear).toHaveLength(0);
    expect(player.gearDust).toBe(5);
    expect(player.gold).toBe(10_000 - gearEnhanceSpent(10) + Math.floor(gearEnhanceSpent(10) / 2));
  });
  it('rerolls exactly one normal line, keeps its unique and raises both costs', () => {
    const state = game(), loot = item(state, 'weapon', 'p1', 'blood-pact'), player = state.players.p1;
    player.gold = 10_000; player.gearDust = 100;
    const oldLines = structuredClone(loot.lines);
    const cost = gearRerollCost(0);
    command(state, { type: 'reroll-item', itemId: loot.id });
    expect(loot.lines.filter((line, i) => line.stat !== oldLines[i].stat || line.value !== oldLines[i].value)).toHaveLength(1);
    expect(new Set(loot.lines.map(line => line.stat)).size).toBe(loot.lines.length);
    expect(loot.unique).toBe('blood-pact');
    expect(player.gold).toBe(10_000 - cost.gold); expect(player.gearDust).toBe(100 - cost.dust);
    const next = gearRerollCost(1);
    command(state, { type: 'reroll-item', itemId: loot.id });
    expect(player.gold).toBe(10_000 - cost.gold - next.gold);
    expect(player.gearDust).toBe(100 - cost.dust - next.dust);
  });
  it('returns consumed craft ingredients, merge copies and sold hero equipment without losing items', () => {
    const state = game(), recipe = CRAFT_RECIPES[0];
    const ingredients = recipe.ingredients.map(heroId => summon(state, heroId));
    const craftedGear = ingredients.map(unit => { const loot = item(state); loot.unitId = unit.id; return loot; });
    command(state, { type: 'craft', heroId: recipe.heroId });
    expect(craftedGear.every(loot => loot.unitId === null)).toBe(true);
    const copies = Array.from({ length: 3 }, () => summon(state));
    const mergedGear = copies.map(unit => { const loot = item(state); loot.unitId = unit.id; return loot; });
    command(state, { type: 'merge', unitId: copies[0].id });
    expect(mergedGear[0].unitId).toBe(copies[0].id);
    expect(mergedGear.slice(1).every(loot => loot.unitId === null)).toBe(true);
    command(state, { type: 'sell', unitId: copies[0].id });
    expect(mergedGear[0].unitId).toBeNull();
    expect(state.players.p1.gear).toHaveLength(6);
  });
  it('absorbs only base ranked stats on consumption, does not compound and never absorbs on sale', () => {
    const state = game(), unit = summon(state), seal = item(state, 'armor', 'p1', 'inheritance-seal');
    unit.rank = 2; unit.attack = 1e9; unit.maxHp = 1e9; seal.unitId = unit.id;
    const hero = HERO_BY_ID[unit.heroId];
    releaseUnitGear(state, unit, 'craft');
    expect(seal.absorbedAttack).toBeCloseTo(hero.attack * 2.4 * .15);
    expect(seal.absorbedHp).toBeCloseTo(hero.hp * 2.4 * .15);
    releaseUnitGear(state, unit, 'craft');
    expect(seal.absorbedAttack).toBeCloseTo(hero.attack * 2.4 * .15);
    seal.unitId = unit.id;
    releaseUnitGear(state, unit, 'sell');
    expect(seal.absorbedAttack).toBeCloseTo(hero.attack * 2.4 * .15);
  });
  it('rejects conflicting admin unique options without mutating inventory or seed', () => {
    const state = game(), before = state.gearSeed;
    expect(gearCommand(state, 'p1', { type: 'admin-item', unique: 'blood-pact', slot: 'armor' })?.ok).toBe(false);
    expect(state.players.p1.gear).toHaveLength(0);
    expect(state.gearSeed).toBe(before);
    command(state, { type: 'admin-item', unique: 'blood-pact' });
    expect(state.players.p1.gear[0]).toMatchObject({ rarity: 'gold', slot: 'weapon', unique: 'blood-pact' });
  });
});
