import { describe, expect, it } from 'vitest';
import { PHUONG_HOANG as P } from '../../../content/phuong-hoang-design.js';
import { birdFrame, flameLayout, FLIGHT_SECONDS, flightPath, flightProgress, gatherFrame, MAX_LANE, MAX_STRIKES,
  MIN_LANE, projection, rainLayout, resolveDirection, sampleStrikes, strikeDelay, timeAtProgress }
  from '../src/visual-phuong-hoang-flight-math.js';

const origin = { x: 0, z: 0 };
const right = { x: 1, z: 0 };

describe('Phượng Hoàng lane flight', () => {
  it('prefers the cast direction, then caster→point, then the target spread, then screen-right', () => {
    expect(resolveDirection({ x: 0, z: -3 }, origin, { x: 5, z: 0 }, [], right)).toEqual({ x: 0, z: -1 });
    expect(resolveDirection(undefined, origin, { x: 0, z: 4 }, [], right)).toEqual({ x: 0, z: 1 });
    const spread = resolveDirection(undefined, origin, origin, [{ x: 10, z: 1 }, { x: 20, z: 2 }, { x: 30, z: 3 }], right);
    expect(spread.x).toBeGreaterThan(.99);
    const away = resolveDirection(undefined, origin, origin, [{ x: -10, z: 0 }, { x: -20, z: 0 }], right);
    expect(away.x).toBeLessThan(-.99);
    expect(resolveDirection(undefined, origin, origin, [], right)).toEqual(right);
  });

  it('crosses the whole lane: at least MIN_LANE, past the farthest real point, never beyond MAX_LANE', () => {
    expect(flightPath(origin, right, { x: 3, z: 0 }, []).length).toBe(MIN_LANE);
    expect(flightPath(origin, right, { x: 3, z: 0 }, [{ x: 31, z: 4 }]).length).toBeGreaterThan(31);
    expect(flightPath(origin, right, { x: 3, z: 0 }, [{ x: 400, z: 0 }]).length).toBe(MAX_LANE);
    const path = flightPath(origin, { x: 0, z: 1 }, { x: 0, z: 8 }, []);
    expect(path.start).toEqual(origin);
    expect(path.end.z).toBeCloseTo(path.length);
  });

  it('accelerates through the middle and the delay inverse stays ordered along the lane', () => {
    let previous = 0;
    for (let i = 1; i <= 100; i++) {
      const next = flightProgress(i / 100);
      expect(next).toBeGreaterThanOrEqual(previous);
      previous = next;
    }
    expect(flightProgress(0)).toBe(0);
    expect(flightProgress(1)).toBe(1);
    expect(flightProgress(.1) - flightProgress(0)).toBeLessThan(flightProgress(.5) - flightProgress(.4));
    expect(timeAtProgress(1)).toBeCloseTo(FLIGHT_SECONDS, 2);
    expect(timeAtProgress(flightProgress(.4))).toBeCloseTo(.4 * FLIGHT_SECONDS, 1);
    expect(strikeDelay(0, 30)).toBeLessThan(strikeDelay(15, 30));
    expect(strikeDelay(15, 30)).toBeLessThan(strikeDelay(30, 30));
    expect(strikeDelay(30, 30)).toBeLessThan(FLIGHT_SECONDS);
    expect(strikeDelay(5, 0)).toBe(0);
  });

  it('thins a crowd to the strike cap in lane order and keeps the extremes', () => {
    const crowd = Array.from({ length: 90 }, (_, i) => ({ x: i, z: (i * 7) % 5 }));
    const shown = sampleStrikes([...crowd].reverse(), origin, right);
    expect(shown).toHaveLength(MAX_STRIKES);
    expect(shown[0].x).toBe(0);
    expect(shown[shown.length - 1].x).toBe(89);
    for (let i = 1; i < shown.length; i++)
      expect(projection(origin, right, shown[i])).toBeGreaterThan(projection(origin, right, shown[i - 1]));
    expect(sampleStrikes(crowd.slice(0, 5), origin, right)).toHaveLength(5);
  });

  it('plays a looping wing beat in the flight frames and a gather in the charge frames', () => {
    const frames = Array.from({ length: 40 }, (_, i) => birdFrame(i / 39));
    expect(frames[0]).toBe(3);
    expect(frames[frames.length - 1]).toBe(15);
    expect(new Set(frames).size).toBeGreaterThan(6);
    expect(gatherFrame(0)).toBe(0);
    expect(gatherFrame(1)).toBe(3);
  });

  it('fills the whole R9 with rain and a ring of carpet fire, inside the radius', () => {
    const rain = rainLayout(P.radius), flames = flameLayout(P.radius);
    expect(rain).toHaveLength(9);
    expect(flames.length).toBeGreaterThanOrEqual(12);
    for (const spot of [...rain, ...flames]) expect(Math.hypot(spot.dx, spot.dz)).toBeLessThanOrEqual(P.radius);
    expect(Math.max(...rain.map(s => Math.hypot(s.dx, s.dz)))).toBeGreaterThan(P.radius * .7);
    expect(Math.max(...flames.map(s => Math.hypot(s.dx, s.dz)))).toBeGreaterThan(P.radius * .8);
    // 9 + 13 + decal per carpet, three carpets, plus birds/hits, must stay under the 128 plane cap.
    expect(3 * (rain.length + flames.length + 1) + 3 * 4 + 32 + 3).toBeLessThanOrEqual(128);
  });
});
