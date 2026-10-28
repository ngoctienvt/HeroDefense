import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { gearEnhanceSpent } from '../../../content/gear-design.js';
import type { GameState, Unit } from '../../contracts/src/types.js';
import { GEAR_SLOTS } from '../../contracts/src/gear-types.js';
import { supportAmount } from '../src/ally-scaled-support.js';
import { hurtEnemy } from '../src/combat.js';
import { gearCommand } from '../src/gear-commands.js';
import { grantGearItem, onWaveEndDrought, rollGearItem } from '../src/gear-items.js';
import { abilityCooldownFor, gearModsOf } from '../src/gear-stats.js';
import { beginWave, stepGame } from '../src/simulation.js';
import { attackInterval, effectiveUnitAttack, refreshStats, skillDamageMultiplier } from '../src/stats.js';
import { nextId } from '../src/rules.js';
import { resolveEnemySpawn, WAVE_PLANS } from '../src/wave-plan.js';
import { deployed, game } from './fixtures.js';

const SQUAD = ['h01B', 'h011', 'h01F', 'h01C', 'h015'];
function seeded(seed: number): GameState {
  const state = game(1);
  state.seed = seed; state.gearSeed = (seed ^ 0x85ebca6b) >>> 0;
  state.controlChanceOverride = undefined;
  return state;
}
function killSpawn(state: GameState, unit: Unit, archetype: string, twin = false): void {
  const spec = resolveEnemySpawn(state.wave, archetype, 1, twin), id = nextId(state, 'e');
  const target = {
    id, owner: 'p1', name: spec.name, kind: spec.kind, rank: spec.rank, zone: 0,
    x: unit.x + 1, z: unit.z, hp: spec.hp, maxHp: spec.hp, attack: spec.attack,
    armor: spec.armor, speed: spec.speed, cooldown: 0, target: null, leak: spec.leak, slow: 0,
  };
  state.enemies[id] = target;
  // A deterministic kill-feed experiment isolates loot; it does not simulate player combat skill.
  hurtEnemy(state, unit, target, target.maxHp * 100, 0, false, true);
}

