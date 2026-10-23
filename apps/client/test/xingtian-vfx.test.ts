import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { XINGTIAN as X } from '../../../content/xingtian-design.js';
import atlases from '../src/visual-kit-atlases.json';
import palettes from '../src/visual-kit-palettes.json';
import { burstPose, DEFAULT_WINDUP, GROUND_EXTENT_X, GROUND_EXTENT_Z, GROUND_LIFE, GROUND_SIZE_X, GROUND_SIZE_Z,
  groundBurstPose, groundWindupAlpha, IMPACT_FRAMES, impactAlpha, impactFrame, laneDistance, RADIUS, shellExitAge, shellFrame,
  SHELL_EXIT_FIRST, SHELL_EXIT_SECONDS, SHELL_FRAMES, SHELL_HOLD_COUNT, SHELL_HOLD_FIRST, VORTEX_FRAMES, VORTEX_LIFE,
  WAVE_FLIGHT, WAVE_LENGTH, WAVE_LIFE, waveArrival, wavePose, windupFrame, windupPose, WINDUP_FRAMES } from '../src/visual-xingtian-timeline.js';
import { XingtianReplay } from '../src/visual-xingtian-replay.js';
import type { VisualXingtian } from '../src/visual-xingtian.js';

const ROOT = resolve(__dirname, '../../..');
const source = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');

describe('Hình Thiên layout follows gameplay and the measured art', () => {
  it('reads every length from the design file and makes the painted rim a true R6 circle', () => {
    expect(RADIUS).toBe(X.blastRadius);
    expect(GROUND_SIZE_X * GROUND_EXTENT_X / 2).toBeCloseTo(RADIUS);
    expect(GROUND_SIZE_Z * GROUND_EXTENT_Z / 2).toBeCloseTo(RADIUS);
    expect(WAVE_LENGTH).toBe(X.fireWaveLength);
  });

  it('keeps every runtime asset and both atlas manifest entries on disk', () => {
    for (const file of ['vfx-xingtian-vortex.webp', 'vfx-xingtian-wave-impact.webp', 'vfx-xingtian-ground.webp',
      'vfx-xingtian-wave.webp', 'vfx-xingtian-shell.webp'])
      expect(existsSync(resolve(ROOT, 'apps/client/public/assets', file)), file).toBe(true);
    const list = (atlases as { atlases: { id: string; frames: number; tile: string; framesDir: string }[] }).atlases;
    const vortex = list.find(entry => entry.id === 'xingtian-vortex'), impact = list.find(entry => entry.id === 'xingtian-wave-impact');
    expect(vortex).toMatchObject({ frames: VORTEX_FRAMES, tile: '4x4' });
    expect(impact).toMatchObject({ frames: IMPACT_FRAMES, tile: '4x2' });
    for (const entry of [vortex, impact]) expect(existsSync(resolve(ROOT, entry?.framesDir ?? 'missing'))).toBe(true);
    expect(Object.keys((palettes as { materials: object }).materials)).toContain('warfire');
    expect(source('visual-kit-spray.ts')).toContain('warfire: {');
  });
});

