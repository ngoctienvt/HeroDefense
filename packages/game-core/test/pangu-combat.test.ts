import { describe, expect, it } from 'vitest';
import { MELEE_CLEAVE_SECONDARY } from '../../contracts/src/combat-profiles.js';
import { HERO_BY_ID, CRAFT_RECIPES } from '../../../content/catalog.js';
import { PANGU as P } from '../../../content/pangu-design.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { inPanguRift, panguAbility, stepPanguRifts } from '../src/pangu-combat.js';
import { effectiveUnitAttack } from '../src/stats.js';
import { random } from '../src/rules.js';
import { deployed, enemy, game, summon } from './fixtures.js';

function setup() {
  const state = game(), unit = deployed(state, P.id);
  const physical = (e: ReturnType<typeof enemy>, damage: number, penetration = 0) => hurtEnemy(state, unit, e, damage, penetration);
  const pure = (e: ReturnType<typeof enemy>, damage: number) => hurtEnemy(state, unit, e, damage, 0, false, true);
  return { state, unit, physical, pure };
}
function nonCriticalSeed(): number {
  const state = game();
  for (let seed = 1; seed < 100000; seed++) { state.seed = seed; if (random(state) >= P.critChance) return seed; }
  throw new Error('No noncritical deterministic seed found');
}

