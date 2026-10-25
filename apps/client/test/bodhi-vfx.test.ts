import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { BO_DE } from '../../../content/new-divine-design.js';
import atlases from '../src/visual-kit-atlases.json';
import { accentAllowed, bloomPose, BLOOM_OPEN, CANOPY_ALPHA, CANOPY_LIFE, DEFAULT_WINDUP, gatherPose, HEAL_RADIUS, hitFrame,
  HIT_FRAMES, HIT_LIFE, LINK_ASPECT, LINK_FLIGHT, LINK_HOLD, LINK_LENGTH, LINK_LIFE, linkHeight, linkProgress, linkShape,
  MAX_LINKS, PAIR_ANCHOR_Y, PAIR_INTRO, PAIR_LOOP_COUNT, PAIR_LOOP_FIRST, PAIR_OUTRO, PAIR_OUTRO_FIRST, pairExit, pairPose,
  RELEASE_FRAMES, RELEASE_LIFE, releaseFrame, releasePose, REDUCED_PAIR_FRAME } from '../src/visual-bodhi-timeline.js';
import { BodhiReplay } from '../src/visual-bodhi-replay.js';
import type { VisualBodhi } from '../src/visual-bodhi.js';

const ROOT = resolve(__dirname, '../../..');
const source = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');
type Atlas = { id: string; frames: number; tile: string; framesDir: string };
type Inventory = Record<string, { emptyFrames?: number[]; lostPixels?: number; groundLine?: number; aspect?: number;
  loopDiffRaw?: number; loopDiffAligned?: number }>;

describe('Bồ Đề layout follows gameplay and the measured art', () => {
  it('reads the heal radius and windup from the design file', () => {
    expect(HEAL_RADIUS).toBe(10);
    expect(DEFAULT_WINDUP).toBe(BO_DE.windup);
    expect(BO_DE.buffSeconds).toBe(5);
  });

  it('keeps every runtime asset and its atlas manifest entry on disk', () => {
    for (const file of ['vfx-bodhi-awakening.webp', 'vfx-bodhi-release.webp', 'vfx-bodhi-pair.webp', 'vfx-bodhi-hit.webp',
      'vfx-bodhi-link.webp']) expect(existsSync(resolve(ROOT, 'apps/client/public/assets', file)), file).toBe(true);
    const entries = (atlases as { atlases: Atlas[] }).atlases;
    const expected: [string, number, string][] = [['bodhi-awakening', 16, '4x4'], ['bodhi-release', RELEASE_FRAMES, '4x2'],
      ['bodhi-pair', 16, '4x4'], ['bodhi-hit', HIT_FRAMES, '4x2']];
    for (const [id, frames, tile] of expected) {
      const atlas = entries.find(entry => entry.id === id);
      expect(atlas?.frames, id).toBe(frames);
      expect(atlas?.tile, id).toBe(tile);
      expect(existsSync(resolve(ROOT, atlas?.framesDir ?? 'missing')), id).toBe(true);
    }
  });

  it('matches the measured inventory: nothing clipped, no empty frame, the loop jump removed, link aspect', () => {
    const inventory = JSON.parse(readFileSync(resolve(ROOT, 'assets/vfx-source/bo-de/active-inventory.json'), 'utf8')) as Inventory;
    for (const key of ['awakening', 'release', 'pair', 'hit']) {
      expect(inventory[key].lostPixels, key).toBe(0);
      expect(inventory[key].emptyFrames, key).toEqual([]);
    }
    expect(inventory.pair.groundLine).toBeCloseTo(PAIR_ANCHOR_Y, 3);
    expect(inventory.pair.loopDiffAligned).toBeLessThan((inventory.pair.loopDiffRaw ?? 0) * .6);
    expect(inventory.link.aspect).toBeCloseTo(LINK_ASPECT, 3);
  });
});

describe('Bồ Đề canopy', () => {
  it('gathers over the windup growing frame by frame and holds the last frame while the server is late', () => {
    const frames = [0, .1, .2, .3, .35].map(age => gatherPose(age, DEFAULT_WINDUP, false).frame);
    expect(frames[0]).toBe(0);
    expect(frames.at(-1)).toBe(3);
    expect([...frames].sort((a, b) => a - b)).toEqual(frames);
    expect(gatherPose(5, DEFAULT_WINDUP, false).frame).toBe(3);
    expect(gatherPose(.3, DEFAULT_WINDUP, false).scale).toBeGreaterThan(gatherPose(.05, DEFAULT_WINDUP, false).scale);
    expect(gatherPose(.1, DEFAULT_WINDUP, true)).toEqual(gatherPose(.3, DEFAULT_WINDUP, true));
  });

  it('opens in about .2 s with an overshoot, continuing the gather pose, then scatters and thins to nothing', () => {
    expect(BLOOM_OPEN).toBeCloseTo(.2);
    expect(bloomPose(0, false).frame).toBe(4);
    expect(bloomPose(BLOOM_OPEN - .01, false).frame).toBe(7);
    expect(bloomPose(BLOOM_OPEN + .01, false).frame).toBe(8);
    expect(bloomPose(0, false).scale).toBeCloseTo(gatherPose(DEFAULT_WINDUP, DEFAULT_WINDUP, false).scale, 3);
    expect(bloomPose(0, false).alpha).toBeCloseTo(gatherPose(DEFAULT_WINDUP, DEFAULT_WINDUP, false).alpha, 3);
    const peak = Math.max(...[0, .02, .04, .06, .08, .1, .12, .15, .2].map(age => bloomPose(age, false).scale));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.15);
    expect(bloomPose(CANOPY_LIFE, false).alpha).toBeCloseTo(0);
    expect(bloomPose(CANOPY_LIFE + 1, false).frame).toBe(15);
    expect(CANOPY_ALPHA).toBeLessThan(.9); // sparse: monsters stay readable under it
  });

  it('reduced motion holds one still frame and fades out', () => {
    expect(bloomPose(0, true).frame).toBe(bloomPose(.2, true).frame);
    expect(bloomPose(.32, true).alpha).toBeCloseTo(0);
  });
});

