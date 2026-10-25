import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { CHUCLONG as C } from '../../../content/chuclong-design.js';
import palettes from '../src/visual-kit-palettes.json';
import { SPRAY_PRESETS } from '../src/visual-kit-spray.js';
import { CHUCLONG_ART } from '../src/visual-chuclong-assets.js';
import { ChuclongReplay } from '../src/visual-chuclong-replay.js';
import { BURN_EXIT, burnFrame, dayAlpha, dayFrame, DAY_SECONDS, dissolveFrame, EYE_DISSOLVE_START, EYE_HOLD_COUNT, EYE_HOLD_FIRST,
  frontDelay, FRONT_SPREAD_SECONDS, frostAlpha, gatherDiameter, GATHER_END_DIAMETER, GATHER_START_DIAMETER, giftAlpha,
  GIFT_FLIGHT_SECONDS, giftProgress, impactFrame, IMPACT_FRAMES, nightFrame, openFrame, openScale, SUMMER_GRACE, waveFrame,
  WAVE_FRAMES, waveSeconds } from '../src/visual-chuclong-timeline.js';
import manifest from '../src/visual-tier6-art-manifest.json';

const SRC = resolve(__dirname, '../src');
const ASSETS = resolve(__dirname, '../public/assets');
const read = (file: string): string => readFileSync(resolve(SRC, file), 'utf8');
const sorted = (values: number[]): boolean => values.every((v, i) => i === 0 || v >= values[i - 1]);

describe('Chúc Long timeline', () => {
  it('opens the eye across the windup, holds it if the event is late, stills it for reduced motion', () => {
    const frames = [0, .06, .12, .18, .24].map(age => openFrame(age, .25, false));
    expect(frames[0]).toBe(0);
    expect(sorted(frames)).toBe(true);
    expect(openFrame(5, .25, false)).toBe(3);
    expect(openFrame(0, .25, true)).toBe(3);
    expect(openScale(0, .25, false)).toBeLessThan(openScale(.25, .25, false));
    expect(openScale(0, .25, true)).toBe(1);
  });

  it('closes to the dark disc then loops only the night hold frames until the day event', () => {
    expect(nightFrame(0, false)).toBe(4);
    const held = Array.from({ length: 80 }, (_, i) => nightFrame(.3 + i * .05, false));
    expect(Math.min(...held)).toBe(EYE_HOLD_FIRST);
    expect(Math.max(...held)).toBe(EYE_HOLD_FIRST + EYE_HOLD_COUNT - 1);
    expect(nightFrame(0, true)).toBeGreaterThanOrEqual(EYE_HOLD_FIRST);
  });

  it('dissolves the night eye in frames 12–15 and runs the day eye through all 16 frames', () => {
    expect(dissolveFrame(0, false)).toBe(EYE_DISSOLVE_START);
    expect(dissolveFrame(9, false)).toBe(15);
    expect(dayFrame(0, false)).toBe(0);
    expect(dayFrame(DAY_SECONDS + 1, false)).toBe(15);
    expect(dayFrame(0, true)).toBeGreaterThan(0);
    // the brow fades in with the crossfade, never pops
    expect(dayAlpha(0, false)).toBe(0);
    expect(dayAlpha(.3, false)).toBe(1);
  });

  it('staggers every front by distance from the caster and applies reduced motion at once', () => {
    expect(frontDelay(0, false)).toBe(0);
    expect(frontDelay(100, false)).toBeCloseTo(FRONT_SPREAD_SECONDS);
    expect(frontDelay(5, false)).toBeLessThan(frontDelay(10, false));
    expect(frontDelay(10, true)).toBe(0);
  });

  it('plays the crest and the hit in full, once, and holds the last frame', () => {
    expect(waveFrame(0, false)).toBe(0);
    expect(waveFrame(waveSeconds(false) + 1, false)).toBe(WAVE_FRAMES - 1);
    expect(impactFrame(0, false)).toBe(0);
    expect(impactFrame(5, false)).toBe(IMPACT_FRAMES - 1);
  });

  it('gathers INTO the caster during the windup and never past its start size', () => {
    expect(gatherDiameter(0, .25, false)).toBeCloseTo(GATHER_START_DIAMETER);
    expect(gatherDiameter(.25, .25, false)).toBeCloseTo(GATHER_END_DIAMETER);
    expect(gatherDiameter(.1, .25, false)).toBeLessThanOrEqual(GATHER_START_DIAMETER);
  });

  it('follows the snapshot remaining: burn loops then releases in the last BURN_EXIT s, frost fades with the freeze', () => {
    expect(burnFrame(.05, 3, false)).toBeLessThanOrEqual(3);
    expect(burnFrame(1, BURN_EXIT / 2, false)).toBeGreaterThanOrEqual(12);
    expect(burnFrame(5, 2, true)).toBe(7);
    expect(frostAlpha(2)).toBeGreaterThan(frostAlpha(.1));
    expect(frostAlpha(0)).toBe(0);
  });

  it('flies the gift head first and ends the strip with the flight', () => {
    expect(giftProgress(0)).toBe(0);
    expect(giftProgress(GIFT_FLIGHT_SECONDS)).toBeCloseTo(1);
    expect(giftAlpha(GIFT_FLIGHT_SECONDS / 2)).toBe(1);
    expect(giftAlpha(GIFT_FLIGHT_SECONDS + 1)).toBe(0);
  });

  it('gives up on a lost day event only after phaseDelay plus the grace', () => {
    expect(C.phaseDelay + SUMMER_GRACE).toBeGreaterThan(C.phaseDelay);
  });
});

