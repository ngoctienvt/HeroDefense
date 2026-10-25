import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HIENVIEN as H } from '../../../content/hienvien-design.js';
import atlases from '../src/visual-kit-atlases.json';
import palettes from '../src/visual-kit-palettes.json';
import { ARRAY_SIZE, castFrame, castLift, cauldronPose, cauldronStart, CAULDRON_COUNT, EXIT, fanDirections,
  FOREGROUND_SECONDS, GIANT_RISE, HOLD_FRAME, padOffsets, PAD_RADIUS, rainPose, RAIN_FALL, strikeAlpha, strikeFrame,
  strikeLift, zoneStartAge } from '../src/visual-hienvien-timeline.js';
import { HienvienReplay } from '../src/visual-hienvien-replay.js';
import { STATUS_MARKS, statusMarkSlot } from '../src/visual-status-marks.js';
import type { VisualHienvien } from '../src/visual-hienvien.js';

const ROOT = resolve(__dirname, '../../..');
const source = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');

describe('Hiên Viên layout follows gameplay and the measured art', () => {
  it('lands the painted array edge on the R8.5 giant radius with eight cauldron pads inside it', () => {
    expect(H.giantRadius).toBe(8.5);
    expect(ARRAY_SIZE * .8498 / 2).toBeCloseTo(H.giantRadius);
    const pads = padOffsets();
    expect(pads).toHaveLength(CAULDRON_COUNT);
    for (const pad of pads) expect(Math.hypot(pad.x, pad.z)).toBeCloseTo(PAD_RADIUS);
    expect(PAD_RADIUS).toBeLessThan(H.giantRadius);
    expect(new Set(pads.map(p => `${p.x.toFixed(2)},${p.z.toFixed(2)}`)).size).toBe(CAULDRON_COUNT);
  });

  it('fans the five basic sword qi streaks exactly like the server (hienvienAttack)', () => {
    const dirs = fanDirections({ x: 0, z: 1 });
    expect(dirs).toHaveLength(H.swords);
    expect(dirs[2].x).toBeCloseTo(0); expect(dirs[2].z).toBeCloseTo(1);
    expect(Math.atan2(dirs[4].z, dirs[4].x) - Math.atan2(dirs[3].z, dirs[3].x)).toBeCloseTo(H.swordFanRadians);
  });
});

describe('Hiên Viên giant sword timeline', () => {
  it('gathers high above the point during the windup (frames 0–3)', () => {
    expect(castFrame(0, .25, false)).toBe(0);
    expect(castFrame(.24, .25, false)).toBe(3);
    expect(castLift(0, .25, false)).toBeCloseTo(GIANT_RISE);
    expect(castLift(.25, .25, false)).toBeGreaterThan(GIANT_RISE);
    expect(castLift(.1, .25, true)).toBe(GIANT_RISE); // reduced: still, never planted before the hit
  });

  it('plunges on the server impact, cracks the ground once, then holds one settled frame (no looping debris)', () => {
    expect(strikeFrame(0, H.rainSeconds, false)).toBe(4);
    expect(strikeLift(0, false)).toBeGreaterThan(1);
    expect(strikeLift(.2, false)).toBe(0);
    expect(strikeFrame(.1, H.rainSeconds - .1, false)).toBe(7);
    const held = [1, 2, 3, 4].map(age => strikeFrame(age, H.rainSeconds - age, false));
    expect(new Set(held)).toEqual(new Set([HOLD_FRAME]));
    expect(strikeFrame(1, 1, true)).toBe(HOLD_FRAME);
  });

  it('dissolves through frames 12–15 only when the zone ends, fully gone at remaining 0', () => {
    expect(strikeFrame(4.6, EXIT - .01, false)).toBe(12);
    expect(strikeFrame(5, .01, false)).toBe(15);
    expect(strikeAlpha(5, .001, false)).toBeLessThan(.02);
    expect(strikeAlpha(2, 3, true)).toBe(1);
  });

  it('a late zone snapshot joins at the hold instead of replaying the slam', () => {
    expect(zoneStartAge(H.rainSeconds)).toBe(0);
    expect(zoneStartAge(2)).toBe(H.rainSeconds - 2);
    expect(strikeFrame(zoneStartAge(2), 2, false)).toBe(HOLD_FRAME);
  });

  it('drops the cauldrons staggered around the ring after the impact and lands each one', () => {
    expect(cauldronPose(0, 0, H.rainSeconds, false).alpha).toBe(0);
    const landed = cauldronPose(cauldronStart(7) + .3, 7, H.rainSeconds, false);
    expect(landed.landed).toBe(true);
    expect(Math.abs(landed.lift)).toBeLessThan(.01);
    expect(cauldronPose(cauldronStart(3) + .05, 3, H.rainSeconds, false).lift).toBeGreaterThan(.5);
    expect(cauldronPose(4.9, 0, .1, false).alpha).toBeLessThan(.3);
    expect(cauldronPose(0, 5, 3, true)).toEqual({ lift: 0, alpha: 1, landed: true });
  });

  it('keeps the strike in the foreground pass only for the slam itself', () => {
    expect(FOREGROUND_SECONDS).toBeLessThan(.6);
    const strike = source('visual-hienvien-strike.ts');
    expect(strike).toContain("'giant-hold'");
    expect(strike).toContain("m.setFloat('uTime', time)");
    const main = source('visual-hienvien.ts');
    expect(main).toContain("prepare('giant', '/assets/vfx-hienvien-giant.webp', { foreground: true })");
    expect(main).toContain("prepare('giant-hold', '/assets/vfx-hienvien-giant.webp', { depthAlways: true })");
    // Ground contacts follow camera screen-up (billboards lean back), never a world-Y centre offset.
    for (const file of ['visual-hienvien-strike.ts', 'visual-hienvien-accents.ts'])
      expect(source(file)).toContain('billboardCenter(');
  });
});

