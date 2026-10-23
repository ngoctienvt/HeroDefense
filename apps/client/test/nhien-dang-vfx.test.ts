import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { NHIEN_DANG as N } from '../../../content/new-divine-design.js';
import atlases from '../src/visual-kit-atlases.json';
import palettes from '../src/visual-kit-palettes.json';
import { SPRAY_PRESETS } from '../src/visual-kit-spray.js';
import { activeLook, ARRAY_EXTENT, ARRAY_SIZE, arrayAlpha, BASIC_LIFE, basicPose, BURST_SIZE, CAGE_LIFT, CAGE_RADIUS,
  CAGE_SECONDS, chargeLook, DEFAULT_WINDUP, EXPIRY_WARNING, flameFrame, FLAME_FRAMES, GIFT_FLIGHT, giftPose, liftLook,
  PEARL_COUNT, REFLECT_FRAMES, REFLECT_LIFE, REFLECT_RADIUS, reflectAlpha, reflectFrame, RELEASE_SECONDS, releaseLook,
  RIBBON_FLIGHT, ribbonPose, SLOTS } from '../src/visual-nhien-dang-timeline.js';
import { NhienDangReplay } from '../src/visual-nhien-dang-replay.js';
import type { VisualNhienDang } from '../src/visual-nhien-dang.js';

const ROOT = resolve(__dirname, '../../..');
const source = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');

describe('Nhiên Đăng layout follows gameplay and the measured art', () => {
  it('reads the gameplay numbers from the design file', () => {
    expect(CAGE_RADIUS).toBe(N.radius);
    expect(CAGE_SECONDS).toBe(N.duration);
    expect(DEFAULT_WINDUP).toBe(N.windup);
  });

  it('puts the decal edge on the R7 radius and all 24 pearl slots inside it, in two rings of twelve', () => {
    expect(ARRAY_SIZE * ARRAY_EXTENT / 2).toBeCloseTo(CAGE_RADIUS);
    expect(PEARL_COUNT).toBe(24);
    expect(SLOTS.filter(slot => slot.ring === 'inner')).toHaveLength(12);
    expect(SLOTS.filter(slot => slot.ring === 'outer')).toHaveLength(12);
    const inner = Math.max(...SLOTS.filter(s => s.ring === 'inner').map(s => Math.hypot(s.dx, s.dz)));
    const outer = Math.min(...SLOTS.filter(s => s.ring === 'outer').map(s => Math.hypot(s.dx, s.dz)));
    expect(inner).toBeLessThan(outer);
    for (const slot of SLOTS) expect(Math.hypot(slot.dx, slot.dz)).toBeLessThan(CAGE_RADIUS);
    expect(new Set(SLOTS.map(s => `${s.dx.toFixed(2)},${s.dz.toFixed(2)}`)).size).toBe(24);
  });

  it('keeps every runtime asset, atlas entry, palette and spray preset on disk', () => {
    for (const file of ['pearl', 'array', 'flame', 'reflect', 'reflection'])
      expect(existsSync(resolve(ROOT, 'apps/client/public/assets', `vfx-nhien-dang-${file}.webp`)), file).toBe(true);
    const list = (atlases as { atlases: { id: string; frames: number; tile: string; framesDir: string }[] }).atlases;
    for (const id of ['nhien-dang-flame', 'nhien-dang-reflect']) {
      const atlas = list.find(entry => entry.id === id);
      expect(atlas?.frames, id).toBe(8);
      expect(atlas?.tile, id).toBe('4x2');
      expect(existsSync(resolve(ROOT, atlas?.framesDir ?? 'missing')), id).toBe(true);
    }
    expect(Object.keys((palettes as { materials: object }).materials)).toContain('lantern');
    expect(Object.keys(SPRAY_PRESETS)).toContain('lantern');
  });
});

