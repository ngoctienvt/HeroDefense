import { describe, expect, it } from 'vitest';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { bondAreaScale, bondDamageMultiplier, bondExtraClones, bondHealMultiplier, bondOnBasicAttack, bondOnCast, bondOnCrit,
  bondOnSummonEnd, bondOnWaveClear, bondSummonScale } from '../src/bond-runtime.js';
import { hurtEnemy, hurtUnit } from '../src/combat.js';
import { gearModsOf } from '../src/gear-stats.js';
import { effectiveUnitAttack } from '../src/stats.js';
import { command, deployed, enemy, game, summon } from './fixtures.js';

const squad = (state: GameState, ids: string[]): Unit[] => ids.map((id, slot) => deployed(state, id, slot));
const combat = (state: GameState): void => { state.phase = 'combat'; };
const at = (state: GameState, unit: Unit, x: number, overrides: Partial<Enemy> = {}): Enemy =>
  enemy(state, unit, { x, z: 0, hp: 100, maxHp: 1000, ...overrides });
const burning = (unit: Unit): Enemy['burn'] => ({ remaining: 5, damagePerSecond: 1, casterId: unit.id });

describe('Kiếp Nạn (Thỉnh Kinh và Hậu Tây Du)', () => {
  it('counts wave clears, chieftains and bosses only while a Kiếp bond is active', () => {
    const state = game(), [pig] = squad(state, ['h00J']);
    combat(state);
    bondOnWaveClear(state);
    expect(state.players.p1.bondState.kiep).toBe(0);
    deployed(state, 'h00K', 1);
    bondOnWaveClear(state);
    hurtEnemy(state, pig, at(state, pig, 1, { hp: 1, rank: 'chieftain' }), 100);
    hurtEnemy(state, pig, at(state, pig, 1, { hp: 1 }), 100);
    expect(state.players.p1.bondState.kiep).toBe(2);
    hurtEnemy(state, pig, at(state, pig, 1, { hp: 1, kind: 'boss', rank: 'boss' }), 100);
    expect(state.players.p1.bondState.kiep).toBe(7);
  });

  it('counts once when both bonds are active, and Hậu Tây Du counts alone', () => {
    const state = game();
    squad(state, ['h03T', 'h03U']);
    bondOnWaveClear(state);
    expect(state.players.p1.bondState.kiep).toBe(1);
    deployed(state, 'h00J', 2); deployed(state, 'h00K', 3);
    bondOnWaveClear(state);
    expect(state.players.p1.bondState.kiep).toBe(2);
  });

  it('turns Kiếp into attack, speed at 18 and skill damage at 36, gated by tier', () => {
    const state = game(), units = squad(state, ['h00J', 'h00K', 'h00L', 'h00R']);
    const bond = state.players.p1.bondState;
    bond.kiep = 10; state.players.p1.bondVersion++;
    expect(gearModsOf(state, units[0])['attack-percent']).toBeCloseTo(.05);
    bond.kiep = 17; state.players.p1.bondVersion++;
    expect(gearModsOf(state, units[0]).moveSpeed).toBe(0);
    bond.kiep = 18; state.players.p1.bondVersion++;
    expect(gearModsOf(state, units[0]).moveSpeed).toBeCloseTo(.2);
    bond.kiep = 40; state.players.p1.bondVersion++;
    expect(gearModsOf(state, units[0])['skill-damage']).toBe(0); // 36 Kiếp needs the fifth pilgrim
    deployed(state, 'h00S', 4);
    expect(gearModsOf(state, units[0])['skill-damage']).toBeCloseTo(.2);
  });

  it('keeps Kiếp when a hero is sold (it lives on the player, not on units)', () => {
    const state = game();
    squad(state, ['h00J', 'h00K']);
    state.players.p1.bondState.kiep = 12;
    command(state, { type: 'sell', unitId: summon(state, 'h00L').id });
    bondOnWaveClear(state);
    expect(state.players.p1.bondState.kiep).toBe(13);
  });

  it('Bát Giới takes 30% of Đường Tăng damage, one way and only while alive', () => {
    const state = game(), [pig, monk] = squad(state, ['h00J', 'h00S']);
    combat(state);
    hurtUnit(state, monk, 100);
    expect(pig.hp).toBeLessThan(pig.maxHp);
    expect(monk.hp).toBeLessThan(monk.maxHp);
    const monkAfter = monk.hp;
    hurtUnit(state, pig, 100);
    expect(monk.hp).toBe(monkAfter);
    pig.hp = 0; pig.respawn = 5;
    hurtUnit(state, monk, 100);
    expect(pig.hp).toBe(0);
  });

  it('Đường Tăng hits monsters around the target for 150% attack and enrages Ngộ Không when he falls (tier 3)', () => {
    const state = game(), [monkey, monk] = squad(state, ['h00R', 'h00S', 'h00J']);
    combat(state);
    const foe = at(state, monk, 1, { hp: 100000, maxHp: 100000 });
    bondOnCast(state, monk, foe.id, false);
    expect(100000 - foe.hp).toBeCloseTo(effectiveUnitAttack(monk) * 1.5);
    hurtUnit(state, monk, 1e9);
    expect(monkey.empower?.attackBonus).toBeCloseTo(.5);
  });
});

