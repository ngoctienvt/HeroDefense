import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { KIMTHIEN as K } from '../../../content/kimthien-design.js';
import atlases from '../src/visual-kit-atlases.json';
import palettes from '../src/visual-kit-palettes.json';
import { SPRAY_PRESETS } from '../src/visual-kit-spray.js';
import { advanceBowl, APPEAR_SECONDS, BOWL_ANCHOR_Y, BOWL_RIM_PX, BOWL_SIZE, bowlDone, bowlLayerPose, BREAK_START, budPose,
  type BowlClock, COLLAPSE_ANCHOR_Y, COLLAPSE_SECONDS, DEFAULT_WINDUP, HOLD_COUNT, HOLD_START, inwardDrop, markClock, MARK_GRACE,
  REDUCED_COLLAPSE_SECONDS, SHEET_CELL, shouldCollapse, startBowl, SUCTION_ALPHA, suctionPose, UNCONFIRMED_SECONDS,
  windupPose } from '../src/visual-kimthien-timeline.js';
import { KimthienBowls } from '../src/visual-kimthien-bowls.js';
import { KimthienReplay } from '../src/visual-kimthien-replay.js';
import type { VisualKimthien } from '../src/visual-kimthien.js';

const ROOT = resolve(__dirname, '../../..');
const source = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');

/** Steps a clock in 1/60 s frames, marking it every frame with the given `remaining` function. */
function run(clock: BowlClock, seconds: number, remaining?: (age: number) => number | undefined, reduced = false): BowlClock {
  let next = clock;
  for (let t = 0; t < seconds; t += 1 / 60) {
    const left = remaining?.(next.age);
    if (left !== undefined) next = markClock(next, left);
    next = advanceBowl(next, 1 / 60, reduced);
  }
  return next;
}

describe('Kim Thiền layout follows gameplay and the measured art', () => {
  it('sizes the bowl so the painted rim spans the R7 zone diameter', () => {
    expect(K.zoneRadius).toBe(7);
    expect(BOWL_SIZE * BOWL_RIM_PX / SHEET_CELL).toBeCloseTo(K.zoneRadius * 2);
  });

  it('matches the processed sheets recorded in active-inventory.json', () => {
    const inventory = JSON.parse(readFileSync(resolve(ROOT, 'assets/vfx-source/kimthien/active-inventory.json'), 'utf8')) as {
      bowls: { canvas: number; bottom: number; floorCenterPx: number; holdExtent: { rear: { left: number; right: number; bottom: number } }; emptyFrames: Record<string, number[]> };
      collapse: { extent: number[][] };
    };
    expect(inventory.bowls.canvas).toBe(SHEET_CELL);
    expect(inventory.bowls.floorCenterPx / SHEET_CELL).toBeCloseTo(BOWL_ANCHOR_Y);
    expect(inventory.bowls.holdExtent.rear.right - inventory.bowls.holdExtent.rear.left + 1).toBe(BOWL_RIM_PX);
    expect(inventory.bowls.emptyFrames.rear).toEqual([]);
    expect(inventory.bowls.emptyFrames.front).toEqual([]);
    // The collapse bud's pedestal bottom is the same on every frame (anchored), and COLLAPSE_ANCHOR_Y seats it on the rear bottom.
    const bottoms = new Set(inventory.collapse.extent.map(box => box[3]));
    expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThanOrEqual(8);
    expect(COLLAPSE_ANCHOR_Y).toBeGreaterThan(BOWL_ANCHOR_Y);
  });

  it('keeps every runtime asset and the four atlas manifest entries on disk', () => {
    const entries = (atlases as { atlases: { id: string; url: string; frames: number; tile: string; framesDir: string }[] }).atlases;
    const expected: Record<string, [number, string]> = {
      'kimthien-bowl-rear': [16, '4x4'], 'kimthien-bowl-front': [16, '4x4'], 'kimthien-suction': [8, '4x2'], 'kimthien-collapse': [8, '4x2'],
    };
    for (const [id, [frames, tile]] of Object.entries(expected)) {
      const atlas = entries.find(entry => entry.id === id);
      expect(atlas?.frames, id).toBe(frames);
      expect(atlas?.tile, id).toBe(tile);
      expect(existsSync(resolve(ROOT, atlas?.framesDir ?? 'missing')), id).toBe(true);
      expect(existsSync(resolve(ROOT, 'apps/client/public', (atlas?.url ?? 'missing').slice(1))), id).toBe(true);
    }
    expect(Object.keys((palettes as { materials: object }).materials)).toContain('jade');
    expect(Object.keys(SPRAY_PRESETS)).toEqual(expect.arrayContaining(['bagua', 'kunlun']));
  });
});

