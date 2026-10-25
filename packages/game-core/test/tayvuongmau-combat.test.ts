import { describe, expect, it } from 'vitest';
import { TAYVUONGMAU as T } from '../../../content/tayvuongmau-design.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Tây Vương Mẫu', () => {
  it('fires five separate pins, cuts armor for three seconds, and gains rage once', () => {
    const state = game(), queen = deployed(state, T.id);
    expect(HERO_BY_ID[T.id]).toMatchObject({ hp: 3800, attack: 730,
      armor: 18, range: 9, interval: .8, speed: 3.8 });
    const targets = Array.from({ length: 6 }, (_, index) => enemy(state, queen,
      { x: queen.x + 2 + index * .5, hp: 100000, maxHp: 100000, armor: 100, speed: 0 }));
    executeAttackGeometry(state, queen, targets[0], (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? queen, hit, damage, penetration));
    expect(targets.filter(target => target.hp < target.maxHp)).toHaveLength(5);
    expect(targets.filter(target => target.sunder?.amount === .2)).toHaveLength(5);
    expect(targets[0].sunder?.remaining).toBe(3);
    expect(queen.energy).toBe(16);
    expect(state.events.find(event => event.skillId === 'trait-h01A')?.targets).toHaveLength(5);
  });

  it('selects only the three strongest deployed allies within the rain radius', () => {
    const state = game(), queen = deployed(state, T.id);
    const inside = [deployed(state, 'h017', 1), deployed(state, 'h011', 2),
      deployed(state, 'h012', 3), deployed(state, 'h018', 4)];
    const outside = deployed(state, 'h01B', 5);
    state.phase = 'combat'; queen.energy = 100;
    queen.cooldown = 100;
    const target = enemy(state, queen, { x: queen.x + 3, z: queen.z,
      hp: 100000, maxHp: 100000, armor: 100, speed: 0, attack: 0 });
    for (const [index, ally] of inside.entries()) {
      ally.x = target.x + 1 + index; ally.z = target.z;
      ally.attack = 2000 + index * 100;
      ally.hp = ally.maxHp * .5; ally.cooldown = 100;
    }
    outside.x = target.x + T.rainRadius + 3; outside.z = target.z;
    outside.hp = outside.maxHp * .5; outside.cooldown = 100;
    expect(castAbility(state, queen, target.id)).toBe(true);
    combatStep(state, .25);
    expect(target.sunder).toMatchObject({ amount: .5, remaining: 5 });
    expect(target.hp).toBeLessThan(target.maxHp);
    const recipients = state.events.filter(event => event.skillId === 'peach-h01A');
    expect(recipients).toHaveLength(3);
    expect(recipients.some(event => event.target === outside.id)).toBe(false);
    for (const event of recipients) {
      const ally = state.units[event.target ?? ''];
      expect(ally.hp).toBeCloseTo(ally.maxHp * .8);
      expect(ally.empower).toMatchObject({ remaining: 5, attackBonus: .35, kind: 'peach' });
      expect(ally.haste).toMatchObject({ remaining: 5, amount: .3 });
    }
  });
});
