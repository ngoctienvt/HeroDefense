import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { THAIBACH as T } from '../../../content/thaibach-design.js';
import inventory from '../../../assets/vfx-source/thaibach/active-inventory.json';
import palettes from '../src/visual-kit-palettes.json';
import { CAST_GRACE, castPose, CLOSE_SECONDS, DEFAULT_WINDUP, FALL_END_HEIGHT, fallLandingTime, fallPose, GUIDE_ASPECT, GUIDE_FLIGHT,
  GUIDE_LIFE, GUIDE_MAX_LENGTH, GUIDE_MIN_LENGTH, guideAlpha, guideHead, guideLength, HEAL_FALL, LANDING_RING_RADIUS, OPEN_FRAME_SECONDS,
  printPose, PRINT_LIFE, REVIVE_FALL, STAR_HEIGHT, statusActive, statusAlpha, STATUS_FADE, STATUS_SECONDS, UNIT_HEIGHT } from '../src/visual-thaibach-timeline.js';
import { ThaibachReplay } from '../src/visual-thaibach-replay.js';
import type { VisualThaibach } from '../src/visual-thaibach.js';

const ROOT = resolve(__dirname, '../../..');
const src = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');

describe('Thái Bạch layout follows gameplay and the measured art', () => {
  it('uses the real server windup and durations from the design', () => {
    expect(DEFAULT_WINDUP).toBe(T.windup);
    expect(T.windup).toBe(.5);
    expect(STATUS_SECONDS.haste).toBe(T.hasteSeconds);
    expect(STATUS_SECONDS.immortal).toBe(T.reviveInvulnerable);
    expect(T.reviveInvulnerable).toBe(T.guardInvulnerable);
  });

  it('keeps the runtime art, palette and spray on disk and matches the measured aspect', () => {
    for (const file of ['vfx-thaibach-cast.webp', 'vfx-thaibach-guidance.webp', 'vfx-thaibach-star.webp'])
      expect(existsSync(resolve(ROOT, 'apps/client/public/assets', file))).toBe(true);
    expect(GUIDE_ASPECT).toBeCloseTo(inventory.guidance.aspect, 3);
    expect(inventory.cast.grid).toBe('4x4');
    expect(inventory.cast.emptyFrames).toEqual([]);
    expect(Object.keys((palettes as { materials: object }).materials)).toContain('changgeng');
    expect(src('visual-kit-spray.ts')).toMatch(/\n {2}changgeng: \{/);
  });

  it('draws no area disc: the only ground ring is a contact ring, far inside the R12 selection range', () => {
    expect(T.healRadius).toBeGreaterThan(LANDING_RING_RADIUS * 3);
    expect(src('visual-thaibach.ts')).not.toMatch(/ring\(/);
    expect(src('visual-thaibach-light.ts').match(/bank\.ring\(/g)).toHaveLength(1);
  });
});

describe('cast star timeline', () => {
  it('gathers across the real windup, holds the open frame while the resolve is late, and fades in', () => {
    expect(castPose(0, DEFAULT_WINDUP).frame).toBe(0);
    expect(castPose(0, DEFAULT_WINDUP).alpha).toBe(0);
    expect(castPose(DEFAULT_WINDUP * .5, DEFAULT_WINDUP).frame).toBe(4);
    expect(castPose(DEFAULT_WINDUP - .001, DEFAULT_WINDUP).frame).toBe(7);
    expect(castPose(DEFAULT_WINDUP + CAST_GRACE - .01, DEFAULT_WINDUP)).toMatchObject({ frame: 7, done: false });
  });

  it('opens at the resolve, then folds the star and rolls the cloud away in .25 s', () => {
    const resolved = DEFAULT_WINDUP;
    expect(castPose(resolved, DEFAULT_WINDUP, resolved).frame).toBe(8);
    expect(castPose(resolved + OPEN_FRAME_SECONDS + .01, DEFAULT_WINDUP, resolved).frame).toBe(9);
    const closeFrom = resolved + 2 * OPEN_FRAME_SECONDS;
    expect(castPose(closeFrom + .001, DEFAULT_WINDUP, resolved)).toMatchObject({ frame: 10, done: false });
    expect(castPose(closeFrom + CLOSE_SECONDS - .001, DEFAULT_WINDUP, resolved)).toMatchObject({ frame: 15, done: false });
    expect(castPose(closeFrom + CLOSE_SECONDS + .001, DEFAULT_WINDUP, resolved).done).toBe(true);
  });

  it('survives an early resolve and cleans a cast that never resolves (nobody to help)', () => {
    expect(castPose(.2, DEFAULT_WINDUP, .2).frame).toBe(8);
    const folded = DEFAULT_WINDUP + CAST_GRACE;
    expect(castPose(folded + .001, DEFAULT_WINDUP).frame).toBe(10);
    expect(castPose(folded + CLOSE_SECONDS + .001, DEFAULT_WINDUP).done).toBe(true);
  });

  it('keeps the star centre above the caster and the module follows her every frame', () => {
    expect(STAR_HEIGHT).toBeGreaterThan(3);
    const star = src('visual-thaibach-star.ts');
    expect(star).toContain('CAST_LIFT');
    expect(star).toContain('windup || DEFAULT_WINDUP');
    expect(star).not.toContain('shared'); // the gathering never plays a heal or revive sheet
  });
});

describe('guidance ribbon, starlight and footprint', () => {
  it('never stretches the ribbon: a fixed aspect with a clamped length', () => {
    expect(guideLength(0)).toBe(GUIDE_MIN_LENGTH);
    expect(guideLength(100)).toBe(GUIDE_MAX_LENGTH);
    expect(guideLength(5)).toBeGreaterThan(GUIDE_MIN_LENGTH);
    expect(src('visual-thaibach-light.ts')).toContain('strip.length / GUIDE_ASPECT');
  });

  it('flies head first from the star to the recipient in .18 s and fades without delaying anything', () => {
    const from = { x: 0, y: STAR_HEIGHT, z: 0 }, to = { x: 6, y: UNIT_HEIGHT, z: 2 };
    expect(guideHead(from, to, 0)).toEqual(from);
    const end = guideHead(from, to, GUIDE_FLIGHT);
    expect(end.x).toBeCloseTo(to.x); expect(end.y).toBeCloseTo(to.y); expect(end.z).toBeCloseTo(to.z);
    expect(guideHead(from, to, GUIDE_FLIGHT / 2).y).toBeGreaterThan((from.y + to.y) / 2 - 3);
    expect(guideAlpha(GUIDE_FLIGHT - .01)).toBe(1);
    expect(guideAlpha(GUIDE_LIFE)).toBeCloseTo(0);
    expect(src('visual-thaibach.ts')).toMatch(/this\.shared\('heal', at\);\n.*record/); // heal sheet is not behind the ribbon
  });

  it('drops starlight onto the recipient and leaves a brief footprint at the landing', () => {
    for (const spec of [HEAL_FALL, REVIVE_FALL]) {
      expect(fallPose(0, spec).alpha).toBe(0);
      expect(fallPose(fallLandingTime(spec) - .001, spec).height).toBeCloseTo(FALL_END_HEIGHT, 0);
      expect(fallPose(fallLandingTime(spec) + .001, spec).landed).toBe(true);
    }
    expect(REVIVE_FALL.fromHeight).toBeGreaterThan(HEAL_FALL.fromHeight);
    expect(printPose(0).alpha).toBe(1);
    expect(printPose(PRINT_LIFE).alpha).toBe(0);
    expect(printPose(.3).alpha).toBeLessThan(printPose(.1).alpha);
  });

  it('draws no ribbon for the caster herself and reduced motion keeps a static ring and fall only', () => {
    const light = src('visual-thaibach-light.ts');
    expect(light).toContain('SELF_DISTANCE');
    expect(light).toContain('!self && !reduced');
  });
});

describe('haste / invulnerability aftermath', () => {
  it('only counts recorded recipients inside the design window', () => {
    expect(statusActive('haste', undefined, 1)).toBe(false);
    expect(statusActive('haste', 0, T.hasteSeconds)).toBe(true);
    expect(statusActive('haste', 0, T.hasteSeconds + .01)).toBe(false);
    expect(statusActive('immortal', 0, 1.4)).toBe(true);
    expect(statusActive('immortal', 0, 1.6)).toBe(false);
  });

  it('breathes while the marker lives and eases out in .25 s when it stops', () => {
    expect(statusAlpha(.5, 0, 1, false)).toBeGreaterThan(0);
    expect(statusAlpha(.5, STATUS_FADE, 1, false)).toBe(0);
    expect(statusAlpha(.5, STATUS_FADE / 2, 1, true)).toBeGreaterThan(0);
    expect(statusAlpha(0, 0, 1, true)).toBe(0);
  });

  it('records recipients from our own events only', () => {
    const module = src('visual-thaibach.ts');
    expect(module.match(/status\.record\(/g)).toHaveLength(3); // haste for the heal, immortal for revive and star-guard
    expect(src('visual-thaibach-status.ts')).toContain('statusActive(kind, entry.at, this.now)');
  });
});

describe('routing', () => {
  it('registers the module, plays the revive overlay on top of the shared sheet, and leaves the basic attack alone', () => {
    const effects = src('visual-effects.ts');
    expect(effects).toContain('this.heroKit.register(this.thaibach)');
    expect(effects).toMatch(/endsWith\('-h015'\)\) this\.heroKit\.ability/); // no per-hero skillId literal (visual-hero-adapters routing test)
    expect(effects).toContain("this.sharedStatus.play('revive'"); // shared revive loop untouched
    expect(src('visual-hero-adapters-small.ts')).not.toContain("'h015'");
    const module = src('visual-thaibach.ts');
    expect(module).not.toContain('case `trait-');
    expect(module).not.toContain('case `star-heal');
  });

  it('feeds the caster marker every frame, the status markers and the replay from the battlefield', () => {
    const field = src('battlefield.ts');
    expect(field).toContain("markHero('h015', 'caster'");
    expect(field).toContain("markHero('h015', 'haste'");
    expect(field).toContain("markHero('h015', 'immortal'");
    expect(field).toContain("registerReplay('h015'");
    expect(field).toContain("event.skillId === 'revive-h015' && source?.zone === this.zone");
  });

  it('replays cast → resolve with the caster as origin, a lobby resolve without one, a revive, and a passive guard', () => {
    const cast = vi.fn((..._args: unknown[]) => true), ability = vi.fn((..._args: unknown[]) => true), mark = vi.fn();
    const replay = new ThaibachReplay({ cast, ability, mark } as unknown as Pick<VisualThaibach, 'cast' | 'ability' | 'mark'>);
    const caster = new Vector3(0, 0, 0);
    expect(replay.start('nope', caster, false, caster)).toBe(false);
    expect(replay.start('skill', caster, false, caster)).toBe(true);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability).not.toHaveBeenCalled();
    replay.tick(DEFAULT_WINDUP + .01);
    expect(ability).toHaveBeenCalledTimes(1);
    expect(ability.mock.calls[0][4]).toMatchObject({ hasOrigin: true });
    replay.tick(.1);
    expect(mark).toHaveBeenCalledWith('haste', 'debug-ally', expect.anything(), false);
    replay.start('lobby', caster, false, caster);
    replay.tick(.01);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability.mock.calls[1][4]).toMatchObject({ hasOrigin: false });
    replay.start('revive', caster, false, caster);
    replay.tick(DEFAULT_WINDUP + .01);
    expect((ability.mock.calls[2][0] as { skillId: string }).skillId).toBe('revive-h015');
    replay.start('guard', caster, false, caster);
    expect((ability.mock.calls[3][0] as { skillId: string }).skillId).toBe('star-guard-h015');
    replay.start('idle', caster, false, caster);
    replay.tick(DEFAULT_WINDUP + .5);
    expect(ability).toHaveBeenCalledTimes(4); // a cast with no resolve resolves nothing
  });
});
