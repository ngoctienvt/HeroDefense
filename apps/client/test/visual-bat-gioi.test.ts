import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { deployed, game } from '../../../packages/game-core/test/fixtures.js';
import { Tier3Snapshot } from '../src/battlefield-tier3-snapshot.js';
import { BAT_GIOI as B, tideCharge, tideGuard, tideImpact } from '../src/visual-bat-gioi-timeline.js';
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
});
