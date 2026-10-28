import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { gearLevelScale } from '../../../content/gear-design.js';
import type { GameState, GearItem, Unit } from '../../contracts/src/types.js';
import { executeAttackGeometry, stepOrbitAuras, triggerFollowUp } from '../src/attack-geometry.js';
import { applyEnemyStatus } from '../src/combat-status.js';
import { abilityCooldownFor, gearModsOf, peekGearMods, unitSpeed } from '../src/gear-stats.js';
import { settleGearRecovery } from '../src/gear-uniques.js';
import { attackInterval, effectiveUnitAttack, refreshStats, skillDamageMultiplier } from '../src/stats.js';
import { deployed, enemy, game } from './fixtures.js';

function wear(state: GameState, unit: Unit, patch: Partial<GearItem> = {}): GearItem {
  const item: GearItem = { id: `test-gear-${state.players[unit.owner].gear.length}`, slot: 'weapon', rarity: 'gold',
    level: 20, enhance: 0, rerolls: 0, lines: [], unitId: unit.id, ...patch };
  state.players[unit.owner].gear.push(item);
  state.players[unit.owner].gearVersion++;
  return item;
}

describe('gear stat aggregation', () => {
  it('normalizes ratios and scales bases and rolls while keeping armor absolute', () => {
    const state = game(), unit = deployed(state, 'h007');
    wear(state, unit, { slot: 'armor', level: 10, enhance: 10, lines: [
      { stat: 'health-percent', value: 20 }, { stat: 'armor-flat', value: 5 },
    ] });
    const mods = gearModsOf(state, unit);
    expect(mods['health-percent']).toBeCloseTo(.45 * gearLevelScale(10) * 1.6 + .2 * 1.6);
    expect(mods['armor-flat']).toBeCloseTo(6 * gearLevelScale(10) * 1.6 + 8);
  });

  it('rejects incompatible geometry and resource lines, including custom hero attacks', () => {
    const state = game(), unit = deployed(state, 'h01B');
    wear(state, unit, { lines: [{ stat: 'pierce-length', value: 40 }, { stat: 'cleave-radius', value: 30 },
      { stat: 'cooldown-reduction', value: 15 }] });
    const mods = gearModsOf(state, unit);
    expect(mods['pierce-length']).toBe(0);
    expect(mods['cleave-radius']).toBe(0);
    expect(mods['cooldown-reduction']).toBe(0);
  });

  it('caches by version, player identity, and hero identity; empty units share a zero object', () => {
    const state = game(), unit = deployed(state), other = deployed(state, 'h002', 1);
    expect(gearModsOf(state, unit)).toBe(gearModsOf(state, other));
    const item = wear(state, unit, { lines: [{ stat: 'pierce-length', value: 40 }] });
    const first = gearModsOf(state, unit);
    expect(gearModsOf(state, unit)).toBe(first);
    expect(peekGearMods(unit)).toBe(first);
    item.enhance = 10;
    state.players[unit.owner].gearVersion++;
    expect(gearModsOf(state, unit)['attack-percent']).toBeCloseTo(.64);
    state.players[unit.owner] = { ...state.players[unit.owner], gear: [] };
    expect(gearModsOf(state, unit)['attack-percent']).toBe(0);
    wear(state, unit, { lines: [{ stat: 'pierce-length', value: 40 }] });
    gearModsOf(state, unit);
    unit.heroId = 'h004';
    expect(peekGearMods(unit)['pierce-length']).toBe(0);
    expect(gearModsOf(state, unit)['pierce-length']).toBeCloseTo(.4);
  });

  it('caps persistent absorption independently of enhancement and preserves absorbed flat stats', () => {
    const state = game(), unit = deployed(state);
    wear(state, unit, { unique: 'star-absorption', stacks: 1000, enhance: 10,
      absorbedAttack: 31, absorbedHp: 73 });
    const mods = gearModsOf(state, unit);
    expect(mods['attack-percent']).toBeCloseTo(.64 + .6);
    expect(mods.absorbedAttack).toBe(31);
    expect(mods.absorbedHp).toBe(73);
  });

  it('preserves health fraction when equipping and removing health gear', () => {
    const state = game(), unit = deployed(state);
    unit.hp = unit.maxHp * .37;
    wear(state, unit, { slot: 'armor', unique: 'heaven-earth-reversal' });
    refreshStats(state, unit.owner);
    expect(unit.hp / unit.maxHp).toBeCloseTo(.37);
    expect(unit.attack).toBe(Math.round(HERO_BY_ID[unit.heroId].attack + unit.maxHp * .06));
    state.players[unit.owner].gear = [];
    state.players[unit.owner].gearVersion++;
    refreshStats(state, unit.owner);
    expect(unit.hp / unit.maxHp).toBeCloseTo(.37);
  });

  it('does not treat armor max-HP rescaling as incoming Blood Pact healing', () => {
    const state = game(), unit = deployed(state);
    wear(state, unit, { unique: 'blood-pact' });
    refreshStats(state, unit.owner);
    unit.hp = unit.maxHp * .4;
    unit.gearRuntime = { hpSeen: unit.hp, shieldSeen: unit.shield };
    wear(state, unit, { slot: 'armor' });
    refreshStats(state, unit.owner);
    settleGearRecovery(state, unit);
    expect(unit.hp / unit.maxHp).toBeCloseTo(.4);
  });

  it('applies skill, cooldown, status duration, cast scaling, and movement passives', () => {
    const state = game(), unit = deployed(state, 'h00B'), target = enemy(state, unit);
    wear(state, unit, { slot: 'talisman', unique: 'wind-fire-wheels', lines: [
      { stat: 'skill-damage', value: 25 }, { stat: 'cooldown-reduction', value: 15 },
      { stat: 'status-duration', value: 40 },
    ] });
    refreshStats(state, unit.owner);
    expect(skillDamageMultiplier(state, unit)).toBeCloseTo(1.45);
    expect(abilityCooldownFor(unit, 10)).toBeCloseTo(8.5);
    expect(abilityCooldownFor(unit, 10, state)).toBeCloseTo(8.5);
    expect(unitSpeed(unit)).toBe(HERO_BY_ID[unit.heroId].speed * 2);
    applyEnemyStatus(target, unit, 0, 'slow', 2, .3);
    applyEnemyStatus(target, unit, 0, 'sunder', 3, .2);
    expect(target.slow).toBeCloseTo(2.8);
    expect(target.sunder?.remaining).toBeCloseTo(4.2);
    unit.gearRuntime = { castScale: .4 };
    expect(effectiveUnitAttack(unit)).toBeCloseTo(unit.attack * .4);
  });

  it('applies demon speed while sea anchor leaves the final attack rate unchanged', () => {
    const state = game(), unit = deployed(state);
    const initial = attackInterval(state, unit);
    wear(state, unit, { unique: 'demon-heart' });
    expect(attackInterval(state, unit)).toBeCloseTo(initial / 1.8);
    wear(state, unit, { slot: 'armor', unique: 'sea-anchor' });
    expect(attackInterval(state, unit)).toBeCloseTo(initial / 1.8);
  });

  it('applies seated range and attack and treasure attack penalty without stacking unique effects', () => {
    const state = game(), unit = deployed(state), hero = HERO_BY_ID[unit.heroId];
    const baseRange = unit.range;
    wear(state, unit, { slot: 'talisman', unique: 'seated-oblivion' });
    refreshStats(state, unit.owner);
    expect(unit.range).toBeCloseTo(baseRange * 1.6);
    expect(unit.attack).toBe(Math.round(hero.attack * 1.4));
    state.players[unit.owner].gear[0].unique = 'treasure-basin';
    state.players[unit.owner].gearVersion++;
    refreshStats(state, unit.owner);
    expect(unit.attack).toBe(Math.round(hero.attack * .75));
  });
});