describe('Hình Thiên windup and burst', () => {
  it('shows the first four vortex frames over the windup and holds the last until the resolve', () => {
    expect(windupFrame(0, DEFAULT_WINDUP)).toBe(0);
    expect(windupFrame(DEFAULT_WINDUP - .01, DEFAULT_WINDUP)).toBe(WINDUP_FRAMES - 1);
    expect(windupFrame(DEFAULT_WINDUP + 5, DEFAULT_WINDUP)).toBe(WINDUP_FRAMES - 1);
    const start = windupPose(0, DEFAULT_WINDUP, false), end = windupPose(DEFAULT_WINDUP, DEFAULT_WINDUP, false);
    expect(end.scale).toBeGreaterThan(start.scale);
    expect(windupPose(0, DEFAULT_WINDUP, true).frame).toBe(WINDUP_FRAMES - 1);
    expect(groundWindupAlpha(DEFAULT_WINDUP, DEFAULT_WINDUP)).toBeGreaterThan(groundWindupAlpha(0, DEFAULT_WINDUP));
  });

  it('plays frames 5-16 once after the resolve, then fades; reduced motion holds one still frame', () => {
    expect(burstPose(0, false).frame).toBe(WINDUP_FRAMES);
    expect(burstPose(VORTEX_LIFE - .001, false).frame).toBe(VORTEX_FRAMES - 1);
    expect(burstPose(VORTEX_LIFE, false).alpha).toBeCloseTo(0);
    expect(burstPose(.3, true).frame).toBe(burstPose(.1, true).frame);
    expect(burstPose(.1, false).scale).toBeGreaterThan(burstPose(0, false).scale);
  });

  it('keeps the ground rim a short aftermath that cools out, never a lasting zone', () => {
    expect(groundBurstPose(0, false).alpha).toBe(0);
    expect(groundBurstPose(.1, false).alpha).toBeCloseTo(1);
    expect(groundBurstPose(GROUND_LIFE, false).alpha).toBeCloseTo(0);
    expect(GROUND_LIFE).toBeLessThan(1);
  });
});

describe('Hình Thiên fire wave', () => {
  it('runs out to the 6-unit end of the lane, then its tail catches up and it fades', () => {
    expect(wavePose(0, false).head).toBeCloseTo(0);
    expect(wavePose(WAVE_FLIGHT, false).head).toBeCloseTo(WAVE_LENGTH);
    expect(wavePose(.05, false).head).toBeLessThan(wavePose(.1, false).head);
    expect(wavePose(WAVE_LIFE - .01, false).length).toBeLessThan(WAVE_LENGTH * .1);
    expect(wavePose(WAVE_LIFE, false).alpha).toBeCloseTo(0);
    expect(wavePose(.05, true).head).toBe(WAVE_LENGTH);
  });

  it('flares a monster when the head reaches it, and only inside the 6 x 2 lane', () => {
    expect(waveArrival(WAVE_LENGTH, false)).toBeCloseTo(WAVE_FLIGHT);
    expect(waveArrival(2, false)).toBeLessThan(waveArrival(5, false));
    expect(wavePose(waveArrival(3, false), false).head).toBeCloseTo(3, 1);
    expect(waveArrival(3, true)).toBe(0);
    const from = { x: 0, z: 0 }, dir = { x: 0, z: -1 };
    expect(laneDistance(from, dir, { x: .9, z: -4 })).toBeCloseTo(4);
    expect(laneDistance(from, dir, { x: 1.2, z: -4 })).toBeNull();
    expect(laneDistance(from, dir, { x: 0, z: 1 })).toBeNull();
    expect(laneDistance(from, dir, { x: 0, z: -6.5 })).toBeNull();
  });

  it('plays the impact sheet once then fades, a still frame under reduced motion', () => {
    expect(impactFrame(0, false)).toBe(0);
    expect(impactFrame(5, false)).toBe(IMPACT_FRAMES - 1);
    expect(impactFrame(.2, true)).toBe(impactFrame(0, true));
    expect(impactAlpha(.39, false)).toBeLessThan(1);
  });
});

describe('Hình Thiên berserk shell', () => {
  it('forms, holds in a ping-pong between frames 5 and 12, then breaks apart with the last .3 s of the state', () => {
    expect(shellFrame(0, undefined, false).frame).toBe(0);
    const held = new Set<number>();
    for (let age = .5; age < 5; age += .03) held.add(shellFrame(age, undefined, false).frame);
    expect(Math.min(...held)).toBe(SHELL_HOLD_FIRST);
    expect(Math.max(...held)).toBe(SHELL_HOLD_FIRST + SHELL_HOLD_COUNT - 1);
    expect(shellExitAge(2)).toBeUndefined();
    expect(shellExitAge(SHELL_EXIT_SECONDS)).toBe(0);
    expect(shellExitAge(0)).toBe(SHELL_EXIT_SECONDS);
    expect(shellFrame(9, 0, false).frame).toBe(SHELL_EXIT_FIRST);
    expect(shellFrame(9, SHELL_EXIT_SECONDS - .01, false).frame).toBe(SHELL_FRAMES - 1);
    expect(shellFrame(9, SHELL_EXIT_SECONDS, false).alpha).toBeCloseTo(0);
    expect(shellFrame(9, undefined, true).frame).toBe(shellFrame(1, undefined, true).frame);
  });
});

