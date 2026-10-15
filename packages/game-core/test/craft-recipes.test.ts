import { describe, expect, it } from 'vitest';
import { CRAFT_RECIPES, HERO_BY_ID } from '../../../content/catalog.js';
import { handleCommand } from '../src/index.js';
import { command, game, summon } from './fixtures.js';

describe('source recipe crafting', () => {
  const recipe = CRAFT_RECIPES[0];

  it('requires the exact three rank-one ingredients and never consumes a partial recipe', () => {
    const state = game();
    const first = summon(state, recipe.ingredients[0]);
    const second = summon(state, recipe.ingredients[1]);
    const before = Object.keys(state.units);
    expect(handleCommand(state, 'p1', { type: 'craft', heroId: recipe.heroId }).ok).toBe(false);
    expect(Object.keys(state.units)).toEqual(before);
    const third = summon(state, recipe.ingredients[2], 'p2');
    expect(handleCommand(state, 'p1', { type: 'craft', heroId: recipe.heroId }).ok).toBe(false);
    expect(state.units[first.id]).toBe(first);
    expect(state.units[second.id]).toBe(second);
    expect(state.units[third.id]).toBe(third);
  });

  it('crafts the selected result into the bench and preserves the highest gear in each category', () => {
    const state = game();
    const ingredients = recipe.ingredients.map(id => summon(state, id));
    ingredients[0].equipment = [2, 0, 1];
    ingredients[1].equipment = [0, 3, 0];
    ingredients[2].equipment = [1, 1, 4];
    expect(handleCommand(state, 'p1', { type: 'craft', heroId: recipe.heroId }).ok).toBe(true);
    expect(ingredients.every(unit => !state.units[unit.id])).toBe(true);
    const crafted = Object.values(state.units)[0];
    expect(crafted).toMatchObject({ heroId: recipe.heroId, owner: 'p1', rank: 1, slot: -1, equipment: [2, 3, 4] });
    expect(crafted.maxHp).toBeGreaterThan(HERO_BY_ID[recipe.heroId].hp);
  });

  it('rejects unknown results and ingredients in an expedition', () => {
    const state = game();
    expect(handleCommand(state, 'p1', { type: 'craft', heroId: 'unknown' }).ok).toBe(false);
    const ingredients = recipe.ingredients.map(id => summon(state, id));
    ingredients[0].zone = 1;
    expect(handleCommand(state, 'p1', { type: 'craft', heroId: recipe.heroId }).ok).toBe(false);
    expect(ingredients.every(unit => !!state.units[unit.id])).toBe(true);
  });

  it('keeps crafted heroes even when the collection already exceeds the old bench limit', () => {
    const state = game();
    const ingredients = recipe.ingredients.map((id, slot) => {
      const unit = summon(state, id);
      command(state, { type: 'deploy', unitId: unit.id, slot });
      return unit;
    });
    for (let index = 0; index < 20; index++) summon(state);
    expect(handleCommand(state, 'p1', { type: 'craft', heroId: recipe.heroId }).ok).toBe(true);
    expect(ingredients.every(unit => !state.units[unit.id])).toBe(true);
    expect(Object.values(state.units).filter(unit => unit.owner === 'p1' && unit.slot < 0)).toHaveLength(21);
  });
});
