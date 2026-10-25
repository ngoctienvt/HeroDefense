import { describe, expect, it } from 'vitest';
import { combatStep } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('enemy skill runner and chieftain templates', () => {
  it.each([
    ['template-A', 'enemy-slam-windup', 'enemy-slam', 'circle'],
    ['template-A+', 'enemy-heavy-slam-windup', 'enemy-heavy-slam', 'circle'],
    ['template-B', 'enemy-pierce-windup', 'enemy-pierce', 'line'],
    ['template-C', 'enemy-leap-windup', 'enemy-leap', 'circle'],
    ['template-C+', 'enemy-heavy-leap-windup', 'enemy-heavy-leap', 'circle'],
    ['template-D', 'enemy-warcry-windup', 'enemy-warcry', 'circle'],
  ] as const)('executes chieftain %s with telegraph windup then impact event', (templateId, windupId, impactId, telegraph) => {
    const state = game(1);
    const hero = deployed(state, 'h007');
    hero.stopped = true;
    hero.attack = 0;
    state.phase = 'combat';
    state.wave = 6;

    const chief = enemy(state, hero, {
      skinHeroId: 'h00C',
      rank: 'chieftain',
      x: hero.x,
      z: hero.z - 2.2,
      attack: 60,
      hp: 5000,
      maxHp: 5000,
      speed: 0,
      cooldown: 99,
      skills: [{ id: templateId, cooldown: 0.05, maxCooldown: 8 }],
    });

    combatStep(state, 0.05);
    const castEvent = state.events.find(e => e.kind === 'cast' && e.skillId === windupId);
    expect(castEvent).toBeDefined();
    expect(castEvent?.telegraph).toBe(telegraph);
    expect(chief.skills?.[0]?.windup).toBeDefined();

    for (let i = 0; i < 25; i++) combatStep(state, 0.05);
    const abilityEvent = state.events.find(e => e.kind === 'ability' && e.skillId === impactId);
    expect(abilityEvent).toBeDefined();
    if (templateId === 'template-D') {
      expect(chief.shield).toBeGreaterThan(0);
      expect(chief.armorBuff?.amount).toBeGreaterThan(0);
    } else {
      expect(hero.hp).toBeLessThan(hero.maxHp);
    }
  });

  it('cancels a chieftain skill windup when stunned mid-cast', () => {
    const state = game(1);
    const hero = deployed(state, 'h007');
    hero.stopped = true;
    hero.attack = 0;
    state.phase = 'combat';

    const chief = enemy(state, hero, {
      skinHeroId: 'h00C',
      rank: 'chieftain',
      x: hero.x,
      z: hero.z - 2,
      attack: 80,
      speed: 0,
      cooldown: 99,
      skills: [{ id: 'template-A', cooldown: 0.05, maxCooldown: 8 }],
    });

    combatStep(state, 0.05);
    expect(chief.skills?.[0]?.windup).toBeDefined();
    chief.stun = 1.5;
    combatStep(state, 0.05);
    expect(chief.skills?.[0]?.windup).toBeUndefined();
    expect(chief.skills?.[0]?.cooldown).toBeGreaterThan(0);
    expect(state.events.some(e => e.kind === 'ability' && e.skillId === 'enemy-slam')).toBe(false);
  });
});
