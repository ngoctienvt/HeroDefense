import { describe, expect, it } from 'vitest';
import { HonghainhiTracker } from '../src/battlefield-honghainhi.js';
import { ATLASES } from '../src/visual-kit-atlas-manifest.js';
import { heroIdFromSkillId } from '../src/visual-kit-hero.js';
import { BURN_GAP, BURN_SECONDS, FIRE_RING_PLANE, HONGHAINHI_ATLAS, HONGHAINHI_ID, HONGHAINHI_SKILL, igniteBurningFrame, igniteHoldFrame,
  igniteTailFrame, ORPHAN_SECONDS, ringAlpha, RING_DELAY, RING_LIFE, ringScale, SKILL_RADIUS, SWEEP_AFTER_SECONDS, SWEEP_PLANE, sweepFormingFrame,
  sweepOpenFrame, TAIL_SECONDS } from '../src/visual-honghainhi-timeline.js';
import { HERO_BY_ID } from '../../../content/catalog.js';

describe('Hồng Hài Nhi VFX timeline', () => {
  it('takes radius and burn length from the catalog / combat rules', () => {
    const ability = HERO_BY_ID[HONGHAINHI_ID]?.ability as unknown as { id: string; effect: { radius: number; status: string; statusSeconds: number; sunder: number } };
    expect(ability.id).toBe(HONGHAINHI_SKILL);
    expect(ability.effect.radius).toBe(SKILL_RADIUS);
    expect(ability.effect.status).toBe('burn');
    expect(ability.effect.statusSeconds).toBe(BURN_SECONDS);
  });

  it('routes the skill id to h00C', () => {
    expect(heroIdFromSkillId(HONGHAINHI_SKILL)).toBe(HONGHAINHI_ID);
  });

  it('gathers over the windup and holds until the ability arrives', () => {
    expect(sweepFormingFrame(0, .25)).toBe(0);
    expect(sweepFormingFrame(.24, .25)).toBe(2);
    expect(sweepFormingFrame(5, .25)).toBe(2); // a late ability never plays the sweep early
  });

  it('plays the sweep from frame 3 to the last atlas frame, never backwards', () => {
    expect(sweepOpenFrame(0)).toBe(3);
    expect(sweepOpenFrame(SWEEP_AFTER_SECONDS)).toBe(15);
    expect(sweepOpenFrame(10)).toBe(15);
    let previous = 3;
    for (let t = 0; t <= SWEEP_AFTER_SECONDS; t += .01) {
      const frame = sweepOpenFrame(t);
      expect(frame).toBeGreaterThanOrEqual(previous);
      previous = frame;
    }
  });

  it('sizes the planes so the painted ring edge lands on the 4.2 radius', () => {
    expect(SWEEP_PLANE * .9442 / 2).toBeCloseTo(SKILL_RADIUS, 2);
    expect(FIRE_RING_PLANE * .9807 / 2).toBeCloseTo(SKILL_RADIUS, 2);
    const atlas = ATLASES.get(HONGHAINHI_ATLAS.sweep);
    expect(atlas?.ortho).toBeCloseTo(SWEEP_PLANE, 1);
  });

  it('leaves the scorched ring after the circle closes, fading to nothing', () => {
    expect(RING_DELAY).toBeLessThan(SWEEP_AFTER_SECONDS);
    expect(ringAlpha(0)).toBe(0);
    expect(ringAlpha(RING_LIFE * .4)).toBeGreaterThan(.5);
    expect(ringAlpha(RING_LIFE)).toBe(0);
    expect(ringScale(0)).toBeLessThan(ringScale(1));
    expect(ringScale(1)).toBeCloseTo(1, 6);
    expect(ORPHAN_SECONDS).toBeGreaterThan(.25);
  });

  it('climbs once, loops inside the hold frames, then plays the tail', () => {
    expect(igniteBurningFrame(0)).toBe(0);
    const seen = new Set<number>();
    for (let t = .4; t < 6; t += .02) seen.add(igniteBurningFrame(t));
    expect([...seen].every(frame => frame >= 3 && frame <= 5)).toBe(true);
    expect(igniteHoldFrame(-1)).toBe(igniteHoldFrame(0));
    expect(igniteTailFrame(0)).toBe(5);
    expect(igniteTailFrame(TAIL_SECONDS)).toBe(7);
    expect(igniteTailFrame(9)).toBe(7);
    expect(BURN_GAP).toBeGreaterThan(1 / 60 * 2); // survives one dropped frame
  });

  it('ships both atlases with the cell counts the frames expect', () => {
    expect(ATLASES.get(HONGHAINHI_ATLAS.sweep)?.frames).toBe(16);
    expect(ATLASES.get(HONGHAINHI_ATLAS.ignite)?.frames).toBe(8);
    expect(ATLASES.get(HONGHAINHI_ATLAS.ignite)?.depthWrite).toBe(false);
  });
});

describe('Hồng Hài Nhi burn tracker', () => {
  const clock = (() => { let t = 0; return { now: () => t, advance: (s: number) => { t += s; } }; })();

  it('marks only enemies burning from an h00C caster', () => {
    const tracker = new HonghainhiTracker(clock.now);
    expect(tracker.burning('e1', { burn: { remaining: 3, casterId: 'u1' } }, HONGHAINHI_ID)).toBe(true);
    expect(tracker.burning('e1', { burn: { remaining: 3, casterId: 'u2' } }, 'h00B')).toBe(false);
    expect(tracker.burning('e1', { burn: { remaining: 0, casterId: 'u1' } }, HONGHAINHI_ID)).toBe(false);
    expect(tracker.burning('e1', {}, undefined)).toBe(false);
  });

  it('forces a debug replay for its duration, then stops, and clear() drops it', () => {
    const tracker = new HonghainhiTracker(clock.now);
    tracker.force(['e9'], BURN_SECONDS);
    expect(tracker.burning('e9', {}, undefined)).toBe(true);
    clock.advance(BURN_SECONDS + .1);
    expect(tracker.burning('e9', {}, undefined)).toBe(false);
    tracker.force(['e9'], 10);
    tracker.clear();
    expect(tracker.burning('e9', {}, undefined)).toBe(false);
  });
});