describe('Khai Thiên Tổ Thần', () => {
  it('uses requested base stats and preserves the extracted recipe', () => {
    expect(HERO_BY_ID[P.id]).toMatchObject({ hp: 14500, attack: 1150, armor: 36, range: 2.8, interval: .9, speed: 4.4, element: 1, role: 'warrior' });
    expect(CRAFT_RECIPES.find(r => r.heroId === P.id)?.ingredients).toEqual(['h011', 'h012', 'h00Y']);
  });
  it('cleaves only the front semicircle and grants rage once per swing', () => {
    const { state, unit, physical } = setup(); state.seed = nonCriticalSeed();
    const target = enemy(state, unit), side = enemy(state, unit, { x: unit.x, z: unit.z + 3.7 });
    const behind = enemy(state, unit, { x: unit.x - .1 }), far = enemy(state, unit, { x: unit.x + 3.9 });
    executeAttackGeometry(state, unit, target, physical);
    expect(unit.energy).toBe(14); expect(target.maxHp - target.hp).toBeCloseTo(unit.attack);
    expect(side.maxHp - side.hp).toBeCloseTo(unit.attack * MELEE_CLEAVE_SECONDARY);
    expect(behind.hp).toBe(behind.maxHp); expect(far.hp).toBe(far.maxHp);
  });
  it('grants total 24 rage for a critical swing and ignores 35% armor', () => {
    const { state, unit, physical } = setup(); state.seed = 1;
    const target = enemy(state, unit, { armor: 100 });
    executeAttackGeometry(state, unit, target, physical);
    expect(state.events.at(-1)?.isCrit).toBe(true); expect(unit.energy).toBe(24);
    expect(target.maxHp - target.hp).toBeCloseTo(unit.attack * 2.2 * 100 / 425);
  });
  it('replaces every third cleave with a nine-unit line, bleed and knockback', () => {
    const { state, unit, physical } = setup(); state.seed = nonCriticalSeed(); unit.attackCount = 2;
    unit.zone = 1;
    const target = enemy(state, unit), distant = enemy(state, unit, { x: unit.x + 8.9 });
    const side = enemy(state, unit, { x: unit.x + 2, z: unit.z + .7 });
    executeAttackGeometry(state, unit, target, physical);
    expect(distant.maxHp - distant.hp).toBeCloseTo(unit.attack * 1.8);
    expect(distant.bleed).toEqual({ remaining: 3, bonusDamage: .1 });
    // Knockback pushes away from Bàn Cổ along the rift, not toward the lane start.
    expect(distant.x).toBeCloseTo(unit.x + 8.9 + .6);
    expect(distant.z).toBeCloseTo(unit.z);
    expect(side.hp).toBe(side.maxHp); expect(unit.attackCount).toBe(3);
    expect(state.events.at(-1)).toMatchObject({ geometry: 'linear_pierce', skillId: 'nth-h01B' });
  });
  it('locks the impact point and resolves even if the selected target dies in windup', () => {
    const { state, unit } = setup(); state.phase = 'combat'; unit.energy = 100;
    const target = enemy(state, unit), survivor = enemy(state, unit, { x: unit.x + 2 });
    expect(castAbility(state, unit, target.id)).toBe(true);
    expect(unit.pendingAbility?.remaining).toBe(.35);
    unit.cooldown = 10; const hp = unit.hp; combatStep(state, .1);
    expect(unit.hp).toBe(hp); expect(unit.energy).toBe(0);
    delete state.enemies[target.id]; combatStep(state, .25);
    expect(unit.pendingAbility).toBeUndefined(); expect(survivor.hp).toBeLessThan(survivor.maxHp);
    expect(state.groundEffects?.[0]).toMatchObject({ kind: 'pangu-rift', remaining: 5, length: 14, width: 4.5 });
  });
  it('gains five rage from a successful incoming hit outside windup', () => {
    const { state, unit } = setup(); unit.orderMode = 'hold'; unit.cooldown = 10;
    enemy(state, unit, { x: unit.x, z: unit.z, attack: 10, target: unit.id });
    // The monster's hit lands after its wind-up; one swing fits in 0.6 s.
    for (let tick = 0; tick < 12; tick++) combatStep(state, .05);
    expect(unit.energy).toBe(5); expect(unit.hp).toBeLessThan(unit.maxHp);
  });
  it('auto-cast never falls through to a normal attack in the same windup tick', () => {
    const { state, unit } = setup(); state.phase = 'combat'; unit.energy = 100; unit.cooldown = 0;
    const target = enemy(state, unit, { attack: 10 });
    combatStep(state, .05);
    expect(unit.pendingAbility?.remaining).toBe(.35);
    expect(unit.attackCount ?? 0).toBe(0); expect(unit.energy).toBe(0);
    expect(target.hp).toBe(target.maxHp); expect(unit.hp).toBe(unit.maxHp);
    expect(state.events.filter(e => e.source === unit.id).map(e => e.kind)).toEqual(['cast']);
  });
  it('attributes a critical-triggered follow-up kill to the allied attacker', () => {
    const { state, unit } = setup(); const ally = deployed(state, 'h006', 1);
    ally.x = unit.x; ally.z = unit.z; ally.cooldown = 10; state.seed = 1;
    const hp = unit.attack * 2.2 + 1;
    const target = enemy(state, unit, { hp, maxHp: hp });
    combatStep(state, .05);
    expect(state.enemies[target.id]).toBeUndefined(); expect(unit.kills).toBe(0); expect(ally.kills).toBe(1);
  });
  it('guarantees crit on already-sundered or wounded targets and never stuns', () => {
    const { state, unit, physical, pure } = setup(); state.seed = nonCriticalSeed();
    const healthy = enemy(state, unit), stunned = enemy(state, unit, { kind: 'boss', sunder: { remaining: 1, amount: .1, percent: true } });
    const low = enemy(state, unit, { hp: 49999 });
    panguAbility(state, unit, healthy, { x: 1, z: 0 }, physical, pure);
    expect(healthy.maxHp - healthy.hp).toBeCloseTo(unit.attack * (4.8 + 1.5));
    expect(stunned.maxHp - stunned.hp).toBeCloseTo(unit.attack * (4.8 * 2.2 + 1.5));
    expect(49999 - low.hp).toBeCloseTo(unit.attack * (4.8 * 2.2 + 1.5));
    expect(stunned.stun ?? 0).toBe(0); expect(stunned.sunder).toMatchObject({ amount: .5, remaining: 6, percent: true });
  });
  it('hits all main lanes with true damage and empowers only deployed owner allies', () => {
    const { state, unit, physical, pure } = setup();
    const ally = deployed(state, 'h001', 1), remoteAlly = deployed(state, 'h002', 2); remoteAlly.zone = 1;
    const otherPlayer = deployed(state, 'h003', 0, 'p2'), bench = summon(state, 'h004');
    const remote = enemy(state, unit, { x: unit.x + 40, owner: 'p2', armor: 10000, bleed: { remaining: 3, bonusDamage: .1 } });
    const dungeon = enemy(state, unit, { x: unit.x + 40, zone: 1 });
    panguAbility(state, unit, unit, { x: 1, z: 0 }, physical, pure);
    expect(remote.maxHp - remote.hp).toBeCloseTo(unit.attack * 1.5); expect(dungeon.hp).toBe(dungeon.maxHp);
    for (const u of [unit, ally, remoteAlly]) expect(u.empower).toEqual({ remaining: 5, attackBonus: .25, armorPierce: .2 });
    expect(otherPlayer.empower).toBeUndefined(); expect(bench.empower).toBeUndefined();
    expect(effectiveUnitAttack(ally)).toBeCloseTo(ally.attack * 1.25);
    const armored = enemy(state, ally, { armor: 100 }); const before = armored.hp;
    hurtEnemy(state, ally, armored, 100); expect(before - armored.hp).toBeCloseTo(20);
  });
  it('uses an oriented rectangle and integrates only remaining rift time', () => {
    const { state, unit, physical, pure } = setup();
    panguAbility(state, unit, unit, { x: 0, z: 1 }, physical, pure);
    const ground = state.groundEffects![0]; ground.remaining = .05;
    const inside = enemy(state, unit, { x: unit.x + 2.2, z: unit.z + 13.9, armor: 10000, bleed: { remaining: 3, bonusDamage: .1 } });
    const outside = enemy(state, unit, { x: unit.x + 2.3, z: unit.z + 8 });
    stepPanguRifts(state, .2, (u, e, d) => hurtEnemy(state, u, e, d, 0, false, true));
    expect(inside.maxHp - inside.hp).toBeCloseTo(1150 * .9 * .05); expect(inside.slowStrength).toBe(.6);
    expect(outside.hp).toBe(outside.maxHp); expect(ground.remaining).toBe(0);
    expect(inPanguRift(unit, { x: 0, z: 1 }, { x: unit.x, z: unit.z - .1 }, 14, 4.5)).toBe(false);
  });
  it('removes empower at expiry without changing permanent attack', () => {
    const { state, unit } = setup(); unit.cooldown = 10;
    unit.empower = { remaining: .05, attackBonus: .25, armorPierce: .2 };
    const base = unit.attack; combatStep(state, .1);
    expect(unit.empower).toBeUndefined(); expect(effectiveUnitAttack(unit)).toBe(base);
  });
  it('blocks ten enemies and lets the eleventh continue', () => {
    const { state, unit } = setup(); unit.zone = 1; unit.cooldown = 10;
    for (let i = 0; i < 11; i++) enemy(state, unit);
    combatStep(state, .05);
    expect(Object.values(state.enemies).filter(e => e.target === unit.id)).toHaveLength(10);
  });
});
