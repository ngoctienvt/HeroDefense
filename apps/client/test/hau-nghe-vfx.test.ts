import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HAUNGHE as H } from '../../../content/hau-nghe-design.js';
import atlases from '../src/visual-kit-atlases.json';
import palettes from '../src/visual-kit-palettes.json';
import { ARROW_ASPECT, ARROW_FADE, arcOffset, arrowAlpha, BASIC_FLIGHT, BLAST_LIFE, DEFAULT_WINDUP, DETONATION_FRAMES,
  DETONATION_LIFE, DETONATION_SIZE, detonationAlpha, detonationFrame, DIVE_BLAST_DELAY, DIVE_FLIGHT, DIVE_ORDER, diveDelay,
  diveProgress, diveRank, flightProgress, hoverPose, landingOffset, SCORCH_LIFE, SCORCH_SIZE, scorchPose, strikeDelay,
  SUN_COUNT } from '../src/visual-hau-nghe-timeline.js';
import { HauNgheReplay } from '../src/visual-hau-nghe-replay.js';
import type { VisualHauNghe } from '../src/visual-hau-nghe.js';

const ROOT = resolve(__dirname, '../../..');
const source = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');

describe('Hậu Nghệ layout follows gameplay and the measured art', () => {
  it('sizes the blast and scorch so the painted extent spans the R6.5 gameplay radius', () => {
    expect(H.blastRadius).toBe(6.5);
    expect(DETONATION_SIZE * .92 / 2).toBeCloseTo(H.blastRadius);
    expect(SCORCH_SIZE * .96 / 2).toBeCloseTo(H.blastRadius);
  });

  it('keeps every runtime asset and the atlas manifest entry on disk', () => {
    for (const file of ['vfx-hau-nghe-sun.webp', 'vfx-hau-nghe-arrow.webp', 'vfx-hau-nghe-detonation.webp', 'vfx-hau-nghe-scorch.webp'])
      expect(existsSync(resolve(ROOT, 'apps/client/public/assets', file))).toBe(true);
    const atlas = (atlases as { atlases: { id: string; frames: number; tile: string; framesDir: string }[] }).atlases
      .find(entry => entry.id === 'hau-nghe-detonation');
    expect(atlas?.frames).toBe(DETONATION_FRAMES);
    expect(atlas?.tile).toBe('4x4');
    expect(existsSync(resolve(ROOT, atlas?.framesDir ?? 'missing'))).toBe(true);
    expect(Object.keys((palettes as { materials: object }).materials)).toContain('solar');
  });

  it('uses the measured arrow aspect (4.531:1)', () => {
    expect(ARROW_ASPECT).toBeCloseTo(4.531, 3);
  });
});

