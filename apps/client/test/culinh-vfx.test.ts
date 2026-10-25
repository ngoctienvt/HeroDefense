import { describe, expect, it } from 'vitest';
import { CulinhTracker } from '../src/battlefield-culinh.js';
import { ATLASES } from '../src/visual-kit-atlas-manifest.js';
import { heroIdFromSkillId } from '../src/visual-kit-hero.js';
import { TIER12_RECIPES } from '../src/visual-kit-recipes-tier12.js';
import { BULWARK_DIAMETER, BULWARK_FADE_OUT, bulwarkAlpha, bulwarkScale, CULINH_ATLAS, CULINH_ID, CULINH_SKILL,
  bulwarkKick, GUARD_HANDOFF, GUARD_SECONDS, guardFrame, QUAKE_AFTER_SECONDS, QUAKE_RADIUS, quakeFormingFrame, quakeImpactFrame,
  QUAKE_SKILL, SLAM_DELAY, SLOW_SECONDS, WARD_RADIUS, WORN_ALPHA, wornBlend } from '../src/visual-culinh-timeline.js';

describe('Cự Linh Thần VFX timeline', () => {
  it('uses the server radii: 3.0 hammer quake inside the 4.5 ward reach', () => {
    expect(QUAKE_RADIUS).toBe(3);
    expect(WARD_RADIUS).toBe(4.5);
    expect(BULWARK_DIAMETER / 2).toBeLessThan(QUAKE_RADIUS);
  });

  it('gathers over the windup and holds the hammer overhead until the ability arrives', () => {
    expect(quakeFormingFrame(0, .25)).toBe(0);
    expect(quakeFormingFrame(.24, .25)).toBe(3);
    expect(quakeFormingFrame(3, .25)).toBe(3); // a late ability never plays the slam early
  });

  it('plays the slam from frame 4 to the last atlas frame, never backwards', () => {
    expect(quakeImpactFrame(0)).toBe(4);
    expect(quakeImpactFrame(QUAKE_AFTER_SECONDS)).toBe(15);
    expect(quakeImpactFrame(10)).toBe(15);
    let previous = 4;
    for (let age = 0; age < QUAKE_AFTER_SECONDS; age += .01) {
      expect(quakeImpactFrame(age)).toBeGreaterThanOrEqual(previous);
      previous = quakeImpactFrame(age);
    }
    expect(SLAM_DELAY).toBeLessThan(QUAKE_AFTER_SECONDS);
  });

  it('runs the guard plates over all 8 frames and hands over to the ring before they finish', () => {
    expect(guardFrame(0)).toBe(0);
    expect(guardFrame(GUARD_SECONDS)).toBe(7);
    expect(GUARD_HANDOFF).toBeLessThan(GUARD_SECONDS);
  });

  it('bulwark ring appears as the plates settle, holds while marks arrive, fades once they stop', () => {
    expect(bulwarkAlpha(0, 0)).toBe(0);
    expect(bulwarkAlpha(2, 0)).toBeCloseTo(1, 5);
    expect(bulwarkAlpha(2, BULWARK_FADE_OUT)).toBeCloseTo(0, 5);
    expect(bulwarkScale(2)).toBeCloseTo(1, 1);
    expect(bulwarkScale(0)).toBeLessThan(1);
  });

  it('dims the ring once the shield is gone and rings it on each absorbed blow', () => {
    expect(wornBlend(0)).toBe(0);
    expect(wornBlend(1)).toBeCloseTo(1, 5);
    expect(WORN_ALPHA).toBeLessThan(1);
    expect(bulwarkKick(.05)).toBeGreaterThan(1);
    expect(bulwarkKick(1)).toBe(1);
  });

  it('ships both flipbooks without depth writes so the ally draws over them', () => {
    for (const id of Object.values(CULINH_ATLAS)) {
      expect(ATLASES.get(id), id).toBeDefined();
      expect(ATLASES.get(id)?.depthWrite, id).toBe(false);
    }
  });

  it('routes the skill to h00E; the recipe no longer owns the hero', () => {
    expect(heroIdFromSkillId(CULINH_SKILL)).toBe(CULINH_ID);
    expect(heroIdFromSkillId(QUAKE_SKILL)).toBe(CULINH_ID); // server event `quake-h00E` lists the slowed enemies
    expect(TIER12_RECIPES.some(recipe => recipe.heroId === CULINH_ID)).toBe(false);
  });
});