describe('Nhiên Đăng cage timeline', () => {
  const slot = SLOTS[0], outer = SLOTS[20];

  it('lights the lamps one after another during the windup, brightening the pearls', () => {
    const early = SLOTS.reduce((a, b) => (a.order < b.order ? a : b)), late = SLOTS.reduce((a, b) => (a.order > b.order ? a : b));
    const t = DEFAULT_WINDUP * .3;
    expect(chargeLook(t, DEFAULT_WINDUP, early, false).alpha).toBeGreaterThan(chargeLook(t, DEFAULT_WINDUP, late, false).alpha);
    expect(chargeLook(0, DEFAULT_WINDUP, late, false).alpha).toBeLessThan(.3);
    expect(chargeLook(DEFAULT_WINDUP * 5, DEFAULT_WINDUP, late, false).alpha).toBe(1); // held full if the resolve is late
    expect(chargeLook(0, DEFAULT_WINDUP, late, true).alpha).toBeGreaterThan(.8); // reduced: lit and still
  });

  it('lifts the pearls into the cage heights, the inner ring higher, then holds (bob only after the lift)', () => {
    expect(CAGE_LIFT.inner).toBeGreaterThan(CAGE_LIFT.outer);
    expect(liftLook(0, slot, false).lift).toBeLessThan(liftLook(.4, slot, false).lift);
    expect(liftLook(5, outer, false).lift).toBeCloseTo(CAGE_LIFT.outer);
    expect(activeLook(0, 1, slot, 5, false).lift).toBe(liftLook(0, slot, false).lift);
    expect(activeLook(3, 1, slot, 5, true).lift).toBeCloseTo(CAGE_LIFT[slot.ring]); // reduced: no bob
  });

  it('flickers only in the last moments of the snapshot remaining', () => {
    const calm = activeLook(3, 7, slot, 3, false), warn = activeLook(3, 7, slot, EXPIRY_WARNING / 2, false);
    expect(calm.alpha).toBe(1);
    expect(warn.alpha).toBeLessThanOrEqual(1);
    expect(Math.min(...[1, 2, 3, 4, 5, 6].map(time => activeLook(3, time / 37, slot, .1, false).alpha))).toBeLessThan(1);
  });

  it('brings the pearls down and draws them in over 0.35 s while the flames fold, then nothing is left', () => {
    expect(RELEASE_SECONDS).toBeCloseTo(.35);
    const mid = releaseLook(.2, slot, false), start = releaseLook(0, slot, false), end = releaseLook(RELEASE_SECONDS, slot, false);
    expect(start.lift).toBeCloseTo(CAGE_LIFT[slot.ring]);
    expect(mid.lift).toBeLessThan(start.lift);
    expect(mid.pull).toBeGreaterThan(0);
    expect(mid.flameScale).toBeLessThan(1);
    expect(end.pull).toBe(1);
    expect(end.alpha).toBe(0);
    expect(releaseLook(.2, slot, true).pull).toBe(0); // reduced motion: fade only
  });

  it('shows the array decal from the resolve and fades it with the release; flames loop out of phase', () => {
    expect(arrayAlpha(0, undefined)).toBe(0);
    expect(arrayAlpha(1, undefined)).toBeGreaterThan(.8);
    expect(arrayAlpha(5, RELEASE_SECONDS)).toBe(0);
    const frames = new Set(SLOTS.map(s => flameFrame(.3, s, false)));
    expect(frames.size).toBeGreaterThan(3);
    for (const frame of frames) { expect(frame).toBeGreaterThanOrEqual(0); expect(frame).toBeLessThan(FLAME_FRAMES); }
    expect(flameFrame(1, slot, true)).toBe(flameFrame(2, outer, true));
  });
});

describe('Nhiên Đăng shield, reflect and basic timeline', () => {
  it('flies the shield pearl to the recipient with an arc that lands and fades', () => {
    expect(giftPose(0).t).toBe(0);
    expect(giftPose(GIFT_FLIGHT).t).toBe(1);
    expect(giftPose(GIFT_FLIGHT / 2).arc).toBeGreaterThan(0);
    expect(giftPose(GIFT_FLIGHT).arc).toBeCloseTo(0);
    expect(giftPose(GIFT_FLIGHT + .08).alpha).toBe(0);
  });

  it('sizes the reflect burst so its widest frame spans the R2.5 hit radius, and plays eight frames once', () => {
    expect(REFLECT_RADIUS).toBe(2.5);
    expect(BURST_SIZE * .9437 / 2).toBeCloseTo(REFLECT_RADIUS);
    expect(reflectFrame(0, false)).toBe(0);
    expect(reflectFrame(REFLECT_LIFE - .001, false)).toBe(REFLECT_FRAMES - 1);
    expect(reflectFrame(5, false)).toBe(REFLECT_FRAMES - 1);
    expect(reflectFrame(0, true)).toBe(reflectFrame(1, true));
    expect(reflectAlpha(REFLECT_LIFE, false)).toBe(0);
  });

  it('runs the reflected fire line fast and fades it after it arrives', () => {
    expect(ribbonPose(0).t).toBe(0);
    expect(ribbonPose(RIBBON_FLIGHT).t).toBe(1);
    expect(ribbonPose(RIBBON_FLIGHT / 2).t).toBeLessThan(.5);
    expect(ribbonPose(RIBBON_FLIGHT + .2).alpha).toBe(0);
  });

  it('blooms the basic flame once and fades', () => {
    expect(basicPose(0).frame).toBe(0);
    expect(basicPose(BASIC_LIFE).alpha).toBe(0);
    expect(basicPose(5).frame).toBe(FLAME_FRAMES - 1);
  });
});

