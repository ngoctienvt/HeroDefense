import { afterEach, describe, expect, it } from 'vitest';
import { HEROES } from '../../../content/catalog.js';
import type { GearItem } from '../../../packages/contracts/src/gear-types.js';
import { filterGear, gearBaseLines, gearComparison, gearPage, gearTotals } from '../src/gear-ui.js';
import { configureGearTilePending, gearItemPending, gearSlotPending, gearTileLabel } from '../src/gear-tile.js';

afterEach(() => configureGearTilePending(() => false));

const item = (patch: Partial<GearItem> = {}): GearItem => ({ id: 'g1', slot: 'weapon', rarity: 'blue', level: 20, enhance: 0, rerolls: 0, unitId: null, lines: [], ...patch });

describe('inventory presentation', () => {
  it('reads pending locks live so economic action guards share the same source as tile presentation', () => {
    const pending = new Set(['gear-one']); configureGearTilePending(id => pending.has(id));
    expect(gearItemPending('gear-one')).toBe(true); expect(gearItemPending('gear-two')).toBe(false);
    pending.delete('gear-one'); pending.add('gear-two');
    expect(gearItemPending('gear-one')).toBe(false); expect(gearItemPending('gear-two')).toBe(true);
  });
  it('marks a pending empty destination slot and clears its query when presentation is disposed', () => {
    const slots = new Set(['hero-1:weapon']);
    configureGearTilePending(() => false, (unit, slot) => slots.has(`${unit}:${slot}`));
    expect(gearSlotPending('hero-1', 'weapon')).toBe(true);
    expect(gearSlotPending('hero-1', 'armor')).toBe(false);
    slots.clear(); expect(gearSlotPending('hero-1', 'weapon')).toBe(false);
    slots.add('hero-1:weapon'); configureGearTilePending(() => false);
    expect(gearSlotPending('hero-1', 'weapon')).toBe(false);
  });
  it('makes all 300 distinct items reachable while limiting the full grid to 40 and tray to eight', () => {
    const inventory = Array.from({ length: 300 }, (_, index) => item({ id: `gear-${index}` }));
    const seen = new Set<string>();
    for (let page = 0; page < 8; page++) {
      const slice = gearPage(inventory, page, 40);
      expect(slice.items.length).toBeLessThanOrEqual(40);
      slice.items.forEach(gear => seen.add(gear.id));
    }
    expect(seen.size).toBe(300);
    expect(gearPage(inventory, 0, 8).items).toHaveLength(8);
    expect(inventory).toHaveLength(300);
  });

  it('clamps the current page after items leave the bag and handles an empty bag', () => {
    const inventory = Array.from({ length: 41 }, (_, index) => item({ id: String(index) }));
    expect(gearPage(inventory, 1, 40).items).toHaveLength(1);
    const reduced = gearPage(inventory.slice(0, 40), 1, 40);
    expect(reduced.page).toBe(0); expect(reduced.items).toHaveLength(40);
    expect(gearPage([], 20, 8)).toEqual({ items: [], page: 0, pages: 1 });
  });

  it('labels rarity, level, enhancement, unique and wearing state without depending on image art', () => {
    const label = gearTileLabel(item({ rarity: 'gold', level: 20, enhance: 4, unitId: 'hero-1', unique: 'sea-anchor' }), 'weapon');
    expect(label).toContain('Cấp 20'); expect(label).toContain('+4');
    expect(label).toContain('Độc nhất:'); expect(label).toContain('Đang mặc');
    expect(gearTileLabel(undefined, 'armor')).toContain('Trống');
    expect(gearTileLabel(item(), 'weapon')).toContain('Trong kho');
  });

  it('filters by slot and rarity, sorts rarity before level without changing inventory order', () => {
    const inventory = [item({ id: 'low', rarity: 'white', level: 20 }), item({ id: 'gold', rarity: 'gold', level: 1 }), item({ id: 'armor', slot: 'armor' }), item({ id: 'blue', level: 10 })];
    expect(filterGear(inventory, 'weapon', '').map(item => item.id)).toEqual(['gold', 'blue', 'low']);
    expect(filterGear(inventory, '', 'blue').map(item => item.id)).toEqual(['armor', 'blue']);
    expect(inventory[0].id).toBe('low');
  });

  it('applies level scaling only to base stats and enhancement to base and rolled lines', () => {
    const gear = item({ enhance: 10, lines: [{ stat: 'attack-percent', value: 10 }] });
    expect(gearBaseLines(gear)).toEqual([{ stat: 'attack-percent', value: 40 }]);
    expect(gearTotals(gear, HEROES[0].id)['attack-percent']).toBeCloseTo(80);
    expect(gearBaseLines(item({ level: 1 }))[0].value).toBeCloseTo(21);
  });

  it('includes losses from replaced lines and omits mechanics the hero cannot use', () => {
    const cooldown = HEROES.find(hero => hero.ability && (hero.energyType ?? 'cooldown') === 'cooldown')!;
    const next = item({ slot: 'talisman', lines: [{ stat: 'rage-gain', value: 30 }] });
    const before = item({ slot: 'talisman', enhance: 10, lines: [{ stat: 'cooldown-reduction', value: 10 }] });
    expect(gearTotals(next, cooldown.id)['rage-gain']).toBeUndefined();
    const comparison = gearComparison(next, before, cooldown.id);
    expect(comparison.find(line => line.stat === 'cooldown-reduction')?.delta).toBeCloseTo(-16);
    expect(comparison.find(line => line.stat === 'attack-speed')?.delta).toBeCloseTo(-4.8);
    expect(comparison.find(line => line.stat === 'attack-percent')?.delta).toBe(0);
  });
});
