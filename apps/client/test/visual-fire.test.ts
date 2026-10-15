import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { describe, expect, it, vi } from 'vitest';
import type { Enemy, GameEvent, Unit } from '../../../packages/contracts/src/types.js';
import { fireFlipbookFrame, hasFireBurn, isFireSkill } from '../src/visual-fire.js';
import { fireProjectileDuration } from '../src/visual-fire-projectiles.js';
import { paintTierAbility, type TierSkillPainter } from '../src/visual-tier-skills.js';

describe('fire visual routing', () => {
  it('uses flames for fire skills without treating electrical burns as fire', () => {
    expect(isFireSkill('web-h00C')).toBe(true);
    expect(isFireSkill('skill-h00B')).toBe(true);
    expect(isFireSkill('web-h01H')).toBe(true);
    expect(isFireSkill('web-h00T')).toBe(false);
    expect(isFireSkill('web-h03W')).toBe(false);
    expect(isFireSkill(undefined)).toBe(false);
  });

  it('keeps flames on a target only while an actual fire burn is active', () => {
    const enemy = { burn: { remaining: 3, damagePerSecond: 1, casterId: 'fire-unit' } } as Enemy;
    const units = {
      'fire-unit': { heroId: 'h00C' },
      'fan-unit': { heroId: 'h00B' },
      'electric-unit': { heroId: 'h00T' },
    } as unknown as Record<string, Unit>;
    expect(hasFireBurn(enemy, units)).toBe(true);
    enemy.burn!.casterId = 'fan-unit';
    expect(hasFireBurn(enemy, units)).toBe(true);
    enemy.burn!.casterId = 'electric-unit';
    expect(hasFireBurn(enemy, units)).toBe(false);
    enemy.burn!.casterId = 'missing-unit';
    expect(hasFireBurn(enemy, units)).toBe(false);
    enemy.burn!.casterId = 'fire-unit';
    enemy.burn!.remaining = 0;
    expect(hasFireBurn(enemy, units)).toBe(false);
  });

  it('advances the impact atlas through ignition, peak, and decay without escaping its cells', () => {
    expect(fireFlipbookFrame(-.1, .8)).toBe(0);
    expect(fireFlipbookFrame(0, .8)).toBe(0);
    expect(fireFlipbookFrame(.2, .8)).toBe(4);
    expect(fireFlipbookFrame(.4, .8)).toBe(8);
    expect(fireFlipbookFrame(.8, .8)).toBe(15);
  });

  it('keeps the fireball flight visible long enough while capping its travel time', () => {
    expect(fireProjectileDuration(1)).toBe(.16);
    expect(fireProjectileDuration(8)).toBeCloseTo(.28);
    expect(fireProjectileDuration(30)).toBe(.42);
  });

  it('sweeps Hồng Hài Nhi fire around the caster instead of launching a fireball', () => {
    const fire = vi.fn(), beam = vi.fn(), travel = vi.fn();
    const painter: TierSkillPainter = {
      reduced: false, ring: vi.fn(), image: vi.fn(), burst: vi.fn(), beam, travel, fire, water: vi.fn(),
      motif: vi.fn(), motifTravel: vi.fn(),
      flash: vi.fn(), shockwave: vi.fn(), smoke: vi.fn(), pillar: vi.fn(),
      later: (_delay, run) => run(),
    };
    const from = new Vector3(1, 0, 2), to = new Vector3(9, 0, 2);
    const hit: GameEvent = { id: 2, kind: 'ability', skillId: 'web-h00C', ability: 'cleave' };
    expect(paintTierAbility(painter, hit, from, to, [to])).toBe(true);
    expect(fire).toHaveBeenCalledWith(from, 4.2);
    expect(painter.shockwave).toHaveBeenCalledWith(from, '#fb7135', 4.2, .52);
    expect(travel).not.toHaveBeenCalled();
    expect(beam).not.toHaveBeenCalled();
  });
});