describe('Hiên Viên rain swords', () => {
  it('compresses the fall under .1 s so the contact lands on the server pulse, then fades planted', () => {
    expect(RAIN_FALL).toBeLessThanOrEqual(.1);
    expect(rainPose(0, false).lift).toBeGreaterThan(3);
    expect(rainPose(RAIN_FALL, false)).toMatchObject({ frame: 4, lift: 0 });
    expect(rainPose(.43, false).alpha).toBeLessThan(.2);
    expect(rainPose(0, true).lift).toBe(0);
  });
});

describe('Hiên Viên replay drives the real event order', () => {
  function run(kind: string) {
    const vfx = { cast: vi.fn(() => true), ability: vi.fn(() => true), mark: vi.fn(), markZone: vi.fn() };
    const replay = new HienvienReplay(vfx as unknown as Pick<VisualHienvien, 'cast' | 'ability' | 'mark' | 'markZone'>);
    expect(replay.start(kind, new Vector3(0, 0, -6), false, new Vector3(0, 0, 0))).toBe(true);
    for (let t = 0; t < 7; t += 1 / 60) replay.tick(1 / 60);
    return vfx;
  }

  it('skill: one cast, one impact, exactly 15 rain pulses inside R8.5, zone snapshots, blessing on the caster', () => {
    const vfx = run('skill');
    expect(vfx.cast).toHaveBeenCalledTimes(1);
    const skills = vfx.ability.mock.calls.map(call => (call as unknown[])[0] as { skillId: string; kind: string });
    expect(skills.filter(e => e.skillId === 'skill-h01F' && e.kind === 'ability')).toHaveLength(1);
    const rains = vfx.ability.mock.calls.filter(call => ((call as unknown[])[0] as { skillId: string }).skillId === 'sword-rain-h01F');
    expect(rains).toHaveLength(H.rainSwords);
    for (const call of rains) expect(Vector3.Distance((call as unknown[])[2] as Vector3, new Vector3(0, 0, -6))).toBeLessThanOrEqual(H.giantRadius);
    expect(vfx.markZone.mock.calls.length).toBeGreaterThan(200);
    expect((vfx.mark.mock.calls[0] as unknown[])[2]).toEqual(new Vector3(0, 0, 0));
  });

  it('lobby: impact without cast or zone snapshot (practice casts)', () => {
    const vfx = run('lobby');
    expect(vfx.cast).not.toHaveBeenCalled();
    expect(vfx.markZone).not.toHaveBeenCalled();
    expect(vfx.ability).toHaveBeenCalled();
  });

  it('rejects unknown kinds', () => {
    const replay = new HienvienReplay({ cast: vi.fn(), ability: vi.fn(), mark: vi.fn(), markZone: vi.fn() } as never);
    expect(replay.start('cleave', new Vector3(), false)).toBe(false);
  });
});

describe('Hiên Viên routing, assets and shared marks', () => {
  it('registers the kit module after the legacy adapters and drops the legacy h01F block', () => {
    const effects = source('visual-effects.ts');
    expect(effects).toContain('this.heroKit.register(this.hienvien);');
    expect(effects.indexOf('this.heroKit.register(this.hienvien);')).toBeGreaterThan(effects.indexOf('registerLegacyHeroes(this.heroKit'));
    expect(effects).not.toContain('hienvien: this.hienvien');
    expect(source('visual-hero-adapters-sage.ts')).not.toContain('h01F');
    const battlefield = source('battlefield.ts');
    expect(battlefield).toContain('this.effects.markHienvienZone(ground.id');
    expect(battlefield).toContain("this.effects.markHero('h01F', 'blessing'");
    expect(battlefield).toContain("registerReplay('h01F'");
    expect(battlefield).toContain("kind: 'critical-up'");
    expect(battlefield).toContain("kind: 'haste'");
    const main = source('visual-hienvien.ts');
    for (const skill of ['skill-${H.id}', 'sword-rain-${H.id}', 'imperial-blessing-${H.id}', 'trait-${H.id}'])
      expect(main).toContain(`case \`${skill}\``);
    expect(main).not.toMatch(/MeshBuilder|StandardMaterial/);
  });

  it('ships every runtime texture and an atlas entry per sheet', () => {
    const ids = ['hienvien-giant', 'hienvien-arrival', 'hienvien-rain', 'hienvien-hit'];
    for (const id of ids) expect(atlases.atlases.some(atlas => atlas.id === id), id).toBe(true);
    for (const file of ['giant', 'arrival', 'rain', 'hit', 'array', 'cauldron'])
      expect(existsSync(resolve(ROOT, `apps/client/public/assets/vfx-hienvien-${file}.webp`)), file).toBe(true);
    for (const mark of ['critical-up', 'haste'])
      expect(existsSync(resolve(ROOT, `apps/client/public/assets/vfx-status-${mark}.webp`)), mark).toBe(true);
    expect(palettes.materials.xuanyuan.deep).toEqual([.204, .208, .184]);
  });

  it('adds crit/haste as gold ally rows with their own slots in the shared status table', () => {
    expect(STATUS_MARKS['critical-up'].hero).toBe(true);
    expect(STATUS_MARKS.haste.hero).toBe(true);
    const sides = Object.values(STATUS_MARKS).filter(row => row.hero).map(row => row.x);
    expect(new Set(sides).size).toBe(sides.length);
    expect(statusMarkSlot('haste').y).toBe(statusMarkSlot('attack-up').y);
  });
});