describe('Kim Thiền bowl timeline', () => {
  it('opens wall and lip together on the same frame, never fully opaque before it has begun', () => {
    let clock = startBowl();
    expect(bowlLayerPose(clock, false).frame).toBe(0);
    clock = run(clock, APPEAR_SECONDS - .02);
    expect(clock.phase).toBe('appear');
    expect(bowlLayerPose(clock, false).frame).toBe(3);
    clock = run(clock, .1);
    expect(clock.phase).toBe('hold');
    expect(bowlLayerPose(clock, false).frame).toBeGreaterThanOrEqual(HOLD_START);
  });

  it('loops the hold frames while the server keeps reporting remaining, for the whole 5 s', () => {
    let clock = startBowl();
    const frames = new Set<number>();
    for (let t = 0; t < K.zoneSeconds - .5; t += 1 / 60) {
      clock = run(clock, 1 / 60, () => K.zoneSeconds - t);
      if (clock.phase === 'hold') frames.add(bowlLayerPose(clock, false).frame);
    }
    expect(clock.phase).toBe('hold');
    expect([...frames].sort((a, b) => a - b)).toEqual(Array.from({ length: HOLD_COUNT }, (_, i) => HOLD_START + i));
    expect(suctionPose(clock, false).alpha).toBe(SUCTION_ALPHA); // the suction is continuous through the hold
  });

  it('folds when the server clock runs out, then ends after 0.4 s with no further blast', () => {
    let clock = run(startBowl(), 1, () => 3);
    expect(clock.phase).toBe('hold');
    clock = run(clock, 1 / 30, () => COLLAPSE_SECONDS - .01);
    expect(shouldCollapse(clock)).toBe(true);
    expect(clock.phase).toBe('collapse');
    expect(bowlDone(clock, false)).toBe(false);
    clock = run(clock, COLLAPSE_SECONDS + .05);
    expect(bowlDone(clock, false)).toBe(true);
  });

  it('folds when the ground stops reporting the zone (left the area, ended early)', () => {
    let clock = run(startBowl(), 1, () => 4);
    clock = run(clock, MARK_GRACE + .05);
    expect(clock.phase).toBe('collapse');
  });

  it('plays an unconfirmed resolve (lobby practice) as a short show that still folds, never forever', () => {
    let clock = startBowl();
    expect(clock.confirmed).toBe(false);
    clock = run(clock, UNCONFIRMED_SECONDS - COLLAPSE_SECONDS - .05);
    expect(clock.phase).toBe('hold');
    clock = run(clock, .1);
    expect(clock.phase).toBe('collapse');
    expect(bowlDone(run(clock, COLLAPSE_SECONDS + .05), false)).toBe(true);
  });

  it('a late joiner skips the appear frames and starts holding', () => {
    const clock = markClock(startBowl({ late: true }), 2.5);
    expect(clock.phase).toBe('hold');
    expect(bowlLayerPose(clock, false).alpha).toBe(1);
  });

  it('dissolves the layers while the bud folds shut over eight frames and shrinks into the point', () => {
    const clock = run(run(startBowl(), 1, () => 3), 1 / 30, () => .2);
    expect(clock.phase).toBe('collapse');
    expect(bowlLayerPose(clock, false).frame).toBeGreaterThanOrEqual(BREAK_START);
    const early = budPose({ ...clock, phaseAge: .05 }, false);
    const late = budPose({ ...clock, phaseAge: COLLAPSE_SECONDS - .02 }, false);
    expect(early?.alpha).toBeGreaterThan(0);
    expect(late?.frame).toBe(7);
    expect(late?.scale).toBeLessThan(1);
    expect(bowlLayerPose({ ...clock, phaseAge: .2 }, false).alpha).toBe(0);
    expect(budPose({ ...clock, phase: 'hold' }, false)).toBeUndefined();
  });

  it('reduced motion keeps one still bowl at full range, folds in 0.2 s, and has no bud sheet', () => {
    let clock = run(startBowl(), .1, () => 4, true);
    expect(clock.phase).toBe('hold');
    expect(bowlLayerPose(clock, true)).toEqual({ frame: HOLD_START + 1, alpha: 1 });
    expect(suctionPose(clock, true).frame).toBe(suctionPose({ ...clock, age: 3 }, true).frame);
    clock = run(clock, 1 / 30, () => .1, true);
    expect(budPose(clock, true)).toBeUndefined();
    expect(bowlDone(run(clock, REDUCED_COLLAPSE_SECONDS + .05, undefined, true), true)).toBe(true);
  });

  it('gathers the windup swirl and hands its alpha to the resolve', () => {
    expect(windupPose(0, DEFAULT_WINDUP, false).alpha).toBe(0);
    expect(windupPose(DEFAULT_WINDUP, DEFAULT_WINDUP, false).alpha).toBe(SUCTION_ALPHA);
    expect(windupPose(DEFAULT_WINDUP, DEFAULT_WINDUP, false).scale).toBeCloseTo(1);
    const resolved = startBowl({ swirlFrom: .6 });
    expect(suctionPose(resolved, false).alpha).toBeCloseTo(SUCTION_ALPHA * .6);
  });

  it('only ever draws inward: every drop starts on the ring and flies toward the centre', () => {
    let seed = 1;
    const rand = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 200; i++) {
      const drop = inwardDrop(rand);
      expect(Math.hypot(drop.x, drop.z)).toBeLessThanOrEqual(K.zoneRadius + 1e-6);
      expect(drop.x * drop.vx + drop.z * drop.vz).toBeLessThan(0);
      // Longest spray life × speed (+ the spray's ±.5 scatter) stays short of the centre: no overshoot to the far side.
      expect(Math.hypot(drop.vx, drop.vz) * SPRAY_PRESETS.bagua.life[1] + .5).toBeLessThan(Math.hypot(drop.x, drop.z));
    }
  });

  it('a long frame does not fold a zone whose marks keep arriving, and a stalled fold goes back to holding', () => {
    let clock = run(startBowl(), 1, () => 4);
    clock = markClock(clock, 3.9);
    clock = advanceBowl(clock, 1.5, false); // tab refocus
    expect(clock.phase).toBe('hold');
    const folding = advanceBowl({ ...clock, seen: MARK_GRACE + 1 }, 1 / 60, false);
    expect(folding.phase).toBe('collapse');
    expect(markClock(folding, 3.5).phase).toBe('hold');
    expect(markClock(folding, .2).phase).toBe('collapse'); // really ending: stays folded
  });
});

