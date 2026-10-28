import { afterEach, describe, expect, it, vi } from 'vitest';
import { SYNERGIES } from '../../../content/catalog.js';
import { BOND_DESIGN } from '../../../content/bond-design.js';
import { forceCast } from '../src/bond-cast.js';
import { bondOnWaveStart, bondRandom } from '../src/bond-runtime.js';
import { BOND_HANDLERS, type BondHandler } from '../src/bonds/index.js';
import { castAbility, combatStep } from '../src/combat.js';
import { gearModsOf } from '../src/gear-stats.js';
import { bonuses, refreshStats } from '../src/stats.js';
import { CRAFT_RECIPES } from '../../../content/catalog.js';
import { beginWave } from '../src/simulation.js';
import { command, deployed, game, summon } from './fixtures.js';

const handlers = BOND_HANDLERS as Record<number, BondHandler>;
// Tests install probe handlers; remember what was there so real handlers survive.
const originals = new Map<number, BondHandler | undefined>();
const probe = (id: number, handler: BondHandler): void => {
  if (!originals.has(id)) originals.set(id, handlers[id]);
  handlers[id] = handler;
};
afterEach(() => {
  for (const [id, original] of originals) { if (original) handlers[id] = original; else delete handlers[id]; }
  originals.clear();
});

describe('bond design data', () => {
  it('has an entry for every synergy whose tiers match the catalog thresholds', () => {
    for (const synergy of SYNERGIES) {
      const design = BOND_DESIGN[synergy.id];
      expect(design, `synergy ${synergy.id}`).toBeDefined();
      expect(design.tiers.map(t => t.at)).toEqual(synergy.thresholds);
      for (const tier of design.tiers) expect(tier.text.length).toBeGreaterThan(0);
    }
  });
});

describe('bond counting and flat buffs', () => {
  it('no longer adds flat stats for synergies', () => {
    const state = game();
    deployed(state, 'h00B', 0); deployed(state, 'h00C', 1);
    expect(state.players.p1.activeSynergies.find(s => s.id === 1)?.level).toBe(1);
    expect(bonuses(state, 'p1')).toEqual({ attack: 0, health: 0, speed: 0, armor: 0, regen: 0 });
  });

  it('does not count summoned units toward a threshold', () => {
    const state = game();
    deployed(state, 'h00B', 0); deployed(state, 'h00C', 1);
    const copy = summon(state, 'h00P');
    copy.slot = 2; copy.summonDuration = 10; copy.summonerId = 'x';
    refreshStats(state, 'p1');
    expect(state.players.p1.activeSynergies.find(s => s.id === 1)?.count).toBe(2);
  });

  it('bumps bondVersion only when the active bonds change', () => {
    const state = game(), player = state.players.p1;
    deployed(state, 'h00B', 0);
    const before = player.bondVersion;
    refreshStats(state, 'p1');
    expect(player.bondVersion).toBe(before);
    deployed(state, 'h00C', 1);
    expect(player.bondVersion).toBeGreaterThan(before);
  });
});

describe('Duyên Tụ', () => {
  const key = (unit: { energyType?: string }) =>
    unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit' ? 'rage-gain' : 'cooldown-reduction';

  it('rewards a hero in two active bonds and refreshes the cached mods when the roster changes', () => {
    const state = game();
    const single = deployed(state, 'h00B', 0), shared = deployed(state, 'h00C', 1), other = deployed(state, 'h00V', 2);
    // Hỏa Diệm Sơn (Thiết Phiến + Hồng Hài Nhi) and Chân Hỏa (Hồng Hài Nhi + Na Tra) are both active.
    expect(gearModsOf(state, shared)[key(shared)]).toBeCloseTo(.10);
    expect(gearModsOf(state, single)[key(single)]).toBe(0);
    command(state, { type: 'bench', unitId: other.id });
    expect(gearModsOf(state, shared)[key(shared)]).toBe(0);
  });

  it('grants starting Nộ only to Nộ heroes and keeps the flat grant out of rage-gain scaling', () => {
    const state = game();
    deployed(state, 'h00B', 0); const shared = deployed(state, 'h00C', 1); deployed(state, 'h00V', 2);
    shared.energyType = 'rage_on_attack'; shared.maxEnergy = 100; shared.energy = 0;
    bondOnWaveStart(state);
    expect(shared.energy).toBe(15);
    expect(shared.gearRuntime?.energySeen).toBe(15);
  });
});

