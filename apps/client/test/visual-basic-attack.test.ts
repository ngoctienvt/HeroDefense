import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { describe, expect, it, vi } from 'vitest';
import { HERO_COMBAT_PROFILES } from '../../../packages/contracts/src/combat-profiles.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { basicAttackHeroId, paintBasicAttack, paintEnemyBasicAttack } from '../src/visual-basic-attack.js';
import { BASIC_ATTACK_PROFILES, skinnedEnemyProfile } from '../src/visual-basic-attack-profiles.js';
import type { TierSkillPainter } from '../src/visual-tier-skills.js';

function painter(reduced = false) {
  const scheduled: (() => void)[] = [];
  const travel = vi.fn((_f: Vector3, _t: Vector3, _c: string, _s: number, _x: string, _d: number, arrive: () => void) => arrive());
  const fx: TierSkillPainter = {
    reduced, ring: vi.fn(), image: vi.fn(), burst: vi.fn(), beam: vi.fn(), travel, flash: vi.fn(),
    shockwave: vi.fn(), smoke: vi.fn(), pillar: vi.fn(), fire: vi.fn(), water: vi.fn(), motif: vi.fn(),
    motifTravel: vi.fn(), later: (_delay, run) => { scheduled.push(run); },
  };
  return { fx, scheduled, travel };
}

const from = new Vector3(0, 0, 0);
const hit = new Vector3(2, 0, 0);
const attack = (heroId: string, extra: Partial<GameEvent> = {}): GameEvent =>
  ({ id: 1, kind: 'attack', source: 'u1', at: 5, skillId: `trait-${heroId}`, ...extra });

describe('basic attack profiles', () => {
  it('routes only profiled heroes', () => {
    expect(basicAttackHeroId('trait-h00V')).toBe('h00V');
    expect(basicAttackHeroId('bounce-h00X')).toBe('h00X');
    expect(basicAttackHeroId('trait-h001')).toBe('');
    expect(basicAttackHeroId('skill-h00V')).toBe('');
    expect(paintBasicAttack(painter().fx, attack('h001'), from, hit)).toBe(false);
  });

  it('draws something at the hit point for every profiled hero, also with reduced motion', () => {
    for (const heroId of Object.keys(BASIC_ATTACK_PROFILES)) {
      for (const reduced of [false, true]) {
        const { fx, scheduled } = painter(reduced);
        expect(paintBasicAttack(fx, attack(heroId), from, hit)).toBe(true);
        scheduled.splice(0).forEach(run => run());
        expect(fx.shockwave).toHaveBeenCalled();
        if (reduced) {
          expect(fx.image).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), 'slash_01');
          expect(fx.beam).not.toHaveBeenCalled();
          expect(fx.travel).not.toHaveBeenCalled();
        }
      }
    }
  });

  it('matches each profile to the combat geometry that the server resolves', () => {
    const forms = { arc: 'frontal_cleave', thrust: 'linear_pierce', chain: 'bounce' } as const;
    for (const [heroId, profile] of Object.entries(BASIC_ATTACK_PROFILES)) {
      const geometry = HERO_COMBAT_PROFILES[heroId].geometry.type;
      if (profile.form in forms) expect(geometry).toBe(forms[profile.form as keyof typeof forms]);
      if (heroId === 'h00Z') expect(geometry).toBe('multishot');
    }
  });

  it('sweeps the cleave fan once per swing and impacts every monster it hits', () => {
    const { fx, scheduled } = painter();
    paintBasicAttack(fx, attack('h00V'), from, hit);
    scheduled.splice(0).forEach(run => run());
    expect(fx.image).toHaveBeenCalledTimes(3);
    expect(fx.shockwave).toHaveBeenCalledTimes(1);
    paintBasicAttack(fx, attack('h00V', { id: 2 }), from, new Vector3(2, 0, 1));
    scheduled.splice(0).forEach(run => run());
    expect(fx.image).toHaveBeenCalledTimes(3);
    expect(fx.shockwave).toHaveBeenCalledTimes(2);
    paintBasicAttack(fx, attack('h00V', { id: 3, at: 6 }), from, hit);
    scheduled.splice(0).forEach(run => run());
    expect(fx.image).toHaveBeenCalledTimes(6);
  });

  it('extends the lance to the pierce length from the combat profile', () => {
    const { fx } = painter();
    paintBasicAttack(fx, attack('h00Q'), from, hit);
    const end = (fx.beam as ReturnType<typeof vi.fn>).mock.calls[0][1] as Vector3;
    expect(end.x).toBeCloseTo(HERO_COMBAT_PROFILES.h00Q.geometry.length!, 5);
  });

  it('flies one projectile per shot and lands the impact on arrival', () => {
    const { fx, travel } = painter();
    for (let shot = 0; shot < 3; shot++) paintBasicAttack(fx, attack('h00Z', { id: shot }), from, hit);
    expect(travel).toHaveBeenCalledTimes(3);
    expect(fx.water).toHaveBeenCalledTimes(3);
  });

  it('makes a critical hit bigger and adds the gold flare', () => {
    const normal = painter(), crit = painter();
    paintBasicAttack(normal.fx, attack('h00N'), from, hit);
    paintBasicAttack(crit.fx, attack('h00N', { isCrit: true }), from, hit);
    expect(normal.fx.flash).toHaveBeenCalledTimes(1);
    expect(crit.fx.flash).toHaveBeenCalledTimes(2);
    expect(crit.travel.mock.calls[0][3]).toBeGreaterThan(normal.travel.mock.calls[0][3]);
  });

  it('survives a hit on the attacker position', () => {
    const { fx, scheduled } = painter();
    expect(() => {
      for (const heroId of Object.keys(BASIC_ATTACK_PROFILES)) paintBasicAttack(fx, attack(heroId, { at: 9 }), from, from.clone());
      scheduled.splice(0).forEach(run => run());
    }).not.toThrow();
  });
});

