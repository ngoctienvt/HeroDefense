import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameState } from '../../../packages/contracts/src/types.js';
import { Tier4Snapshot } from '../src/battlefield-tier4-snapshot.js';

const point = (id: string) => ({ at: new Vector3(id === 'a' ? 1 : 2, 0, 3), zone: 0, alive: true });
describe('tier4 remaining and presentation ownership', () => {
  it('draws exact owned linked survivors and uses the shorter remaining for each pair', () => {
    const tracker = new Tier4Snapshot(), markTier4 = vi.fn(), markTier4Link = vi.fn();
    const group = ['a', 'b', 'dead'];
    tracker.update({ units: { caster: { heroId: 'h00Y', hp: 0, zone: 1 } }, enemies: {
      a: { id: 'a', hp: 10, zone: 0, soulLink: { casterId: 'caster', remaining: 2, group } },
      b: { id: 'b', hp: 10, zone: 0, soulLink: { casterId: 'caster', remaining: 1.8, group } },
      dead: { id: 'dead', hp: 0, zone: 0, soulLink: { casterId: 'caster', remaining: 2, group } },
    } } as unknown as GameState);
    expect(tracker.ownsLink('a')).toBe(true);
    tracker.draw({ markTier4, markTier4Link }, 0, point);
    expect(markTier4.mock.calls.map(call => call[2])).toEqual(['caster:a|b|dead:a', 'caster:a|b|dead:b']);
    expect(markTier4Link).toHaveBeenCalledExactlyOnceWith('h00Y', 'caster:a|b|dead:a:b', point('a').at, point('b').at, 1.8);
    tracker.clear(); expect(tracker.ownsLink('a')).toBe(false);
  });
  it('does not claim generic or other-source links', () => {
    const tracker = new Tier4Snapshot();
    tracker.update({ units: { caster: { heroId: 'h00O' } }, enemies: {
      a: { soulLink: { remaining: 3, group: ['a'] } },
      b: { soulLink: { remaining: 3, group: ['b'], casterId: 'caster' } },
    } } as unknown as GameState);
    expect(tracker.ownsLink('a')).toBe(false); expect(tracker.ownsLink('b')).toBe(false);
  });
  it('keeps armed immortality and active body as separate snapshot values', () => {
    const tracker = new Tier4Snapshot(), markTier4 = vi.fn(), markTier4Immortal = vi.fn();
    const unit = { id: 'a', heroId: 'h00R', hp: 1, zone: 0, slot: 0, respawn: 0,
      tierImmortal: { remaining: 0, activeRemaining: 1.2 } };
    tracker.update({ units: { a: unit }, enemies: {} } as unknown as GameState);
    tracker.draw({ markTier4, markTier4Immortal }, 0, point);
    expect(markTier4Immortal).toHaveBeenCalledExactlyOnceWith('a', point('a').at, 0, 1.2);
    markTier4Immortal.mockClear();
    tracker.draw({ markTier4, markTier4Immortal }, 0, () => ({ ...point('a'), alive: false }));
    expect(markTier4Immortal).not.toHaveBeenCalled();
  });
  it('uses barrage snapshot time and center, never random pulse focus or a new full duration', () => {
    const tracker = new Tier4Snapshot(), markTier4 = vi.fn();
    tracker.update({ units: { caster: { heroId: 'h00Z', hp: 10, zone: 0, slot: 0 } }, enemies: {},
      tierPulses: [{ casterId: 'caster', heroId: 'h00Z', zone: 0, x: 8, z: 9, radius: 6.5, remaining: 3, interval: .5, timer: .2 }],
    } as unknown as GameState);
    tracker.draw({ markTier4 }, 0, point);
    expect(markTier4).toHaveBeenCalledExactlyOnceWith('h00Z', 'barrage', 'caster:0:8:9:6.5', new Vector3(8, 0, 9), 1.2, 6.5);
  });
});
