import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { LUCNHI as L } from '../../../content/lucnhi-design.js';
import atlases from '../src/visual-kit-atlases.json';
import palettes from '../src/visual-kit-palettes.json';
import { SPRAY_PRESETS } from '../src/visual-kit-spray.js';
import { basicArrival, boundaryEnd, boundaryPose, BOUNDARY_RADIUS, BOUNDARY_RING_RATIO, BOUNDARY_SIZE, CAST_GRACE, DEFAULT_WINDUP,
  EXPOSED_EXTENT, EXPOSED_SIZE, exposedPose, hitAlpha, hitFrame, HIT_LIFE, MAX_PULSE_TARGETS, RETURN_SECONDS, returnAlpha,
  returnFrame, splitPose, SPLIT_LIFE, staffAlpha, staffProgress, STAFF_FADE, STAFF_FLIGHT, strikeDirection, vanishAlpha,
  vanishEnd, vanishFrame, VANISH_DISPERSE_SECONDS } from '../src/visual-lucnhi-timeline.js';
import { LucnhiReplay } from '../src/visual-lucnhi-replay.js';

const ROOT = resolve(__dirname, '../../..');
const source = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');
type AtlasEntry = { id: string; frames: number; tile: string; size: string; framesDir: string };

describe('Lục Nhĩ layout follows gameplay and the measured art', () => {
  it('sizes the boundary so the fitted arc radius is the server lock radius R6.5', () => {
    expect(BOUNDARY_RADIUS).toBe(6.5);
    expect(BOUNDARY_SIZE * BOUNDARY_RING_RATIO / 2).toBeCloseTo(L.strikeRadius);
    expect(EXPOSED_SIZE * EXPOSED_EXTENT).toBeCloseTo(2.1);
  });

  it('keeps every runtime asset, atlas entry (frame count, size) and the palette/spray on disk', () => {
    for (const file of ['vanish', 'return', 'hit', 'staff', 'boundary', 'weakness', 'weakness-split'])
      expect(existsSync(resolve(ROOT, `apps/client/public/assets/vfx-lucnhi-${file}.webp`))).toBe(true);
    const entries = (atlases as { atlases: AtlasEntry[] }).atlases;
    for (const id of ['lucnhi-vanish', 'lucnhi-return', 'lucnhi-hit']) {
      const atlas = entries.find(entry => entry.id === id);
      expect(atlas?.frames).toBe(8);
      expect(atlas?.tile).toBe('4x2');
      expect(atlas?.size).toBe('1280x640');
      expect(existsSync(resolve(ROOT, atlas?.framesDir ?? 'missing'))).toBe(true);
    }
    expect(Object.keys((palettes as { materials: object }).materials)).toContain('lucnhi');
    expect(SPRAY_PRESETS.lucnhi.capacity).toBeGreaterThan(0);
  });

  it('keeps the measured return-sheet repair on record: nothing dropped, no edge contact', () => {
    const inventory = JSON.parse(readFileSync(resolve(ROOT, 'assets/vfx-source/lucnhi/active-inventory.json'), 'utf8'));
    for (const key of ['vanish', 'return', 'hit']) {
      expect(inventory[key].ownedPixels).toBe(inventory[key].sourcePixels);
      expect(inventory[key].maxEdgeAlpha).toBe(0);
    }
  });
});

describe('Lục Nhĩ vanish and return', () => {
  it('gathers over the windup (frames 0-3), holds the peak while the resolve is late, then disperses (4-7) in 0.2 s', () => {
    expect([0, .07, .13, .2, .25].map(age => vanishFrame(age, DEFAULT_WINDUP))).toEqual([0, 1, 2, 3, 3]);
    expect(vanishFrame(3, DEFAULT_WINDUP)).toBe(3);
    const resolved = .25;
    expect(vanishFrame(.25, DEFAULT_WINDUP, resolved)).toBe(4);
    expect(vanishFrame(resolved + VANISH_DISPERSE_SECONDS - .001, DEFAULT_WINDUP, resolved)).toBe(7);
    expect(vanishEnd(DEFAULT_WINDUP, resolved)).toBeCloseTo(resolved + VANISH_DISPERSE_SECONDS);
  });

  it('cleans up a cast that never resolves after windup + grace, with no extra art', () => {
    expect(vanishEnd(DEFAULT_WINDUP)).toBeCloseTo(DEFAULT_WINDUP + CAST_GRACE);
    expect(vanishAlpha(DEFAULT_WINDUP + CAST_GRACE, DEFAULT_WINDUP, undefined, false)).toBe(0);
    expect(vanishAlpha(.1, DEFAULT_WINDUP, undefined, true)).toBe(1); // reduced motion: static until the fade
  });

  it('plays the return over 0.25 s on all eight frames, ending transparent', () => {
    expect(returnFrame(0)).toBe(0);
    expect(returnFrame(RETURN_SECONDS - .001)).toBe(7);
    expect(returnAlpha(RETURN_SECONDS, false)).toBe(0);
  });
});

