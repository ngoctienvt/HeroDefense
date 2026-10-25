import { describe, expect, it } from 'vitest';
import { KIMTHIEN as K } from '../../../content/kimthien-design.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Kim Thiền Tử', () => {
  it('sends rage, strikes one target with the gold lotus and applies a 15% damage vulnerability', () => {
    const state = game(), monk = deployed(state, K.id), ally = deployed(state, 'h011', 1);
    ally.x = monk.x + 2; ally.z = monk.z; ally.energy = 12;
    const target = enemy(state, monk), nearby = enemy(state, monk, { x: target.x + 2 });
    expect(HERO_BY_ID[K.id]).toMatchObject({ hp: 3400, attack: 740, armor: 16,
      range: 8, interval: 1.1, speed: 3.6, element: 2 });
    executeAttackGeometry(state, monk, target,
      (hit, damage, penetration, source) => hurtEnemy(state, source ?? monk, hit, damage, penetration));
    expect(nearby.hp).toBe(nearby.maxHp);
    expect(nearby.pureLand).toBeUndefined();
    expect(target.pureLand).toMatchObject({ remaining: 3, bonusDamage: .15 });
    expect(ally.energy).toBe(17);
    const before = target.hp;
    hurtEnemy(state, ally, target, 100);
    expect(before - target.hp).toBeCloseTo(115);
  });

  it('keeps the bowl zone for five seconds, pulls without rooting, and deals 100% Công per second', () => {
    const state = game(), monk = deployed(state, K.id); state.phase = 'combat';
    const target = enemy(state, monk, { x: monk.x + 5, hp: 100000, maxHp: 100000 });
    const outside = enemy(state, monk, { x: monk.x + 14, hp: 100000, maxHp: 100000 });
    expect(castAbility(state, monk, target.id)).toBe(true);
    monk.cooldown = 10; combatStep(state, .25);
    const bowl = state.groundEffects?.find(ground => ground.kind === 'golden-bowl');
    expect(bowl).toMatchObject({ x: target.x, z: target.z, radius: 7, remaining: 5 });
    combatStep(state, 1);
    expect(target.root ?? 0).toBe(0);
    expect(100000 - target.hp).toBeCloseTo(K.attack * K.attackPowerPerSecond, 0);
    expect(outside.hp).toBe(100000);
    expect(bowl?.remaining).toBe(4);
    combatStep(state, 4);
    expect(state.groundEffects?.some(ground => ground.kind === 'golden-bowl')).toBe(false);
  });
});
