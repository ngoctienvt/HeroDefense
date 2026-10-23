import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { HIENVIEN as H } from '../../../content/hienvien-design.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Hiên Viên', () => {
  it('fires five armor-piercing sword rays without any stun', () => {
    const state = game(), unit = deployed(state, H.id);
    const focus = enemy(state, unit, { x: unit.x + 3, armor: 100, hp: 100000, maxHp: 100000 });
    const along = enemy(state, unit, { x: unit.x + 7, armor: 100, hp: 100000, maxHp: 100000 });
    const behind = enemy(state, unit, { x: unit.x - 2, hp: 100000, maxHp: 100000 });
    for (let i = 0; i < 3; i++) executeAttackGeometry(state, unit, focus,
      (hit, amount, penetration, source) => hurtEnemy(state, source ?? unit, hit, amount, penetration));
    expect(HERO_BY_ID[H.id]).toMatchObject({ hp: 8200, attack: 1150, armor: 28,
      range: 9.5, interval: .75, speed: 4.2 });
    expect(focus.hp).toBeLessThan(focus.maxHp);
    expect(along.hp).toBeLessThan(along.maxHp);
    expect(behind.hp).toBe(behind.maxHp);
    expect(unit.energy).toBe(48);
    expect(focus.stun ?? 0).toBe(0);
    expect(state.events.filter(event => event.skillId === 'trait-h01F')).toHaveLength(3);
  });

  it("drops the giant sword, rains 15 impacts, and blesses only the owner's heroes", () => {
    const state = game(), unit = deployed(state, H.id);
    const ally = deployed(state, 'h011', 1);
    const other = deployed(state, 'h011', 0, 'p2');
    state.phase = 'combat'; unit.energy = 100; unit.cooldown = 100;
    ally.zone = 1;
    const boss = enemy(state, unit, { kind: 'boss', x: unit.x + 4,
      hp: 1000000, maxHp: 1000000, armor: 0, attack: 0, speed: 0 });
    expect(castAbility(state, unit, boss.id)).toBe(true);
    combatStep(state, .25);
    expect(boss.maxHp - boss.hp).toBeGreaterThanOrEqual(H.attack * H.giantPower * H.giantCritMultiplier);
    expect(boss.stun ?? 0).toBe(0);
    expect(state.groundEffects?.some(ground => ground.kind === 'xuanyuan-sword')).toBe(true);
    expect(ally.critBlessing).toMatchObject({ chance: .3, remaining: 6 });
    expect(ally.haste?.amount).toBe(.3);
    expect(other.critBlessing).toBeUndefined();
    for (let i = 0; i < 20; i++) combatStep(state, .25);
    expect(state.events.filter(event => event.skillId === 'sword-rain-h01F')).toHaveLength(15);
    expect(boss.sunder?.amount).toBe(.5);
  });
});