describe('Kim Thiền bowl set lifecycle', () => {
  const stubs = () => {
    const art = { acquire: vi.fn(() => undefined), release: vi.fn(), frame: vi.fn() };
    const bank = { ring: vi.fn(), spray: vi.fn(() => ({ trail: vi.fn() })) };
    return { art, bank, bowls: new KimthienBowls(art as never, bank as never) };
  };
  const up = new Vector3(0, 1, 0), point = new Vector3(2, 0, 3);
  const frames = (bowls: KimthienBowls, seconds: number, id?: string, remaining?: () => number): void => {
    for (let t = 0; t < seconds; t += 1 / 60) { if (id && remaining) bowls.mark(id, point, remaining(), false); bowls.tick(1 / 60, up); }
  };

  it('does not rebuild a folded bowl from stale marks, and forgets the id once the marks stop', () => {
    const { bowls } = stubs();
    bowls.begin(point, 0, false);
    frames(bowls, 1, 'bowl-1', () => 3);
    frames(bowls, COLLAPSE_SECONDS + .3, 'bowl-1', () => .1); // server keeps one stale tick near zero
    expect(bowls.count).toBe(0);
    frames(bowls, .5, 'bowl-1', () => 0);
    expect(bowls.count).toBe(0);
    frames(bowls, 1.2); // marks stop: the id is forgotten
    bowls.mark('bowl-1', point, 4, false);
    expect(bowls.count).toBe(1);
  });

  it('ignores a zone first seen with less than the fold time left', () => {
    const { bowls } = stubs();
    bowls.mark('bowl-2', point, COLLAPSE_SECONDS - .05, false);
    expect(bowls.count).toBe(0);
  });

  it('a ground mark that arrives before the resolve event still gives exactly one bowl', () => {
    const { bowls } = stubs();
    bowls.mark('bowl-3', point, 4.9, false);
    expect(bowls.count).toBe(1);
    expect(bowls.begin(point, 0, false)).toBe(true);
    expect(bowls.count).toBe(1);
  });
});

