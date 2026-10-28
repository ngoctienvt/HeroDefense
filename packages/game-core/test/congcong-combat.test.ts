import { describe, expect, it } from 'vitest';
import { CONGCONG as C } from '../../../content/congcong-design.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Cộng Công', () => {
  it('thrusts one target, gains rage and slows movement and attacks with his aura', () => {
    const state = game(), caster = deployed(state, C.id);
    expect(HERO_BY_ID[C.id]).toMatchObject({ hp: 14200, attack: 460, armor: 42,
      range: 2.5, interval: 1.2, speed: 3.2 });
    const front = enemy(state, caster), side = enemy(state, caster,
      { x: caster.x + 2, z: caster.z + 1, speed: 0 });
    const back = enemy(state, caster, { x: caster.x - 1, speed: 0 });
    executeAttackGeometry(state, caster, front, (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? caster, hit, damage, penetration));
    expect(caster.energy).toBe(10);
    // One swing = one event carrying the unit→target direction (client draws the crescent from it).
    const swings = state.events.filter(event => event.skillId === 'trait-h01G');
    expect(swings).toHaveLength(1);
    const length = Math.hypot(front.x - caster.x, front.z - caster.z);
    expect(swings[0].direction?.x).toBeCloseTo((front.x - caster.x) / length);
    expect(swings[0].direction?.z).toBeCloseTo((front.z - caster.z) / length);
    // Guardians no longer sweep: only the chosen target is hit.
    expect(front.hp).toBeLessThan(front.maxHp);
    expect(swings[0].targets).toEqual([front.id]);
    expect(side.hp).toBe(side.maxHp);
    expect(back.hp).toBe(back.maxHp);
    caster.cooldown = 100; combatStep(state, .1);
    expect(front.slowStrength).toBe(.45);
    expect(front.attackSlow?.strength).toBe(.25);
  });

  it('pushes the wave without freezing while shielding each ally from their own max HP', () => {
    const state = game(), caster = deployed(state, C.id);
    const ally = deployed(state, 'h017', 1);
    state.phase = 'combat'; caster.energy = 100;
    caster.cooldown = ally.cooldown = 100;
    const target = enemy(state, caster, { hp: 100000, maxHp: 100000, attack: 0, speed: 0 });
    const start = { x: target.x, z: target.z };
    expect(castAbility(state, caster, target.id)).toBe(true);
    // Tụ lực 0,8 giây; event cast đặt tại thân Cộng Công để VFX báo trước đúng tâm chiêu.
    expect(caster.pendingAbility?.remaining).toBe(C.windup);
    expect(state.events.at(-1)).toMatchObject({ kind: 'cast', skillId: 'skill-h01G',
      x: caster.x, z: caster.z, windup: C.windup });
    combatStep(state, C.windup - .05);
    expect(target.hp).toBe(target.maxHp);
    combatStep(state, .05);
    expect(target.hp).toBeLessThan(target.maxHp);
    expect(target.frozen ?? 0).toBe(0);
    expect(Math.hypot(target.x - start.x, target.z - start.z)).toBeGreaterThan(0);
    expect(caster.shield).toBeCloseTo(460 * 3.5 + caster.maxHp * .25);
    expect(ally.shield).toBeCloseTo(460 * 3.5 + ally.maxHp * .25);
    expect(ally.ward).toMatchObject({ reduction: .4, kind: 'black-water' });
    expect(state.events.find(event => event.kind === 'ability' && event.skillId === 'skill-h01G')?.targets).toContain(target.id);
    expect(state.events.some(event => event.skillId === 'shield-h01G'
      && event.targets?.includes(ally.id))).toBe(true);
  });

  it('does not let a frozen enemy attack or move', () => {
    const state = game(), caster = deployed(state, C.id);
    state.phase = 'combat'; caster.cooldown = 100;
    const target = enemy(state, caster, { x: caster.x + 5, attack: 1000, speed: 4,
      frozen: 1, cooldown: 0 });
    const before = { x: target.x, z: target.z, hp: caster.hp };
    combatStep(state, .1);
    expect(target.x).toBe(before.x);
    expect(target.z).toBe(before.z);
    expect(caster.hp).toBe(before.hp);
  });
});
