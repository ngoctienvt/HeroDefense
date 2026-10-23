import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../content/catalog.js';
import { ThietphienTracker } from '../src/battlefield-thietphien.js';
import { ATLASES } from '../src/visual-kit-atlas-manifest.js';
import { heroIdFromSkillId } from '../src/visual-kit-hero.js';
import { DEFAULT_WINDUP, EMBER_GATE, fanAlpha, fanScale, GUST_EXTEND, GUST_LIFE, gustAlpha, gustPlaneWidth, gustReach,
  hitDelay, hitFrame, HIT_SECONDS, hitScale, igniteFrame, IGNITE_SECONDS, insideSkillArea, SKILL_RADIUS, skillZone, STORM_AFTER_SECONDS,
  stormBlowFrame, stormGatherFrame, THIETPHIEN_ATLAS, THIETPHIEN_ID, THIETPHIEN_SKILL } from '../src/visual-thietphien-timeline.js';

describe('Thiết Phiến VFX timeline', () => {
  it('takes its radius from the catalog skill', () => {
    const hero = HEROES.find(item => item.id === THIETPHIEN_ID);
    if (!hero?.ability?.effect) throw new Error('Thiết Phiến skill effect is missing from the catalog');
    expect(hero.ability.id).toBe(THIETPHIEN_SKILL);
    expect(hero.ability.effect.radius).toBe(SKILL_RADIUS);
  });

  it('draws a circle on a far target and a forward cone for a near one, like combat.ts', () => {
    const far = skillZone({ x: 0, z: 0 }, { x: 0, z: 7 });
    expect(far.kind).toBe('circle');
    expect(far.center).toEqual({ x: 0, z: 7 });
    expect(far.radius).toBe(SKILL_RADIUS);
    const near = skillZone({ x: 0, z: 0 }, { x: 3, z: 0 });
    expect(near.kind).toBe('cone');
    expect(near.dir).toEqual({ x: 1, z: 0 });
    expect(near.center.z).toBe(0);
    expect(near.center.x).toBeGreaterThan(0);
    expect(near.center.x + near.radius).toBeLessThanOrEqual(SKILL_RADIUS + .001);
    expect(skillZone({ x: 1, z: 1 }, { x: 1, z: 1 }).dir).toEqual({ x: 0, z: 1 }); // degenerate aim never produces NaN
  });

  it('mirrors the server area test: circle around a far target, 150 degree cone from her otherwise', () => {
    const origin = { x: 0, z: 0 };
    expect(insideSkillArea(origin, { x: 0, z: 7 }, { x: 3, z: 9 })).toBe(true);
    expect(insideSkillArea(origin, { x: 0, z: 7 }, { x: 0, z: 2 })).toBe(false);
    expect(insideSkillArea(origin, { x: 0, z: 3 }, { x: 0, z: 4 })).toBe(true);
    expect(insideSkillArea(origin, { x: 0, z: 3 }, { x: 4, z: -2 })).toBe(false); // behind the cone edge
    expect(insideSkillArea(origin, { x: 0, z: 3 }, { x: 0, z: 5 })).toBe(false); // beyond the radius
  });

  it('gathers sand over the windup, holds, then plays the cyclone from frame 2 to 15 without going back', () => {
    expect(stormGatherFrame(0, DEFAULT_WINDUP)).toBe(0);
    expect(stormGatherFrame(DEFAULT_WINDUP - .01, DEFAULT_WINDUP)).toBe(1);
    expect(stormGatherFrame(5, DEFAULT_WINDUP)).toBe(1); // a late ability never plays the bloom early
    expect(stormBlowFrame(0)).toBe(2);
    expect(stormBlowFrame(STORM_AFTER_SECONDS)).toBe(15);
    let previous = 2;
    for (let age = 0; age < STORM_AFTER_SECONDS; age += .01) {
      expect(stormBlowFrame(age)).toBeGreaterThanOrEqual(previous);
      previous = stormBlowFrame(age);
    }
  });

  it('swings the fan open then fades it, and sends the gust head-first before fading', () => {
    expect(fanScale(0)).toBeLessThan(fanScale(.2));
    expect(fanAlpha(.2)).toBeCloseTo(1, 5);
    expect(fanAlpha(.42)).toBeCloseTo(0, 5);
    expect(gustReach(0)).toBe(0);
    expect(gustReach(GUST_EXTEND)).toBeCloseTo(1, 5);
    expect(gustAlpha(GUST_EXTEND)).toBe(1);
    expect(gustAlpha(GUST_LIFE)).toBeCloseTo(0, 5);
    expect(gustPlaneWidth(1)).toBe(1.3);
    expect(gustPlaneWidth(30)).toBe(2.6);
  });

  it('sweeps a crowd front to back and shrinks puffs in a packed lane', () => {
    expect(hitDelay(0)).toBe(0);
    expect(hitDelay(-3)).toBe(0);
    expect(hitDelay(5)).toBeLessThan(hitDelay(8));
    expect(hitDelay(500)).toBeLessThanOrEqual(.22);
    expect(hitFrame(0)).toBe(0);
    expect(hitFrame(HIT_SECONDS)).toBe(7);
    expect(igniteFrame(IGNITE_SECONDS)).toBe(7);
    expect(hitScale(1)).toBe(1);
    expect(hitScale(12)).toBeLessThan(hitScale(4));
    expect(EMBER_GATE).toBeGreaterThan(0);
  });

  it('ships all flipbooks without depth writes so the hero draws over them', () => {
    for (const id of Object.values(THIETPHIEN_ATLAS)) {
      expect(ATLASES.get(id), id).toBeDefined();
      expect(ATLASES.get(id)?.depthWrite, id).toBe(false);
    }
  });

  it('routes the skill to h00B while basic attacks stay with the recipe fallback', () => {
    expect(heroIdFromSkillId(THIETPHIEN_SKILL)).toBe(THIETPHIEN_ID);
    expect(heroIdFromSkillId('trait-h00B')).toBe(THIETPHIEN_ID);
  });
});