describe('Nhiên Đăng routing, cleanup and replay', () => {
  it('registers as a direct HeroVfx; the legacy divine adapter and visual-divine no longer carry h03W', () => {
    expect(source('visual-effects.ts')).toContain('this.heroKit.register(this.nhienDang)');
    expect(source('visual-hero-adapters-late.ts')).toMatch(/DIVINE_IDS = \['h01I', 'h014'\]/);
    expect(source('visual-hero-adapters-late.ts')).not.toMatch(/\(03W\|/);
    expect(source('visual-divine.ts')).not.toMatch(/h03W|lantern-cage/);
    const battlefield = source('battlefield.ts');
    expect(battlefield).toContain("registerReplay('h03W'");
    expect(battlefield).toContain("markHero('h03W', 'caster'");
    expect(battlefield).toContain('markNhienDangCage(ground.casterId');
    expect(battlefield).not.toContain("markDivineAura(id, 'lantern'");
  });

  it('draws 24 separate pearl planes (not one billboard), cleans an unconfirmed cast after its windup and releases everything', () => {
    const cage = source('visual-nhien-dang-cage.ts');
    expect(cage).toContain("acquire('pearl')");
    expect(cage).toContain('PEARL_COUNT');
    expect(cage).toContain('windup + CAST_GRACE');
    expect(cage).toContain('this.art.release(cell.pearl)');
    const main = source('visual-nhien-dang.ts');
    expect(main).toContain('this.art.clear()');
    expect(main).toContain('event.id === this.lastResolveId'); // the per-ally defensive calls resolve the cage once
  });

  it('puts the reflect hit at the attacker with no recipient centre and resets pooled strips', () => {
    const main = source('visual-nhien-dang.ts');
    expect(main).toMatch(/reflect-\$\{N\.id\}[\s\S]*this\.hits\.reflect\(at,/);
    expect(source('visual-nhien-dang-reflect.ts')).toContain('resetStrip(');
    expect(source('visual-nhien-dang-reflect.ts')).toContain('REFLECT_RADIUS');
  });

  it('replays cast → windup → three shields → resolve → snapshot, a lobby resolve, a reflect and an attack', () => {
    const cast = vi.fn((..._args: unknown[]) => true), ability = vi.fn((..._args: unknown[]) => true), markCage = vi.fn();
    const replay = new NhienDangReplay({ cast, ability, markCage } as unknown as Pick<VisualNhienDang, 'cast' | 'ability' | 'markCage'>);
    const caster = new Vector3(0, 0, 0), point = new Vector3(0, 0, -4);
    expect(replay.start('nope', point, false, caster)).toBe(false);
    expect(replay.start('skill', point, false, caster)).toBe(true);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability).not.toHaveBeenCalled();
    replay.tick(DEFAULT_WINDUP + .01);
    const skills = ability.mock.calls.map(call => (call[0] as { skillId: string }).skillId);
    expect(skills.filter(id => id === 'shield-h03W')).toHaveLength(3);
    expect(skills.at(-1)).toBe('skill-h03W');
    expect(markCage).toHaveBeenCalled();
    replay.clear();
    ability.mockClear();
    replay.start('lobby', point, false, caster);
    replay.tick(.01);
    expect(cast).toHaveBeenCalledTimes(1);
    expect((ability.mock.calls[0][4] as { hasOrigin: boolean }).hasOrigin).toBe(false);
    ability.mockClear();
    replay.start('reflect', point, false, caster);
    expect((ability.mock.calls[0][0] as { skillId: string }).skillId).toBe('reflect-h03W');
    replay.start('attack', point, false, caster);
    expect((ability.mock.calls[1][0] as { skillId: string }).skillId).toBe('trait-h03W');
  });
});
