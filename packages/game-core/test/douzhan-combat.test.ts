import { describe, expect, it } from 'vitest';
import { DOUZHAN as D } from '../../../content/douzhan-design.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

function setup() {
  const state = game(), unit = deployed(state, D.id);
  const hurt = (target: ReturnType<typeof enemy>, damage: number, penetration = 0,
    source = unit) => hurtEnemy(state, source, target, damage, penetration);
  return { state, unit, hurt };
}

describe('Đấu Chiến Thắng Phật', () => {
  it('uses the supplied stats and one rage gain for a frontal cleave', () => {
    const { state, unit, hurt } = setup();
    expect(HERO_BY_ID[D.id]).toMatchObject({ hp: 9200, attack: 760, armor: 26,
      range: 3.2, interval: .75, speed: 4.8, block: 12 });
    const front = enemy(state, unit), side = enemy(state, unit, { x: unit.x + 2, z: unit.z + 2 });
    const behind = enemy(state, unit, { x: unit.x - 1 });
    executeAttackGeometry(state, unit, front, hurt);
    expect([16, 28]).toContain(unit.energy);
    expect(side.hp).toBeLessThan(side.maxHp);
    expect(behind.hp).toBe(behind.maxHp);
    expect(state.events.some(event => event.skillId === 'trait-h012')).toBe(true);
  });

  it('strikes a 14 by 4.5 lane, sunders without stunning, then spawns three temporary clones', () => {
    const { state, unit } = setup(); state.phase = 'combat'; unit.energy = 100;
    const near = enemy(state, unit, { x: unit.x + 2 });
    const long = enemy(state, unit, { x: unit.x + 13, z: unit.z + 2, armor: 100 });
    const wide = enemy(state, unit, { x: unit.x + 5, z: unit.z + 3 });
    expect(castAbility(state, unit, near.id)).toBe(true);
    unit.cooldown = 10; combatStep(state, .25);
    expect(near.stun ?? 0).toBe(0);
    expect(long.sunder).toMatchObject({ amount: .4, percent: true });
    expect(long.hp).toBeLessThan(long.maxHp);
    expect(wide.hp).toBe(wide.maxHp);
    const clones = Object.values(state.units).filter(other => other.summonKind === 'buddha-clone');
    expect(clones).toHaveLength(3);
    expect(clones.every(clone => clone.summonerId === unit.id && clone.attack === unit.attack * .5)).toBe(true);
    expect(state.events.find(event => event.skillId === 'skill-h012')?.targets).toEqual([near.id, long.id]);
    combatStep(state, 7.01);
    expect(Object.values(state.units).filter(other => other.summonKind === 'buddha-clone')).toHaveLength(0);
  });

  it('grants critical rage once, adds the staff shadow, and makes each clone echo that critical hit', () => {
    const { state, unit, hurt } = setup(); state.phase = 'combat'; unit.energy = 100;
    const target = enemy(state, unit);
    expect(castAbility(state, unit, target.id)).toBe(true);
    unit.cooldown = 10; combatStep(state, .25);
    state.seed = 1;
    const before = target.hp;
    executeAttackGeometry(state, unit, target, hurt);
    expect(unit.energy).toBe(28);
    expect(state.events.filter(event => event.skillId === 'buddha-shadow-h012')).toHaveLength(1);
    expect(state.events.filter(event => event.skillId === 'clone-crit-h012')).toHaveLength(4);
    expect(before - target.hp).toBeCloseTo(760 * 2.2 + 760 * .8 + 4 * 380 * 2.2);
  });
});
