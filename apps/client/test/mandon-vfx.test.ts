import { describe, expect, it } from 'vitest';
import { MandonTracker } from '../src/battlefield-mandon.js';
import { ATLASES } from '../src/visual-kit-atlas-manifest.js';
import { heroIdFromSkillId } from '../src/visual-kit-hero.js';
import { BLOOM_AFTER_SECONDS, BLOOM_RELEASE_DELAY, bloomFormingFrame, bloomOpenFrame, HASTE_FADE, hasteAlpha, HEAL_DELAY, HEAL_RADIUS,
  HEAL_SECONDS, healFrame, MANDON_ATLAS, MANDON_ID, MANDON_SKILL, STREAM_EXTEND, STREAM_LIFE, streamAlpha, streamPlaneWidth, streamReach,
  waveAlpha, waveRadius, WAVE_SECONDS } from '../src/visual-mandon-timeline.js';
import { HERO_BY_ID } from '../../../content/catalog.js';

describe('Mẫu Đơn VFX timeline', () => {
  it('takes the heal radius and target cap from the catalog', () => {
    const ability = HERO_BY_ID[MANDON_ID]?.ability;
    const effect = ability as unknown as { id: string; effect: { radius: number; maxTargets: number } } | undefined;
    expect(effect?.id).toBe(MANDON_SKILL);
    expect(effect?.effect.radius).toBe(HEAL_RADIUS);
    expect(effect?.effect.maxTargets).toBe(4);
  });

  it('forms the buds over the windup and holds until the ability arrives', () => {
    expect(bloomFormingFrame(0, .25)).toBe(0);
    expect(bloomFormingFrame(.24, .25)).toBe(3);
    expect(bloomFormingFrame(3, .25)).toBe(3); // a late ability never plays the bloom early
  });

  it('opens the peony from frame 4 to the last atlas frame, never backwards', () => {
    expect(bloomOpenFrame(0)).toBe(4);
    expect(bloomOpenFrame(BLOOM_AFTER_SECONDS)).toBe(15);
    expect(bloomOpenFrame(10)).toBe(15);
    let previous = 4;
    for (let age = 0; age < BLOOM_AFTER_SECONDS; age += .01) {
      expect(bloomOpenFrame(age)).toBeGreaterThanOrEqual(previous);
      previous = bloomOpenFrame(age);
    }
    expect(BLOOM_RELEASE_DELAY).toBeLessThan(BLOOM_AFTER_SECONDS);
  });

  it('sweeps the petal wave out to the heal radius and fades it', () => {
    expect(waveRadius(0)).toBeLessThan(HEAL_RADIUS / 2);
    expect(waveRadius(WAVE_SECONDS)).toBeCloseTo(HEAL_RADIUS, 5);
    expect(waveAlpha(0)).toBeGreaterThan(0);
    expect(waveAlpha(WAVE_SECONDS)).toBeCloseTo(0, 5);
  });

  it('grows the petal stream head-first, blooms on the ally once it is out, then fades', () => {
    expect(streamReach(0)).toBe(0);
    expect(streamReach(STREAM_EXTEND)).toBeCloseTo(1, 5);
    expect(HEAL_DELAY).toBeLessThan(STREAM_EXTEND);
    expect(streamAlpha(STREAM_EXTEND)).toBe(1);
    expect(streamAlpha(STREAM_LIFE)).toBeCloseTo(0, 5);
    expect(healFrame(0)).toBe(0);
    expect(healFrame(HEAL_SECONDS)).toBe(7);
  });

  it('keeps the painted strip near its 3:1 aspect within a sane width', () => {
    expect(streamPlaneWidth(4.5)).toBeCloseTo(1.5, 5);
    expect(streamPlaneWidth(.5)).toBe(1.1);
    expect(streamPlaneWidth(20)).toBe(1.6);
  });

  it('haste ring holds while marks arrive and withers after they stop', () => {
    expect(hasteAlpha(0, 0)).toBe(0);
    expect(hasteAlpha(2, 0)).toBeCloseTo(.9, 5);
    expect(hasteAlpha(2, HASTE_FADE)).toBeCloseTo(0, 5);
  });

  it('ships both flipbooks without depth writes so heroes draw over them', () => {
    for (const id of Object.values(MANDON_ATLAS)) {
      expect(ATLASES.get(id), id).toBeDefined();
      expect(ATLASES.get(id)?.depthWrite, id).toBe(false);
    }
  });

  it('routes skill and basic-attack ids to h00F', () => {
    expect(heroIdFromSkillId(MANDON_SKILL)).toBe(MANDON_ID);
    expect(heroIdFromSkillId('trait-h00F')).toBe(MANDON_ID);
  });
});

describe('Mẫu Đơn snapshot tracker', () => {
  const skillHaste = { remaining: 3, amount: .35, attackBonus: .15 };

  it('rings allies holding the +35% / +15% buff her skill sets', () => {
    const tracker = new MandonTracker(() => 0);
    expect(tracker.haste('a', { heroId: 'h001', haste: skillHaste })).toBe(true);
    expect(tracker.haste('a', { heroId: 'h001', haste: { ...skillHaste, remaining: 0 } })).toBe(false);
    expect(tracker.haste('a', { heroId: 'h001' })).toBe(false);
  });

  it('ignores haste from other sources, including her permanent +12% passive', () => {
    const tracker = new MandonTracker(() => 0);
    expect(tracker.haste('a', { heroId: 'h001', haste: { remaining: .2, amount: .12 } })).toBe(false);
    expect(tracker.haste('a', { heroId: 'h001', haste: { remaining: 4, amount: .45 } })).toBe(false); // hasteAllyMax without attackBonus
    expect(tracker.haste('e', { haste: skillHaste })).toBe(false); // enemies never
  });

  it('debug replay forces the ring briefly, clear() drops it', () => {
    let now = 0;
    const tracker = new MandonTracker(() => now);
    tracker.force(['a'], 4.5);
    expect(tracker.haste('a', { heroId: 'h001' })).toBe(true);
    now = 4.6;
    expect(tracker.haste('a', { heroId: 'h001' })).toBe(false);
    tracker.force(['a'], 4.5);
    tracker.clear();
    expect(tracker.haste('a', { heroId: 'h001' })).toBe(false);
  });
});