const TIER34 = ['h00J', 'h00K', 'h00L', 'h00M', 'h00N', 'h00O', 'h00P', 'h00Q', 'h03Q', 'h03R', 'h03S', 'h00R', 'h00S', 'h00T',
  'h00U', 'h00V', 'h00W', 'h00X', 'h00Y', 'h00Z', 'h010', 'h03T', 'h03U', 'h03V'];

describe('full tier 3–4 coverage', () => {
  it('profiles every tier 3–4 hero, each with a catalog entry and a combat profile', () => {
    for (const heroId of TIER34) {
      expect(BASIC_ATTACK_PROFILES[heroId], heroId).toBeDefined();
      expect(HERO_BY_ID[heroId], heroId).toBeDefined();
      expect(HERO_COMBAT_PROFILES[heroId], heroId).toBeDefined();
    }
  });

  it('gives no two heroes of the same element the same form, colour and texture', () => {
    const seen = new Map<string, string>();
    for (const heroId of TIER34) {
      const p = BASIC_ATTACK_PROFILES[heroId];
      const key = `${p.form}|${p.color}|${p.texture}`;
      expect(seen.get(key), `${heroId} duplicates ${seen.get(key)}`).toBeUndefined();
      seen.set(key, heroId);
    }
  });

  it('plays the authored motif on impact except under reduced motion', () => {
    const full = painter(), reduced = painter(true);
    paintBasicAttack(full.fx, attack('h00T'), from, hit);
    paintBasicAttack(reduced.fx, attack('h00T'), from, hit);
    expect(full.fx.motif).toHaveBeenCalledWith(expect.anything(), 'lightning', expect.any(Number), expect.any(Number));
    expect(reduced.fx.motif).not.toHaveBeenCalled();
  });

  it('draws earth dust and leaf sparks for their matters', () => {
    const earth = painter(); paintBasicAttack(earth.fx, attack('h00M'), from, hit);
    expect(earth.fx.smoke).toHaveBeenCalled();
    const wood = painter(); paintBasicAttack(wood.fx, attack('h00S'), from, hit);
    expect(wood.fx.image).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), 'spark_01');
  });
});

describe('hero-skinned enemies', () => {
  const enemyEvent: GameEvent = { id: 9, kind: 'attack', source: 'e1', at: 3, skillId: 'monster-attack-h00V', isCrit: true };

  it('use the skin hero look, smaller, and never flare as a critical hit', () => {
    const { fx, scheduled } = painter();
    expect(paintEnemyBasicAttack(fx, enemyEvent, from, hit, 'h00V')).toBe(true);
    scheduled.splice(0).forEach(run => run());
    expect(fx.image).toHaveBeenCalledTimes(3);
    expect(fx.flash).not.toHaveBeenCalled();
    const heroSize = (BASIC_ATTACK_PROFILES.h00V.size);
    expect((fx.image as ReturnType<typeof vi.fn>).mock.calls[0][2]).toBeLessThan(heroSize);
  });

  it('derives a look from element, reach and geometry when the skin hero has no profile', () => {
    expect(skinnedEnemyProfile('h001')?.form).toBe('bolt');
    expect(skinnedEnemyProfile('h003')?.form).toBe('arc');
    expect(skinnedEnemyProfile('h004')?.form).toBe('thrust');
    expect(skinnedEnemyProfile('h002')?.form).toBe('chain');
    expect(skinnedEnemyProfile('h007')?.form).toBe('smash');
    expect(skinnedEnemyProfile('h001')?.color).not.toBe(skinnedEnemyProfile('h002')?.color);
    expect(skinnedEnemyProfile('nope')).toBeUndefined();
    expect(paintEnemyBasicAttack(painter().fx, enemyEvent, from, hit, 'nope')).toBe(false);
  });

  it('keeps a lance on the hero it hits', () => {
    const { fx } = painter();
    paintEnemyBasicAttack(fx, enemyEvent, from, hit, 'h00U');
    const end = (fx.beam as ReturnType<typeof vi.fn>).mock.calls[0][1] as Vector3;
    expect(end.x).toBeCloseTo(hit.x, 5);
  });
});
