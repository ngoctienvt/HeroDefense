import { describe, expect, it } from 'vitest';
import { TRUONG_DAO_LANG as B } from '../../../content/truong-dao-lang-design.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { castAbility, combatStep } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Cửu Thiên Ngũ Lôi Chính Pháp', () => {
  it('freezes bosses, launches 21 total bolts, and blesses allies', () => {
    const state = game(), caster = deployed(state, B.id);
    state.phase = 'combat'; caster.cooldown = 100;
    const center = enemy(state, caster, { x: caster.x + 2, hp: 100000, maxHp: 100000,
      attack: 0, speed: 0, armor: 0 });
    const boss = enemy(state, caster, { x: center.x + 8.9, kind: 'boss', monsterId: 'b001',
      hp: 100000, maxHp: 100000, attack: 0, speed: 0, armor: 0 });
    const outside = enemy(state, caster, { x: center.x + 9.1, hp: 100000,
      maxHp: 100000, attack: 0, speed: 0, armor: 0 });
    expect(HERO_BY_ID[B.id].ability).toMatchObject({ power: 6, effect: { radius: 9 } });
    expect(castAbility(state, caster, center.id)).toBe(true);
    expect(state.events.at(-1)).toMatchObject({ kind: 'cast', skillId: 'skill-h040', windup: .35 });
    expect(center.hp).toBe(center.maxHp);
    combatStep(state, .35);
    expect(center.hp).toBe(center.maxHp);
    expect(boss.hp).toBe(boss.maxHp);
    expect(outside.hp).toBe(outside.maxHp);
    expect(center.frozen).toBeGreaterThan(2);
    expect(boss.frozen).toBeGreaterThan(2);
    expect(state.groundEffects?.find(zone => zone.kind === 'beidou')).toMatchObject({ radius: 9 });
    expect(caster.thunderBlessing).toMatchObject({ remaining: 5, power: .35 });
    expect(state.events.find(entry => entry.skillId === 'skill-h040' && entry.kind === 'ability')?.targets)
      .toEqual(expect.arrayContaining([center.id, boss.id]));
    for (let i = 0; i < 21; i++) combatStep(state, .1);
    expect(state.events.filter(entry => entry.skillId === 'bolt-h040')).toHaveLength(21);
    expect(center.maxHp - center.hp).toBeGreaterThan(0);
    expect(outside.hp).toBe(outside.maxHp);
  });

  it('freezes later arrivals and keeps bolt damage inside the zone', () => {
    const state = game(), caster = deployed(state, B.id);
    state.phase = 'combat'; caster.cooldown = 100;
    const center = enemy(state, caster, { hp: 100000, maxHp: 100000, attack: 0, speed: 0 });
    expect(castAbility(state, caster, center.id)).toBe(true);
    combatStep(state, .35);
    const late = enemy(state, caster, { x: center.x + 8, hp: 100000,
      maxHp: 100000, attack: 0, speed: 0 });
    combatStep(state, .1);
    expect(late.frozen).toBeGreaterThan(1.9);
    for (let i = 0; i < 25; i++) combatStep(state, .1);
    expect(state.groundEffects?.some(zone => zone.kind === 'beidou')).toBe(false);
    expect(late.frozen).toBeLessThanOrEqual(.1);
  });
});