describe('gear attack geometry', () => {
  it.each(['h01B', 'h00T', 'h002', 'h010', 'h00A', 'h00J', 'h03R'])
  ('replacement bounce suppresses native attacks and on-hit effects for %s', heroId => {
    const state = game(), unit = deployed(state, heroId);
    unit.hp = unit.maxHp / 2;
    unit.tierBuff = { kind: 'fire', remaining: 10 };
    const hp = unit.hp, energy = unit.energy;
    const targets = [0, 1, 2, 3].map(i => enemy(state, unit, { x: unit.x + 1 + i, z: unit.z, slow: 1 }));
    const hits: number[] = [];
    executeAttackGeometry(state, unit, targets[0], (_target, damage) => hits.push(damage), {
      geometryOverride: { type: 'bounce', bounces: 3, bounceRadius: 5, bounceDecay: .15 },
    });
    expect(hits).toEqual([1, .85, .7, .55].map(ratio => unit.attack * ratio));
    expect(unit.hp).toBe(hp);
    expect(unit.energy).toBe(energy);
    expect(targets.every(t => !t.burn && !t.poison && !t.fireMark && !t.attackWeak)).toBe(true);
    expect(state.events.filter(e => e.kind === 'attack')).toHaveLength(4);
  });

  it('extends generic pierce reach and frontal cleave radius with compatible lines', () => {
    const state = game(), archer = deployed(state, 'h004');
    wear(state, archer, { lines: [{ stat: 'pierce-length', value: 40 }] });
    const reach = HERO_BY_ID[archer.heroId].attackGeometry?.length ?? archer.range;
    const primary = enemy(state, archer, { x: archer.x + 1, z: archer.z });
    const far = enemy(state, archer, { x: archer.x + reach * 1.2, z: archer.z });
    const hits: string[] = [];
    executeAttackGeometry(state, archer, primary, t => hits.push(t.id));
    expect(hits).toContain(far.id);
    const melee = deployed(state, 'h003', 1);
    wear(state, melee, { lines: [{ stat: 'cleave-radius', value: 30 }] });
    const radius = HERO_BY_ID[melee.heroId].attackGeometry?.radius ?? 2.2;
    const near = enemy(state, melee, { x: melee.x + .5, z: melee.z });
    const edge = enemy(state, melee, { x: melee.x + radius * 1.15, z: melee.z });
    executeAttackGeometry(state, melee, near, t => hits.push(t.id));
    expect(hits).toContain(edge.id);
  });

  it('suppresses native orbit and follow-up damage for replacement attacks', () => {
    const state = game(), orbiter = deployed(state, 'h00V'), support = deployed(state, 'h006', 1);
    const ally = deployed(state, 'h001', 2), target = enemy(state, ally, { x: orbiter.x, z: orbiter.z });
    wear(state, orbiter, { unique: 'fate-defiance' });
    wear(state, support, { unique: 'fate-defiance' });
    let hits = 0;
    stepOrbitAuras(state, 1, () => { hits++; });
    triggerFollowUp(state, ally, target, 'skill', () => { hits++; });
    expect(hits).toBe(0);
  });
});
