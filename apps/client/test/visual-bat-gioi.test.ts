import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { deployed, game } from '../../../packages/game-core/test/fixtures.js';
import { Tier3Snapshot } from '../src/battlefield-tier3-snapshot.js';
import { BAT_GIOI as B, GUARD_FRONT_CUT, guardFrontGeometry, tideCharge, tideGuard, tideImpact,
  tideWave, tideFrontRadius, tideContactDelay, TIDE_SECONDS, RUPTURE_SECONDS } from '../src/visual-bat-gioi-timeline.js';
import layout from '../src/visual-bat-gioi-layout.json';
import { isModernTier3Event } from '../src/visual-tier3-heroes.js';

describe('Bát Giới cold tide', () => {
  it('keeps the server footprint and event ids', () => {
    expect(B.radius).toBe(5); expect(B.skill).toBe('tier3-tier4-h00J');
    expect(isModernTier3Event(B.skill)).toBe(true);
    expect(isModernTier3Event('water-shield-burst-h00J')).toBe(true);
    expect(isModernTier3Event('trait-h00J')).toBe(false);
  });
  it('gathers visibly, holds the final windup pose and releases without overshooting R', () => {
    expect(tideCharge(.25, .25, false)).toEqual(tideCharge(.4, .25, false));
    expect(tideCharge(.25, .25, false).alpha).toBeGreaterThan(tideCharge(0, .25, false).alpha);
    expect(tideImpact(.5, false, false).scale).toBeLessThanOrEqual(1);
    expect(tideGuard(3, .1, false, true).sink).toBeGreaterThan(0);
    expect(tideGuard(3, .1, true, true).scale).toBe(1);
  });
  it('uses only the living Bát Giới blockBonus remaining and stops after clear', () => {
    const state = game(), unit = deployed(state, 'h00J'), other = deployed(state, 'h00K', 1);
    unit.blockBonus = { remaining: .27, amount: 3 }; other.blockBonus = { remaining: 4, amount: 3 };
    const tracker = new Tier3Snapshot(); tracker.update(state);
    const sink = { markTier3: vi.fn() }, at = new Vector3(4, 0, 2);
    tracker.draw(sink, unit.zone, id => ({ at, zone: unit.zone, alive: Boolean(state.units[id]?.hp) }));
    expect(sink.markTier3).toHaveBeenCalledOnce();
    expect(sink.markTier3).toHaveBeenCalledWith('h00J', 'guard', unit.id, at, .27);
    unit.blockBonus = undefined; sink.markTier3.mockClear(); tracker.draw(sink, unit.zone, () => ({ at, zone: unit.zone, alive: true }));
    expect(sink.markTier3).not.toHaveBeenCalled(); tracker.clear();
    unit.blockBonus = { remaining: 5, amount: 3 }; tracker.draw(sink, unit.zone, () => ({ at, zone: unit.zone, alive: true }));
    expect(sink.markTier3).not.toHaveBeenCalled();
  });
  it('keeps an intact water collar throughout a long guard instead of cycling dissolution poses', () => {
    for (let age = 0; age < 20; age += .017) {
      expect([4, 5, 6, 7]).toContain(tideGuard(age, 3, false).frame);
      expect(tideGuard(age, 3, true).frame).toBe(5);
    }
    expect(tideGuard(2, .1, false, true).frame).toBeGreaterThanOrEqual(8);
    expect(tideGuard(2, 0, false, true).alpha).toBe(0);
  });
  it('places the entire overlay lip below the foot anchor while preserving image proportions', () => {
    for (const size of [1, 3, 5.8]) {
      const crop = guardFrontGeometry(size);
      const fullCenter = (layout.guard.anchorY - .5) * size;
      const frontTop = fullCenter + crop.offset + crop.height / 2;
      expect(frontTop).toBeLessThanOrEqual(0);
      expect(crop.height / size).toBeCloseTo(1 - GUARD_FRONT_CUT);
      expect(crop.offset - crop.height / 2).toBeCloseTo(-size / 2);
    }
  });
  it('keeps both travelling fronts inside R5 and fades them out at their own lifetime', () => {
    for (const rupture of [false, true]) {
      const life = rupture ? RUPTURE_SECONDS : TIDE_SECONDS;
      let previousRadius = 0;
      for (let age = 0; age <= life; age += .01) {
        const p = tideWave(age, rupture);
        expect(p.radius).toBeGreaterThanOrEqual(previousRadius);
        expect(p.radius + p.thickness).toBeLessThanOrEqual(B.radius);
        expect(p.height).toBeGreaterThan(0);
        expect(p.alpha).toBeGreaterThanOrEqual(0); expect(p.alpha).toBeLessThanOrEqual(1);
        previousRadius = p.radius;
      }
      expect(tideWave(life, rupture).alpha).toBe(0);
    }
    expect(tideWave(.1, true).height).toBeGreaterThan(tideWave(.1, false).height);
  });
  it('lands local splashes as the wave reaches each confirmed target, without delaying reduced-motion cues', () => {
    for (const rupture of [false, true]) {
      for (const distance of [1.5, 2, 3, 4, 4.58, 5]) {
        const arrival = tideContactDelay(distance, rupture, false);
        expect(tideFrontRadius(arrival, rupture)).toBeCloseTo(distance);
        expect(tideContactDelay(distance, rupture, true)).toBe(0);
      }
      expect(tideContactDelay(0, rupture, false)).toBe(0);
      expect(tideContactDelay(6, rupture, false)).toBeLessThanOrEqual(.56);
    }
  });
});
