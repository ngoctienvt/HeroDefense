import { describe, expect, it } from 'vitest';
import { isLadongtanArray, ladongtanArrayId } from '../src/battlefield-ladongtan.js';
import { ATLASES } from '../src/visual-kit-atlas-manifest.js';
import { heroIdFromSkillId } from '../src/visual-kit-hero.js';
import { ARRAY_FADE, ARRAY_SECONDS, arrayAlpha, arrayExpired, arrayRadius, FALL_AFTER_SECONDS, fallFormingFrame, fallImpactFrame,
  FLAME_FRAMES, flameAlpha, flameFrame, LADONGTAN_ATLAS, LADONGTAN_ID, LADONGTAN_SKILL, MARK_HOLD, STRIKE_RADIUS, UNCONFIRMED_HOLD,
  WAVE_SECONDS } from '../src/visual-ladongtan-timeline.js';
import { HERO_BY_ID } from '../../../content/catalog.js';

describe('Lã Động Tân VFX timeline', () => {
  it('takes the strike radius and the array lifetime from the catalog', () => {
    const ability = HERO_BY_ID[LADONGTAN_ID]?.ability as unknown as
      { id: string; effect: { radius: number; groundBurnSeconds: number } } | undefined;
    expect(ability?.id).toBe(LADONGTAN_SKILL);
    expect(ability?.effect.radius).toBe(STRIKE_RADIUS);
    expect(ability?.effect.groundBurnSeconds).toBe(ARRAY_SECONDS);
    expect(heroIdFromSkillId(LADONGTAN_SKILL)).toBe(LADONGTAN_ID);
  });

  it('registers both atlases with the frame counts the timeline plays', () => {
    expect(ATLASES.get(LADONGTAN_ATLAS.fall)?.frames).toBe(16);
    expect(ATLASES.get(LADONGTAN_ATLAS.flame)?.frames).toBe(FLAME_FRAMES);
    expect(ATLASES.get(LADONGTAN_ATLAS.fall)?.depthWrite).toBe(false);
    expect(ATLASES.get(LADONGTAN_ATLAS.flame)?.depthWrite).toBe(false);
  });

  it('drops the sword over the windup and holds before the bite until the ability arrives', () => {
    expect(fallFormingFrame(0, .25)).toBe(0);
    expect(fallFormingFrame(.25, .25)).toBe(5);
    expect(fallFormingFrame(3, .25)).toBe(5); // a late ability never plays the bite early
    let previous = 0;
    for (let age = 0; age < .3; age += .005) {
      expect(fallFormingFrame(age, .25)).toBeGreaterThanOrEqual(previous);
      previous = fallFormingFrame(age, .25);
    }
  });

  it('plays the bite to the last frame, never backwards, and ends well before the array is established', () => {
    expect(fallImpactFrame(0)).toBe(6);
    expect(fallImpactFrame(FALL_AFTER_SECONDS)).toBe(15);
    expect(fallImpactFrame(10)).toBe(15);
    let previous = 6;
    for (let age = 0; age < FALL_AFTER_SECONDS; age += .005) {
      expect(fallImpactFrame(age)).toBeGreaterThanOrEqual(previous);
      previous = fallImpactFrame(age);
    }
    expect(FALL_AFTER_SECONDS).toBeLessThan(.6); // the giant sword never lingers over the cluster
  });

  it('spreads the shock wave to the strike radius and holds it', () => {
    expect(arrayRadius(0)).toBeLessThan(STRIKE_RADIUS / 2);
    expect(arrayRadius(WAVE_SECONDS)).toBeCloseTo(STRIKE_RADIUS, 5);
    expect(arrayRadius(5)).toBeCloseTo(STRIKE_RADIUS, 5);
  });

  it('keeps the array while the snapshot marks it and withers it after the marks stop', () => {
    expect(arrayAlpha(1, 0, true)).toBeGreaterThan(.8);
    expect(arrayAlpha(1, MARK_HOLD, true)).toBeCloseTo(arrayAlpha(1, 0, true), 5);
    expect(arrayAlpha(1, MARK_HOLD + ARRAY_FADE, true)).toBe(0);
    expect(arrayExpired(MARK_HOLD - .01, true)).toBe(false);
    expect(arrayExpired(MARK_HOLD + ARRAY_FADE, true)).toBe(true);
  });

  it('waits longer for the first snapshot of a fresh impact than for a missed frame of a confirmed array', () => {
    expect(arrayExpired(MARK_HOLD + ARRAY_FADE, false)).toBe(false);
    expect(arrayExpired(UNCONFIRMED_HOLD + ARRAY_FADE, false)).toBe(true);
  });

  it('loops the flame ring seamlessly and fades it in after the shock ring', () => {
    expect(flameFrame(0)).toBe(0);
    expect(flameFrame(.7)).toBe(0); // frame 8 flows back into frame 1
    for (let age = 0; age < 3; age += .01) {
      const frame = flameFrame(age);
      expect(frame).toBeGreaterThanOrEqual(0);
      expect(frame).toBeLessThan(FLAME_FRAMES);
    }
    expect(flameAlpha(0, 0, true)).toBe(0);
    expect(flameAlpha(1, 0, true)).toBeCloseTo(1, 5);
    expect(flameAlpha(1, MARK_HOLD + ARRAY_FADE, true)).toBe(0);
  });
});

describe('Lã Động Tân ground effect ownership', () => {
  const ground = { x: 12.04, z: -3.26, remaining: 2.4, casterId: 'u-17' };

  it('claims only kind-less ground fire owned by an h00D caster', () => {
    expect(isLadongtanArray(ground, LADONGTAN_ID)).toBe(true);
    expect(isLadongtanArray(ground, 'h00F')).toBe(false);
    expect(isLadongtanArray(ground, undefined)).toBe(false);
    expect(isLadongtanArray({ ...ground, kind: 'tier-fire' }, LADONGTAN_ID)).toBe(false);
    expect(isLadongtanArray({ ...ground, remaining: 0 }, LADONGTAN_ID)).toBe(false);
  });

  it('gives one stable id per caster and landing point across snapshots', () => {
    const laterGround = { ...ground, remaining: 1 };
    expect(ladongtanArrayId(ground)).toBe(ladongtanArrayId(laterGround));
    expect(ladongtanArrayId(ground)).not.toBe(ladongtanArrayId({ ...ground, x: 20 }));
    expect(ladongtanArrayId(ground)).not.toBe(ladongtanArrayId({ ...ground, casterId: 'u-18' }));
  });
});
