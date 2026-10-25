import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { TUONG_THAN as T } from '../../../content/tuong-than-design.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Tương Thần', () => {
  it('cleaves, leeches health and shields, and gains rage', () => {
    const state = game(), unit = deployed(state, T.id);
    unit.hp -= 1000;
    const first = enemy(state, unit, { hp: 20000, maxHp: 20000, armor: 0 });
    const second = enemy(state, unit, { x: first.x + 1, z: first.z,
      hp: 20000, maxHp: 20000, armor: 0 });
    const behind = enemy(state, unit, { x: unit.x - 1, z: unit.z,
      hp: 20000, maxHp: 20000, armor: 0 });
    executeAttackGeometry(state, unit, first, (hit, amount, penetration, source) =>
      hurtEnemy(state, source ?? unit, hit, amount, penetration));
    expect(HERO_BY_ID[T.id]).toMatchObject({ hp: 14000, attack: 1090, block: 16 });
    expect(first.hp).toBeLessThan(first.maxHp);
    expect(second.hp).toBeLessThan(second.maxHp);
    expect(behind.hp).toBe(behind.maxHp);
    expect(first.bleed?.damagePerSecond).toBe(T.bleedDps);
    expect(first.burn?.damagePerSecond).toBe(T.burnDps);
    expect(unit.hp).toBeGreaterThan(unit.maxHp - 1000);
    expect(unit.shield).toBeGreaterThan(0);
    expect(unit.energy).toBe(T.rageOnAttack);
  });

  it('summons a blood warrior on every sixth lane death up to six', () => {
    const state = game(), unit = deployed(state, T.id);
    for (let index = 0; index < 37; index++) {
      const victim = enemy(state, unit, { hp: 1, maxHp: 1, armor: 0 });
      hurtEnemy(state, unit, victim, 10);
    }
    const warriors = Object.values(state.units).filter(value => value.summonKind === 'blood-warrior');
    expect(warriors).toHaveLength(6);
    expect(warriors.every(value => value.hp === 3000 && value.attack === 350)).toBe(true);
    expect(unit.bloodDeathCount).toBe(1);
  });

  it('casts blood sea with four generals and applies its persistent control', () => {
    const state = game(), unit = deployed(state, T.id), ally = deployed(state, 'h011', 1);
    state.phase = 'combat'; unit.cooldown = 100; ally.cooldown = 100;
    unit.energy = 100; unit.hp = 1000; ally.hp -= 1000;
    const victim = enemy(state, unit, { hp: 100000, maxHp: 100000,
      armor: 0, speed: 0, attack: 0 });
    expect(castAbility(state, unit, victim.id)).toBe(true);
    combatStep(state, .25);
    expect(unit.hp).toBe(unit.maxHp);
    expect(state.groundEffects?.find(effect => effect.kind === 'blood-sea')?.radius).toBe(8.5);
    expect(Object.values(state.units).filter(value => value.summonKind === 'blood-general')).toHaveLength(4);
    expect(ally.shield).toBeGreaterThanOrEqual(T.teamShield);
    const before = victim.hp;
    combatStep(state, .25);
    expect(victim.hp).toBeLessThan(before);
    expect(victim.sunder?.amount).toBe(.4);
    expect(victim.slowStrength).toBe(.5);
  });
});
