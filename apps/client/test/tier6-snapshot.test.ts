import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { deployed, enemy, game } from '../../../packages/game-core/test/fixtures.js';
import type { GameState } from '../../../packages/contracts/src/types.js';
import { Tier6Snapshot } from '../src/battlefield-tier6-snapshot.js';
import { tier6Charge, tier6Ending, tier6HoldFrame } from '../src/visual-tier6-timeline.js';

function setup(state: GameState) {
  const tracker = new Tier6Snapshot(); tracker.update(state);
  const sink = { markTier6: vi.fn(), markFuxiLink: vi.fn(), markHerbalHeal: vi.fn(),
    markSharedStatus: vi.fn(), showTimeGift: vi.fn() };
  const point = (id: string) => {
    const entity = state.units[id] ?? state.enemies[id];
    return entity ? { at: new Vector3(entity.x, 0, entity.z), zone: entity.zone, alive: entity.hp > 0 } : undefined;
  };
  return { tracker, sink, point };
}

describe('remaining tier 6 snapshot presentation', () => {
  it('keeps the real transformation and blessing duration on the right units', () => {
    const state = game(), solar = deployed(state, 'h01I'), ally = deployed(state, 'h011', 1);
    solar.berserk = { remaining: .2, attackSpeed: 1, lifesteal: 0, critChance: 1 };
    ally.primordialBlessing = { remaining: 4.3 }; ally.divineImmortal = .7;
    const { tracker, sink, point } = setup(state);
    tracker.draw(sink, solar.zone, point);
    expect(sink.markTier6).toHaveBeenCalledWith('solar', solar.id, expect.any(Vector3), .2);
    expect(sink.markTier6).toHaveBeenCalledWith('primordial', ally.id, expect.any(Vector3), 4.3, .7);
    solar.berserk = undefined; ally.primordialBlessing = undefined;
    sink.markTier6.mockClear(); tracker.draw(sink, solar.zone, point);
    expect(sink.markTier6).not.toHaveBeenCalled();
  });
  it('heals eligible allies outside the damage radius but within the same zone', () => {
    const state = game(), caster = deployed(state, 'h01E'), ally = deployed(state, 'h011', 1);
    ally.x = caster.x + 30;
    state.groundEffects = [{ id: 'grove', kind: 'shennong-grove', casterId: caster.id,
      x: caster.x, z: caster.z, zone: caster.zone, radius: 8.5, remaining: 2.1, damagePerSecond: 0 }];
    const { tracker, sink, point } = setup(state);
    tracker.draw(sink, caster.zone, point);
    expect(sink.markHerbalHeal).toHaveBeenCalledWith(`grove:${ally.id}`, expect.any(Vector3), point(ally.id)!.at, 2.1);
    ally.zone = 2; sink.markHerbalHeal.mockClear(); tracker.draw(sink, caster.zone, point);
    expect(sink.markHerbalHeal.mock.calls.some(call => call[0] === `grove:${ally.id}`)).toBe(false);
  });
  it('uses only living current ultimate-strength soulLink endpoints', () => {
    const state = game(), caster = deployed(state, 'h01D');
    const a = enemy(state, caster), b = enemy(state, caster), normal = enemy(state, caster);
    a.soulLink = { remaining: 2, group: [a.id, b.id, normal.id], sharePercent: .6 };
    b.soulLink = { remaining: 1.5, group: [a.id, b.id], sharePercent: .6 };
    normal.soulLink = { remaining: 4, group: [normal.id, a.id], sharePercent: .35 };
    const { tracker, sink, point } = setup(state);
    tracker.draw(sink, caster.zone, point);
    expect(sink.markFuxiLink).toHaveBeenCalledOnce();
    expect(sink.markFuxiLink.mock.calls[0][3]).toBe(1.5);
    b.hp = 0; sink.markFuxiLink.mockClear(); tracker.draw(sink, caster.zone, point);
    expect(sink.markFuxiLink).not.toHaveBeenCalled();
  });
  it('does not infer Chuc Long freezing from the hit list without a frozen snapshot', () => {
    const state = game(), caster = deployed(state, 'h01K'), victim = enemy(state, caster);
    const { tracker, sink, point } = setup(state);
    tracker.record({ id: 1, kind: 'ability', source: caster.id, skillId: 'skill-h01K', targets: [victim.id] });
    tracker.draw(sink, caster.zone, point);
    expect(sink.markTier6).not.toHaveBeenCalled();
    victim.frozen = .8; tracker.draw(sink, caster.zone, point);
    expect(sink.markTier6).toHaveBeenCalledWith('winter', victim.id, expect.any(Vector3), .8);
    tracker.clear(); sink.markTier6.mockClear(); tracker.draw(sink, caster.zone, point);
    expect(sink.markTier6).not.toHaveBeenCalled();
  });
  it('leaves ordinary Chuc Long breath burns outside the ultimate art route', () => {
    const state = game(), caster = deployed(state, 'h01K'), victim = enemy(state, caster);
    victim.burn = { remaining: 3, damagePerSecond: 350, casterId: caster.id, trueDamage: true };
    const { tracker, sink, point } = setup(state);
    tracker.draw(sink, caster.zone, point);
    expect(sink.markTier6).not.toHaveBeenCalled();
    victim.burn = { remaining: 4, damagePerSecond: 512, casterId: caster.id, trueDamage: true };
    tracker.record({ id: 2, kind: 'trait', source: caster.id, skillId: 'summer-h01K',
      value: 1280 * 3.5, targets: [victim.id] });
    tracker.draw(sink, caster.zone, point);
    expect(sink.markTier6).toHaveBeenCalledWith('solar-burn', victim.id, expect.any(Vector3), 4);
    victim.burn = { remaining: 3, damagePerSecond: 350, casterId: caster.id, trueDamage: true };
    tracker.update(state); sink.markTier6.mockClear(); tracker.draw(sink, caster.zone, point);
    expect(sink.markTier6).not.toHaveBeenCalled();
  });
});

describe('tier 6 timing', () => {
  it('charges monotonically inside its border and stays fully charged until resolve', () => {
    for (const windup of [.25, .5, .8]) {
      let previous = tier6Charge(0, windup, false);
      for (let i = 1; i <= 20; i++) {
        const next = tier6Charge(i / 20 * windup, windup, false);
        expect(next.scale).toBeGreaterThanOrEqual(previous.scale);
        expect(next.alpha).toBeGreaterThanOrEqual(previous.alpha);
        expect(next.scale).toBeLessThanOrEqual(1); previous = next;
      }
      expect(tier6Charge(windup * 2, windup, false).scale).toBe(1);
    }
  });
  it('plays closing frames immediately on a late snapshot and stops looping currents at the end', () => {
    expect(tier6HoldFrame(0, 16, .1, false, .4)).toBe(15);
    expect(tier6HoldFrame(0, 8, .1, false, .4)).toBe(tier6HoldFrame(100, 8, .1, false, .4));
    expect(tier6Ending(.2, .4)).toBeCloseTo(.5);
  });
});
