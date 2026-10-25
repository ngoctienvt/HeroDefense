import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { NUWA as N } from '../../../content/nuwa-design.js';
import palettes from '../src/visual-kit-palettes.json';
import { validatePalette } from '../src/visual-kit-palettes.js';
import { SPRAY_PRESETS } from '../src/visual-kit-spray.js';
import { NUWA_ART } from '../src/visual-nuwa-assets.js';
import { NuwaReplay } from '../src/visual-nuwa-replay.js';
import { DEFAULT_WINDUP, FALL_HEIGHT, FALL_SECONDS, hitFrame, IMPACT_FIRST, MARK_SECONDS, markAlpha, MAX_TARGETS,
  MAX_TARGETS_REDUCED, nearestFirst, rainDelay, rainLife, rainState, releaseFrame, releaseSeconds, RELEASE_SECONDS,
  riftFrame, targetBudget, wardAlpha, WARD_EXIT } from '../src/visual-nuwa-timeline.js';
import manifest from '../src/visual-tier6-art-manifest.json';

const SRC = resolve(__dirname, '../src');
const ASSETS = resolve(__dirname, '../public/assets');
const read = (file: string): string => readFileSync(resolve(SRC, file), 'utf8');
const sorted = (values: number[]): boolean => values.every((v, i) => i === 0 || v >= values[i - 1]);

describe('Nữ Oa timeline', () => {
  it('opens the rift across the 0.25 s windup, holds frame 10 if the ability is late, stills it for reduced motion', () => {
    const frames = [0, .06, .12, .18, .24].map(age => riftFrame(age, DEFAULT_WINDUP, false));
    expect(frames[0]).toBe(0);
    expect(sorted(frames)).toBe(true);
    expect(riftFrame(5, DEFAULT_WINDUP, false)).toBe(10);
    expect(riftFrame(0, DEFAULT_WINDUP, true)).toBe(riftFrame(.2, DEFAULT_WINDUP, true));
  });

  it('spins the stones free after the event, then mends the sky shut in frames 11–15 only', () => {
    expect(releaseFrame(0, false)).toBeLessThanOrEqual(10);
    expect(releaseFrame(.1, false)).toBeGreaterThanOrEqual(7);
    expect(releaseFrame(RELEASE_SECONDS - .01, false)).toBe(15);
    expect(releaseFrame(9, false)).toBe(15);
    expect(releaseFrame(0, true)).toBeGreaterThanOrEqual(11);
    expect(releaseSeconds(true)).toBeLessThan(releaseSeconds(false));
  });

  it('drops each stone from the sky (frames 0–3, accelerating) before it lands (frames 4–15)', () => {
    const start = rainState(0, false), mid = rainState(FALL_SECONDS / 2, false), land = rainState(FALL_SECONDS + .01, false);
    expect(start.falling).toBe(true);
    expect(start.lift).toBeCloseTo(FALL_HEIGHT);
    expect(start.frame).toBe(0);
    expect(mid.lift).toBeGreaterThan(FALL_HEIGHT / 2); // accelerates from rest: still high at half the time
    expect(land.falling).toBe(false);
    expect(land.lift).toBe(0);
    expect(land.frame).toBe(IMPACT_FIRST);
    expect(rainState(9, false).frame).toBe(15);
    const frames = [0, .05, .1, .15, .2, .3, .4, .55].map(age => rainState(age, false).frame);
    expect(sorted(frames)).toBe(true);
  });

  it('lands a reduced-motion stone at once on a single still, never in the fall frames', () => {
    const state = rainState(0, true);
    expect(state.falling).toBe(false);
    expect(state.lift).toBe(0);
    expect(state.frame).toBeGreaterThanOrEqual(IMPACT_FIRST);
    expect(rainLife(true)).toBeLessThan(rainLife(false));
    expect(rainDelay(30, true)).toBe(0);
  });

  it('hits farther monsters a beat later, never past the stagger cap', () => {
    expect(rainDelay(0, false)).toBe(0);
    expect(rainDelay(5, false)).toBeLessThan(rainDelay(10, false));
    expect(rainDelay(500, false)).toBeLessThanOrEqual(.14);
  });

  it('keeps the budget on the nearest monsters and a smaller one for reduced motion', () => {
    expect(targetBudget(true)).toBe(MAX_TARGETS_REDUCED);
    expect(targetBudget(false)).toBe(MAX_TARGETS);
    const ordered = nearestFirst([{ x: 9, z: 0 }, { x: 2, z: 0 }, { x: 5, z: 0 }], { x: 0, z: 0 });
    expect(ordered.map(p => p.x)).toEqual([2, 5, 9]);
  });

  it('pops the shatter through 8 frames and cools the stone mark to nothing', () => {
    expect(hitFrame(0, false)).toBe(0);
    expect(hitFrame(5, false)).toBe(7);
    expect(markAlpha(0, false)).toBe(0);
    expect(markAlpha(.1, false)).toBeGreaterThan(.7);
    expect(markAlpha(MARK_SECONDS, false)).toBe(0);
    expect(markAlpha(.5, false)).toBeLessThan(markAlpha(.2, false));
  });

  it('shows the ward from the snapshot only: fades in, holds, draws back over the last WARD_EXIT', () => {
    expect(N.blessingSeconds).toBe(6);
    expect(wardAlpha(N.blessingSeconds, 0)).toBe(0);
    expect(wardAlpha(N.blessingSeconds, 1)).toBe(1);
    expect(wardAlpha(WARD_EXIT, 3)).toBe(1);
    expect(wardAlpha(WARD_EXIT / 2, 3)).toBeCloseTo(.5);
    expect(wardAlpha(0, 3)).toBe(0);
  });
});

