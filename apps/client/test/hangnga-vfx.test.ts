import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HANGNGA as H } from '../../../content/hangnga-design.js';
import palettes from '../src/visual-kit-palettes.json';
import { validatePalette } from '../src/visual-kit-palettes.js';
import { DEFAULT_WINDUP, DROP_HEIGHT, dropDelay, dropPose, FOLD_FIRST, foreshorten, HOLD_FIRST, LATE_CAST_GRACE, moonPose,
  OPEN_FRAMES, revealFraction, revealUvs, SILK_CHEST, SILK_FLIGHT, SILK_SETTLE, silkLength, silkPoint, silkPose, UNWIND_SECONDS,
  wrapPose, WRAP_DELAY, MAX_FREEZE_SILKS } from '../src/visual-hangnga-timeline.js';
import { HangngaReplay } from '../src/visual-hangnga-replay.js';
import type { VisualHangnga } from '../src/visual-hangnga.js';

const ROOT = resolve(__dirname, '../../..');
const source = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');

describe('Hằng Nga layout follows gameplay and the measured art', () => {
  it('uses the design numbers: R9,5 heal ring, 2 s freeze, zone-wide freeze without a radius', () => {
    expect(H.allyRadius).toBe(9.5);
    expect(H.freezeSeconds).toBe(2);
    expect(source('visual-hangnga-moon.ts')).toContain('H.allyRadius');
    expect(source('visual-hangnga-freeze.ts')).not.toContain('allyRadius');
  });

  it('keeps the runtime art, measurement script, inventory and palette/spray on disk', () => {
    for (const file of ['vfx-hangnga-moon.webp', 'vfx-hangnga-silk.webp'])
      expect(existsSync(resolve(ROOT, 'apps/client/public/assets', file)), file).toBe(true);
    expect(existsSync(resolve(ROOT, 'assets/vfx-source/hangnga/process-art.py'))).toBe(true);
    const inventory = JSON.parse(readFileSync(resolve(ROOT, 'assets/vfx-source/hangnga/active-inventory.json'), 'utf8'));
    expect(inventory.moon.frames).toHaveLength(16);
    expect(inventory.moon.emptyFrames).toEqual([]);
    expect(inventory.silk.aspect).toBeCloseTo(5.9535, 3);
    expect(Object.keys(palettes.materials)).toContain('moon');
    expect(validatePalette(palettes.materials.moon)).toEqual([]);
    expect(source('visual-kit-spray.ts')).toMatch(/\n  moon: \{/);
  });
});

describe('moon sheet timing', () => {
  it('opens frames 0-4 across the windup, holds while the ability is late', () => {
    expect(moonPose(0, undefined, DEFAULT_WINDUP, false).frame).toBe(0);
    expect(moonPose(DEFAULT_WINDUP - .01, undefined, DEFAULT_WINDUP, false).frame).toBe(OPEN_FRAMES - 1);
    const held = [0, .09, .18].map(t => moonPose(DEFAULT_WINDUP + t, undefined, DEFAULT_WINDUP, false).frame);
    expect(held).toEqual([HOLD_FIRST, HOLD_FIRST + 1, HOLD_FIRST + 2]);
    expect(moonPose(DEFAULT_WINDUP + .09 - 1e-6, undefined, DEFAULT_WINDUP, false).frame).toBe(HOLD_FIRST);
    expect(moonPose(DEFAULT_WINDUP + .18 - 1e-6, undefined, DEFAULT_WINDUP, false).frame).toBe(HOLD_FIRST + 1);
  });

  it('folds frames 8-15 after the resolve and finishes', () => {
    expect(moonPose(.3, .3, DEFAULT_WINDUP, false).frame).toBe(FOLD_FIRST);
    expect(moonPose(5, .3, DEFAULT_WINDUP, false).done).toBe(true);
    expect(moonPose(.3 + .45, .3, DEFAULT_WINDUP, false).frame).toBe(15);
    expect(moonPose(.3 + .1, .3, DEFAULT_WINDUP, false).done).toBe(false);
  });

  it('cleans a cast without ability after windup + grace, with no fold', () => {
    const end = DEFAULT_WINDUP + LATE_CAST_GRACE;
    expect(moonPose(end - .01, undefined, DEFAULT_WINDUP, false).done).toBe(false);
    expect(moonPose(end, undefined, DEFAULT_WINDUP, false).done).toBe(true);
    expect(moonPose(end - .01, undefined, DEFAULT_WINDUP, false).frame).toBeLessThan(FOLD_FIRST);
  });

  it('keeps a single static frame in reduced motion', () => {
    const frames = [0, .1, .2, .4].map(t => moonPose(t, undefined, DEFAULT_WINDUP, true).frame);
    expect(new Set(frames).size).toBe(1);
  });
});

describe('silk flight', () => {
  it('reads: .34 s flight, lands then folds in .25 s, head arcs at chest height and ends on the ally', () => {
    expect(silkPose(0).progress).toBe(0);
    expect(silkPose(SILK_FLIGHT).progress).toBeCloseTo(1);
    expect(silkPose(SILK_FLIGHT - .01).arrived).toBe(false);
    expect(silkPose(SILK_FLIGHT).arrived).toBe(true);
    expect(silkPose(SILK_FLIGHT + SILK_SETTLE).done).toBe(true);
    const from = { x: 0, z: 0 }, to = { x: 8, z: 3 };
    expect(silkPoint(from, to, 0)).toEqual({ x: 0, y: SILK_CHEST, z: 0 });
    expect(silkPoint(from, to, 1).x).toBe(8);
    expect(silkPoint(from, to, .5).y).toBeGreaterThan(SILK_CHEST);
  });

  it('reveals the ribbon with UV and length together, never past the start point', () => {
    expect(revealFraction(.5, 4)).toBeCloseTo(.125);
    expect(revealFraction(10, 4)).toBe(1);
    expect(revealUvs([0, 0, 1, 0, 1, 1, 0, 1], .5)).toEqual([.5, 0, 1, 0, 1, 1, .5, 1]);
    expect(silkLength(.1)).toBeGreaterThan(0);
    expect(silkLength(30)).toBeLessThanOrEqual(4.4);
  });

  it('foreshortens along the view and never collapses to zero', () => {
    expect(foreshorten({ x: 1, y: 0, z: 0 }, { x: 0, y: -.669, z: -.743 })).toBeCloseTo(1);
    expect(foreshorten({ x: 0, y: -.669, z: -.743 }, { x: 0, y: -.669, z: -.743 })).toBeGreaterThanOrEqual(.45);
  });
});

describe('shield wrap has no timer', () => {
  it('appears after the silk lands and stays full while the shield shows', () => {
    expect(wrapPose(0, 0, false).alpha).toBe(0);
    expect(wrapPose(WRAP_DELAY + .3, 0, false).alpha).toBeCloseTo(1);
    expect(wrapPose(60, 0, false).alpha).toBeCloseTo(1);
  });

  it('unwinds in exactly .3 s once marks stop', () => {
    expect(UNWIND_SECONDS).toBe(.3);
    expect(wrapPose(5, .15, false).alpha).toBeCloseTo(.5);
    expect(wrapPose(5, UNWIND_SECONDS, false).alpha).toBe(0);
  });

  it('freezes the orbit in reduced motion', () => {
    expect(wrapPose(1, 0, true).offset).toEqual(wrapPose(3, 0, true).offset);
  });
});

describe('freeze drop', () => {
  it('falls from the sky, lands, fades; targets are staggered and capped', () => {
    expect(dropPose(0).height).toBe(DROP_HEIGHT);
    expect(dropPose(.22).height).toBeCloseTo(SILK_CHEST);
    expect(dropPose(.22).arrived).toBe(true);
    expect(dropPose(2).done).toBe(true);
    expect(dropDelay(0)).toBe(0);
    expect(dropDelay(100)).toBeLessThanOrEqual(.24);
    expect(MAX_FREEZE_SILKS).toBe(16);
  });
});

describe('event routing and source contracts', () => {
  const sources = ['visual-hangnga.ts', 'visual-hangnga-moon.ts', 'visual-hangnga-silk.ts', 'visual-hangnga-wrap.ts',
    'visual-hangnga-freeze.ts', 'visual-hangnga-timeline.ts', 'visual-hangnga-replay.ts'];

  it('handles cast, ability, basic and freeze events and ignores others', () => {
    const main = source('visual-hangnga.ts');
    expect(main).toContain('`skill-${H.id}`');
    expect(main).toContain('`trait-${H.id}`');
    expect(main).toContain('`freeze-${H.id}`');
    expect(main).toContain('default: return false');
    expect(main).not.toMatch(/bounceTargets/);
  });

  it('is registered as a HeroVfx and no longer a legacy adapter', () => {
    const effects = source('visual-effects.ts');
    expect(effects).toContain('this.heroKit.register(this.hangnga)');
    expect(effects).toContain('new VisualHangnga(scene, this.sharedStatus)');
    expect(source('visual-hero-adapters-war.ts')).not.toContain('h018');
    expect(source('battlefield.ts')).toContain("registerReplay('h018'");
  });

  it('passes every healed ally position to the module and marks the wrap from the shared shield flag', () => {
    const field = source('battlefield.ts');
    const start = field.indexOf("if (event.skillId === 'skill-h018') {");
    expect(start).toBeGreaterThan(0);
    const branch = field.slice(start, field.indexOf("if (event.skillId === 'skill-h00I'", start));
    expect(branch).toContain('event.targets');
    expect(branch).toContain('source.root.position, hits');
    expect(field).toContain("markHero('h018', 'shield'");
    expect(field).not.toContain('moonBlessed');
  });

  it('does not draw its own shield bubble or frozen sheet (shared layers) and never uses a fixed timer for the shield', () => {
    for (const file of sources) {
      const text = source(file);
      expect(text, file).not.toMatch(/sharedShield|SharedShield/);
      expect(text, file).not.toMatch(/\bconsole\./);
    }
    expect(source('visual-hangnga-wrap.ts')).not.toMatch(/shieldSeconds|5 s/);
  });

  it('draws the silk in the foreground pass (under heroes, over monsters)', () => {
    const main = source('visual-hangnga.ts');
    expect(main).toContain("'/assets/vfx-hangnga-moon.webp', { foreground: true }");
    expect(main).toContain("'/assets/vfx-hangnga-silk.webp', { foreground: true }");
  });
});

describe('replay', () => {
  function harness() {
    const calls: { kind: string; ids?: string[]; targets?: number; hasOrigin?: boolean }[] = [];
    const vfx = {
      cast: vi.fn((event: { skillId?: string }) => { calls.push({ kind: `cast:${event.skillId}` }); return true; }),
      ability: vi.fn((event: { skillId?: string; targets?: string[] }, _o: Vector3, _a: Vector3, _r: boolean, extra?: { targets: Vector3[]; hasOrigin: boolean }) => {
        calls.push({ kind: `ability:${event.skillId}`, ids: event.targets, targets: extra?.targets.length, hasOrigin: extra?.hasOrigin });
        return true;
      }),
      mark: vi.fn(),
    };
    return { calls, vfx, replay: new HangngaReplay(vfx as unknown as Pick<VisualHangnga, 'cast' | 'ability' | 'mark'>) };
  }

  it('skill: cast, then ability with the caster and two allies after the windup, then the freeze, markers then stop', () => {
    const { calls, vfx, replay } = harness();
    expect(replay.start('skill', new Vector3(0, 0, -6), false, new Vector3(0, 0, 0))).toBe(true);
    expect(calls[0].kind).toBe('cast:skill-h018');
    replay.tick(DEFAULT_WINDUP + .01);
    expect(calls[1]).toMatchObject({ kind: 'ability:skill-h018', targets: 3, hasOrigin: true });
    expect(calls[1].ids).toHaveLength(3);
    expect(calls[2]).toMatchObject({ kind: 'ability:freeze-h018', targets: 4 });
    expect(vfx.mark).toHaveBeenCalledWith('shield', expect.any(String), expect.any(Vector3), false);
    replay.tick(4.5);
    vfx.mark.mockClear();
    replay.tick(.1);
    expect(vfx.mark).not.toHaveBeenCalled();
  });

  it('lobby, attack, shield and freeze kinds run; unknown kinds are refused', () => {
    for (const kind of ['lobby', 'attack', 'shield', 'freeze']) {
      const { calls, replay } = harness();
      expect(replay.start(kind, new Vector3(0, 0, -6), false), kind).toBe(true);
      replay.tick(.01);
      expect(calls.length, kind).toBeGreaterThan(0);
    }
    expect(harness().replay.start('nope', new Vector3(), false)).toBe(false);
  });
});