describe('Hậu Tây Du Ký', () => {
  it('wards a member that drops below 30% once per wave, and adds a fourth clone at tier 5', () => {
    const state = game(), units = squad(state, ['h03T', 'h03U', 'h03V']);
    combat(state);
    units[0].hp = units[0].maxHp * .29;
    hurtUnit(state, units[0], 1);
    expect(units[0].divineImmortal).toBe(2);
    expect(bondExtraClones(state, units[0])).toBe(0);
    const [, , , fighter] = [...units, deployed(state, 'h012', 3), deployed(state, 'h013', 4)];
    expect(bondExtraClones(state, fighter)).toBe(1);
  });

  it('hits monsters inside the golden bowl 30% harder (tier 4)', () => {
    const state = game(), units = squad(state, ['h03T', 'h03U', 'h03V', 'h013']);
    combat(state);
    const inside = at(state, units[0], 0), outside = at(state, units[0], 30);
    (state.groundEffects ??= []).push({ x: 0, z: 0, zone: 0, radius: 3, remaining: 5, damagePerSecond: 0, casterId: units[3].id, kind: 'golden-bowl' });
    expect(bondDamageMultiplier(state, units[2], inside)).toBe(1.3);
    expect(bondDamageMultiplier(state, units[2], outside)).toBe(1);
  });
});

describe('Phong Thần Diễn Nghĩa', () => {
  it('awards Thần Vị only when the sealed monster dies in time, capped at 5 and growing attack', () => {
    const state = game(), units = squad(state, ['h00T', 'h00U', 'h00V', 'h019']);
    combat(state);
    state.elapsed = 10;
    let prey = at(state, units[0], 1, { rank: 'elite', hp: 1, maxHp: 5000 });
    bondOnCast(state, units[3], prey.id, false);
    expect(prey.stun).toBeGreaterThan(0);
    expect(state.players.p1.bondState.thanViMark).toMatchObject({ enemyId: prey.id, until: 16 });
    state.elapsed = 12;
    hurtEnemy(state, units[0], prey, 100);
    expect(state.players.p1.bondState.thanVi).toBe(1);
    expect(gearModsOf(state, units[0])['attack-percent']).toBeCloseTo(.06);
    prey = at(state, units[0], 1, { rank: 'elite', hp: 1, maxHp: 5000 });
    bondOnCast(state, units[3], prey.id, false);
    state.elapsed = 40;
    hurtEnemy(state, units[0], prey, 100);
    expect(state.players.p1.bondState.thanVi).toBe(1);
    state.players.p1.bondState.thanVi = 5;
    prey = at(state, units[0], 1, { rank: 'elite', hp: 1, maxHp: 5000 });
    state.elapsed = 50;
    bondOnCast(state, units[3], prey.id, false);
    hurtEnemy(state, units[0], prey, 100);
    expect(state.players.p1.bondState.thanVi).toBe(5);
  });

  it('Dương Tiễn and Na Tra sometimes strike twice', () => {
    const state = game(), [, spear] = squad(state, ['h00T', 'h00U']);
    combat(state);
    const foe = at(state, spear, 1, { hp: 1e9, maxHp: 1e9 });
    for (let i = 0; i < 100; i++) bondOnBasicAttack(state, spear, foe);
    expect(foe.hp).toBeLessThan(1e9);
  });
});

