import { describe, expect, it } from 'vitest';
import { CHUCDUNG as C } from '../../../content/chucdung-design.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Chúc Dung', () => {
  it('burns one target, leaves a five-second ember pool, and chains a death explosion', () => {
    const state = game(), caster = deployed(state, C.id);
    expect(HERO_BY_ID[C.id]).toMatchObject({ hp: 8200, attack: 1150, armor: 27,
      range: 7.5, interval: 1.1, speed: 3.6 });
    const burnDps = C.attack * C.burnPower;
    const first = enemy(state, caster), second = enemy(state, caster, { x: caster.x + 2 });
    const outside = enemy(state, caster, { x: caster.x + 6 });
    executeAttackGeometry(state, caster, first, (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? caster, hit, damage, penetration));
    expect(first.burn).toMatchObject({ damagePerSecond: burnDps, remaining: 3 });
    // The lava orb no longer splashes: the neighbour is untouched until the death explosion.
    expect(second.burn).toBeUndefined();
    expect(second.hp).toBe(second.maxHp);
    expect(outside.hp).toBe(outside.maxHp);
    expect(state.groundEffects?.find(zone => zone.kind === 'chucdung-ember')).toMatchObject({
      radius: 3.5, remaining: 5,
    });
    const before = second.hp;
    first.hp = 100;
    hurtEnemy(state, caster, first, 100);
    expect(state.enemies[first.id]).toBeUndefined();
    expect(before - second.hp).toBeCloseTo(C.attack * C.deathExplosionPower);
    expect(state.events.some(event => event.skillId === 'burst-h01H')).toBe(true);
  });

  it('erupts once, then deals direct lava damage and doubles burn in its zone', () => {
    const state = game(), caster = deployed(state, C.id);
    state.phase = 'combat'; caster.cooldown = 100;
    const target = enemy(state, caster, { hp: 100000, maxHp: 100000, speed: 0 });
    expect(castAbility(state, caster, target.id)).toBe(true);
    combatStep(state, .25);
    expect(state.groundEffects?.find(zone => zone.kind === 'chucdung-lava')).toMatchObject({
      radius: 7.5, remaining: 5, damagePerSecond: C.attack * C.lavaDpsPower,
    });
    const before = target.hp;
    combatStep(state, .1);
    expect(before - target.hp).toBeCloseTo(C.attack * C.lavaDpsPower * .1 + C.attack * C.burnPower * .1 * 2);
    expect(target.slowStrength).toBe(.45);
  });
});
