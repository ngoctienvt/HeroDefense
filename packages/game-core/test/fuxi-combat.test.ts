import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { FUXI as F } from '../../../content/fuxi-design.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Phục Hy', () => {
  it('strikes one enemy and links it with five nearby enemies', () => {
    const state = game(), unit = deployed(state, F.id);
    state.phase = 'combat';
    const enemies = Array.from({ length: 7 }, (_, index) => enemy(state, unit, {
      x: unit.x + 2 + index, z: unit.z, hp: 100000, maxHp: 100000,
      armor: 0, speed: 0, attack: 0,
    }));
    executeAttackGeometry(state, unit, enemies[0], (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? unit, hit, damage, penetration));
    expect(HERO_BY_ID[F.id]).toMatchObject({ hp: 9200, attack: 1060,
      armor: 31, range: 8.5, interval: .95, speed: 3.8 });
    expect(enemies[0].hp).toBeLessThan(enemies[0].maxHp);
    expect(enemies.slice(1).every(value => value.hp === value.maxHp)).toBe(true);
    expect(enemies[5].soulLink?.group).toContain(enemies[0].id);
    expect(enemies[6].soulLink).toBeUndefined();
    expect(enemies[0].soulLink?.sharePercent).toBe(.35);
    expect(enemies[0].soulLink?.group).toHaveLength(6);
  });

  it('keeps the bagua zone active for six seconds as a pure debuff', () => {
    const state = game(), unit = deployed(state, F.id), ally = deployed(state, 'h011', 1);
    state.phase = 'combat'; unit.cooldown = 100; ally.cooldown = 100;
    ally.x = unit.x + 2; ally.z = unit.z; ally.hp -= 1000;
    const victim = enemy(state, unit, { x: unit.x + 4, z: unit.z,
      hp: 100000, maxHp: 100000, armor: 0, speed: 0, attack: 0 });
    expect(castAbility(state, unit, victim.id)).toBe(true);
    combatStep(state, .25);
    expect(state.groundEffects?.find(effect => effect.kind === 'fuxi-bagua')?.radius).toBe(9.5);
    expect(victim.stun ?? 0).toBe(0);
    expect(victim.sunder?.amount).toBe(.45);
    expect(victim.soulLink?.sharePercent).toBe(.6);
    const before = ally.hp;
    combatStep(state, .25);
    expect(ally.hp).toBe(before);
    expect(ally.fuxiBlessing).toBeUndefined();
  });
});