describe('Hình Thiên routing and replay', () => {
  it('registers as a direct HeroVfx, no longer as a legacy adapter, with the shell fed from the snapshot', () => {
    const battlefield = readFileSync(resolve(__dirname, '../src/battlefield.ts'), 'utf8');
    expect(source('visual-effects.ts')).toContain('this.heroKit.register(this.xingtian)');
    expect(source('visual-hero-adapters-war.ts')).not.toContain("'h011'");
    expect(battlefield).toContain("registerReplay('h011'");
    expect(battlefield).toContain('markXingtianShell(id, actor.root.position, actor.xingtianBerserk!)');
    expect(battlefield).toContain("event.skillId === 'fire-wave-h011'");
  });

  it('leaves the basic attack and non-ability resolves to the common path, and never draws burn', () => {
    const main = source('visual-xingtian.ts');
    expect(main).toContain('if (event.kind !== \'ability\') return false;');
    expect(main).not.toContain('case `trait-');
    for (const file of ['visual-xingtian.ts', 'visual-xingtian-vortex.ts', 'visual-xingtian-waves.ts'])
      expect(source(file)).not.toMatch(/markStatus|statusMarks|markSharedStatus/);
  });

  it('draws the wave as a camera-facing strip and always resets pooled strips', () => {
    expect(source('visual-xingtian-waves.ts')).toContain('placeStrip(');
    expect(source('visual-xingtian-waves.ts')).toContain('resetStrip(');
    expect(source('visual-xingtian-impacts.ts')).toContain("acquire('impact')");
  });

  it('cleans a cancelled cast after its windup with no impact', () => {
    const vortex = source('visual-xingtian-vortex.ts');
    expect(vortex).toContain('slot.windup + CAST_GRACE');
    expect(vortex).toContain('cast.timeout');
  });

  it('breaks the shell when its marker stops, not only when remaining runs out', () => {
    expect(source('visual-xingtian-shell.ts')).toContain('shell.lost > SHELL_MARKER_GRACE');
  });

  it('replays cast → resolve, a lobby resolve, one wave and the shell through the same entry points', () => {
    const cast = vi.fn((..._args: unknown[]) => true), ability = vi.fn((..._args: unknown[]) => true), markShell = vi.fn();
    const replay = new XingtianReplay({ cast, ability, markShell } as unknown as Pick<VisualXingtian, 'cast' | 'ability' | 'markShell'>);
    const caster = new Vector3(0, 0, 0);
    expect(replay.start('nope', caster, false)).toBe(false);
    expect(replay.start('skill', caster, false)).toBe(true);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability).not.toHaveBeenCalled();
    replay.tick(DEFAULT_WINDUP + .01);
    expect(ability).toHaveBeenCalledTimes(1);
    expect((ability.mock.calls[0][4] as { targets: unknown[] }).targets).toHaveLength(3);
    expect(markShell).toHaveBeenCalled();
    expect(markShell.mock.calls[0][2]).toBeLessThanOrEqual(X.berserkSeconds);
    replay.tick(.5);
    expect(ability.mock.calls.some(call => (call[0] as { skillId: string }).skillId === 'fire-wave-h011')).toBe(true);
    replay.start('lobby', caster, false);
    replay.tick(.01);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability.mock.calls.at(-1)?.[4]).toMatchObject({ hasOrigin: false });
    markShell.mockClear();
    replay.start('wave', caster, false);
    expect((ability.mock.calls.at(-1)?.[4] as { targets: unknown[] }).targets).toHaveLength(3);
    expect(ability.mock.calls.at(-1)?.[0]).toMatchObject({ skillId: 'fire-wave-h011', kind: 'trait' });
    replay.start('shell', caster, false);
    replay.tick(.1);
    expect(markShell).toHaveBeenCalledTimes(1);
  });
});
