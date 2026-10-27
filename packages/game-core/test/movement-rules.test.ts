import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { combatStep } from '../src/combat.js';
import { MOVEMENT_SPEED_MULTIPLIER } from '../src/rules.js';
import { deployed, enemy, game } from './fixtures.js';

describe('movement pace and crossing', () => {
  it('increases hero running pace without changing attack cooldown timing', () => {
    const state = game(1), hero = deployed(state, 'h001');
    hero.x = 0; hero.z = 0; hero.orderMode = 'move';
    hero.destination = { x: 0, z: 8 }; hero.cooldown = 2;
    combatStep(state, .05);
    expect(hero.z).toBeCloseTo(HERO_BY_ID.h001.speed * 1.5 * .05);
    expect(hero.cooldown).toBeCloseTo(1.95);
    expect(MOVEMENT_SPEED_MULTIPLIER).toBe(1.5);
  });

  it.each([0, .5])('increases enemy pace while preserving slow strength %f', slowStrength => {
    const state = game(1), hero = deployed(state, 'h003');
    state.phase = 'combat'; state.wave = 1; hero.orderMode = 'hold';
    hero.cooldown = 100;
    const foe = enemy(state, hero, { x: hero.x + 8, z: hero.z, speed: 2,
      slow: slowStrength ? 2 : 0, slowStrength });
    const x = foe.x;
    combatStep(state, .05);
    expect(x - foe.x).toBeCloseTo(2 * 1.5 * .05 * (1 - slowStrength));
    expect(foe.z).toBeCloseTo(hero.z);
  });

  it('does not separate a hero crossing a held ally during the real simulation tick', () => {
    const state = game(1), mover = deployed(state, 'h001', 0), parked = deployed(state, 'h002', 1);
    mover.x = 0; mover.z = 0; mover.orderMode = 'move'; mover.destination = { x: 0, z: 6 };
    parked.x = 0; parked.z = 2; parked.orderMode = 'hold';
    let crossed = false;
    for (let tick = 0; tick < 30; tick++) {
      combatStep(state, .05);
      crossed ||= Math.abs(mover.z - parked.z) < .3;
      expect(mover.x).toBe(0);
      expect(parked.x).toBe(0); expect(parked.z).toBe(2);
    }
    expect(crossed).toBe(true);
    expect(mover.z).toBe(6);
  });

  it('lets a melee guardian reach and attack a stationary monster', () => {
    const state = game(1), hero = deployed(state, 'h007');
    state.phase = 'combat'; state.wave = 1;
    const foe = enemy(state, hero, { x: hero.x + 8, z: hero.z,
      speed: 0, root: 20, cooldown: 100, attack: 0, hp: 1e9, maxHp: 1e9 });
    hero.orderMode = 'attack'; hero.target = foe.id; hero.cooldown = 0;
    let attacked = false;
    for (let tick = 0; tick < 100 && !attacked; tick++) {
      combatStep(state, .05);
      attacked = state.events.some(event => event.kind === 'attack' && event.source === hero.id && event.target === foe.id);
    }
    expect(attacked).toBe(true);
  });
});
