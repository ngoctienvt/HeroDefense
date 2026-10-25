import { describe, expect, it, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { FUXI } from '../../../content/fuxi-design.js';
import palettes from '../src/visual-kit-palettes.json';
import { validatePalette } from '../src/visual-kit-palettes.js';
import { SPRAY_PRESETS } from '../src/visual-kit-spray.js';
import { FUXI_ART } from '../src/visual-fuxi-assets.js';
import { FuxiReplay } from '../src/visual-fuxi-replay.js';
import { CAST_GRACE, CLOSE_SECONDS, compressAlpha, compressScale, COMPRESS_FLOOR, currentFrame, holdAlpha, isClosing,
  isLateZone, linkAlpha, linkHead, linkWidth, releaseFrame, retractAlpha, wakeAlpha, wakeChargeFrame, wakeImpactFrame,
  WAKE_SECONDS, wakeSeconds } from '../src/visual-fuxi-timeline.js';
import manifest from '../src/visual-tier6-art-manifest.json';

const SRC = resolve(__dirname, '../src');
const ASSETS = resolve(__dirname, '../public/assets');
const read = (file: string): string => readFileSync(resolve(SRC, file), 'utf8');
const sorted = (values: number[]): boolean => values.every((v, i) => i === 0 || v >= values[i - 1]);

describe('Phục Hy opening (wake)', () => {
  it('raises the pillars across the 0.25 s windup, holds frame 3 if the event is late, stills for reduced motion', () => {
    const frames = [0, .07, .14, .2, .249].map(age => wakeChargeFrame(age, .25, false));
    expect(frames[0]).toBe(0);
    expect(sorted(frames)).toBe(true);
    expect(wakeChargeFrame(5, .25, false)).toBe(3);
    expect(wakeChargeFrame(0, .25, true)).toBe(3);
  });

  it('plays frames 4–15 only after the ability event and ends on 15', () => {
    expect(wakeImpactFrame(0, false)).toBe(4);
    expect(wakeImpactFrame(WAKE_SECONDS + 1, false)).toBe(15);
    expect(wakeImpactFrame(0, true)).toBeGreaterThanOrEqual(4);
    expect(wakeSeconds(true)).toBeLessThan(WAKE_SECONDS);
  });

  it('hands the pillars over to the flat array and never passes full strength before the event', () => {
    expect(wakeAlpha(0, .25, undefined, false)).toBeLessThan(wakeAlpha(.25, .25, undefined, false));
    expect(wakeAlpha(9, .25, undefined, false)).toBeLessThanOrEqual(1);
    expect(wakeAlpha(0, .25, 0, false)).toBe(1);
    expect(wakeAlpha(0, .25, WAKE_SECONDS, false)).toBeCloseTo(0);
  });

  it('compresses the rim inward and never grows it past the server radius', () => {
    expect(compressScale(0)).toBe(1);
    for (const age of [0, .1, .2, .45, 3]) expect(compressScale(age)).toBeLessThanOrEqual(1);
    expect(compressScale(5)).toBeCloseTo(COMPRESS_FLOOR);
    expect(compressAlpha(5)).toBe(0);
    expect(CAST_GRACE).toBeGreaterThan(0);
  });
});

describe('Phục Hy hold, close and links', () => {
  it('follows the snapshot: late zones skip the opening, closing starts at the last 0.4 s', () => {
    expect(isLateZone(FUXI.duration - .1)).toBe(false);
    expect(isLateZone(FUXI.duration - 2)).toBe(true);
    expect(holdAlpha(0, false)).toBe(0);
    expect(holdAlpha(10, false)).toBe(1);
    expect(holdAlpha(.15, true)).toBe(1);
    expect(isClosing(CLOSE_SECONDS + .01)).toBe(false);
    expect(isClosing(CLOSE_SECONDS)).toBe(true);
    expect(releaseFrame(CLOSE_SECONDS, false)).toBe(0);
    expect(releaseFrame(.001, false)).toBe(7);
    expect(sorted([.4, .3, .2, .1, .01].map(r => releaseFrame(r, false)))).toBe(true);
  });

  it('loops the inward threads in range and stills them for reduced motion', () => {
    for (const t of [0, .5, 3.3, 99]) expect(currentFrame(t, false)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...[...Array(200)].map((_, i) => currentFrame(i * .031, false)))).toBe(7);
    expect(currentFrame(5, true)).toBe(0);
  });

  it('draws the rope on, lets go in the last 0.4 s and retracts a vanished pair', () => {
    expect(linkHead(0, false)).toBe(0);
    expect(linkHead(.3, false)).toBe(1);
    expect(linkHead(0, true)).toBe(1);
    expect(linkAlpha(0, 5)).toBe(0);
    expect(linkAlpha(1, 5)).toBe(1);
    expect(linkAlpha(1, .2)).toBeCloseTo(.5);
    expect(linkAlpha(1, 5, .25)).toBe(0);
    expect(retractAlpha(0)).toBe(1);
    expect(linkWidth(.5)).toBe(.6);
    expect(linkWidth(30)).toBe(1.2);
  });
});

