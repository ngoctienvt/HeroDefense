import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { PANGU as P } from '../../../content/pangu-design.js';
import { getPalette } from '../src/visual-kit-palettes.js';
import { PanguReplay, replayQuakePoints, type PanguReplayTarget } from '../src/visual-pangu-replay.js';
import { PANGU_ART, chargeFrame, craterAlpha, croppedUvs, flowFrame, groundStrip, impactFrame, quakeDelay, quakeFrame,
  QUAKE_STAGGER, riftAlpha, riftLayout, riftReveal, telegraphFrame } from '../src/visual-pangu-timeline.js';

vi.stubGlobal('location', { search: '' });

const publicAsset = (url: string) => resolve(__dirname, '../public', url.replace(/^\//, ''));

describe('Bàn Cổ ultimate timeline', () => {
  it('gathers across the windup, holds the axe mark, then dissolves after the server resolves', () => {
    expect(chargeFrame(0, P.windup)).toBe(0);
    expect(chargeFrame(P.windup, P.windup)).toBe(3);
    expect(chargeFrame(P.windup * 5, P.windup)).toBe(3);        // held while waiting for the event
    expect(chargeFrame(.4, P.windup, .4)).toBe(4);
    expect(chargeFrame(.4 + .31, P.windup, .4)).toBe(7);
    expect(chargeFrame(.4 + .4, P.windup, .4)).toBe(-1);
  });

  it('drops the axe shadow without ever reaching the strike frames before the event', () => {
    const frames = [0, .1, .2, P.windup, 2].map(t => telegraphFrame(t, P.windup));
    expect(Math.max(...frames)).toBe(2);
    expect(frames).toEqual([...frames].sort((a, b) => a - b));
  });

  it('strikes on frame 3, settles through 15 and ends', () => {
    expect(impactFrame(0)).toBe(3);
    expect(impactFrame(.4)).toBeGreaterThan(impactFrame(.1));
    expect(impactFrame(1.1)).toBeLessThanOrEqual(15);
    expect(impactFrame(5)).toBe(-1);
  });

  it('fades the crater in fast and out slowly', () => {
    expect(craterAlpha(0)).toBe(0);
    expect(craterAlpha(.1)).toBe(1);
    expect(craterAlpha(1)).toBe(1);
    expect(craterAlpha(10)).toBe(0);
  });

  it('ripples the cataclysm cracks instead of popping them together', () => {
    const delays = Array.from({ length: 12 }, (_, i) => quakeDelay(i));
    expect(Math.max(...delays)).toBeLessThan(QUAKE_STAGGER);
    expect(new Set(delays.map(d => d.toFixed(4))).size).toBe(12);
    expect(quakeFrame(-.1)).toBe(0);
    expect(quakeFrame(.2)).toBeGreaterThan(0);
    expect(quakeFrame(5)).toBe(-1);
  });

  it('loops the rift flow and fades the fissure on the server remaining time', () => {
    expect(new Set(Array.from({ length: 40 }, (_, i) => flowFrame(i / 10))).size).toBe(8);
    expect(flowFrame(-3)).toBe(0);
    expect(riftAlpha(P.riftSeconds)).toBe(1);
    expect(riftAlpha(.1)).toBeLessThan(1);
    expect(riftAlpha(0)).toBe(0);
    expect(riftReveal(0)).toBe(0);
    expect(riftReveal(1)).toBe(1);
  });
});

describe('Bàn Cổ rift placement matches the server geometry', () => {
  // KitPainted ground plane: rotation (π/2, yaw, 0). Local +X must point along the cast direction.
  const axisAfter = (yaw: number, local: Vector3) =>
    Vector3.TransformNormal(local, Matrix.RotationYawPitchRoll(yaw, Math.PI / 2, 0));

  it.each([{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }, { x: Math.SQRT1_2, z: Math.SQRT1_2 }])(
    'runs u=0 at the caster and u=1 at 14 units along $x,$z', dir => {
      const strip = groundStrip({ x: 3, z: -2 }, dir, 0, P.riftLength, P.riftWidth);
      const along = axisAfter(strip.yaw, new Vector3(1, 0, 0));
      expect(along.x).toBeCloseTo(dir.x); expect(along.z).toBeCloseTo(dir.z);
      const far = new Vector3(strip.x, 0, strip.z).add(along.scale(strip.length / 2));
      expect(far.x).toBeCloseTo(3 + dir.x * P.riftLength); expect(far.z).toBeCloseTo(-2 + dir.z * P.riftLength);
      const near = new Vector3(strip.x, 0, strip.z).subtract(along.scale(strip.length / 2));
      expect(near.x).toBeCloseTo(3); expect(near.z).toBeCloseTo(-2);
      expect(strip.width).toBe(P.riftWidth);
    });

  it('keeps the axe-head mouth on the far end and only once the tear is complete', () => {
    const dir = { x: 0, z: 1 };
    expect(riftLayout({ x: 0, z: 0 }, dir, P.riftLength, P.riftWidth, .5).mouth).toBeUndefined();
    const done = riftLayout({ x: 0, z: 0 }, dir);
    expect(done.mouth).toBeDefined();
    const flow = PANGU_ART.flow;
    expect(done.mouth!.z + done.mouth!.length / 2).toBeCloseTo(P.riftLength);   // far edge = server length
    expect(done.mouth!.length).toBe(flow.length);
    // body ends where the mouth art takes over; both stay inside 14
    expect(done.body.length).toBeCloseTo(P.riftLength * PANGU_ART.rift.cut);
    expect(done.body.z + done.body.length / 2).toBeLessThanOrEqual(P.riftLength);
  });

  it('reveals by shrinking plane and UV range together (art never stretches)', () => {
    const half = riftLayout({ x: 0, z: 0 }, { x: 1, z: 0 }, P.riftLength, P.riftWidth, .4);
    const full = riftLayout({ x: 0, z: 0 }, { x: 1, z: 0 });
    expect(half.body.length / full.body.length).toBeCloseTo(half.uMax / full.uMax);
    expect(full.uMax).toBe(1);
    const base = [0, 1, 1, 1, 1, 0, 0, 0];
    expect(croppedUvs(base, .5)).toEqual([0, 1, .5, 1, .5, 0, 0, 0]);
  });
});

describe('Bàn Cổ replay', () => {
  const target = (): PanguReplayTarget & { calls: string[] } => {
    const calls: string[] = [];
    return {
      calls,
      cast: (event) => { calls.push(`cast:${event.skillId}`); return true; },
      ability: (event, _o, _a, _r, extra) => { calls.push(`${event.kind}:${event.skillId}:${extra?.targets.length ?? 0}`); return true; },
      markRift: ground => { calls.push(`rift:${ground.remaining.toFixed(1)}:${ground.direction?.x}`); },
    };
  };

  it('plays cast → cataclysm cracks → strike → five-second rift on the locked point direction', () => {
    const vfx = target(), replay = new PanguReplay(vfx);
    expect(replay.start('ultimate', new Vector3(0, 0, 0), new Vector3(9, 0, 0), false)).toBe(true);
    for (let t = 0; t < P.windup + P.riftSeconds + .5; t += .05) replay.tick(.05);
    expect(vfx.calls[0]).toBe('cast:skill-h01B');
    expect(vfx.calls[1]).toBe(`trait:cataclysm-h01B:${replayQuakePoints(new Vector3()).length}`);
    expect(vfx.calls[2]).toBe('ability:skill-h01B:0');
    const rifts = vfx.calls.filter(c => c.startsWith('rift:'));
    expect(rifts.length).toBeGreaterThan(80);
    expect(rifts[0]).toMatch(/^rift:(5\.0|4\.9):1$/);
    const before = vfx.calls.length;
    replay.tick(.05);
    expect(vfx.calls.length).toBe(before);   // ended and cleared
  });

  it('rejects unknown kinds and can start straight in the rift', () => {
    const vfx = target(), replay = new PanguReplay(vfx);
    expect(replay.start('bogus', new Vector3(), new Vector3(1, 0, 0), false)).toBe(false);
    expect(replay.start('rift', new Vector3(), new Vector3(0, 0, 9), true)).toBe(true);
    replay.tick(.1);
    expect(vfx.calls.some(c => c.startsWith('cast:'))).toBe(false);
    expect(vfx.calls[vfx.calls.length - 1]).toMatch(/^rift:/);
  });

  it('clear cancels future events', () => {
    const vfx = target(), replay = new PanguReplay(vfx);
    replay.start('ultimate', new Vector3(), new Vector3(9, 0, 0), false);
    replay.clear();
    replay.tick(1);
    expect(vfx.calls.filter(c => !c.startsWith('cast:'))).toEqual([]);
  });
});

describe('Bàn Cổ art manifest', () => {
  it('ships every packed atlas with its own source record and a Pangu palette', () => {
    const record = JSON.parse(readFileSync(resolve(__dirname, '../../../assets/vfx-source/pangu/active-inventory.json'), 'utf8'));
    for (const art of Object.values(PANGU_ART)) expect(existsSync(publicAsset(art.url)), art.url).toBe(true);
    for (const [name, entry] of Object.entries<{ file: string; source: string }>(record)) {
      expect(existsSync(resolve(__dirname, '../../..', entry.file)), name).toBe(true);
      expect(entry.source).toMatch(/^raw\//);
    }
    expect(getPalette('pangu').edge.every(c => c >= 0 && c <= 1)).toBe(true);
  });
});
