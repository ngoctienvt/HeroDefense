import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { KIMSI as K } from '../../../content/kimsi-design.js';
import atlases from '../src/visual-kit-atlases.json';
import palettes from '../src/visual-kit-palettes.json';
import { MarkTracker } from '../src/visual-kimsi-marks.js';
import { KimsiReplay, replayTargets } from '../src/visual-kimsi-replay.js';
import { BLEED_FADE_LIFE, bleedFadeFrame, bleedFrame, BURST_LIFE, burstAlpha, burstFrame, burstScale, CUT_FRAMES, CUT_LIFE,
  cutDelay, CUT_WAVE_SECONDS, DEFAULT_WINDUP, FEATHER_COUNT, gatherAlpha, gatherFeather, gatherFrame, mantleAtlasFrame,
  mantleFold, mantleStep, MARKER_GRACE, RING_END, RING_START, STORM_EXTENT, STORM_SIZE, strikeDirection, tangentYaw,
  THROW_SECONDS, throwFeather } from '../src/visual-kimsi-timeline.js';
import type { VisualKimsi } from '../src/visual-kimsi.js';

const ROOT = resolve(__dirname, '../../..');
const source = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');
type AtlasEntry = { id: string; frames: number; tile: string; framesDir: string };

describe('Kim Sí layout follows gameplay and the measured art', () => {
  it('spans the R6.5 gameplay radius with the measured storm extent and starts the feathers on the rim', () => {
    expect(K.stormRadius).toBe(6.5);
    expect(STORM_SIZE * STORM_EXTENT / 2).toBeCloseTo(K.stormRadius);
    expect(RING_START).toBe(K.stormRadius);
    expect(throwFeather(0, THROW_SECONDS).radius).toBeLessThanOrEqual(K.stormRadius);
  });

  it('keeps every runtime asset, the three square atlas entries and the palette on disk', () => {
    for (const file of ['storm', 'cut', 'bleed', 'feather', 'mantle'])
      expect(existsSync(resolve(ROOT, 'apps/client/public/assets', `vfx-kimsi-${file}.webp`))).toBe(true);
    const entries = (atlases as { atlases: AtlasEntry[] }).atlases;
    for (const [id, frames, tile] of [['kimsi-storm', 16, '4x4'], ['kimsi-cut', 8, '4x2'], ['kimsi-bleed', 16, '4x4']] as const) {
      const atlas = entries.find(entry => entry.id === id);
      expect(atlas?.frames).toBe(frames);
      expect(atlas?.tile).toBe(tile);
      expect(existsSync(resolve(ROOT, atlas?.framesDir ?? 'missing'))).toBe(true);
    }
    expect(Object.keys((palettes as { materials: object }).materials)).toContain('goldwing');
    expect(CUT_FRAMES).toBe(8);
  });
});

describe('Kim Sí storm timeline', () => {
  it('runs the gather frames across the windup and holds the last one while the resolve is late', () => {
    expect([0, .1, .2, DEFAULT_WINDUP, 1].map(age => gatherFrame(age, DEFAULT_WINDUP))).toEqual([0, 1, 3, 3, 3]);
    expect(gatherAlpha(DEFAULT_WINDUP + .02, DEFAULT_WINDUP)).toBe(1);
    expect(gatherAlpha(DEFAULT_WINDUP + .4, DEFAULT_WINDUP)).toBe(0); // unconfirmed cast fades out, no fake impact
  });

  it('swirls fourteen feathers from the rim to the caster in the windup and throws them back out inside the edge', () => {
    expect(FEATHER_COUNT).toBe(14);
    expect(gatherFeather(0, 0, DEFAULT_WINDUP).radius).toBeCloseTo(RING_START);
    expect(gatherFeather(0, DEFAULT_WINDUP, DEFAULT_WINDUP).radius).toBeCloseTo(RING_END);
    expect(gatherFeather(3, .1, DEFAULT_WINDUP).radius).toBeLessThan(RING_START);
    const radii = [0, .1, .2, THROW_SECONDS].map(age => throwFeather(2, age).radius);
    expect(radii).toEqual([...radii].sort((a, b) => a - b));
    expect(throwFeather(2, THROW_SECONDS).alpha).toBe(0);
    expect(Number.isFinite(tangentYaw(1.3))).toBe(true);
  });

  it('plays the cut/burst/dissipate rows once, in order, ending clear; reduced motion holds the peak frame', () => {
    expect(burstFrame(0, false)).toBe(4);
    expect(burstFrame(BURST_LIFE, false)).toBe(15);
    expect(burstAlpha(BURST_LIFE, false)).toBeCloseTo(0);
    expect(burstFrame(1, true)).toBe(6);
    expect(burstScale(1, false)).toBeCloseTo(1);
    for (let age = 0; age <= BURST_LIFE; age += .01) expect(burstScale(age, false)).toBeLessThan(1.02);
    expect(BURST_LIFE).toBeLessThan(.45);
  });

  it('sends one wave of cuts, nearest first, inside 0.12 s; reduced motion cuts at once', () => {
    expect(cutDelay(0, false)).toBe(0);
    expect(cutDelay(K.stormRadius * 2, false)).toBeCloseTo(CUT_WAVE_SECONDS);
    expect(cutDelay(2, false)).toBeLessThan(cutDelay(5, false));
    expect(cutDelay(5, true)).toBe(0);
    expect(CUT_LIFE).toBeLessThan(.4);
  });

  it('swings the second strike of a double strike to the other side of the first', () => {
    const dir = { x: 0, z: -1 };
    expect(strikeDirection(dir, false, false)).toEqual(dir);
    const a = strikeDirection(dir, true, false), b = strikeDirection(dir, true, true);
    expect(Math.sign(a.x)).toBe(-Math.sign(b.x));
    expect(Math.hypot(a.x, a.z)).toBeCloseTo(1);
  });
});

