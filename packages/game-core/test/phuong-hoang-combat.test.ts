import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { PHUONG_HOANG as P } from '../../../content/phuong-hoang-design.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy, hurtUnit } from '../src/combat.js';
import { startPhoenixEgg } from '../src/phuong-hoang-combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Phượng Hoàng', () => {
  it('shoots four distinct feathers with poison, burn and rage, without bursts', () => {
    const state = game(), unit = deployed(state, P.id);
    const victims = Array.from({ length: 7 }, (_, index) => enemy(state, unit, {
      x: unit.x + 2 + index * 1.2, z: unit.z,
      hp: 100000, maxHp: 100000, armor: 0,
    }));
    executeAttackGeometry(state, unit, victims[0], (hit, amount, penetration, source) =>
      hurtEnemy(state, source ?? unit, hit, amount, penetration));
    expect(HERO_BY_ID[P.id]).toMatchObject({ hp: 8000, attack: 1260,
      range: 11.5, interval: .8, speed: 4.8 });
    const feathers = state.events.find(event => event.skillId === 'trait-h041')?.targets ?? [];
    expect(feathers).toHaveLength(4);
    for (const victim of victims) {
      if (feathers.includes(victim.id)) expect(victim.maxHp - victim.hp).toBeCloseTo(unit.attack);
      else expect(victim.hp).toBe(victim.maxHp);
    }
    expect(victims[0].poison?.damagePerSecond).toBe(P.poisonDps);
    expect(victims[0].burn?.damagePerSecond).toBe(P.burnDps);
    expect(unit.energy).toBe(P.rageOnAttack);
  });

  it('becomes an invulnerable egg and revives after two seconds', () => {
    const state = game(), unit = deployed(state, P.id);
    state.phase = 'combat'; unit.cooldown = 100;
    const victim = enemy(state, unit, { hp: 100000, maxHp: 100000,
      armor: 0, attack: 0, speed: 0 });
    startPhoenixEgg(state, unit);
    expect(unit.hp).toBe(1);
    expect(unit.phoenixEgg?.remaining).toBe(2);
    combatStep(state, 1);
    expect(unit.hp).toBe(1);
    combatStep(state, 1.1);
    expect(unit.phoenixEgg).toBeUndefined();
    expect(unit.hp).toBe(unit.maxHp);
    expect(victim.hp).toBeLessThan(victim.maxHp);
  });

  it('rebirths only from lethal damage, then waits 45 seconds before the next egg', () => {
    const state = game(), unit = deployed(state, P.id);
    state.phase = 'combat'; unit.cooldown = 100; unit.abilityCooldown = 100;
    combatStep(state, 31);
    expect(unit.phoenixEgg).toBeUndefined();
    hurtUnit(state, unit, unit.maxHp * 10);
    expect(unit.phoenixEgg?.remaining).toBe(P.eggSeconds);
    expect(unit.phoenixCycle).toBe(P.rebirthCooldown);
    combatStep(state, P.eggSeconds + .1);
    expect(unit.hp).toBe(unit.maxHp);
    hurtUnit(state, unit, unit.maxHp * 10);
    expect(unit.phoenixEgg).toBeUndefined();
    expect(unit.respawn).toBeGreaterThan(0);
  });

  it('sweeps the lane and keeps rain and healing fire on the locked point', () => {
    const state = game(), unit = deployed(state, P.id), ally = deployed(state, 'h011', 1);
    state.phase = 'combat'; unit.energy = 100; unit.cooldown = 100; ally.cooldown = 100;
    ally.hp -= 3000;
    const near = enemy(state, unit, { hp: 100000, maxHp: 100000, attack: 0 });
    const far = enemy(state, unit, { x: unit.x + 25,
      hp: 100000, maxHp: 100000, attack: 0 });
    expect(castAbility(state, unit, near.id)).toBe(true);
    combatStep(state, .25);
    expect(far.hp).toBeLessThan(far.maxHp);
    const carpet = state.groundEffects?.find(effect => effect.kind === 'phoenix-carpet');
    expect(carpet?.radius).toBe(9);
    const before = ally.hp;
    combatStep(state, .25);
    expect(near.root ?? 0).toBe(0);
    expect(near.sunder?.amount).toBe(.5);
    expect(ally.hp).toBeGreaterThan(before);
  });
});
