import { describe, expect, it } from 'vitest';
import { primordialStreams } from '../src/visual-nguyen-thuy-timeline.js';
import { solarSplashPoints } from '../src/visual-de-tuan-timeline.js';
import { tier6Ending, tier6HoldFrame } from '../src/visual-tier6-timeline.js';
import { CHUCLONG } from '../../../content/chuclong-design.js';
import { DE_TUAN } from '../../../content/new-divine-design.js';

describe('remaining divine ultimate presentation', () => {
  it('aims the three primordial motifs toward actual target coordinates', () => {
    const streams = primordialStreams({ x: 2, z: 3 }, { x: 2, z: -7 });
    expect(streams).toHaveLength(3);
    expect(streams[1]).toEqual({ from: { x: 2, z: 3 }, to: { x: 2, z: -7 } });
    expect(streams.every(stream => stream.to.z < stream.from.z)).toBe(true);
    expect(streams[0].from.x + streams[2].from.x).toBeCloseTo(4);
  });

  it('omits an invented primordial axis for missing or invalid geometry', () => {
    expect(primordialStreams({ x: 2, z: 3 }, { x: 2, z: 3 })).toEqual([]);
    expect(primordialStreams({ x: 2, z: 3 }, { x: Number.NaN, z: 3 })).toEqual([]);
    expect(primordialStreams({ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 1, z: 0 })).toEqual([]);
  });

  it('preserves the solar main target when it is not the first affected enemy', () => {
    const splash = { x: 4, z: 1 }, main = { x: -3, z: 2 };
    expect(solarSplashPoints([splash, main], main)).toEqual([splash]);
    expect(solarSplashPoints([splash])).toEqual([splash]);
    expect(solarSplashPoints([], main)).toEqual([]);
    expect(solarSplashPoints([])).toEqual([]);
  });

  it('ends the solar transformation from remaining even after reconnecting late', () => {
    const remaining = .2;
    expect(tier6Ending(remaining, .4)).toBeCloseTo(.5);
    // A brand-new renderer at the last snapshot must immediately show the release frames.
    expect(tier6HoldFrame(0, 16, remaining, false, .4)).toBe(14);
    expect(tier6HoldFrame(DE_TUAN.berserkSeconds - remaining, 16, remaining, false, .4)).toBe(14);
  });

  it('ends ChucLong burn using its own snapshot, independently of the winter delay', () => {
    expect(tier6HoldFrame(CHUCLONG.phaseDelay, 16, CHUCLONG.summerBurnSeconds, false, .3)).toBeLessThan(12);
    expect(tier6HoldFrame(CHUCLONG.phaseDelay, 16, .15, false, .3)).toBe(14);
    expect(tier6Ending(0, .3)).toBe(1);
  });
});