describe('bond counters', () => {
  it('keeps per-match counters through selling and resets per-wave counters at wave start', () => {
    const state = game(), player = state.players.p1;
    const unit = summon(state, 'h00B');
    Object.assign(player.bondState, { kiep: 7, dienHai: 3, souls: 5, longUy: 4, thanVi: 2, tamTai: 1, dienTich: 2, usedThisWave: { 'x:y:z': true } });
    command(state, { type: 'sell', unitId: unit.id });
    expect(player.bondState.kiep).toBe(7);
    const version = player.bondVersion;
    beginWave(state);
    expect(player.bondState).toMatchObject({ kiep: 7, dienHai: 3, souls: 0, longUy: 0, thanVi: 0, tamTai: 0, dienTich: 0, usedThisWave: {} });
    expect(player.bondVersion).toBeGreaterThan(version);
  });

  it('keeps per-match counters through crafting', () => {
    const state = game(), player = state.players.p1, recipe = CRAFT_RECIPES[0];
    for (const id of recipe.ingredients) summon(state, id);
    Object.assign(player.bondState, { kiep: 7, dienHai: 3 });
    command(state, { type: 'craft', heroId: recipe.heroId });
    expect(player.bondState).toMatchObject({ kiep: 7, dienHai: 3 });
  });

  it('draws bond rolls from a stream separate from the control stream', () => {
    const state = game();
    const control = state.controlSeed;
    const roll = bondRandom(state);
    expect(roll).toBeGreaterThanOrEqual(0); expect(roll).toBeLessThan(1);
    expect(state.controlSeed).toBe(control);
  });
});

describe('forceCast', () => {
  const ready = (unit: ReturnType<typeof deployed>) => {
    unit.abilityCooldown = 0;
    if (unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit') unit.energy = unit.maxEnergy ?? 100;
  };

  it('casts without spending Nộ or cooldown, and does not re-trigger bond handlers', () => {
    const state = game();
    const kimTra = deployed(state, 'h009', 0); deployed(state, 'h00A', 1);
    const onCast = vi.fn();
    probe(2, { onCast });
    expect(state.players.p1.activeSynergies.some(s => s.id === 2)).toBe(true);
    ready(kimTra);
    expect(castAbility(state, kimTra)).toBe(true);
    expect(onCast).toHaveBeenCalledTimes(1);

    kimTra.shield = 0; kimTra.abilityCooldown = 12;
    const energy = kimTra.energy;
    expect(forceCast(state, kimTra)).toBe(true);
    expect(kimTra.shield).toBeGreaterThan(0);
    expect(kimTra.abilityCooldown).toBe(12);
    expect(kimTra.energy).toBe(energy);
    expect(onCast).toHaveBeenCalledTimes(1);
  });

  it('carries the bond marker through a windup cast so its resolution cannot chain', () => {
    const state = game();
    const kimTra = deployed(state, 'h009', 0); deployed(state, 'h00A', 1);
    const onCast = vi.fn();
    probe(2, { onCast });
    state.phase = 'combat';
    kimTra.abilityCooldown = 9;
    expect(forceCast(state, kimTra)).toBe(true);
    expect(kimTra.pendingAbility?.bondTriggered).toBe(true);
    expect(kimTra.abilityCooldown).toBe(9);
    for (let i = 0; i < 20; i++) combatStep(state, .05);
    expect(kimTra.pendingAbility).toBeUndefined();
    expect(onCast).not.toHaveBeenCalled();
  });

  it('refuses while the hero is already winding up', () => {
    const state = game();
    const kimTra = deployed(state, 'h009', 0);
    state.phase = 'combat';
    expect(forceCast(state, kimTra)).toBe(true);
    expect(forceCast(state, kimTra)).toBe(false);
  });
});