describe('replay', () => {
  function run(kind: string) {
    const vfx = { cast: vi.fn(), impact: vi.fn(), markZone: vi.fn(), markLink: vi.fn() };
    const replay = new FuxiReplay(vfx);
    const point = new Vector3(10, 0, 4);
    expect(replay.start(kind, new Vector3(2, 0, 4), point, false)).toBe(true);
    return { vfx, replay, point };
  }

  it('casts at the locked point, resolves once with targets inside R9.5, then holds zone and links until 6 s are gone', () => {
    const { vfx, replay, point } = run('ultimate');
    expect(vfx.cast).toHaveBeenCalledTimes(1);
    expect(vfx.cast.mock.calls[0][1]).toEqual(point);
    for (let t = 0; t < 8; t += .05) replay.tick(.05);
    expect(vfx.impact).toHaveBeenCalledTimes(1);
    const targets = vfx.impact.mock.calls[0][3] as Vector3[];
    expect(targets.length).toBeGreaterThan(2);
    for (const target of targets) expect(Vector3.Distance(target, point)).toBeLessThanOrEqual(FUXI.radius);
    const remaining = vfx.markZone.mock.calls.map(call => call[3] as number);
    expect(remaining[0]).toBeLessThanOrEqual(FUXI.duration);
    expect(sorted([...remaining].reverse())).toBe(true);
    expect(vfx.markZone.mock.calls.every(call => call[2] === FUXI.radius)).toBe(true);
    expect(vfx.markLink.mock.calls.length).toBeGreaterThan(0);
    const afterEnd = vfx.markZone.mock.calls.length;
    for (let t = 0; t < 2; t += .05) replay.tick(.05);
    expect(vfx.markZone.mock.calls.length).toBe(afterEnd);
  });

  it('lobby resolves without a cast, hold enters mid-life, unknown kinds are refused and clear cancels', () => {
    const lobby = run('lobby');
    expect(lobby.vfx.cast).not.toHaveBeenCalled();
    lobby.replay.tick(.05);
    expect(lobby.vfx.impact).toHaveBeenCalled();
    const hold = run('hold');
    hold.replay.tick(.05);
    expect(hold.vfx.impact).not.toHaveBeenCalled();
    expect(hold.vfx.markZone.mock.calls[0][3]).toBeLessThan(FUXI.duration);
    const { vfx, replay } = run('ultimate');
    replay.clear();
    for (let t = 0; t < 3; t += .1) replay.tick(.1);
    expect(vfx.impact).not.toHaveBeenCalled();
    expect(new FuxiReplay(vfx).start('nope', Vector3.Zero(), Vector3.Zero(), false)).toBe(false);
  });
});

describe('assets, palette and routing', () => {
  it('uses only Codex sheets that exist in the tier-6 manifest and on disk', () => {
    for (const [id, { asset }] of Object.entries(FUXI_ART)) {
      const entry = (manifest as unknown as Record<string, { url: string; source: string; groundRadiusFactor: number }>)[asset];
      expect(entry, id).toBeDefined();
      expect(existsSync(resolve(ASSETS, entry.url.replace('/assets/', ''))), id).toBe(true);
      expect(entry.source).toMatch(/tier56-codex-art\/raw\//);
    }
    expect(new Set(Object.values(FUXI_ART).map(a => a.asset)).size).toBe(6);
  });

  it('has its own teal bagua palette (not the Mộc jade) and spray', () => {
    expect(validatePalette(palettes.materials.bagua)).toEqual([]);
    expect(palettes.materials.bagua.body).not.toEqual(palettes.materials.jade.body);
    expect(palettes.materials.bagua.body[2]).toBeGreaterThan(palettes.materials.jade.body[2] * 1.5);
    expect(SPRAY_PRESETS.bagua.capacity).toBeGreaterThan(0);
  });

  it('draws only through painted sheets and kit shaders, and keeps terrain passes under actors but ropes over monsters', () => {
    const files = readdirSync(SRC).filter(file => /^visual-fuxi.*\.ts$/.test(file));
    expect(files).toContain('visual-fuxi.ts');
    for (const file of files) {
      expect(read(file), file).not.toMatch(/StandardMaterial|MeshBuilder\.Create(?!Plane)|DynamicTexture|new ShaderMaterial/);
    }
    expect(FUXI_ART.rope.pass).toBe('foreground');
    expect(FUXI_ART.array.pass).toBe('world');
  });

  it('keeps the server radius: the rim and decals take the snapshot radius, never an invented one', () => {
    expect(read('visual-fuxi-wake.ts')).toContain('FUXI.radius');
    expect(read('visual-fuxi-array.ts')).toMatch(/zone\.radius/);
    expect(read('visual-fuxi-array.ts')).not.toContain('FUXI.radius');
  });

  it('routes the ultimate through the adapter with the real target list and the replay to the module', () => {
    expect(read('visual-hero-adapters-sage.ts')).toContain('m.fuxi.impact(c.event, c.at, c.reduced, c.targets)');
    expect(read('visual-effects.ts')).toContain("heroId === 'h01D') return this.fuxi.replay(");
  });
});