describe('Thiết Phiến burn tracker', () => {
  const burn = (remaining: number) => ({ burn: { remaining, casterId: 'u1' } });

  it('flags the first snapshot of a detonation burn as start, then hold', () => {
    const tracker = new ThietphienTracker(() => 0);
    expect(tracker.ember('e', burn(3), 'h00B')).toBe('start');
    expect(tracker.ember('e', burn(2.9), 'h00B')).toBe('hold');
    expect(tracker.ember('e', burn(1), 'h00B')).toBe('hold');
  });

  it('flags a re-detonation (remaining jumps back up) as a new start', () => {
    const tracker = new ThietphienTracker(() => 0);
    tracker.ember('e', burn(3), 'h00B');
    tracker.ember('e', burn(1), 'h00B');
    expect(tracker.ember('e', burn(3), 'h00B')).toBe('start');
  });

  it('ignores burn from other heroes and forgets an enemy once it stops burning', () => {
    const tracker = new ThietphienTracker(() => 0);
    expect(tracker.ember('e', burn(3), 'h00C')).toBeUndefined();
    expect(tracker.ember('e', {}, undefined)).toBeUndefined();
    tracker.ember('e', burn(3), 'h00B');
    expect(tracker.ember('e', {}, 'h00B')).toBeUndefined();
    expect(tracker.ember('e', burn(3), 'h00B')).toBe('start');
  });

  it('debug replay forces a start then holds until it expires; clear() drops it', () => {
    let now = 0;
    const tracker = new ThietphienTracker(() => now);
    tracker.force(['e'], 3);
    expect(tracker.ember('e', {}, undefined)).toBe('start');
    expect(tracker.ember('e', {}, undefined)).toBe('hold');
    now = 3.1;
    expect(tracker.ember('e', {}, undefined)).toBeUndefined();
    tracker.force(['e'], 3);
    tracker.clear();
    expect(tracker.ember('e', {}, undefined)).toBeUndefined();
  });
});
