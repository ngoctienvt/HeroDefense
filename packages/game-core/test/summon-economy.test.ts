import { describe, expect, it } from 'vitest';
import { CRAFT_RECIPES, HEROES, HERO_BY_ID } from '../../../content/catalog.js';
import { handleCommand } from '../src/index.js';
import { random } from '../src/rules.js';
import { command, game, summon } from './fixtures.js';

describe('summon packages and Linh Đan', () => {
  it('keeps wave gates, exact costs, tier pools and a three-hero choice', () => {
    const state = game(1), player = state.players.p1;
    player.souls = 100;
    expect(handleCommand(state, 'p1', { type: 'summon', pack: 'tien' }).ok).toBe(false);
    expect(handleCommand(state, 'p1', { type: 'summon', pack: 'thien' }).ok).toBe(false);
    command(state, { type: 'summon', pack: 'phan' });
    expect(player.souls).toBe(98);
    expect([1, 2]).toContain(HERO_BY_ID[Object.values(state.units)[0].heroId].tier);

    state.wave = 5;
    state.phase = 'preparation';
    player.summonFailures.tien = 4;
    command(state, { type: 'summon', pack: 'tien' });
    expect(player.souls).toBe(94);
    expect(player.summonFailures.tien).toBe(0);
    expect(player.pendingChoice?.heroIds).toHaveLength(3);
    expect(new Set(player.pendingChoice?.heroIds).size).toBe(3);
    expect(player.pendingChoice?.heroIds.every(id => [2, 3].includes(HERO_BY_ID[id].tier))).toBe(true);
    expect(handleCommand(state, 'p1', { type: 'summon' }).ok).toBe(false);
    expect(handleCommand(state, 'p1', { type: 'choose-hero', heroId: HEROES.find(hero => hero.tier === 5)!.id }).ok).toBe(false);
    command(state, { type: 'choose-hero', heroId: player.pendingChoice!.heroIds[0] });

    state.wave = 14;
    player.summonFailures.thien = 5;
    command(state, { type: 'summon', pack: 'thien' });
    expect(player.souls).toBe(86);
    expect(player.summonFailures.thien).toBe(0);
    expect(player.pendingChoice?.heroIds.every(id => [3, 4].includes(HERO_BY_ID[id].tier))).toBe(true);
  });

  it('awards a tier-1 fallback and pellets on failure, then honors each pity separately', () => {
    const state = game(1), player = state.players.p1;
    state.wave = 15; player.souls = 1000;
    for (const pack of ['tien', 'thien'] as const) for (let attempt = 0; attempt < (pack === 'tien' ? 4 : 5); attempt++) {
      const chance = pack === 'tien' ? .45 : .25;
      let seed = 1;
      while (random({ ...state, seed }) < chance) seed++;
      state.seed = seed;
      const beforePellets = player.pellets;
      const beforeUnits = Object.keys(state.units).length;
      command(state, { type: 'summon', pack });
      expect(player.pendingChoice).toBeNull();
      expect(Object.keys(state.units)).toHaveLength(beforeUnits + 1);
      expect(HERO_BY_ID[Object.values(state.units).at(-1)!.heroId].tier).toBe(1);
      expect(player.pellets - beforePellets).toBe(pack === 'tien' ? 1 : 3);
    }
    expect(player.summonFailures.tien).toBe(4);
    expect(player.summonFailures.thien).toBe(5);
    command(state, { type: 'summon', pack: 'tien' });
    expect(player.pendingChoice).not.toBeNull();
    expect(player.summonFailures.tien).toBe(0);
    expect(player.summonFailures.thien).toBe(5);
    command(state, { type: 'choose-hero', heroId: player.pendingChoice!.heroIds[0] });
    command(state, { type: 'summon', pack: 'thien' });
    expect(player.pendingChoice).not.toBeNull();
    expect(player.summonFailures.thien).toBe(0);
  });

  it('redeems any same-tier hero and consumes one embryo for one missing ingredient', () => {
    const state = game(1), player = state.players.p1;
    player.pellets = 50;
    command(state, { type: 'redeem', item: 'chest-1' });
    expect(player.pellets).toBe(48);
    expect(player.pendingChoice?.heroIds).toHaveLength(8);
    const chosen = player.pendingChoice!.heroIds[0];
    command(state, { type: 'choose-hero', heroId: chosen });
    command(state, { type: 'redeem', item: 'chest-1' });
    expect(player.pendingChoice?.heroIds).toContain(chosen);
    command(state, { type: 'choose-hero', heroId: chosen });
    expect(Object.values(state.units).filter(unit => unit.heroId === chosen)).toHaveLength(2);
    command(state, { type: 'redeem', item: 'chest-2' });
    expect(player.pendingChoice?.heroIds).toHaveLength(12);
    command(state, { type: 'choose-hero', heroId: player.pendingChoice!.heroIds[0] });

    command(state, { type: 'redeem', item: 'embryo-3' });
    command(state, { type: 'redeem', item: 'embryo-4' });
    expect(handleCommand(state, 'p1', { type: 'redeem', item: 'embryo-4' }).ok).toBe(false);
    const recipe = CRAFT_RECIPES.find(item => item.ingredients.filter(id => HERO_BY_ID[id].tier === 3).length === 1)!;
    for (const id of recipe.ingredients.filter(id => HERO_BY_ID[id].tier !== 3)) summon(state, id);
    const before = player.embryos.tier3;
    command(state, { type: 'craft', heroId: recipe.heroId });
    expect(player.embryos.tier3).toBe(before - 1);
    expect(Object.values(state.units).some(unit => unit.heroId === recipe.heroId)).toBe(true);

    const higherRecipe = CRAFT_RECIPES.find(item => item.ingredients.filter(id => HERO_BY_ID[id].tier === 4).length === 1)!;
    const beforeTier4 = player.embryos.tier4;
    expect(handleCommand(state, 'p1', { type: 'craft', heroId: higherRecipe.heroId }).ok).toBe(false);
    expect(player.embryos.tier4).toBe(beforeTier4);
    for (const id of higherRecipe.ingredients.filter(id => HERO_BY_ID[id].tier !== 4)) summon(state, id);
    command(state, { type: 'craft', heroId: higherRecipe.heroId });
    expect(player.embryos.tier4).toBe(beforeTier4 - 1);
  });
});