describe('Lục Nhĩ lock boundary', () => {
  it('closes the two arcs into a ring over the windup and holds it only briefly after the resolve', () => {
    const start = boundaryPose(0, DEFAULT_WINDUP, undefined, false);
    const locked = boundaryPose(DEFAULT_WINDUP, DEFAULT_WINDUP, undefined, false);
    expect(start.spin).toBeCloseTo(Math.PI / 3);
    expect(locked.spin).toBeCloseTo(0);
    expect(locked.scale).toBeCloseTo(1);
    expect(boundaryPose(.1, DEFAULT_WINDUP, .25, true).spin).toBe(0); // reduced: static
    // The boundary is never a DPS zone: it is gone a fraction of a second after the resolve.
    expect(boundaryEnd(DEFAULT_WINDUP, .25)).toBeLessThan(.25 + .5);
    expect(boundaryPose(boundaryEnd(DEFAULT_WINDUP, .25) - .001, DEFAULT_WINDUP, .25, false).alpha).toBeLessThan(.05);
  });
});

describe('Lục Nhĩ pulses', () => {
  it('uses six distinct 60° directions, one per strikeIndex, clamped (never a fixed axis)', () => {
    const angles = [1, 2, 3, 4, 5, 6].map(i => Math.round(Math.atan2(strikeDirection(i).z, strikeDirection(i).x) * 180 / Math.PI));
    expect(new Set(angles).size).toBe(L.strikes);
    expect(strikeDirection(0)).toEqual(strikeDirection(1));
    expect(strikeDirection(99)).toEqual(strikeDirection(L.strikes));
    for (let i = 1; i <= 6; i++) expect(Math.hypot(strikeDirection(i).x, strikeDirection(i).z)).toBeCloseTo(1);
  });

  it('flies the cudgel in with acceleration, then fades; the hit sheet plays inside one pulse interval', () => {
    expect(staffProgress(0)).toBe(0);
    expect(staffProgress(STAFF_FLIGHT)).toBe(1);
    expect(staffProgress(STAFF_FLIGHT / 2)).toBeLessThan(.2);
    expect(staffAlpha(STAFF_FLIGHT + STAFF_FADE)).toBe(0);
    expect(STAFF_FLIGHT + HIT_LIFE).toBeLessThanOrEqual(L.strikeDuration / L.strikes + 1e-9);
    expect(hitFrame(0, false)).toBe(0);
    expect(hitFrame(HIT_LIFE - .001, false)).toBe(7);
    expect(hitFrame(.1, true)).toBe(1); // reduced: one still frame
    expect(hitAlpha(HIT_LIFE, false)).toBe(0);
    expect(MAX_PULSE_TARGETS).toBeGreaterThan(0);
  });

  it('times the basic hit by how far down the pierce line the target stands', () => {
    expect(basicArrival(0)).toBe(0);
    expect(basicArrival(L.waveLength)).toBeGreaterThan(basicArrival(L.waveLength / 2));
    expect(basicArrival(99)).toBe(basicArrival(L.waveLength));
  });
});

describe('Lục Nhĩ weakness seal', () => {
  it('counts age from the first frame (a re-mark never restarts the pop) and is still under reduced motion', () => {
    expect(exposedPose(0, 0, false).alpha).toBe(0);
    expect(exposedPose(.3, 0, false).scale).toBeCloseTo(1, 1);
    expect(exposedPose(.3, 0, true)).toEqual({ scale: 1, alpha: .9, spin: 0 });
  });

  it('splits into six strokes that travel outward and fade out', () => {
    expect(splitPose(0).travel).toBe(0);
    expect(splitPose(SPLIT_LIFE).travel).toBeGreaterThan(1);
    expect(splitPose(SPLIT_LIFE).alpha).toBe(0);
  });
});