describe('Cự Linh Thần ward tracker', () => {
  const ward = { ward: { remaining: 3 } };

  it('shows the ring on recipients while the snapshot ward holds and drops it after', () => {
    let now = 0;
    const tracker = new CulinhTracker(() => now);
    tracker.record({ id: 1, kind: 'ability', skillId: CULINH_SKILL, targets: ['a', 'b'] } as never);
    expect(tracker.ward('a', ward)).toBe(true);
    expect(tracker.ward('b', ward)).toBe(true);
    expect(tracker.ward('a', { ward: { remaining: 0 } })).toBe(false);
    expect(tracker.ward('a', ward)).toBe(false); // ended once: the grant is forgotten
    expect(tracker.ward('c', ward)).toBe(false);
    now = 99;
  });

  it('waits for a snapshot that trails the event, but gives up after the grace period', () => {
    let now = 0;
    const tracker = new CulinhTracker(() => now);
    tracker.record({ id: 1, kind: 'ability', skillId: CULINH_SKILL, targets: ['a'] } as never);
    expect(tracker.ward('a', {})).toBe(false);
    now = .5;
    expect(tracker.ward('a', ward)).toBe(true); // snapshot caught up
    tracker.record({ id: 2, kind: 'ability', skillId: CULINH_SKILL, targets: ['b'] } as never);
    now = 5;
    expect(tracker.ward('b', {})).toBe(false);
    expect(tracker.ward('b', ward)).toBe(false); // grant expired unseen
  });

  it('ignores wards of another hero kind and wards Cự Linh never gave', () => {
    const tracker = new CulinhTracker(() => 0);
    tracker.record({ id: 1, kind: 'ability', skillId: CULINH_SKILL, targets: ['a'] } as never);
    expect(tracker.ward('a', { ward: { remaining: 3, kind: 'black-water' } })).toBe(false);
    expect(tracker.ward('x', ward)).toBe(false);
  });

  it('debug replay forces the ring briefly, clear() drops it', () => {
    let now = 0;
    const tracker = new CulinhTracker(() => now);
    tracker.force(['m'], 4.5);
    expect(tracker.ward('m', {})).toBe(true);
    now = 4.6;
    expect(tracker.ward('m', {})).toBe(false);
    tracker.force(['m'], 4.5);
    tracker.clear();
    expect(tracker.ward('m', {})).toBe(false);
  });
});

describe('Cự Linh Thần quake slow and shield phases', () => {
  it('marks the enemies the server listed for the slow, then lets go', () => {
    let now = 0;
    const tracker = new CulinhTracker(() => now);
    tracker.recordSlow({ id: 1, kind: 'trait', skillId: QUAKE_SKILL, targets: ['e1', 'e2'] });
    expect(tracker.slowed('e1')).toBe(true);
    expect(tracker.slowed('e3')).toBe(false);
    now = SLOW_SECONDS + .01;
    expect(tracker.slowed('e1')).toBe(false);
  });

  it('reads shield absorption and breakage from the snapshot', () => {
    const tracker = new CulinhTracker(() => 0);
    expect(tracker.shieldPhase('a', 400)).toEqual({ hit: false, worn: false });
    expect(tracker.shieldPhase('a', 400)).toEqual({ hit: false, worn: false });
    expect(tracker.shieldPhase('a', 250)).toEqual({ hit: true, worn: false });
    expect(tracker.shieldPhase('a', 0)).toEqual({ hit: true, worn: true });
    expect(tracker.shieldPhase('a', 0)).toEqual({ hit: false, worn: true });
  });
});