describe('Phật Quang Phổ Chiếu', () => {
  it('reduces damage taken at tier 2 and heals the squad and strikes the target for 100% attack on a member cast at tier 3', () => {
    const state = game(), units = squad(state, ['h012', 'h013']);
    expect(gearModsOf(state, units[0])['damage-reduction']).toBeCloseTo(.15);
    deployed(state, 'h016', 2);
    combat(state);
    units[1].hp = units[1].maxHp * .5;
    const foe = at(state, units[0], 1, { hp: 100000, maxHp: 100000 });
    bondOnCast(state, units[0], foe.id, false);
    expect(units[1].hp).toBeCloseTo(units[1].maxHp * .54);
    expect(100000 - foe.hp).toBeCloseTo(effectiveUnitAttack(units[0]));
  });
});

describe('Chân Hỏa', () => {
  it('shielded heroes ignite targets with ordinary attacks', () => {
    const state = game(), [fire] = squad(state, ['h00C', 'h00V', 'h010']);
    combat(state);
    const foe = at(state, fire, 1, { hp: 1e6, maxHp: 1e6 });
    bondOnBasicAttack(state, fire, foe);
    expect(foe.burn).toBeUndefined();
    fire.shield = 100; fire.tierGoldShields = [{ remaining: 5, amount: 100 }];
    bondOnBasicAttack(state, fire, foe);
    expect(foe.burn).toBeDefined();
  });

  it('burning corpses explode at most two steps deep and never from bosses', () => {
    const state = game(), [fire] = squad(state, ['h00C', 'h00V', 'h010', 'h01H']);
    combat(state);
    const [a, b, c, d] = [0, 2.5, 5, 7.5].map(x => at(state, fire, x, { hp: x === 0 ? 1 : 100, burn: burning(fire) }));
    hurtEnemy(state, fire, a, 100);
    expect(state.enemies[a.id]).toBeUndefined();
    expect(state.enemies[b.id]).toBeUndefined();
    expect(state.enemies[c.id]).toBeUndefined();
    expect(state.enemies[d.id]).toBe(d);
    const boss = at(state, fire, 40, { hp: 1, kind: 'boss', rank: 'boss', burn: burning(fire) });
    const neighbour = at(state, fire, 41, { hp: 100, burn: burning(fire) });
    hurtEnemy(state, fire, boss, 100);
    expect(neighbour.hp).toBe(100);
  });
});

