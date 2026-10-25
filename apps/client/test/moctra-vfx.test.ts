import { describe, expect, it } from 'vitest';
import { MoctraTracker } from '../src/battlefield-moctra.js';
import { ATLASES } from '../src/visual-kit-atlas-manifest.js';
import { heroIdFromSkillId } from '../src/visual-kit-hero.js';
import { TIER12_RECIPES } from '../src/visual-kit-recipes-tier12.js';
import { AWAKEN_AFTER_SECONDS, awakenFormingFrame, awakenImpactFrame, HIT_DELAY, HIT_SECONDS, hitFrame, LASH_EXTEND,
  LASH_LIFE, lashAlpha, lashPlaneWidth, lashReach, MOCTRA_ATLAS, MOCTRA_ID, MOCTRA_SKILL, VINE_REACH, VINE_SKILL,
  WREATH_FADE, WREATH_RADIUS, wreathAlpha, wreathKick } from '../src/visual-moctra-timeline.js';

describe('Mộc Tra VFX timeline', () => {
  it('takes its reach from the server rules and keeps the wreath inside the basic cleave', () => {
    expect(VINE_REACH).toBe(4.5);
    expect(WREATH_RADIUS).toBeCloseTo(2.2 * .7, 5);
    expect(WREATH_RADIUS).toBeLessThan(2.2);
  });

  it('sprouts over the windup and holds until the ability arrives', () => {
    expect(awakenFormingFrame(0, .25)).toBe(0);
    expect(awakenFormingFrame(.24, .25)).toBe(3);
    expect(awakenFormingFrame(3, .25)).toBe(3); // a late ability never plays the burst early
  });

  it('plays the awakening burst from frame 4 to the last atlas frame, never backwards', () => {
    expect(awakenImpactFrame(0)).toBe(4);
    expect(awakenImpactFrame(AWAKEN_AFTER_SECONDS)).toBe(15);
    expect(awakenImpactFrame(10)).toBe(15);
    let previous = 4;
    for (let age = 0; age < AWAKEN_AFTER_SECONDS; age += .01) {
      expect(awakenImpactFrame(age)).toBeGreaterThanOrEqual(previous);
      previous = awakenImpactFrame(age);
    }
  });

  it('grows the vine lash hook-first, strikes once it is out, then fades', () => {
    expect(lashReach(0)).toBe(0);
    expect(lashReach(LASH_EXTEND)).toBeCloseTo(1, 5);
    expect(HIT_DELAY).toBeLessThan(LASH_EXTEND);
    expect(lashAlpha(LASH_EXTEND)).toBe(1);
    expect(lashAlpha(LASH_LIFE)).toBeCloseTo(0, 5);
    expect(hitFrame(0)).toBe(0);
    expect(hitFrame(HIT_SECONDS)).toBe(7);
  });

  it('keeps the painted strip near its 3:1 aspect within a sane width', () => {
    expect(lashPlaneWidth(3.6)).toBeCloseTo(1.2, 5);
    expect(lashPlaneWidth(.5)).toBe(1);
    expect(lashPlaneWidth(20)).toBe(1.5);
  });

  it('wreath holds while marks arrive, withers after they stop, kicks on each shot', () => {
    expect(wreathAlpha(0, 0)).toBe(0);
    expect(wreathAlpha(2, 0)).toBeCloseTo(1, 5);
    expect(wreathAlpha(2, WREATH_FADE)).toBeCloseTo(0, 5);
    expect(wreathKick(.05)).toBeGreaterThan(1);
    expect(wreathKick(1)).toBe(1);
  });

  it('ships both flipbooks without depth writes so the hero draws over them', () => {
    for (const id of Object.values(MOCTRA_ATLAS)) {
      expect(ATLASES.get(id), id).toBeDefined();
      expect(ATLASES.get(id)?.depthWrite, id).toBe(false);
    }
  });

  it('routes the skill and the vine shots to h00A; the recipe no longer owns the hero', () => {
    expect(heroIdFromSkillId(MOCTRA_SKILL)).toBe(MOCTRA_ID);
    expect(heroIdFromSkillId(VINE_SKILL)).toBe(MOCTRA_ID);
    expect(TIER12_RECIPES.some(recipe => recipe.heroId === MOCTRA_ID)).toBe(false);
  });
});

describe('Mộc Tra snapshot tracker', () => {
  it('shows the frenzy wreath only on Mộc Tra while berserk lasts', () => {
    const tracker = new MoctraTracker(() => 0);
    expect(tracker.frenzy('m', { heroId: 'h00A', berserk: { remaining: 2 } })).toBe(true);
    expect(tracker.frenzy('m', { heroId: 'h00A', berserk: { remaining: 0 } })).toBe(false);
    expect(tracker.frenzy('m', { heroId: 'h00A' })).toBe(false);
    expect(tracker.frenzy('x', { heroId: 'h011', berserk: { remaining: 3 } })).toBe(false); // Hình Thiên has his own look
  });

  it('marks poison only when a Mộc Tra applied it (h03P also poisons)', () => {
    const tracker = new MoctraTracker(() => 0);
    const poison = { poison: { remaining: 1.5, casterId: 'u1' } };
    expect(tracker.poisoned('e', poison, 'h00A')).toBe(true);
    expect(tracker.poisoned('e', poison, 'h03P')).toBe(false);
    expect(tracker.poisoned('e', { poison: { remaining: 0, casterId: 'u1' } }, 'h00A')).toBe(false);
    expect(tracker.poisoned('e', {}, undefined)).toBe(false);
  });

  it('debug replay forces both states briefly, clear() drops them', () => {
    let now = 0;
    const tracker = new MoctraTracker(() => now);
    tracker.force(['m', 'e'], 5);
    expect(tracker.frenzy('m', { heroId: 'h00A' })).toBe(true);
    expect(tracker.poisoned('e', {}, undefined)).toBe(true);
    now = 5.1;
    expect(tracker.frenzy('m', { heroId: 'h00A' })).toBe(false);
    tracker.force(['m'], 5);
    tracker.clear();
    expect(tracker.frenzy('m', { heroId: 'h00A' })).toBe(false);
  });
});
