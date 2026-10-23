import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../content/catalog.js';
import { BaoquatuTracker } from '../src/battlefield-baoquatu.js';
import { ATLASES } from '../src/visual-kit-atlas-manifest.js';
import { heroIdFromSkillId } from '../src/visual-kit-hero.js';
import { BAOQUATU_ATLAS, BAOQUATU_ID, BAOQUATU_SKILL, BLAST_RADIUS, BURST_SECONDS, burstFrame, MIST_FADE, MIST_MAX_ALPHA, MIST_RADIUS,
  mistAlpha, mistPlaneSide, PLANT_GROW_SECONDS, PLANT_LOOP_FRAMES, PLANT_LOOP_START, PLANT_WITHER_SECONDS, plantFrame,
  plantWitherFrame, SEED_FLIGHT, seedHeight, seedProgress, telegraphRadius } from '../src/visual-baoquatu-timeline.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';

describe('Bảo Quả Tử VFX timeline', () => {
  it('takes the blast radius from the catalog and the mist radius from the plant rule', () => {
    const hero = HEROES.find(item => item.id === BAOQUATU_ID);
    expect(hero?.ability?.id).toBe(BAOQUATU_SKILL);
    expect(BLAST_RADIUS).toBe((hero?.ability?.effect as { radius: number }).radius);
    expect(MIST_RADIUS).toBeLessThan(BLAST_RADIUS);
  });

  it('routes skill ids to h03P', () => {
    expect(heroIdFromSkillId(BAOQUATU_SKILL)).toBe(BAOQUATU_ID);
  });

  it('flies the seed from the caster to the target along an arc that lands on the ground target', () => {
    expect(seedProgress(0)).toBe(0);
    expect(seedProgress(SEED_FLIGHT)).toBeCloseTo(1, 5);
    expect(seedHeight(SEED_FLIGHT / 2, 1)).toBeGreaterThan(seedHeight(0, 1));
    expect(seedHeight(SEED_FLIGHT, 1)).toBeCloseTo(1, 5);
  });

  it('tightens the telegraph ring over the windup and never grows it', () => {
    expect(telegraphRadius(0, .25)).toBeCloseTo(BLAST_RADIUS, 5);
    expect(telegraphRadius(.25, .25)).toBeLessThan(BLAST_RADIUS);
    expect(telegraphRadius(5, .25)).toBeCloseTo(telegraphRadius(.25, .25), 5);
  });

  it('plays the burst forwards over all 16 frames and holds the last one', () => {
    expect(burstFrame(0)).toBe(0);
    expect(burstFrame(BURST_SECONDS)).toBe(15);
    expect(burstFrame(10)).toBe(15);
    let previous = 0;
    for (let age = 0; age < BURST_SECONDS; age += .01) {
      expect(burstFrame(age)).toBeGreaterThanOrEqual(previous);
      previous = burstFrame(age);
    }
  });

  it('grows the plant once, then chomps in a loop inside frames 4-11, then withers on frames 12-15', () => {
    expect(plantFrame(0)).toBe(0);
    expect(plantFrame(PLANT_GROW_SECONDS - .001)).toBe(3);
    const seen = new Set<number>();
    for (let age = PLANT_GROW_SECONDS; age < PLANT_GROW_SECONDS + 3; age += .01) seen.add(plantFrame(age));
    expect(Math.min(...seen)).toBe(PLANT_LOOP_START);
    expect(Math.max(...seen)).toBe(PLANT_LOOP_START + PLANT_LOOP_FRAMES - 1);
    expect(plantWitherFrame(0)).toBe(12);
    expect(plantWitherFrame(PLANT_WITHER_SECONDS)).toBe(15);
    expect(plantWitherFrame(99)).toBe(15);
  });

  it('thins the mist out after the plant is gone and sizes the plane for the painted 92% fill', () => {
    expect(mistAlpha(5, 0)).toBeCloseTo(MIST_MAX_ALPHA, 5);
    expect(mistAlpha(5, MIST_FADE)).toBeCloseTo(0, 5);
    expect(mistAlpha(0, 0)).toBeCloseTo(0, 5);
    expect(mistPlaneSide(MIST_RADIUS) * .92).toBeCloseTo(MIST_RADIUS * 2, 5);
  });
});

describe('Bảo Quả Tử atlases and replay plants', () => {
  it('registers both flipbook atlases with the frame counts the timeline assumes', () => {
    expect(ATLASES.get(BAOQUATU_ATLAS.burst)?.frames).toBe(16);
    expect(ATLASES.get(BAOQUATU_ATLAS.plant)?.frames).toBe(16);
    expect(ATLASES.get(BAOQUATU_ATLAS.burst)?.depthWrite).toBe(false);
    expect(ATLASES.get(BAOQUATU_ATLAS.plant)?.depthWrite).toBe(false);
  });

  it('keeps a forced debug plant for its lifetime, then drops it', () => {
    let now = 100;
    const tracker = new BaoquatuTracker(() => now);
    tracker.forcePlant('p1', new Vector3(1, 0, 2), 0, 6);
    expect(tracker.plants().map(plant => plant.id)).toEqual(['p1']);
    now = 105.9;
    expect(tracker.plants()).toHaveLength(1);
    now = 106.1;
    expect(tracker.plants()).toHaveLength(0);
    tracker.forcePlant('p2', Vector3.Zero(), 0, 6);
    tracker.clear();
    expect(tracker.plants()).toHaveLength(0);
  });
});
