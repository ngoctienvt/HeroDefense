import { describe, expect, it } from 'vitest';
import { GEAR_UNIQUES } from '../../../content/gear-design.js';
import type { GameState, GearItem, GearUniqueId, Unit } from '../../contracts/src/types.js';
import { combatStep, hurtEnemy } from '../src/combat.js';
import { gearNormalHit } from '../src/gear-attacks.js';
import { settleGearRecovery } from '../src/gear-recovery.js';
import { refreshStats } from '../src/stats.js';
import { resolveTier3Ability } from '../src/tier3-combat.js';
import { deployed, enemy, game } from './fixtures.js';

function wear(state: GameState, unit: Unit, unique: GearUniqueId): void {
  const item: GearItem = { id: `interaction-${unit.id}-${unique}`, slot: GEAR_UNIQUES[unique].slot,
    rarity: 'gold', level: 20, enhance: 0, rerolls: 0, lines: [], unitId: unit.id, unique };
  state.players[unit.owner].gear.push(item); state.players[unit.owner].gearVersion++;
  refreshStats(state, unit.owner);
}

describe('gear interactions with shared combat state', () => {
  it('scales both attack and max-HP portions of the free guardian shield', () => {
    const normal = game(), scaled = game();
    const a = deployed(normal, 'h00J'), b = deployed(scaled, 'h00J');
    b.gearRuntime = { castScale: .4 };
    resolveTier3Ability(normal, a, a, () => {});
    resolveTier3Ability(scaled, b, b, () => {});
    expect(b.shield).toBeCloseTo(a.shield * .4);
    expect(b.tierShield?.amount).toBeCloseTo((a.tierShield?.amount ?? 0) * .4);
  });
  it('scales new and replacement shield bookkeeping without reducing unrelated retained shields', () => {
    const state = game(), unit = deployed(state, 'h006');
    wear(state, unit, 'blood-pact'); settleGearRecovery(state, unit);
    unit.shield = 100; unit.lanternShield = { amount: 100, remaining: 5, casterId: unit.id };
    settleGearRecovery(state, unit);
    expect(unit.shield).toBe(40); expect(unit.lanternShield.amount).toBe(40);
    unit.shield -= unit.lanternShield.amount;
    unit.shield += 100; unit.lanternShield = { amount: 100, remaining: 5, casterId: unit.id };
    settleGearRecovery(state, unit);
    expect(unit.shield).toBe(40); expect(unit.lanternShield.amount).toBe(40);
    unit.shield += 50; unit.divineShield = { amount: 50, remaining: 1 };
    settleGearRecovery(state, unit);
    expect(unit.shield).toBe(60); expect(unit.divineShield.amount).toBe(20);
    unit.shield -= unit.divineShield.amount; unit.divineShield = undefined;
    settleGearRecovery(state, unit);
    expect(unit.shield).toBe(40);
  });

  it('retains pending healing through refreshStats and does not mistake max-HP scaling for recovery', () => {
    const state = game(), unit = deployed(state, 'h006');
    wear(state, unit, 'blood-pact'); unit.hp = 100; settleGearRecovery(state, unit);
    unit.hp += 50;
    refreshStats(state, unit.owner);
    settleGearRecovery(state, unit);
    expect(unit.hp).toBe(120);
  });

  it('credits each soul-linked death once to its actual killer when a nearby gourd bursts', () => {
    const state = game(), killer = deployed(state, 'h006'), gourd = deployed(state, 'h006', 0, 'p2');
    gourd.x = killer.x; gourd.z = killer.z;
    wear(state, gourd, 'heaven-devouring-gourd'); gourd.gearRuntime = { souls: 24 };
    const a = enemy(state, killer, { hp: 1, maxHp: 1 }), b = enemy(state, killer, { hp: 1, maxHp: 1 });
    a.soulLink = { remaining: 5, group: [a.id, b.id], sharePercent: 1 };
    hurtEnemy(state, killer, a, 100);
    expect(killer.kills).toBe(2); expect(gourd.kills).toBe(0);
    expect(state.events.filter(event => event.kind === 'death' && [a.id, b.id].includes(event.target ?? ''))).toHaveLength(2);
    expect(Object.keys(state.enemies)).toHaveLength(0);
  });

  it('caps recovery at actual HP removed and does not advance counters on delayed normal hits', () => {
    const state = game(), unit = deployed(state, 'h006');
    wear(state, unit, 'yin-yang'); unit.hp = 100; unit.gearRuntime = { attacks: 6 };
    const target = enemy(state, unit, { hp: 1, maxHp: 1 });
    gearNormalHit(state, unit, target, 1000, 0,
      (victim, amount) => hurtEnemy(state, unit, victim, amount), true);
    expect(unit.hp).toBeCloseTo(100.3); expect(unit.gearRuntime.attacks).toBe(6);
  });

  it('still releases the seventh free skill after its primary enemy dies', () => {
    const state = game(), unit = deployed(state, 'h012');
    wear(state, unit, 'seven-kills'); unit.gearRuntime = { attacks: 6 };
    const target = enemy(state, unit, { hp: 1, maxHp: 1 });
    enemy(state, unit, { x: unit.x + 2, hp: 1e9, maxHp: 1e9 });
    unit.target = target.id; unit.energy = 0; unit.abilityCooldown = 99;
    state.phase = 'combat'; combatStep(state, .01);
    expect(state.events.some(event => event.kind === 'ability' && event.skillId === 'skill-h012')).toBe(true);
    expect(Object.values(state.units).some(clone => clone.summonerId === unit.id)).toBe(true);
  });
});