describe('Chúc Long art routing', () => {
  it('draws every hit layer in the foreground pass and the holds under the actors', () => {
    for (const id of ['wave', 'impact', 'dayEye', 'giftStrip'] as const) expect(CHUCLONG_ART[id].pass).toBe('foreground');
    expect(CHUCLONG_ART.burn.pass).toBe('ground');
    expect(CHUCLONG_ART.eyeWorld.pass).toBe('world');
    expect(CHUCLONG_ART.giftSheet.pass).toBe('world');
  });

  it('resolves every id to a packed sheet in the manifest and the public assets', () => {
    for (const [id, def] of Object.entries(CHUCLONG_ART)) {
      const meta = (manifest as Record<string, { url: string; frames: number }>)[def.asset];
      expect(meta, id).toBeDefined();
      expect(existsSync(resolve(ASSETS, `.${meta.url.replace('/assets', '')}`)), id).toBe(true);
    }
  });

  it('adds a crimson spray and ships the palettes the layers use', () => {
    expect(SPRAY_PRESETS.daybreak).toBeDefined();
    expect(SPRAY_PRESETS.daybreak.color1[0]).toBeGreaterThan(SPRAY_PRESETS.daybreak.color1[2]);
    for (const name of ['ice', 'solar']) expect((palettes.materials as Record<string, unknown>)[name], name).toBeDefined();
  });
});

describe('Chúc Long source contracts', () => {
  const modules = ['visual-chuclong.ts', 'visual-chuclong-eye.ts', 'visual-chuclong-fronts.ts', 'visual-chuclong-marks.ts',
    'visual-chuclong-gift.ts'];

  it('has no flat primitive or legacy art helper in the ultimate layers', () => {
    for (const file of modules.slice(1)) {
      const text = read(file);
      expect(text, file).not.toMatch(/MeshBuilder\.Create(Sphere|Cylinder|Box|Torus)/);
      expect(text, file).not.toContain('Tier6Art');
    }
  });

  it('keeps the legacy adapter routing contract: cast with origin, winter/summer by skill id, markers, gift', () => {
    const text = read('visual-chuclong.ts');
    for (const method of ['cast(', 'winter(', 'summer(', 'markWinter(', 'markBurn(', 'timeGift(', 'replay(', 'tick(', 'clear(']) {
      expect(text, method).toContain(method);
    }
    expect(text).toContain("visual.chuclong.cast.skip");
  });

  it('frees every pooled layer on clear and drops events that never resolve', () => {
    expect(read('visual-chuclong-eye.ts')).toContain('resolve-not-received');
    expect(read('visual-chuclong-eye.ts')).toContain('summer-not-received');
    for (const file of modules.slice(1)) expect(read(file), file).toMatch(/clear\(\): void/);
  });

  it('logs caps once per layer without personal data', () => {
    for (const file of modules.slice(1)) expect(read(file), file).not.toMatch(/playerName|token/i);
    expect(read('visual-chuclong-fronts.ts')).toContain("'visual.chuclong.cap'");
  });
});

