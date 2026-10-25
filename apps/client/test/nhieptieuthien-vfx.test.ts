import { describe, expect, it } from 'vitest';
import { NhiepTracker } from '../src/battlefield-nhieptieuthien.js';
import { ATLASES } from '../src/visual-kit-atlas-manifest.js';
import { heroIdFromSkillId } from '../src/visual-kit-hero.js';
import { DEFAULT_WINDUP, FLECK_GATE, HEAL_DELAY, HEAL_RADIUS, HEAL_SECONDS, healFrame, MAX_HEAL_TARGETS, MUSIC_AFTER_SECONDS,
  MUSIC_RELEASE_DELAY, musicFormingFrame, musicOpenFrame, NHIEP_ATLAS, NHIEP_ID, NHIEP_SKILL, RIBBON_EXTEND, RIBBON_LIFE,
  ribbonAlpha, ribbonPlaneWidth, ribbonReach, SHELL_FADE, SHELL_GROW_SECONDS, SHIELD_ATTACK_SLOW, SHIELD_SECONDS, shellAlpha,
  shellFrame, shellScale } from '../src/visual-nhieptieuthien-timeline.js';
import { HERO_BY_ID } from '../../../content/catalog.js';

describe('Nhiếp Tiểu Thiến VFX timeline', () => {
  it('takes radius and target cap from the catalog', () => {
    const effect = HERO_BY_ID[NHIEP_ID]?.ability as unknown as { id: string; effect: { radius: number; maxTargets: number; overhealShield: boolean } } | undefined;
    expect(effect?.id).toBe(NHIEP_SKILL);
    expect(effect?.effect.radius).toBe(HEAL_RADIUS);
    expect(effect?.effect.maxTargets).toBe(MAX_HEAL_TARGETS);
    expect(effect?.effect.overhealShield).toBe(true);
  });

  it('routes the skill id to h03O and nothing else', () => {
    expect(heroIdFromSkillId(NHIEP_SKILL)).toBe(NHIEP_ID);
    expect(heroIdFromSkillId('trait-h03O')).toBe(NHIEP_ID);
  });

  it('forms the wreath over the windup and holds until the ability arrives', () => {
    expect(musicFormingFrame(0, DEFAULT_WINDUP)).toBe(0);
    expect(musicFormingFrame(.24, DEFAULT_WINDUP)).toBe(3);
    expect(musicFormingFrame(3, DEFAULT_WINDUP)).toBe(3);
  });

  it('opens the wreath from frame 4 to the last atlas frame, never backwards', () => {
    expect(musicOpenFrame(0)).toBe(4);
    expect(musicOpenFrame(MUSIC_AFTER_SECONDS)).toBe(15);
    expect(musicOpenFrame(10)).toBe(15);
    let previous = 4;
    for (let age = 0; age < MUSIC_AFTER_SECONDS; age += .01) {
      expect(musicOpenFrame(age)).toBeGreaterThanOrEqual(previous);
      previous = musicOpenFrame(age);
    }
    expect(MUSIC_RELEASE_DELAY).toBeLessThan(MUSIC_AFTER_SECONDS);
  });

  it('grows the ribbon head first, then thins and fades it before it ends', () => {
    expect(ribbonReach(0)).toBe(0);
    expect(ribbonReach(RIBBON_EXTEND)).toBe(1);
    expect(ribbonAlpha(RIBBON_EXTEND * .5)).toBe(1);
    expect(ribbonAlpha(RIBBON_LIFE)).toBeCloseTo(0, 5);
    expect(ribbonPlaneWidth(1)).toBeGreaterThanOrEqual(1.15);
    expect(ribbonPlaneWidth(100)).toBeLessThanOrEqual(1.7);
  });

  it('blooms the heal on arrival through all 8 frames', () => {
    expect(HEAL_DELAY).toBeLessThanOrEqual(RIBBON_EXTEND);
    expect(healFrame(0)).toBe(0);
    expect(healFrame(HEAL_SECONDS)).toBe(7);
    expect(healFrame(5)).toBe(7);
  });

  it('plays the shell grow frames 0-2 once, then loops frames 3-7 seamlessly', () => {
    expect(shellFrame(0)).toBe(0);
    expect(shellFrame(SHELL_GROW_SECONDS - .001)).toBe(2);
    const seen = new Set<number>();
    for (let age = SHELL_GROW_SECONDS; age < SHIELD_SECONDS; age += .01) {
      const frame = shellFrame(age);
      expect(frame).toBeGreaterThanOrEqual(3);
      expect(frame).toBeLessThanOrEqual(7);
      seen.add(frame);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7]);
  });

  it('keeps the shell fully visible while marks arrive and thins it after the last mark', () => {
    expect(shellAlpha(SHELL_GROW_SECONDS, 0)).toBeCloseTo(1, 5);
    expect(shellAlpha(2, SHELL_FADE)).toBeCloseTo(0, 5);
    expect(shellAlpha(2, SHELL_FADE / 2)).toBeGreaterThan(0);
    expect(shellAlpha(2, SHELL_FADE / 2)).toBeLessThan(1);
    expect(shellScale(10)).toBeCloseTo(1, 5);
    expect(FLECK_GATE).toBeGreaterThan(0);
  });

  it('matches the combat numbers: 5 s shield, 40% attack slow', () => {
    expect(SHIELD_SECONDS).toBe(5);
    expect(SHIELD_ATTACK_SLOW).toBe(.4);
  });

  it('declares the three atlases with the painted-art manifest settings', () => {
    expect(ATLASES.get(NHIEP_ATLAS.music)).toMatchObject({ frames: 16, depthWrite: false });
    expect(ATLASES.get(NHIEP_ATLAS.heal)).toMatchObject({ frames: 8, depthWrite: false });
    expect(ATLASES.get(NHIEP_ATLAS.frost)).toMatchObject({ frames: 8, depthWrite: false });
  });
});

describe('NhiepTracker', () => {
  it('shows the shell only while the snapshot holds frostShield', () => {
    const tracker = new NhiepTracker(() => 0);
    expect(tracker.shield('a', { heroId: 'h00F' })).toBe(false);
    expect(tracker.shield('a', { heroId: 'h00F', frostShield: { remaining: 3 } })).toBe(true);
    expect(tracker.shield('a', { heroId: 'h00F', frostShield: { remaining: 0 } })).toBe(false);
    expect(tracker.shield('m', { frostShield: { remaining: 3 } })).toBe(false); // monsters never show it
  });

  it('a heal that overflowed nothing (no frostShield) never shows the shell', () => {
    expect(new NhiepTracker(() => 0).shield('a', { heroId: 'h003' })).toBe(false);
  });

  it('forced replay shells expire', () => {
    let now = 0;
    const tracker = new NhiepTracker(() => now);
    tracker.force(['a'], SHIELD_SECONDS);
    expect(tracker.shield('a', { heroId: 'h003' })).toBe(true);
    now = SHIELD_SECONDS + .1;
    expect(tracker.shield('a', { heroId: 'h003' })).toBe(false);
    tracker.force(['a'], 5);
    tracker.clear();
    expect(tracker.shield('a', { heroId: 'h003' })).toBe(false);
  });
});