describe('Bồ Đề links', () => {
  it('whips out head first with acceleration, holds, then folds into the ally', () => {
    expect(linkProgress(0)).toBe(0);
    expect(linkProgress(LINK_FLIGHT)).toBeCloseTo(1);
    expect(linkProgress(LINK_FLIGHT * .25)).toBeGreaterThan(.25);
    expect(linkShape(0, 10).length).toBe(0);
    expect(linkShape(LINK_FLIGHT, 20).length).toBeCloseTo(LINK_LENGTH);
    expect(linkShape(LINK_FLIGHT, 3).length).toBeCloseTo(3);
    expect(linkShape(LINK_FLIGHT + LINK_HOLD - .001, 20).alpha).toBeCloseTo(1, 1);
    expect(linkShape(LINK_LIFE, 20).alpha).toBeCloseTo(0);
    expect(linkShape(LINK_LIFE, 20).length).toBeLessThan(linkShape(LINK_FLIGHT, 20).length * .25);
  });

  it('arcs between the two heights and falls straight with no arc when there is no origin', () => {
    expect(linkHeight(0, 1.7, 1.4, 1.1)).toBeCloseTo(1.7);
    expect(linkHeight(1, 1.7, 1.4, 1.1)).toBeCloseTo(1.4);
    expect(linkHeight(.5, 1.7, 1.4, 1.1)).toBeCloseTo(2.65);
    expect(linkHeight(.5, 8, 1.4, 0)).toBeCloseTo(4.7);
  });

  it('links at most two allies and only the ones the server chose', () => {
    expect(MAX_LINKS).toBe(2);
    const links = source('visual-bodhi-links.ts');
    expect(links).toContain('allies.slice(0, MAX_LINKS)');
    expect(links).toContain('placePin(');
    expect(links).toContain('resetStrip(');
    expect(source('visual-bodhi.ts')).toContain('this.links.cast(center, hasOrigin, extra?.targets ?? [], reduced)');
  });
});

describe('Bồ Đề blessing, leaf pair and double-hit accent', () => {
  it('opens the fruit once per recipient over eight frames', () => {
    expect(RELEASE_LIFE).toBeCloseTo(.4);
    expect(releaseFrame(0)).toBe(0);
    expect(releaseFrame(RELEASE_LIFE - .001)).toBe(RELEASE_FRAMES - 1);
    expect(releasePose(RELEASE_LIFE, false).alpha).toBeCloseTo(0);
    expect(releasePose(0, true).frame).toBe(releasePose(.1, true).frame);
  });

  it('plays the double-hit sheet once and counts two events of one source inside .15 s as one double strike', () => {
    expect(hitFrame(0)).toBe(0);
    expect(hitFrame(HIT_LIFE + 1)).toBe(HIT_FRAMES - 1);
    expect(accentAllowed(undefined, 3)).toBe(true);
    expect(accentAllowed(3, 3.05)).toBe(false);
    expect(accentAllowed(3, 3.2)).toBe(true);
  });

  it('derives the leaving from the server remaining, never from a client timer, and never goes backwards by itself', () => {
    expect(pairExit(5, 0)).toBe(0);
    expect(pairExit(PAIR_OUTRO, 0)).toBe(0);
    expect(pairExit(PAIR_OUTRO / 2, 0)).toBeCloseTo(.5);
    expect(pairExit(0, 0)).toBe(1);
    expect(pairExit(undefined, 0)).toBe(0);
    expect(pairExit(undefined, PAIR_OUTRO / 2)).toBeCloseTo(.5);
    expect(pairExit(undefined, PAIR_OUTRO)).toBe(1);
    expect(pairExit(2, 10)).toBe(1);
  });

  it('grows in, loops the eight aligned frames without leaving them, then splits and pulls in', () => {
    expect(pairPose(0, 0, false).frame).toBe(0);
    expect(pairPose(PAIR_INTRO - .01, 0, false).frame).toBe(3);
    const seen = new Set<number>();
    for (let age = PAIR_INTRO; age < PAIR_INTRO + 3; age += .01) seen.add(pairPose(age, 0, false).frame);
    expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: PAIR_LOOP_COUNT }, (_, i) => PAIR_LOOP_FIRST + i));
    expect(pairPose(PAIR_INTRO + 8 * .09 + .01, 0, false).frame).toBe(PAIR_LOOP_FIRST);
    expect(pairPose(2, .1, false)).toEqual({ frame: PAIR_OUTRO_FIRST, alpha: 1 });
    expect(pairPose(2, .5, false).frame).toBe(PAIR_OUTRO_FIRST + 2);
    expect(pairPose(2, .99, false).alpha).toBeLessThan(.1);
    expect(pairPose(2, 0, true).frame).toBe(REDUCED_PAIR_FRAME);
    expect(pairPose(2, .5, true).alpha).toBeCloseTo(.5);
  });

  it('never plays the accent for Bồ Đề himself and drives the pair from the snapshot remaining', () => {
    const vfx = source('visual-bodhi.ts');
    expect(vfx.match(/this\.blessing\.accent\(/g)).toHaveLength(1);
    expect(vfx.slice(vfx.indexOf('ability(event'), vfx.indexOf('mark(kind'))).not.toContain('accent(');
    const battlefield = source('battlefield.ts');
    expect(battlefield).toMatch(/source\?\.bodhiBlessed[\s\S]{0,200}!target\.heroId[\s\S]{0,260}bodhiAccent\(/);
    expect(battlefield).toContain('markBodhiBlessing(id, actor.root.position, actor.bodhiRemaining ?? 0)');
    expect(battlefield).toContain('entity.bodhiBlessing?.remaining');
  });
});