describe('Kim Sí berserk mantle and bleed follow the snapshot, not a timer', () => {
  it('maps layer steps into the 4x8 frenzy atlas with shoulders on even rows and feet on odd rows', () => {
    expect(mantleAtlasFrame('shoulder', 0)).toBe(0);
    expect(mantleAtlasFrame('feet', 0)).toBe(4);
    expect(mantleAtlasFrame('shoulder', 15)).toBe(6 * 4 + 3);
    expect(mantleAtlasFrame('feet', 7)).toBe(3 * 4 + 3);
    const all = new Set(['shoulder', 'feet'].flatMap(layer => Array.from({ length: 16 }, (_, k) => mantleAtlasFrame(layer as 'feet', k))));
    expect(all.size).toBe(32);
  });

  it('plays an intro then loops inside the clean gold steps (never the canvas-clipped steps of the feet layer)', () => {
    expect(mantleStep('shoulder', 0)).toBe(0);
    expect(mantleStep('shoulder', .1)).toBe(1);
    for (let age = .2; age < 3; age += .013) {
      const shoulder = mantleStep('shoulder', age), feet = mantleStep('feet', age, 2);
      expect(shoulder).toBeGreaterThanOrEqual(2); expect(shoulder).toBeLessThanOrEqual(11);
      expect(feet).toBeGreaterThanOrEqual(2); expect(feet).toBeLessThanOrEqual(9);
    }
  });

  it('folds in 0.3 s: fading, narrowing and dropping, on pale frames', () => {
    const start = mantleFold('shoulder', 0), end = mantleFold('shoulder', .3);
    expect(start.alpha).toBe(1);
    expect(end.alpha).toBe(0);
    expect(end.widthScale).toBeLessThan(start.widthScale);
    expect(end.drop).toBeGreaterThan(0);
    expect(mantleFold('feet', .3).step).toBeLessThanOrEqual(11);
  });

  it('shows a scar that appears, holds in a loop and fades only after the marker stops', () => {
    expect([0, .06, .12, .18].map(bleedFrame)).toEqual([0, 1, 2, 3]);
    for (let age = .2; age < 4; age += .017) {
      expect(bleedFrame(age)).toBeGreaterThanOrEqual(4);
      expect(bleedFrame(age)).toBeLessThanOrEqual(11);
    }
    expect(bleedFadeFrame(0)).toBe(12);
    expect(bleedFadeFrame(BLEED_FADE_LIFE)).toBe(15);
  });

  it('keeps an entry alive while the marker arrives, bridges a short gap, then folds and drops it', () => {
    const tracker = new MarkTracker(2, () => ({}));
    const at = new Vector3(1, 0, 2);
    const released: string[] = [];
    const visit = (entry: { foldAge?: number }, id: string): boolean => {
      if ((entry.foldAge ?? 0) >= .3) { released.push(id); return true; }
      return false;
    };
    expect(tracker.mark('a', at)).toBe(true);
    for (let i = 0; i < 30; i++) { tracker.mark('a', at); tracker.tick(.016, visit); }
    expect(tracker.size).toBe(1);
    tracker.tick(MARKER_GRACE / 2, visit); // one missed frame is bridged
    expect(tracker.size).toBe(1);
    for (let i = 0; i < 60; i++) tracker.tick(.016, visit); // marker gone for ~1 s
    expect(released).toEqual(['a']);
    expect(tracker.size).toBe(0);
  });

  it('caps the entries and resumes a folding one when its marker returns', () => {
    const tracker = new MarkTracker(1, () => ({}));
    const at = new Vector3();
    const entries: { foldAge?: number; age: number }[] = [];
    expect(tracker.mark('a', at)).toBe(true);
    expect(tracker.mark('b', at)).toBe(false);
    for (let i = 0; i < 12; i++) tracker.tick(.016, entry => { entries[0] = entry; return false; });
    expect(entries[0].foldAge).toBeDefined();
    tracker.mark('a', at);
    tracker.tick(.016, entry => { entries[0] = entry; return false; });
    expect(entries[0].foldAge).toBeUndefined();
  });
});

