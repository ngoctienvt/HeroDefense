import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../content/catalog.js';
import type { GameState, Unit } from '../../contracts/src/types.js';
import { combatStep } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

/**
 * Rough balance report for Huyền–Thần damage dealers: each hero fights alone for
 * 30 seconds against (a) one boss dummy and (b) a pack of 12 minions. Bands are
 * deliberately loose; the printed table is what the designer tunes from.
 */
const SECONDS = 30, STEP = .1;
const DAMAGE_ROLES = new Set(['warrior', 'ranger', 'mage']);

function duel(heroId: string, scenario: 'boss' | 'pack'): number {
  const state: GameState = game(1);
  // Real tier chances so control-heavy kits are not overrated.
  state.controlChanceOverride = undefined;
  const unit: Unit = deployed(state, heroId);
  state.phase = 'combat';
  const base = { attack: 0, speed: 0, armor: 20, hp: 5_000_000, maxHp: 5_000_000 };
  const victims = scenario === 'boss'
    ? [enemy(state, unit, { ...base, kind: 'boss', x: unit.x + 3 })]
    : Array.from({ length: 12 }, (_, index) => enemy(state, unit, {
      ...base, hp: 200_000, maxHp: 200_000,
      x: unit.x + 3 + (index % 4) * 1.1, z: unit.z + Math.floor(index / 4) * 1.1 - 1.1 }));
  for (let time = 0; time < SECONDS; time += STEP) combatStep(state, STEP);
  return victims.reduce((sum, victim) => sum + victim.maxHp - Math.max(0, state.enemies[victim.id]?.hp ?? 0), 0);
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const TIERS = [2, 3, 4, 5, 6];
const medians = new Map<number, number>();

describe('Huyền–Thần damage benchmark', () => {
  for (const tier of TIERS) {
    it(`keeps tier ${tier} damage dealers inside a shared band`, () => {
      const rows = HEROES.filter(hero => hero.tier === tier && DAMAGE_ROLES.has(hero.role)).map(hero => {
        const boss = duel(hero.id, 'boss'), pack = duel(hero.id, 'pack');
        return { id: hero.id, name: hero.name, role: hero.role, bossDps: Math.round(boss / SECONDS),
          packDps: Math.round(pack / SECONDS), best: Math.max(boss, pack) / SECONDS };
      });
      // eslint-disable-next-line no-console
      console.table(rows.map(({ best: _best, ...row }) => row));
      const middle = median(rows.map(row => row.best));
      medians.set(tier, middle);
      for (const row of rows) {
        expect(row.best, `${row.id} ${row.name}`).toBeGreaterThan(middle * .35);
        expect(row.best, `${row.id} ${row.name}`).toBeLessThan(middle * 2.5);
      }
    });
  }

  // Lower tiers earn a slot through utility, never by out-damaging a higher tier.
  it('raises median damage with every tier', () => {
    for (const tier of TIERS.slice(1)) {
      const lower = medians.get(tier - 1), upper = medians.get(tier);
      expect(lower, `tier ${tier - 1}`).toBeDefined();
      expect(upper, `tier ${tier} vs ${tier - 1}`).toBeGreaterThan(lower ?? Infinity);
    }
  });
});