describe('Viêm Đế Huyết Mạch', () => {
  it('poisons six targets, counts Điền Hải on poisoned kills up to the cap, and Mộc Linh heals Thần Nông', () => {
    const state = game(), [warrior, herbalist] = squad(state, ['h00M', 'h01E']);
    combat(state);
    const target = at(state, warrior, 1, { hp: 1e9, maxHp: 1e9 });
    const crowd = [2, 3, 4, 5, 6, 7, 20].map(x => at(state, warrior, x, { hp: 1e9, maxHp: 1e9 }));
    bondOnBasicAttack(state, warrior, target);
    expect(target.poison).toBeDefined();
    expect(crowd.filter(foe => foe.poison)).toHaveLength(5);
    expect(crowd[6].poison).toBeUndefined();
    const dying = at(state, warrior, 1, { hp: 1, poison: { remaining: 3, damagePerSecond: 1, casterId: herbalist.id } });
    hurtEnemy(state, warrior, dying, 100);
    expect(state.players.p1.bondState.dienHai).toBe(1);
    expect(gearModsOf(state, warrior)['attack-percent']).toBeCloseTo(.01);
    expect(gearModsOf(state, warrior)['attack-speed']).toBeCloseTo(.12);
    state.players.p1.bondState.dienHai = 30;
    hurtEnemy(state, warrior, at(state, warrior, 1, { hp: 1, poison: { remaining: 3, damagePerSecond: 1, casterId: herbalist.id } }), 100);
    expect(state.players.p1.bondState.dienHai).toBe(30);
    herbalist.hp = herbalist.maxHp * .5;
    bondOnSummonEnd(state, { ...herbalist, id: 'tree', summonKind: 'ancient-tree', summonerId: herbalist.id });
    expect(herbalist.hp).toBeCloseTo(herbalist.maxHp * .7);
  });
});

describe('effects completed after the first passes', () => {
  it('U Minh: Ngũ Đạo heals more per Hồn at tier 5', () => {
    const state = game(), units = squad(state, ['h00H', 'h00I', 'h00N', 'h00O', 'h00Y']);
    state.players.p1.bondState.souls = 10;
    expect(bondHealMultiplier(state, units[4], units[0])).toBeCloseTo(1.1);
  });

  it('Chiến Phủ widens Chiến Ý, Thiên Địa Nhân widens Thần Lôi Phù, Âm Khí buffs summons and healing', () => {
    let state = game();
    const [giant, banCo] = squad(state, ['h011', 'h01B']);
    expect(bondAreaScale(state, giant)).toBe(1.25);
    expect(bondAreaScale(state, banCo)).toBe(1);
    state = game();
    const sages = squad(state, ['h015', 'h019', 'h040']);
    expect(bondAreaScale(state, sages[2])).toBe(1.2);
    state = game();
    const pact = squad(state, ['h00Y', 'h01K', 'h03Z']);
    expect(bondSummonScale(state, pact[2])).toBe(1.5);
    expect(bondHealMultiplier(state, pact[0], pact[1])).toBe(1.5);
  });

  it('Âm Khí leaves a Huyết Thi until the wave ends when a member falls', () => {
    const state = game(), units = squad(state, ['h00Y', 'h01K', 'h03Z']);
    combat(state);
    hurtUnit(state, units[0], 1e9);
    const corpse = Object.values(state.units).find(unit => unit.summonKind === 'blood-warrior');
    expect(corpse?.summonDuration).toBe(3600);
  });

  it('Hoàng Thiên Ứng Long: Hiên Viên crits feed Ứng Long', () => {
    const state = game(), [dragon, emperor] = squad(state, ['h00Z', 'h01F']);
    combat(state);
    dragon.abilityCooldown = 5; dragon.energy = 0;
    const rage = dragon.energyType === 'rage_on_attack' || dragon.energyType === 'rage_on_hit';
    bondOnCrit(state, emperor, at(state, emperor, 1));
    expect(rage ? dragon.energy : dragon.abilityCooldown).toBe(rage ? 10 : 4);
  });

  it('Kim Sí stores Tật Phong from blows taken and spends it on casting', () => {
    const state = game(), units = squad(state, ['h03R', 'h016']);
    combat(state);
    const foe = at(state, units[1], 1, { hp: 1e9, maxHp: 1e9 });
    hurtUnit(state, units[1], 1, foe);
    expect(bondDamageMultiplier(state, units[1], foe)).toBeCloseTo(1.05);
    bondOnCast(state, units[1], foe.id, false);
    expect(bondDamageMultiplier(state, units[1], foe)).toBe(1);
  });
});