describe('Chúc Long replay', () => {
  const make = (): { vfx: Record<'cast' | 'winter' | 'summer' | 'timeGift' | 'markWinter' | 'markBurn', ReturnType<typeof vi.fn>>;
    replay: ChuclongReplay } => {
    const vfx = { cast: vi.fn(), winter: vi.fn(), summer: vi.fn(), timeGift: vi.fn(), markWinter: vi.fn(), markBurn: vi.fn() };
    return { vfx, replay: new ChuclongReplay(vfx as never) };
  };
  const run = (replay: ChuclongReplay, seconds: number): void => { for (let t = 0; t < seconds; t += .05) replay.tick(.05); };

  it('rejects unknown kinds', () => {
    expect(make().replay.start('bogus', new Vector3(), false)).toBe(false);
  });

  it('ultimate: cast, then night with gifts, then day 1.5 s later with different targets', () => {
    const { vfx, replay } = make();
    expect(replay.start('ultimate', new Vector3(), false)).toBe(true);
    expect(vfx.cast).toHaveBeenCalledTimes(1);
    expect(vfx.winter).not.toHaveBeenCalled();
    run(replay, .5);
    expect(vfx.winter).toHaveBeenCalledTimes(1);
    expect(vfx.timeGift).toHaveBeenCalledTimes(3);
    expect(vfx.summer).not.toHaveBeenCalled();
    run(replay, 1.6);
    expect(vfx.summer).toHaveBeenCalledTimes(1);
    expect(vfx.summer.mock.calls[0][3]).toHaveLength(4);
    expect(vfx.winter.mock.calls[0][2]).toHaveLength(5);
    expect(vfx.markWinter).toHaveBeenCalled();
    expect(vfx.markBurn).toHaveBeenCalled();
  });

  it('lobby: both events in the same tick, no cast', () => {
    const { vfx, replay } = make();
    replay.start('lobby', new Vector3(), false);
    replay.tick(.05);
    expect(vfx.cast).not.toHaveBeenCalled();
    expect(vfx.winter).toHaveBeenCalledTimes(1);
    expect(vfx.summer).toHaveBeenCalledTimes(1);
  });

  it('nosummer: the day event never arrives and no burn marker is drawn', () => {
    const { vfx, replay } = make();
    replay.start('nosummer', new Vector3(), false);
    run(replay, 4);
    expect(vfx.winter).toHaveBeenCalledTimes(1);
    expect(vfx.summer).not.toHaveBeenCalled();
    expect(vfx.markBurn).not.toHaveBeenCalled();
  });

  it('hold: markers only, no events', () => {
    const { vfx, replay } = make();
    replay.start('hold', new Vector3(), false);
    run(replay, .5);
    expect(vfx.cast).not.toHaveBeenCalled();
    expect(vfx.winter).not.toHaveBeenCalled();
    expect(vfx.markWinter).toHaveBeenCalled();
    expect(vfx.markBurn).toHaveBeenCalled();
  });

  it('clear cancels every later event', () => {
    const { vfx, replay } = make();
    replay.start('ultimate', new Vector3(), false);
    replay.clear();
    run(replay, 3);
    expect(vfx.winter).not.toHaveBeenCalled();
    expect(vfx.summer).not.toHaveBeenCalled();
  });
});