describe('twenty-wave gear balance report (diagnostic, no visual acceptance)', () => {
  it('reports observed drops across the real twenty-wave roster with independent seeds', () => {
    const rows = Array.from({ length: 32 }, (_, index) => {
      const state = seeded(100_003 + index * 7919), unit = deployed(state, 'h001');
      for (const plan of WAVE_PLANS) {
        state.wave = plan.wave;
        for (const group of plan.spawns) for (let count = 0; count < group.count; count++)
          killSpawn(state, unit, group.archetypeId);
        for (const boss of plan.bosses ?? []) killSpawn(state, unit, boss, (plan.bosses?.length ?? 0) > 1);
        onWaveEndDrought(state);
      }
      const loot = state.players.p1.gear;
      return { seed: index, kills: unit.kills, items: loot.length,
        white: loot.filter(item => item.rarity === 'white').length, blue: loot.filter(item => item.rarity === 'blue').length,
        purple: loot.filter(item => item.rarity === 'purple').length, gold: loot.filter(item => item.rarity === 'gold').length };
    });
    const items = rows.reduce((sum, row) => sum + row.items, 0) / rows.length;
    const gold = rows.reduce((sum, row) => sum + Number(row.gold), 0) / rows.length;
    console.table([{ seeds: rows.length, laneKills: rows[0].kills, meanItems: items, meanGold: gold,
      itemTarget: '25–35', goldTarget: '2–5', itemsInBand: items >= 25 && items <= 35, goldInBand: gold >= 2 && gold <= 5 }]);
    expect(rows.every(row => row.kills === 462)).toBe(true);
    expect(rows.every(row => row.items >= 6)).toBe(true);
    expect(new Set(rows.map(row => row.items)).size).toBeGreaterThan(1);
  });

  it('reports actual kill ownership and loot from a fixed squad using the full simulation', () => {
    const state = seeded(782_341);
    const squad = SQUAD.map((id, slot) => deployed(state, id, slot));
    state.phase = 'preparation';
    const finished = () => state.phase === 'won' || state.phase === 'lost';
    const equipped = new Set<string>();
    // Fixed tier-five/six roster from wave one measures mechanics; it is not a summon-progression benchmark.
    for (let ticks = 0; ticks < 7200 && !finished(); ticks++) {
      if (state.phase === 'preparation') {
        for (const item of state.players.p1.gear) if (!equipped.has(item.id)) {
          const unit = squad.find(candidate => !state.players.p1.gear.some(other => other.unitId === candidate.id && other.slot === item.slot))
            ?? squad[Number(item.id.slice(1)) % squad.length];
          gearCommand(state, 'p1', { type: 'equip-item', itemId: item.id, unitId: unit.id });
          equipped.add(item.id);
        }
        beginWave(state);
      }
      stepGame(state, .5);
    }
    console.table(squad.map(unit => ({ hero: HERO_BY_ID[unit.heroId].name, kills: unit.kills, deaths: unit.deaths })));
    console.table([{ phase: state.phase, reachedWave: state.wave, seconds: Math.round(state.elapsed),
      actualKills: state.players.p1.kills, actualItems: state.players.p1.gear.length, actualGold: state.players.p1.gold }]);
    expect(state.wave).toBeGreaterThan(0);
    expect(state.players.p1.kills).toBeGreaterThan(0);
    expect(Number.isFinite(state.elapsed)).toBe(true);
  }, 60_000);

  it('compares seeded level-twenty purple +6 stats with the removed level-five formulas', () => {
    const rows = SQUAD.map(heroId => {
      const samples = Array.from({ length: 16 }, (_, index) => {
        const state = seeded(230_003 + index * 101), unit = deployed(state, heroId);
        for (const slot of GEAR_SLOTS) {
          const item = rollGearItem(state, { source: 'admin', slot, rarity: 'purple', level: 20 });
          item.enhance = 6;
          grantGearItem(state, 'p1', item, 'admin'); item.unitId = unit.id;
        }
        state.players.p1.gearVersion++; refreshStats(state, 'p1');
        const h = HERO_BY_ID[heroId], mods = gearModsOf(state, unit), enemyArmor = 20;
        const crit = 1 + mods['crit-chance'] * (.5 + mods['crit-damage']);
        const basicDps = unit.attack / attackInterval(state, unit) * crit
          * 100 / (100 + enemyArmor * (1 - Math.min(1, mods['armor-pierce'])) * 5);
        const legacyDps = h.attack * 2.1 / (h.interval / 1.2) * 100 / (100 + enemyArmor * 5);
        const ehp = unit.maxHp * (1 + unit.armor * .05) / (1 - Math.min(.95, mods['damage-reduction']));
        const legacyEhp = h.hp * 2.25 * (1 + (h.armor + 20) * .05);
        const ability = h.ability;
        return { dpsRatio: basicDps / legacyDps, ehpRatio: ehp / legacyEhp,
          skillMultiplier: skillDamageMultiplier(state, unit),
          cooldown: ability ? abilityCooldownFor(unit, ability.cooldown, state) : 0 };
      });
      const mean = (key: keyof typeof samples[number]) => samples.reduce((sum, row) => sum + row[key], 0) / samples.length;
      return { hero: HERO_BY_ID[heroId].name, basicDpsRatio: mean('dpsRatio'), ehpRatio: mean('ehpRatio'),
        skillDamageMultiplier: mean('skillMultiplier'), cooldown: mean('cooldown'), target: '.85–1.15' };
    });
    // This isolates general basic-hit/EHP formulas. Hero geometry/procs/uniques and real incoming damage are excluded.
    console.table(rows);
    for (const row of rows) {
      expect(row.basicDpsRatio).toBeGreaterThan(0);
      expect(row.ehpRatio).toBeGreaterThan(0);
    }
  });

  it('reports reference support amounts including the recipient health share', () => {
    const rows = ['h009', 'h00K', 'h010', 'h03U'].map(heroId => {
      const state = seeded(523_703), unit = deployed(state, heroId), hero = HERO_BY_ID[heroId];
      for (const slot of GEAR_SLOTS) {
        const item = rollGearItem(state, { slot, rarity: 'purple', level: 20 });
        item.enhance = 6; grantGearItem(state, 'p1', item, 'admin'); item.unitId = unit.id;
      }
      state.players.p1.gearVersion++; refreshStats(state, 'p1');
      const ability = hero.ability!;
      const recipientShare = ability.effect?.recipientMaxHpRatio ?? 0;
      const current = supportAmount(effectiveUnitAttack(unit) * ability.power, unit, recipientShare);
      const legacy = supportAmount(hero.attack * 2.1 * ability.power * 2.25, { maxHp: hero.hp * 2.25 }, recipientShare);
      return { hero: hero.name, kind: ability.kind, current, legacy, ratio: current / legacy, recipientShare };
    });
    console.table(rows);
    for (const row of rows) {
      expect(['heal', 'shield']).toContain(row.kind);
      expect(row.current).toBeGreaterThan(0);
      expect(row.legacy).toBeGreaterThan(0);
    }
  });

  it('requires an investment choice against the actual twenty-wave stone income', () => {
    const guaranteedGold = 500 + WAVE_PLANS.reduce((sum, plan) => sum + 180 + 40 * plan.wave, 0);
    const fullCost = 15 * gearEnhanceSpent(10);
    console.table([{ guaranteedGold, fifteenItemsAt10: fullCost, affordableAt10: guaranteedGold / gearEnhanceSpent(10),
      fifteenItemsAt8: 15 * gearEnhanceSpent(8), fifteenItemsAt6: 15 * gearEnhanceSpent(6) }]);
    expect(guaranteedGold).toBe(12_500);
    expect(fullCost).toBe(17_325);
    expect(fullCost).toBeGreaterThan(guaranteedGold);
  });
});
