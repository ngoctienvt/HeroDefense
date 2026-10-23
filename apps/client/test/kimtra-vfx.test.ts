import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { KimtraTracker } from '../src/battlefield-kimtra.js';
import { ATLASES } from '../src/visual-kit-atlas-manifest.js';
import { TIER12_RECIPES } from '../src/visual-kit-recipes-tier12.js';
import { arrayAlpha, arrayScale, ARRAY_RADIUS, BELL_AFTER_SECONDS, bellFormingFrame, bellImpactFrame, KIMTRA_ATLAS,
  REFLECT_RADIUS, RING_SECONDS, ringAlpha, ringRadius, shatterFrame, shellSettle, SHELL_SETTLE_START, SHATTER_SECONDS, SLAM_DELAY, SLASH_HALF_ANGLE,
  SLASH_LIFE, SLASH_REACH, slashSweep } from '../src/visual-kimtra-timeline.js';

describe('Kim Tra VFX timeline', () => {
  it('reads every radius from the catalog and combat profile', () => {
    expect(ARRAY_RADIUS).toBe(4.5);
    expect(SLASH_REACH).toBe(2.2);
    expect(SLASH_HALF_ANGLE).toBeCloseTo(Math.PI / 3, 5);
    expect(REFLECT_RADIUS).toBe(3);
  });

  it('forms the bell over the windup and holds it until the ability arrives', () => {
    expect(bellFormingFrame(0, .25)).toBe(0);
    expect(bellFormingFrame(.24, .25)).toBe(3);
    expect(bellFormingFrame(2, .25)).toBe(3); // late ability: never drops before the server impact
  });

  it('drops, slams on frame 6 at SLAM_DELAY, then plays to the last frame of the atlas', () => {
    expect(bellImpactFrame(0)).toBe(4);
    expect(bellImpactFrame(SLAM_DELAY * .75)).toBe(5);
    expect(bellImpactFrame(SLAM_DELAY)).toBe(6);
    expect(bellImpactFrame(BELL_AFTER_SECONDS)).toBe(15);
    expect(bellImpactFrame(10)).toBe(15);
    let previous = 0;
    for (let age = 0; age < BELL_AFTER_SECONDS; age += .01) {
      const frame = bellImpactFrame(age);
      expect(frame).toBeGreaterThanOrEqual(previous);
      previous = frame;
    }
  });

  it('shows the formation during the windup and clears it right after the slam', () => {
    expect(arrayAlpha(0, .25, undefined)).toBe(0);
    expect(arrayAlpha(.25, .25, undefined)).toBeCloseTo(.75, 5);
    expect(arrayAlpha(1, .25, SLAM_DELAY + .2)).toBe(0);
    expect(arrayScale(undefined)).toBe(1);
    expect(arrayScale(1)).toBeLessThan(.5);
  });

  it('runs the counter wave exactly to the server counter radius and fades out', () => {
    expect(ringRadius(0)).toBe(0);
    expect(ringRadius(RING_SECONDS)).toBeCloseTo(REFLECT_RADIUS, 5);
    expect(ringAlpha(0)).toBe(1);
    expect(ringAlpha(RING_SECONDS)).toBe(0);
  });

  it('keeps the seated bell full through the handoff, then settles to the slim rim', () => {
    expect(shellSettle(0)).toBe(0);
    expect(shellSettle(SHELL_SETTLE_START)).toBe(0);
    expect(shellSettle(SHELL_SETTLE_START + .5)).toBe(1);
  });

  it('keeps shatter and sword-arc timing inside their atlases/lifetimes', () => {
    expect(shatterFrame(0)).toBe(0);
    expect(shatterFrame(SHATTER_SECONDS)).toBe(11);
    expect(slashSweep(0).head).toBe(0);
    expect(slashSweep(SLASH_LIFE).head).toBeCloseTo(1, 5);
    expect(slashSweep(SLASH_LIFE).tail).toBeCloseTo(1, 5);
  });

  it('ships both atlases without depth writes so the hero stays on top of the bell', () => {
    for (const id of Object.values(KIMTRA_ATLAS)) {
      expect(ATLASES.get(id), id).toBeDefined();
      expect(ATLASES.get(id)?.depthWrite, id).toBe(false);
    }
  });

  it('is no longer a tier 1–2 recipe (its own module owns h009)', () => {
    expect(TIER12_RECIPES.some(recipe => recipe.heroId === 'h009')).toBe(false);
  });
});

describe('Kim Tra bell tracker', () => {
  const ability = (targets: string[]): GameEvent => ({ id: 1, kind: 'ability', skillId: 'skill-h009', targets });

  it('shows a bell only on ability recipients, and only while their shield lasts', () => {
    const tracker = new KimtraTracker(() => 0);
    tracker.record(ability(['kim', 'ally']));
    expect(tracker.bell('kim', 120)).toBe(true);
    expect(tracker.bell('other', 120)).toBe(false); // a shield from another hero is not a bell
    expect(tracker.bell('ally', 0)).toBe(false);
    expect(tracker.bell('ally', 50)).toBe(false); // gone once the bell broke; a later shield is someone else's
  });

  it('debug replay forces bells without a shield, then they expire', () => {
    let now = 0;
    const tracker = new KimtraTracker(() => now);
    tracker.force(['kim'], 3);
    expect(tracker.bell('kim', 0)).toBe(true);
    now = 3.1;
    expect(tracker.bell('kim', 0)).toBe(false);
    tracker.record(ability(['kim']));
    tracker.clear();
    expect(tracker.bell('kim', 10)).toBe(false);
  });
});
