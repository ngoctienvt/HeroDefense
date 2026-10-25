import { describe, expect, it } from 'vitest';
import { CRAFT_RECIPES, HERO_BY_ID, SYNERGIES } from '../../../content/catalog.js';
import { BO_DE, DE_TUAN, NGUYEN_THUY, NHIEN_DANG, NHU_LAI } from '../../../content/new-divine-design.js';
import type { Enemy, Unit } from '../../contracts/src/types.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { combatStep } from '../src/combat.js';
import { bodhiAbility, lanternAbility } from '../src/divine-support-combat.js';
import { deTuanAbility, deTuanAttack, nguyenThuyAbility, nhuLaiAbility } from '../src/divine-god-combat.js';
import { deployed, enemy, game } from './fixtures.js';
import { solarCritMultiplier } from '../src/stats.js';

const strike = (_source: Unit, target: Enemy, damage: number) => { target.hp -= damage; };

describe('new saint and god heroes', () => {
  it('maps five new names onto retired IDs without editing extracted content', () => {
    expect([NHIEN_DANG, BO_DE, DE_TUAN, NHU_LAI, NGUYEN_THUY]
      .map(hero => HERO_BY_ID[hero.id].name))
      .toEqual(['Nhiên Đăng Cổ Phật', 'Bồ Đề Tổ Sư', 'Đế Tuấn', 'Như Lai Phật Tổ', 'Nguyên Thủy Thiên Tôn']);
    expect(HERO_BY_ID[NGUYEN_THUY.id].tier).toBe(6);
    expect(CRAFT_RECIPES.find(recipe => recipe.heroId === 'h040')?.ingredients)
      .toEqual(['h03W', 'h03X', 'h019']);
    expect(CRAFT_RECIPES.find(recipe => recipe.heroId === 'h01C')?.ingredients)
      .toEqual(['h018', 'h01G', 'h00X']);
    expect(SYNERGIES.every(definition => definition.members.every(id =>
      !['h03W', 'h03X', 'h01I', 'h01J', 'h014'].includes(id)))).toBe(true);
  });

  it('reflects only damage absorbed by Nhiên Đăng’s shield', () => {
    const state = game(), caster = deployed(state, NHIEN_DANG.id);
    const opponent = deployed(state, BO_DE.id, 0, 'p2');
    opponent.zone = caster.zone; opponent.x = caster.x; opponent.z = caster.z;
    const foe = enemy(state, caster, { attack: 100, armor: 0, speed: 0 });
    state.phase = 'combat'; caster.cooldown = 100;
    caster.divineShield = { remaining: 6, amount: 1000 }; caster.shield += 1000;
    lanternAbility(state, caster);
    expect(opponent.lanternShield).toBeUndefined();
    const before = foe.hp;
    combatStep(state, .1);
    expect(caster.lanternShield?.amount).toBeLessThan(490 * 3.4 + caster.maxHp * .24);
    expect(caster.divineShield?.amount).toBe(1000);
    expect(foe.burn?.damagePerSecond).toBe(180);
    expect(foe.hp).toBeLessThan(before);
    expect(state.events.some(item => item.skillId === 'reflect-h03W')).toBe(true);
  });

  it('Bồ Đề heals allies and grants two strongest allies instant skill access and double attacks', () => {
    const state = game(), caster = deployed(state, BO_DE.id);
    const first = deployed(state, DE_TUAN.id, 1);
    const second = deployed(state, NGUYEN_THUY.id, 2);
    const opponent = deployed(state, DE_TUAN.id, 0, 'p2');
    first.x = second.x = caster.x; first.z = second.z = caster.z;
    opponent.zone = caster.zone; opponent.x = caster.x; opponent.z = caster.z;
    first.hp -= 500; first.energy = 0; second.abilityCooldown = 9;
    bodhiAbility(state, caster);
    expect(first.hp).toBeGreaterThan(first.maxHp - 500);
    expect(first.energy).toBe(first.maxEnergy);
    expect(second.abilityCooldown).toBe(0);
    expect(first.bodhiBlessing?.remaining).toBe(5);
    expect(second.bodhiBlessing?.remaining).toBe(5);
    expect(opponent.bodhiBlessing).toBeUndefined();
  });

  it('Đế Tuấn calls one damaging crow burst on each empowered basic attack', () => {
    const state = game(), caster = deployed(state, DE_TUAN.id);
    const foe = enemy(state, caster, { hp: 100000, maxHp: 100000 });
    const nearby = enemy(state, caster, { id: 'nearby', x: foe.x + 1, hp: 100000, maxHp: 100000 });
    caster.berserk = { remaining: 5, attackSpeed: 1, lifesteal: 0, critChance: 1 };
    deTuanAttack(state, caster, foe, strike);
    expect(foe.hp).toBeLessThan(100000 - caster.attack * 2);
    expect(nearby.hp).toBeLessThan(100000);
    expect(state.events.filter(item => item.skillId === 'crow-burst-h01I')).toHaveLength(1);
    expect(solarCritMultiplier(state, caster, 2)).toBeCloseTo(2.35);
    const wood = deployed(state, BO_DE.id, 1);
    expect(solarCritMultiplier(state, wood, 2)).toBe(2);
  });

  it('Đế Tuấn strikes a single target normally and focuses his ultimate on the largest enemy', () => {
    const state = game(), caster = deployed(state, DE_TUAN.id);
    const foe = enemy(state, caster, { hp: 100000, maxHp: 100000 });
    const nearby = enemy(state, caster, { id: 'nearby', x: foe.x + 1, hp: 100000, maxHp: 100000 });
    deTuanAttack(state, caster, foe, strike);
    expect(100000 - foe.hp).toBeCloseTo(caster.attack * DE_TUAN.strikePower);
    expect(nearby.hp).toBe(100000);
    const big = enemy(state, caster, { id: 'big', x: caster.x + 2, hp: 300000, maxHp: 300000, armor: 0 });
    const before = { big: big.hp, nearby: nearby.hp };
    deTuanAbility(state, caster, strike);
    expect(before.big - big.hp).toBeCloseTo(caster.attack * DE_TUAN.skillPower);
    expect(before.nearby - nearby.hp).toBeCloseTo(caster.attack * DE_TUAN.skillSplashPower);
    expect(big.stun ?? 0).toBe(0);
    expect(caster.berserk?.critChance).toBe(1);
  });

  it('Như Lai places a five second control zone and shields the deployed team', () => {
    const state = game(), caster = deployed(state, NHU_LAI.id);
    const ally = deployed(state, BO_DE.id, 1);
    const foe = enemy(state, caster);
    nhuLaiAbility(state, caster, foe, strike);
    expect(foe.stun).toBe(3);
    expect(state.groundEffects?.find(item => item.kind === 'five-finger')).toMatchObject({ remaining: 5, radius: 9.5 });
    expect(ally.divineShield?.remaining).toBe(6);
  });

  it('Nguyên Thủy clears boss protection, strikes the whole lane, and protects allies', () => {
    const state = game(), caster = deployed(state, NGUYEN_THUY.id);
    const ally = deployed(state, BO_DE.id, 1);
    const boss = enemy(state, caster, { kind: 'boss', monsterId: 'b001', x: caster.x + 15,
      shield: 1000, armorBuff: { remaining: 10, amount: 50 } });
    ally.hp -= 1000;
    nguyenThuyAbility(state, caster, strike);
    expect(boss.shield).toBe(0);
    expect(boss.armorBuff).toBeUndefined();
    expect(boss.hp).toBeLessThan(boss.maxHp);
    // Anti-boss debuffer: no healing, no attack or crit buff; only invulnerability and armor pierce.
    expect(ally.hp).toBe(ally.maxHp - 1000);
    expect(ally.divineImmortal).toBe(2);
    expect(ally.primordialBlessing?.remaining).toBe(6);
    expect(ally.empower).toMatchObject({ attackBonus: 0, armorPierce: .4 });
    expect(ally.critBlessing).toBeUndefined();
  });

  it('dispatches each normal attack to its own geometry; supports and guardians hit one target', () => {
    const state = game(), caster = deployed(state, BO_DE.id);
    const first = enemy(state, caster), second = enemy(state, caster, { id: 'second', x: first.x + 2 });
    executeAttackGeometry(state, caster, first, target => { target.hp -= 1; });
    expect(first.hp).toBeLessThan(first.maxHp);
    expect(second.hp).toBe(second.maxHp);
    expect(state.events.some(item => item.skillId === 'trait-h03X')).toBe(true);
  });
});