describe('Kim Sí replay drives the real event sequence', () => {
  function replayWith() {
    const vfx = { cast: vi.fn(() => true), ability: vi.fn(() => true), mark: vi.fn() };
    return { vfx, replay: new KimsiReplay(vfx as unknown as Pick<VisualKimsi, 'cast' | 'ability' | 'mark'>) };
  }

  it('casts, waits the windup, then resolves at the caster with five cut targets inside R6.5', () => {
    const { vfx, replay } = replayWith();
    const caster = new Vector3(3, 0, -2);
    expect(replay.start('skill', caster, false, caster)).toBe(true);
    expect(vfx.cast).toHaveBeenCalledTimes(1);
    replay.tick(DEFAULT_WINDUP / 2);
    expect(vfx.ability).not.toHaveBeenCalled();
    replay.tick(DEFAULT_WINDUP);
    expect(vfx.ability).toHaveBeenCalledTimes(1);
    const extra = (vfx.ability.mock.calls[0] as unknown[])[4] as { targets: Vector3[]; hasOrigin: boolean };
    expect(extra.hasOrigin).toBe(true);
    expect(extra.targets).toHaveLength(5);
    for (const target of replayTargets(caster)) expect(Math.hypot(target.x - caster.x, target.z - caster.z)).toBeLessThan(K.stormRadius);
  });

  it('lobby resolves without a cast; attack sends two strikes with a direction; unknown kinds are refused', () => {
    const { vfx, replay } = replayWith();
    const caster = new Vector3();
    replay.start('lobby', caster, false);
    replay.tick(.01);
    expect(vfx.cast).not.toHaveBeenCalled();
    expect(vfx.ability).toHaveBeenCalledTimes(1);
    replay.start('attack', caster, false);
    expect(vfx.ability).toHaveBeenCalledTimes(3);
    const strike = (vfx.ability.mock.calls[1] as unknown[])[0] as { direction?: { x: number; z: number }; skillId: string };
    expect(strike.skillId).toBe('trait-h016');
    expect(Math.hypot(strike.direction!.x, strike.direction!.z)).toBeCloseTo(1);
    expect(replay.start('nope', caster, false)).toBe(false);
  });

  it('keeps the berserk marker for 5.5 s and the bleed marker for 3 s, then stops both', () => {
    const { vfx, replay } = replayWith();
    replay.start('berserk', new Vector3(), false);
    const count = (kind: string): number => vfx.mark.mock.calls.filter(call => call[0] === kind).length;
    const run = (seconds: number): void => { for (let i = 0; i < Math.round(seconds * 10); i++) replay.tick(.1); };
    run(2); // ages 0.1..2.0
    expect(count('bleed')).toBeGreaterThan(0);
    expect(count('berserk')).toBeGreaterThan(0);
    run(1.5); // 3.5 s: past the 3 s bleed
    const bleedDone = count('bleed');
    run(1); // 4.5 s: berserk still on
    expect(count('bleed')).toBe(bleedDone);
    const berserkOn = count('berserk');
    expect(berserkOn).toBeGreaterThan(0);
    run(1.3); // 5.8 s: past the 5.5 s berserk
    const berserkDone = count('berserk');
    run(1); // the replay ends; nothing more arrives
    expect(count('berserk')).toBe(berserkDone);
  });
});

describe('Kim Sí wiring has a single owner and no fire ring', () => {
  it('removes the legacy adapter block and the goldenFeathers torus', () => {
    expect(source('visual-hero-adapters-myth.ts')).not.toContain('m.kimsi');
    expect(source('visual-hero-adapters-myth.ts')).not.toContain("heroId: 'h016'");
    expect(source('visual-effects.ts')).not.toContain('goldenFeathers');
    expect(source('visual-effects.ts')).toContain('this.heroKit.register(this.kimsi)');
    expect(source('battlefield.ts')).not.toContain('goldenFeathers');
  });

  it('drives the berserk and bleed markers from the snapshot remaining, not from actor.status', () => {
    const battlefield = source('battlefield.ts');
    expect(battlefield).toMatch(/kimsiBerserk = .*berserk\?\.remaining/);
    expect(battlefield).toMatch(/kimsiBleed = .*bleed\?\.remaining/);
    expect(battlefield).toContain("heroId === 'h016'");
    expect(battlefield).toContain("markHero('h016', 'bleed'");
    expect(battlefield).toContain("registerReplay('h016'");
  });

  it('draws the storm art flat and in the foreground pass, never a fire palette', () => {
    expect(source('visual-kimsi.ts')).toContain("foreground: true");
    expect(source('visual-kimsi-storm.ts')).toContain("acquire('storm', true)");
    expect(source('visual-kimsi-storm.ts')).not.toMatch(/'solar'|'lava'|'phoenix'/);
  });
});
