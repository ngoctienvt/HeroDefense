import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../content/catalog.js';
import {
  A_REF,
  H_REF,
  PRESSURE,
  aRef,
  bossHp,
  chieftainHp,
  hRef,
  minionAttack,
  minionHp,
  partyBossFactor,
  pressure,
} from '../src/balance-curve.js';

describe('20-wave balance curve', () => {
  it('defines strictly increasing A_REF, H_REF, and PRESSURE across waves 1..20', () => {
    expect(A_REF).toHaveLength(21);
    expect(H_REF).toHaveLength(21);
    expect(PRESSURE).toHaveLength(21);
    expect(pressure(1)).toBeCloseTo(0.80);
    expect(pressure(20)).toBeCloseTo(1.40);
    for (let wave = 2; wave <= 20; wave++) {
      expect(aRef(wave)).toBeGreaterThan(aRef(wave - 1));
      expect(hRef(wave)).toBeGreaterThan(hRef(wave - 1));
      expect(pressure(wave)).toBeGreaterThan(pressure(wave - 1));
    }
  });

  it('keeps basic melee minion hits-to-kill within 10..15 for reference attack and Tier 1 DPS heroes', () => {
    for (let wave = 1; wave <= 20; wave++) {
      const armor = Math.min(12, Math.floor(wave * 0.6));
      const hp = minionHp(wave, armor);
      const effectiveDamagePerHit = aRef(wave) * (100 / (100 + armor * 5));
      const hits = hp / effectiveDamagePerHit;
      expect(hits).toBeGreaterThanOrEqual(10);
      expect(hits).toBeLessThanOrEqual(15);
    }

    const wave1MinionHp = minionHp(1, 2);
    const tier1Dps = HEROES.filter(hero => hero.tier === 1 && ['ranger', 'mage'].includes(hero.role));
    expect(tier1Dps.length).toBeGreaterThanOrEqual(4);
    for (const hero of tier1Dps) {
      const dmg = hero.attack * (100 / (100 + 2 * 5));
      const hits = wave1MinionHp / dmg;
      expect(hits).toBeGreaterThanOrEqual(10);
      expect(hits).toBeLessThanOrEqual(15);
    }
  });

  it('scales chieftain HP to 4x minion HP and shared boss HP by 1 + 0.75 * (players - 1)', () => {
    for (let wave = 1; wave <= 20; wave++) {
      expect(chieftainHp(wave, 5)).toBe(4 * minionHp(wave, 5));
      expect(minionAttack(wave)).toBeGreaterThan(0);
    }
    expect(partyBossFactor(1)).toBeCloseTo(1.0);
    expect(partyBossFactor(2)).toBeCloseTo(1.75);
    expect(partyBossFactor(3)).toBeCloseTo(2.5);
    expect(partyBossFactor(4)).toBeCloseTo(3.25);

    const solo1 = bossHp(5, 8, 1, false);
    const solo4 = bossHp(5, 8, 4, false);
    expect(solo4 / solo1).toBeCloseTo(3.25, 2);
  });
});