describe('Lục Nhĩ replay follows the server sequence', () => {
  function run(kind: string) {
    const vfx = { cast: vi.fn((..._args: unknown[]) => true), ability: vi.fn((..._args: unknown[]) => true),
      mark: vi.fn((..._args: unknown[]) => undefined) };
    const replay = new LucnhiReplay(vfx as never);
    const at = new Vector3(10, 0, 4), origin = new Vector3(2, 0, 4);
    expect(replay.start(kind, at, false, origin)).toBe(true);
    return { vfx, replay };
  }

  it('rejects unknown kinds', () => {
    expect(new LucnhiReplay({ cast: vi.fn(), ability: vi.fn(), mark: vi.fn() } as never).start('nope', new Vector3(), false)).toBe(false);
  });

  it('casts, resolves after the windup, then fires exactly six pulses 0.25 s apart on the listed targets and holds the assault marker 1.5 s', () => {
    const { vfx, replay } = run('skill');
    expect(vfx.cast).toHaveBeenCalledTimes(1);
    const dt = 1 / 60;
    let t = 0;
    const pulseTimes: number[] = [];
    let lastAssault = 0;
    vfx.ability.mockImplementation((...args: unknown[]) => { const event = args[0] as { skillId: string }; if (event.skillId === 'shadow-hit-h03Y') pulseTimes.push(t); return true; });
    vfx.mark.mockImplementation((...args: unknown[]) => { if (args[0] === 'assault') lastAssault = t; return undefined; });
    for (; t < 8; t += dt) replay.tick(dt);
    const calls = vfx.ability.mock.calls.map(call => call[0] as { skillId: string; strikeIndex?: number });
    expect(calls.filter(event => event.skillId === 'skill-h03Y')).toHaveLength(1);
    const pulses = calls.filter(event => event.skillId === 'shadow-hit-h03Y');
    expect(pulses.map(event => event.strikeIndex)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const [i, time] of pulseTimes.entries()) expect(time).toBeCloseTo(DEFAULT_WINDUP + (i + 1) * .25, 1);
    for (const call of vfx.ability.mock.calls.filter(c => (c[0] as { skillId: string }).skillId === 'shadow-hit-h03Y'))
      expect((call[4] as { targets: Vector3[] }).targets).toHaveLength(3);
    expect(lastAssault).toBeCloseTo(DEFAULT_WINDUP + L.strikeDuration, 1);
  });

  it('keeps the weakness seals 5 s after the last pulse and then stops marking so they split', () => {
    const { vfx, replay } = run('skill');
    let t = 0, lastExposed = 0;
    vfx.mark.mockImplementation((...args: unknown[]) => { if (args[0] === 'exposed') lastExposed = t; return undefined; });
    for (; t < 12; t += 1 / 60) replay.tick(1 / 60);
    expect(lastExposed).toBeCloseTo(DEFAULT_WINDUP + L.strikeDuration + L.weaknessSeconds, 0);
  });

  it('plays the basic cudgel once with a direction and three targets; the exposed kind only marks seals', () => {
    const { vfx } = run('attack');
    expect(vfx.ability).toHaveBeenCalledTimes(1);
    const [event, , , , extra] = vfx.ability.mock.calls[0] as unknown as [{ skillId: string; direction: { x: number; z: number } }, unknown, unknown, unknown, { targets: Vector3[] }];
    expect(event.skillId).toBe('trait-h03Y');
    expect(Math.hypot(event.direction.x, event.direction.z)).toBeCloseTo(1);
    expect(extra.targets).toHaveLength(3);
    const exposed = run('exposed');
    exposed.replay.tick(.1);
    expect(exposed.vfx.mark).toHaveBeenCalledWith('exposed', 'replay-0', expect.any(Vector3), false);
    expect(exposed.vfx.cast).not.toHaveBeenCalled();
  });
});

describe('Lục Nhĩ wiring', () => {
  it('no longer routes h03Y through the legacy adapter, so nothing plays twice', () => {
    expect(source('visual-hero-adapters-late.ts')).not.toContain("'h03Y'");
    expect(source('visual-effects.ts')).toContain('this.heroKit.register(this.lucnhi)');
  });

  it('drives the assault and exposed markers from the snapshot loop and registers the replay', () => {
    const battlefield = source('battlefield.ts');
    expect(battlefield).toContain("markHero('h03Y', 'assault'");
    expect(battlefield).toContain("markHero('h03Y', 'exposed'");
    expect(battlefield).toContain("registerReplay('h03Y'");
    expect(battlefield).toContain('unregisterLucnhiReplay()');
  });

  it('draws pulses only on server target lists: no art at the assault point or the hidden caster', () => {
    const strikes = source('visual-lucnhi-strikes.ts');
    const main = source('visual-lucnhi.ts');
    expect(main).toContain('this.strikes.pulse(event.strikeIndex ?? 1, extra?.targets ?? [], reduced)');
    expect(strikes).toContain('for (const target of listed)');
    expect(strikes).not.toMatch(/pulse\([^)]*origin/);
  });

  it('keeps every module under 200 lines', () => {
    for (const file of ['visual-lucnhi.ts', 'visual-lucnhi-timeline.ts', 'visual-lucnhi-smoke.ts', 'visual-lucnhi-boundary.ts',
      'visual-lucnhi-strikes.ts', 'visual-lucnhi-exposed.ts', 'visual-lucnhi-replay.ts'])
      expect(source(file).split('\n').length).toBeLessThan(200);
  });
});