describe('Bồ Đề routing and replay', () => {
  it('registers as a direct HeroVfx after the legacy adapters and no longer as a divine adapter', () => {
    const effects = source('visual-effects.ts');
    expect(effects).toContain('this.heroKit.register(this.bodhi)');
    expect(effects.indexOf('this.heroKit.register(this.bodhi)')).toBeGreaterThan(effects.indexOf('registerLegacyHeroes('));
    expect(source('visual-hero-adapters-late.ts')).not.toContain("'h03X'");
    const battlefield = source('battlefield.ts');
    expect(battlefield).toContain("registerReplay('h03X'");
    expect(battlefield).toContain("markHero('h03X', 'caster'");
    expect(battlefield).not.toContain("markDivineAura(id, 'bodhi'");
    expect(battlefield).toMatch(/skill-h03X' && event\.kind === 'ability'[\s\S]{0,420}chosen/);
  });

  it('cleans a cancelled cast after its windup with no impact', () => {
    const canopy = source('visual-bodhi-canopy.ts');
    expect(canopy).toContain('windup + CAST_GRACE');
    expect(canopy).toContain('visual.bodhi.cast.timeout');
  });

  it('replays cast → blessings → ability with the caster as origin, a lobby resolve without one, a basic whisk and the buff', () => {
    const cast = vi.fn((..._args: unknown[]) => true), ability = vi.fn((..._args: unknown[]) => true);
    const markBlessing = vi.fn(), accent = vi.fn(() => true);
    const replay = new BodhiReplay({ cast, ability, markBlessing, accent } as unknown as Pick<VisualBodhi,
      'cast' | 'ability' | 'markBlessing' | 'accent'>);
    const caster = new Vector3(0, 0, 0), point = new Vector3(0, 0, -6);
    expect(replay.start('nope', point, false, caster)).toBe(false);
    expect(replay.start('skill', point, false, caster)).toBe(true);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability).not.toHaveBeenCalled();
    replay.tick(DEFAULT_WINDUP + .01);
    expect(ability).toHaveBeenCalledTimes(3);
    expect((ability.mock.calls[0][0] as { skillId: string }).skillId).toBe('blessing-h03X');
    expect((ability.mock.calls[2][0] as { skillId: string }).skillId).toBe('skill-h03X');
    expect(ability.mock.calls[2][4]).toMatchObject({ hasOrigin: true });
    expect((ability.mock.calls[2][4] as { targets: unknown[] }).targets).toHaveLength(2);
    expect(markBlessing).toHaveBeenCalledTimes(2);
    expect(markBlessing.mock.calls[0][2]).toBeLessThan(BO_DE.buffSeconds);
    replay.tick(BO_DE.buffSeconds + 1);
    const marks = markBlessing.mock.calls.length;
    replay.tick(.1);
    expect(markBlessing).toHaveBeenCalledTimes(marks);

    replay.start('lobby', point, false, caster);
    replay.tick(.01);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability.mock.calls[5][4]).toMatchObject({ hasOrigin: false });

    ability.mockClear(); accent.mockClear();
    replay.start('attack', point, false, caster);
    expect(ability).toHaveBeenCalledTimes(1);
    expect((ability.mock.calls[0][0] as { skillId: string }).skillId).toBe('trait-h03X');

    ability.mockClear();
    replay.start('blessing', point, false, caster);
    expect(ability).toHaveBeenCalledTimes(2);
    replay.tick(.81);
    expect(accent).toHaveBeenCalledTimes(1);
  });
});