describe('Nữ Oa assets and kit', () => {
  it('maps every painted id to a manifest sheet whose webp exists, with the foreground pass over monsters', () => {
    for (const [id, { asset, pass }] of Object.entries(NUWA_ART)) {
      const meta = (manifest as Record<string, { url: string; frames: number; columns: number; rows: number }>)[asset];
      expect(meta, id).toBeDefined();
      expect(existsSync(resolve(ASSETS, meta.url.replace('/assets/', ''))), meta.url).toBe(true);
      expect(meta.columns * meta.rows).toBe(meta.frames);
      expect(['foreground', 'world']).toContain(pass);
    }
    // the stone rain and rift must read over monsters (the old module drew them under their targets)
    expect(NUWA_ART.rain.pass).toBe('foreground');
    expect(NUWA_ART.rift.pass).toBe('foreground');
    expect(NUWA_ART.hit.pass).toBe('foreground');
    expect(NUWA_ART.mark.pass).toBe('world');
  });

  it('ships a valid fivecolor palette and the five shard sprays it uses', () => {
    expect(validatePalette((palettes.materials as Record<string, unknown>).fivecolor)).toEqual([]);
    for (const name of ['jade', 'gold', 'frost', 'petal', 'earth']) expect(SPRAY_PRESETS).toHaveProperty(name);
  });

  it('drives the ward and shield from snapshots, never from a skill id, and routes revive to the recipients', () => {
    const fx = read('visual-effects.ts');
    expect(fx).toMatch(/markNuwaWard\(id: string, at: Vector3, remaining: number\)/);
    expect(fx).toMatch(/revive-h01C'\) this\.nuwa\.revive\(event, targets/);
    expect(read('battlefield.ts')).toMatch(/entity\.ward\?\.kind === 'five-color'/);
    // the rain is never drawn without server-listed monsters
    expect(read('visual-nuwa-rain.ts')).not.toMatch(/targets\.length \? targets : \[/);
  });
});

describe('Nữ Oa replay', () => {
  function run(kind: string) {
    const vfx = { cast: vi.fn(), impact: vi.fn(), blessing: vi.fn(), revive: vi.fn(), markWard: vi.fn() };
    const replay = new NuwaReplay(vfx);
    expect(replay.start(kind, new Vector3(10, 0, 4), false)).toBe(true);
    return { vfx, replay };
  }

  it('casts, resolves exactly once on monsters, blesses the allies and holds the ward for 6 s', () => {
    const { vfx, replay } = run('ultimate');
    expect(vfx.cast).toHaveBeenCalledTimes(1);
    for (let t = 0; t < 8; t += .05) replay.tick(.05);
    expect(vfx.impact).toHaveBeenCalledTimes(1);
    expect(vfx.impact.mock.calls[0][2]).toHaveLength(5);
    expect(vfx.blessing).toHaveBeenCalledTimes(1);
    const remaining = vfx.markWard.mock.calls.map(call => call[2] as number);
    expect(Math.max(...remaining)).toBeLessThanOrEqual(N.blessingSeconds);
    expect(Math.min(...remaining)).toBeGreaterThan(0);
    const calls = vfx.markWard.mock.calls.length;
    for (let t = 0; t < 2; t += .05) replay.tick(.05);
    expect(vfx.markWard.mock.calls.length).toBe(calls); // cleared after the ward ended
  });

  it('lobby resolves without a cast; hold only marks the ward; revive stands up the allies beside her', () => {
    const lobby = run('lobby');
    expect(lobby.vfx.cast).not.toHaveBeenCalled();
    lobby.replay.tick(.05);
    expect(lobby.vfx.impact).toHaveBeenCalledTimes(1);
    const hold = run('hold');
    hold.replay.tick(.05);
    expect(hold.vfx.impact).not.toHaveBeenCalled();
    expect(hold.vfx.markWard).toHaveBeenCalled();
    const revive = run('revive');
    expect(revive.vfx.revive).toHaveBeenCalledTimes(1);
    expect(revive.vfx.revive.mock.calls[0][1]).toHaveLength(2);
  });

  it('rejects unknown kinds and cancels later events on clear', () => {
    const vfx = { cast: vi.fn(), impact: vi.fn(), blessing: vi.fn(), revive: vi.fn(), markWard: vi.fn() };
    const replay = new NuwaReplay(vfx);
    expect(replay.start('nope', new Vector3(), false)).toBe(false);
    replay.start('ultimate', new Vector3(), false);
    replay.clear();
    replay.tick(1);
    expect(vfx.impact).not.toHaveBeenCalled();
  });
});
