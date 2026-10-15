import { describe, expect, it } from 'vitest';
import { CRAFT_RECIPES, HERO_BY_ID } from '../../../content/catalog.js';
import { getIngredientTree } from '../src/craft-board.js';

describe('craft board ingredient tree & highlighting logic', () => {
  const recipeByHero = new Map(CRAFT_RECIPES.map(recipe => [recipe.heroId, recipe]));

  it('identifies direct ingredients for Tier 2 recipes accurately', () => {
    // h009 is Kim Tra (T2) <= Quy Thừa Tướng (h007 x2) + Thổ Hành Tôn (h008 x1)
    const kimTra = CRAFT_RECIPES.find(r => r.heroId === 'h009')!;
    expect(kimTra).toBeDefined();

    const tree = getIngredientTree('h009', recipeByHero);
    expect(tree.hasRecipe).toBe(true);
    expect(tree.directCounts.get('h007')).toBe(2);
    expect(tree.directCounts.get('h008')).toBe(1);
    expect(tree.directCounts.size).toBe(2);
    expect(tree.subCounts.size).toBe(0); // T1 ingredients have no sub-recipes
  });

  it('identifies both direct ingredients and nested sub-ingredients for higher tier heroes', () => {
    // Find a Tier 3 hero with recipe
    const t3Recipe = CRAFT_RECIPES.find(r => HERO_BY_ID[r.heroId]?.tier === 3)!;
    expect(t3Recipe).toBeDefined();

    const tree = getIngredientTree(t3Recipe.heroId, recipeByHero);
    expect(tree.hasRecipe).toBe(true);
    expect(tree.directCounts.size).toBeGreaterThan(0);
    // Direct ingredients must not overlap with subCounts
    for (const directId of tree.directCounts.keys()) {
      expect(tree.subCounts.has(directId)).toBe(false);
    }
    // Sub ingredients should include the base T1 materials needed for those T2 direct ingredients
    expect(tree.subCounts.size).toBeGreaterThan(0);
  });

  it('reports hasRecipe as false and empty maps for Tier 1 heroes', () => {
    // h001 is a Tier 1 hero
    const tree = getIngredientTree('h001', recipeByHero);
    expect(tree.hasRecipe).toBe(false);
    expect(tree.directCounts.size).toBe(0);
    expect(tree.subCounts.size).toBe(0);
    expect(tree.baseTier1Counts.size).toBe(0);
  });

  it('ensures all recipes in catalog resolve to valid hero definitions', () => {
    for (const recipe of CRAFT_RECIPES) {
      expect(HERO_BY_ID[recipe.heroId]).toBeDefined();
      expect(recipe.ingredients).toHaveLength(3);
      for (const ingredientId of recipe.ingredients) {
        expect(HERO_BY_ID[ingredientId]).toBeDefined();
      }
    }
  });
});
