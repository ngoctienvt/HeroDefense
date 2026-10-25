import { describe, expect, it } from 'vitest';
import { KHUONGTU as K } from '../../../content/khuongtu-nha-design.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { skillDamageMultiplier } from '../src/stats.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Khương Tử Nha', () => {
  it('chains five targets and grants one skill-damage aura to allies in the same zone', () => {
    const state = game(), caster = deployed(state, K.id);
    expect(HERO_BY_ID[K.id]).toMatchObject({ hp: 3500, attack: 750, armor: 16,
      range: 8.5, interval: 1.1, speed: 3.5 });
    const targets = Array.from({ length: 6 }, (_, i) => enemy(state, caster, { x: caster.x + i + 1 }));
    executeAttackGeometry(state, caster, targets[0], (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? caster, hit, damage, penetration));
    expect(targets.slice(0, 5).every(target => target.hp < target.maxHp)).toBe(true);
    expect(targets[5].hp).toBe(targets[5].maxHp);
    expect(state.events.at(-1)).toMatchObject({ skillId: 'trait-h019',
      targets: targets.slice(0, 5).map(target => target.id) });
    const ally = deployed(state, 'h017', 1);
    expect(skillDamageMultiplier(state, ally)).toBe(1.15);
    caster.zone = 1;
    expect(skillDamageMultiplier(state, ally)).toBe(1);
  });

  it('fires eight total bolts over five seconds and seals boss skills inside the scroll', () => {
    const state = game(), caster = deployed(state, K.id);
    state.phase = 'combat'; caster.cooldown = 100;
    const boss = enemy(state, caster, { kind: 'boss', monsterId: 'b001', kit: 'hac-phong',
      hp: 1000000, maxHp: 1000000, armor: 100, speed: 0 });
    expect(castAbility(state, caster, boss.id)).toBe(true);
    combatStep(state, .25);
    expect(state.groundEffects?.find(zone => zone.kind === 'phong-than')).toMatchObject({
      radius: 7, remaining: 5, boltsRemaining: 8,
    });
    for (let i = 0; i < 10; i++) combatStep(state, .1);
    expect(boss.sealed).toBeGreaterThan(0);
    expect(boss.slowStrength).toBe(.6);
    expect(boss.sunder).toMatchObject({ amount: .4, percent: true });
    expect(boss.shield).toBeUndefined();
    for (let i = 10; i < 50; i++) combatStep(state, .1);
    expect(state.events.filter(entry => entry.skillId === 'bolt-h019')).toHaveLength(8);
    expect(state.groundEffects?.some(zone => zone.kind === 'phong-than')).toBe(false);
  });
});