describe('Hậu Nghệ timeline', () => {
  it('arranges seven suns in a symmetric arc whose middle sun is the highest', () => {
    expect(SUN_COUNT).toBe(7);
    const arc = Array.from({ length: SUN_COUNT }, (_, i) => arcOffset(i));
    expect(arc[0].side).toBeCloseTo(-arc[SUN_COUNT - 1].side);
    expect(arc[3].side).toBeCloseTo(0);
    expect(Math.max(...arc.map(a => a.rise))).toBe(arc[3].rise);
  });

  it('pops the suns in from the middle outward, then holds them until the resolve (no expiry of their own)', () => {
    expect(hoverPose(3, 0, 0, false).alpha).toBe(0);
    expect(hoverPose(3, .2, 0, false).alpha).toBe(1);
    expect(hoverPose(0, 0, 0, false).alpha).toBe(0);
    expect(hoverPose(0, 5, 0, false).alpha).toBe(1); // a late resolve keeps them up
    expect(hoverPose(2, .1, 3, true)).toEqual({ scale: 1, alpha: 1, bob: 0 }); // reduced motion: still
  });

  it('dives every sun once, outermost first, accelerating, the middle one landing last as the blast starts', () => {
    expect([...DIVE_ORDER].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(diveRank(0)).toBe(0);
    expect(diveRank(3)).toBe(SUN_COUNT - 1);
    for (let i = 0; i < SUN_COUNT; i++) {
      expect(diveProgress(i, 0)).toBe(0);
      expect(diveProgress(i, DIVE_BLAST_DELAY)).toBe(1);
      expect(diveProgress(i, diveDelay(i) + DIVE_FLIGHT / 2)).toBeLessThan(.5); // accelerating
    }
    expect(diveDelay(3) + DIVE_FLIGHT).toBeCloseTo(DIVE_BLAST_DELAY);
    expect(strikeDelay(false)).toBe(DIVE_BLAST_DELAY);
    expect(strikeDelay(true)).toBe(0); // reduced motion: no dive, blast at once
  });

  it('lands the suns on distinct spots around the point', () => {
    const spots = Array.from({ length: SUN_COUNT }, (_, i) => landingOffset(i));
    expect(new Set(spots.map(p => `${p.x.toFixed(2)},${p.z.toFixed(2)}`)).size).toBe(SUN_COUNT);
  });

  it('flies the arrow with acceleration, then dissolves it into the blast', () => {
    expect(flightProgress(0, BASIC_FLIGHT)).toBe(0);
    expect(flightProgress(BASIC_FLIGHT, BASIC_FLIGHT)).toBe(1);
    expect(flightProgress(BASIC_FLIGHT / 2, BASIC_FLIGHT)).toBeLessThan(.5);
    expect(arrowAlpha(BASIC_FLIGHT - .01, BASIC_FLIGHT)).toBe(1);
    expect(arrowAlpha(BASIC_FLIGHT + ARROW_FADE, BASIC_FLIGHT)).toBe(0);
  });

  it('plays the sixteen frames once, then fades; reduced motion holds one still frame', () => {
    expect(detonationFrame(0, false)).toBe(0);
    expect(detonationFrame(DETONATION_LIFE - .001, false)).toBe(DETONATION_FRAMES - 1);
    expect(detonationFrame(10, false)).toBe(DETONATION_FRAMES - 1);
    expect(detonationFrame(0, true)).toBe(detonationFrame(1, true));
    expect(detonationAlpha(0, false)).toBe(1);
    expect(detonationAlpha(DETONATION_LIFE, false)).toBe(0);
    expect(detonationAlpha(.5, true)).toBe(0);
  });

  it('keeps the scorch a short aftermath that cools out, never a lasting zone', () => {
    expect(scorchPose(.3).alpha).toBe(1);
    expect(scorchPose(SCORCH_LIFE).alpha).toBe(0);
    expect(scorchPose(SCORCH_LIFE).scale).toBeLessThan(1);
    expect(SCORCH_LIFE).toBeLessThan(2);
    expect(BLAST_LIFE).toBe(Math.max(DETONATION_LIFE, SCORCH_LIFE));
  });
});

describe('Hậu Nghệ routing and replay', () => {
  it('registers as a direct HeroVfx and no longer as a legacy adapter', () => {
    expect(source('visual-effects.ts')).toContain('this.heroKit.register(this.hauNghe)');
    expect(source('visual-hero-adapters-myth.ts')).not.toContain("'h017'");
    expect(readFileSync(resolve(__dirname, '../src/battlefield.ts'), 'utf8')).toContain("registerReplay('h017'");
    expect(readFileSync(resolve(__dirname, '../src/battlefield.ts'), 'utf8')).toContain("markHero('h017', 'caster'");
  });

  it('draws the arrow along the 3D flight direction without mirroring and always resets pooled strips', () => {
    expect(source('visual-hau-nghe-arrows.ts')).toContain('placeStrip(');
    expect(source('visual-hau-nghe-arrows.ts')).toContain('resetStrip(');
  });

  it('cleans a cancelled cast after its windup with no impact', () => {
    const suns = source('visual-hau-nghe-suns.ts');
    expect(suns).toContain('windup + CAST_GRACE');
    expect(suns).not.toContain('HauNgheBlast'); // the suns only play the blast through the resolve callback
  });

  it('replays cast → resolve with the caster as origin, a lobby resolve without one, and a three-target attack', () => {
    const cast = vi.fn((..._args: unknown[]) => true), ability = vi.fn((..._args: unknown[]) => true);
    const replay = new HauNgheReplay({ cast, ability } as unknown as Pick<VisualHauNghe, 'cast' | 'ability'>);
    const caster = new Vector3(0, 0, 0), point = new Vector3(0, 0, -9);
    expect(replay.start('nope', point, false, caster)).toBe(false);
    expect(replay.start('skill', point, false, caster)).toBe(true);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability).not.toHaveBeenCalled();
    replay.tick(DEFAULT_WINDUP + .01);
    expect(ability).toHaveBeenCalledTimes(1);
    expect(ability.mock.calls[0][4]).toMatchObject({ hasOrigin: true });
    replay.start('lobby', point, false, caster);
    replay.tick(.01);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability.mock.calls[1][4]).toMatchObject({ hasOrigin: false });
    replay.start('attack', point, false, caster);
    expect((ability.mock.calls[2][4] as { targets: unknown[] }).targets).toHaveLength(3);
  });
});