describe('Kim Thiền routing and replay', () => {
  it('registers as a direct HeroVfx and no longer as a legacy adapter; the ground marker carries remaining', () => {
    expect(source('visual-effects.ts')).toContain('this.heroKit.register(this.kimthien)');
    expect(source('visual-hero-adapters-war.ts')).not.toContain("'h013'");
    const battlefield = readFileSync(resolve(__dirname, '../src/battlefield.ts'), 'utf8');
    expect(battlefield).toContain("registerReplay('h013'");
    expect(battlefield).toMatch(/markKimthienBowl\(ground\.id, [^\n]*ground\.remaining\)/);
  });

  it('layers the bowl by occlusion: rear in the world pass, front lip in the foreground pass', () => {
    const facade = source('visual-kimthien.ts');
    expect(facade).toMatch(/prepare\('rear'[^)]*depthAlways: true/);
    expect(facade).toMatch(/prepare\('front'[^)]*foreground: true/);
    expect(facade).not.toMatch(/prepare\('rear'[^)]*foreground/);
  });

  it('drops a cancelled cast after its windup with no bowl and never draws a blast', () => {
    const windup = source('visual-kimthien-windup.ts');
    expect(windup).toContain('windup + CAST_GRACE');
    expect(windup).not.toContain('KimthienBowls');
  });

  it('replays cast → resolve → ground markers counting 5 s down, a lobby resolve with none, a late join and a basic hit', () => {
    const cast = vi.fn((..._args: unknown[]) => true), ability = vi.fn((..._args: unknown[]) => true), markBowl = vi.fn();
    const replay = new KimthienReplay({ cast, ability, markBowl } as unknown as Pick<VisualKimthien, 'cast' | 'ability' | 'markBowl'>);
    const caster = new Vector3(0, 0, 0), point = new Vector3(0, 0, -7);
    expect(replay.start('nope', point, false, caster)).toBe(false);
    expect(replay.start('skill', point, false, caster)).toBe(true);
    expect(cast).toHaveBeenCalledTimes(1);
    replay.tick(DEFAULT_WINDUP / 2);
    expect(ability).not.toHaveBeenCalled();
    expect(markBowl).not.toHaveBeenCalled();
    replay.tick(DEFAULT_WINDUP);
    expect(ability).toHaveBeenCalledTimes(1);
    replay.tick(1);
    const remaining = markBowl.mock.calls.map(call => call[2] as number);
    expect(remaining.length).toBeGreaterThan(0);
    expect(remaining[remaining.length - 1]).toBeLessThan(K.zoneSeconds);
    replay.tick(10);
    const ended = markBowl.mock.calls.length;
    replay.tick(1);
    expect(markBowl.mock.calls.length).toBe(ended); // the zone is over: no more markers
    markBowl.mockClear(); ability.mockClear();
    replay.start('lobby', point, false, caster);
    replay.tick(.5);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability).toHaveBeenCalledTimes(1);
    expect(markBowl).not.toHaveBeenCalled();
    replay.start('late', point, false, caster);
    replay.tick(.1);
    expect(markBowl.mock.calls[0][2]).toBeLessThanOrEqual(2.5);
    replay.start('attack', point, false, caster);
    expect((ability.mock.calls.at(-1)?.[4] as { targets: unknown[] }).targets).toHaveLength(1);
  });
});
