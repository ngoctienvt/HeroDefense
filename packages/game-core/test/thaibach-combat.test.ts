import { describe, expect, it } from 'vitest';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { THAIBACH as T } from '../../../content/thaibach-design.js';
import { executeAttackGeometry } from '../src/attack-geometry.js';
import { castAbility, combatStep, hurtEnemy, hurtUnit } from '../src/combat.js';
import { deployed, enemy, game } from './fixtures.js';

describe('Thái Bạch Kim Tinh', () => {
  it('uses its own tier-5 support profile instead of the old generic heal', () => {
    expect(HERO_BY_ID[T.id]).toMatchObject({ tier: 5, role: 'support', hp: T.hp, attack: T.attack,
      energyType: 'cooldown' });
    expect(HERO_BY_ID[T.id].ability?.id).toBe('skill-h015');
  });

  it('shoots one target and heals the lowest owned ally by its own Máu', () => {
    const state = game(), unit = deployed(state, T.id), ally = deployed(state, 'h011', 1);
    ally.x = unit.x + 2; ally.z = unit.z; ally.hp = ally.maxHp * .5;
    const first = enemy(state, unit), second = enemy(state, unit, { x: unit.x + 1.5 });
    executeAttackGeometry(state, unit, first, (hit, damage, penetration, source) =>
      hurtEnemy(state, source ?? unit, hit, damage, penetration));
    expect(first.maxHp - first.hp).toBeCloseTo(T.attack * T.boltPower);
    expect(second.hp).toBe(second.maxHp);
    expect(ally.hp).toBeCloseTo(ally.maxHp * (.5 + T.healRatio));
  });

  it('saves one owned ally from a lethal hit, then needs 45 seconds', () => {
    const state = game(), unit = deployed(state, T.id), ally = deployed(state, 'h011', 1);
    const stranger = deployed(state, 'h011', 0, 'p2');
    state.phase = 'combat';
    ally.x = unit.x + 2; ally.z = unit.z; stranger.zone = unit.zone; stranger.x = unit.x; stranger.z = unit.z;
    hurtUnit(state, stranger, stranger.maxHp * 10);
    expect(stranger.respawn).toBeGreaterThan(0);
    hurtUnit(state, ally, ally.maxHp * 10);
    expect(ally.respawn).toBe(0);
    expect(ally.hp).toBeCloseTo(1 + ally.maxHp * T.guardHealRatio);
    expect(ally.divineImmortal).toBe(T.guardInvulnerable);
    expect(unit.starGuardCooldown).toBe(T.guardCooldown);
    ally.divineImmortal = 0;
    hurtUnit(state, ally, ally.maxHp * 10);
    expect(ally.respawn).toBeGreaterThan(0);
  });

  it('revives the strongest fallen ally beside Thái Bạch, otherwise heals the weakest', () => {
    const state = game(), unit = deployed(state, T.id);
    const weak = deployed(state, 'h001', 1), strong = deployed(state, 'h01B', 2);
    state.phase = 'combat'; unit.cooldown = 100; unit.starGuardCooldown = 100;
    for (const fallen of [weak, strong]) { fallen.hp = 0; fallen.respawn = 6; fallen.zone = 1; }
    expect(castAbility(state, unit)).toBe(true);
    combatStep(state, T.windup + .01);
    expect(strong.respawn).toBe(0);
    expect(strong.hp).toBeCloseTo(strong.maxHp * T.reviveHpRatio, -1);
    expect(strong.zone).toBe(unit.zone);
    expect(weak.respawn).toBeGreaterThan(0);
    expect(state.events.some(e => e.skillId === 'revive-h015' && e.target === strong.id)).toBe(true);

    unit.abilityCooldown = 0; weak.respawn = 0; weak.hp = 1; weak.zone = unit.zone;
    weak.x = unit.x + 1; weak.z = unit.z; weak.stun = 2;
    expect(castAbility(state, unit)).toBe(true);
    combatStep(state, T.windup + .01);
    expect(weak.hp).toBeGreaterThan(1);
    expect(weak.stun ?? 0).toBe(0);
    expect(weak.haste?.amount).toBe(T.haste);
  });
});
