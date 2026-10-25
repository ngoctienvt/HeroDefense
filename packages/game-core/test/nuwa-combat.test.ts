import { describe, expect, it } from 'vitest';
import { NUWA as N } from '../../../content/nuwa-design.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Nữ Oa', () => {
  it('throws one stone at one target and grants timed healing and shields', () => {
    const state = game(), nuwa = deployed(state, N.id), ally = deployed(state, 'h011', 1);
    state.phase = 'combat';
    ally.x = nuwa.x + 2; ally.z = nuwa.z; ally.hp -= 500;
    const enemies = Array.from({ length: 5 }, (_, i) => enemy(state, nuwa, { x: nuwa.x + i + 1 }));
    executeAttackGeometry(state, nuwa, enemies[0], (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? nuwa, hit, damage, penetration));
    expect(HERO_BY_ID[N.id]).toMatchObject({ hp: 9500, attack: 950, armor: 32,
      range: 9, interval: .95, speed: 4 });
    expect(enemies[0].hp).toBeLessThan(enemies[0].maxHp);
    expect(enemies[0].slowStrength).toBe(.45);
    expect(enemies.slice(1).every(hit => hit.hp === hit.maxHp)).toBe(true);
    expect(ally.hp).toBe(ally.maxHp - 350);
    expect(ally.nuwaShields?.at(-1)).toMatchObject({ amount: 300, remaining: 3 });
    state.enemies = {};
    nuwa.abilityCooldown = 100;
    combatStep(state, 3.01);
    expect(ally.nuwaShields).toEqual([]);
    expect(ally.shield).toBe(0);
  });

  it('slows the whole lane and revives allies beside Nữ Oa with damage reduction only', () => {
    const state = game(), nuwa = deployed(state, N.id), ally = deployed(state, 'h011', 1, 'p2');
    state.phase = 'combat'; ally.hp = 0; ally.respawn = 4; ally.zone = 1;
    const inLane = enemy(state, nuwa, { x: nuwa.x + 30 });
    const otherLane = enemy(state, nuwa, { zone: 1 });
    expect(castAbility(state, nuwa)).toBe(true);
    combatStep(state, .25);
    expect(inLane.hp).toBeLessThan(inLane.maxHp);
    expect(inLane.frozen ?? 0).toBe(0);
    expect(inLane.slowStrength).toBe(N.rainSlow);
    expect(otherLane.hp).toBe(otherLane.maxHp);
    expect(ally.respawn).toBe(0);
    expect(ally.hp).toBeGreaterThanOrEqual(ally.maxHp * N.reviveHpRatio);
    expect(ally.zone).toBe(nuwa.zone);
    expect(Math.hypot(ally.x - nuwa.x, ally.z - nuwa.z)).toBeLessThan(3);
    expect(ally.haste).toBeUndefined();
    expect(ally.ward).toMatchObject({ reduction: .35 });
    expect(ally.nuwaShields?.[0].remaining).toBe(6);
    expect(state.events.some(e => e.skillId === 'revive-h01C' && e.targets?.includes(ally.id))).toBe(true);
  });
});
