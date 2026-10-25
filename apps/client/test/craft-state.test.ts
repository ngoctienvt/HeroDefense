import { describe, expect, it } from 'vitest';
import { CRAFT_RECIPES, HERO_BY_ID } from '../../../content/catalog.js';
import type { Unit } from '../../../packages/contracts/src/types.js';
import { craftableHeroIds } from '../src/craft-state.js';

let next = 0;
const unit = (heroId: string, patch: Partial<Unit> = {}): Unit => ({ id: `u${next++}`, heroId, owner: 'p1', rank: 1, zone: 0, slot: -1, ...patch }) as Unit;
const none = { tier3: 0, tier4: 0 };

describe('craftable heroes (highlighted in Ghép Tướng and the rail dot)', () => {
  it('lists Kim Tra once two Quy Thừa Tướng and one Thổ Hành Tôn are owned at 1★', () => {
    expect(CRAFT_RECIPES.find(recipe => recipe.heroId === 'h009')?.ingredients.slice().sort()).toEqual(['h007', 'h007', 'h008']);
    expect(craftableHeroIds([unit('h007'), unit('h007'), unit('h008')], 'p1', none).has('h009')).toBe(true);
    expect(craftableHeroIds([unit('h007'), unit('h008')], 'p1', none).has('h009')).toBe(false);
  });

  it('ignores copies above 1★, in a dungeon or owned by someone else', () => {
    expect(craftableHeroIds([unit('h007'), unit('h007', { rank: 2 }), unit('h008')], 'p1', none).has('h009')).toBe(false);
    expect(craftableHeroIds([unit('h007'), unit('h007', { zone: 1 }), unit('h008')], 'p1', none).has('h009')).toBe(false);
    expect(craftableHeroIds([unit('h007'), unit('h007', { owner: 'p2' }), unit('h008')], 'p1', none).has('h009')).toBe(false);
  });

  it('lets one Linh Phôi stand in for a single missing Phẩm 3 ingredient', () => {
    const recipe = CRAFT_RECIPES.find(item => item.ingredients.some(id => HERO_BY_ID[id]?.tier === 3) && new Set(item.ingredients).size === 3);
    expect(recipe).toBeDefined();
    const missing = recipe!.ingredients.find(id => HERO_BY_ID[id]?.tier === 3)!;
    const owned = recipe!.ingredients.filter(id => id !== missing).map(id => unit(id));
    expect(craftableHeroIds(owned, 'p1', none).has(recipe!.heroId)).toBe(false);
    expect(craftableHeroIds(owned, 'p1', { tier3: 1, tier4: 0 }).has(recipe!.heroId)).toBe(true);
  });
});
