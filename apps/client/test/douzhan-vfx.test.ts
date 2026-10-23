import { beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DOUZHAN as D } from '../../../content/douzhan-design.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { buildStaffGeometry, staffAxis, staffBasis } from '../src/visual-douzhan-staff-geometry.js';
import { DouzhanClones } from '../src/visual-douzhan-clones.js';
import { DouzhanReplay } from '../src/visual-douzhan-replay.js';
import { DouzhanStrikes } from '../src/visual-douzhan-strike.js';
import * as T from '../src/visual-douzhan-timeline.js';

beforeAll(() => { vi.stubGlobal('location', { search: '' }); });

const ROOT = resolve(__dirname, '../../..');
const source = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');
const inventory = JSON.parse(readFileSync(resolve(ROOT, 'assets/vfx-source/douzhan/active-inventory.json'), 'utf8'));

/** Mesh stand-in: just what the modules read and write. */
const fakeMesh = () => ({ position: new Vector3(), scaling: new Vector3(1, 1, 1), visibility: 1 });
function fakeArt() {
  const live = new Set<unknown>();
  const art = { acquire: vi.fn(() => { const mesh = fakeMesh(); live.add(mesh); return mesh; }), frame: vi.fn(),
    release: vi.fn((mesh: unknown) => { if (mesh) live.delete(mesh); }) };
  return { art, live };
}
const scene = { activeCamera: null } as never;
const up = new Vector3(0, 1, 0);

describe('Đấu Chiến layout follows gameplay and the measured art', () => {
  it('keeps the lane, staff reach and fracture on the server numbers', () => {
    expect(T.LANE_LENGTH).toBe(D.staffLength);
    expect(T.LANE_WIDTH).toBe(D.staffWidth);
    expect(T.PIVOT_OFFSET + T.STAFF_LENGTH).toBeCloseTo(D.staffLength); // lying flat the tip reaches the lane end
    expect(T.FRACTURE_LENGTH * (T.FRACTURE_X1 - T.FRACTURE_X0)).toBeCloseTo(D.staffLength);
    expect(T.FRACTURE_WIDTH * (inventory.fracture.y1 - inventory.fracture.y0)).toBeLessThan(D.staffWidth); // painted height inside the lane
    expect(Math.max(...T.BURST_DISTANCES)).toBeLessThanOrEqual(D.staffLength);
    expect(T.CLONE_CAP).toBeGreaterThan(D.cloneSeconds);
  });

  it('matches the constants to the art inventory and keeps every runtime asset on disk', () => {
    expect(T.FRACTURE_X0).toBeCloseTo(inventory.fracture.x0, 3);
    expect(T.FRACTURE_X1).toBeCloseTo(inventory.fracture.x1, 3);
    expect(T.FRACTURE_ASPECT).toBe(inventory.fracture.aspect);
    expect(T.BURST_GROUND).toBeCloseTo(inventory.slam.groundFraction, 3);
    expect(T.BURST_FRAMES).toBe(inventory.slam.frames);
    expect(T.ARRIVAL_GROUND).toBeCloseTo(inventory.arrival.groundFraction, 3);
    expect(T.ARRIVAL_FRAMES).toBe(inventory.arrival.frames);
    expect(T.HIT_ANCHOR_X).toBeCloseTo(inventory.hit.anchorX, 3);
    expect(T.HIT_ANCHOR_Y).toBeCloseTo(inventory.hit.anchorY, 3);
    expect(T.HIT_FRAMES).toBe(inventory.hit.frames);
    expect(source('visual-douzhan-staff.ts')).toContain(`CAP_V = ${String(inventory.staff.capV).replace('0.', '.')}`);
    for (const file of ['staff', 'slam', 'fracture', 'arrival', 'hit'])
      expect(existsSync(resolve(ROOT, 'apps/client/public/assets', `vfx-douzhan-${file}.webp`)), file).toBe(true);
    expect(inventory.slam.emptyFrames).toEqual([]);
  });
});

describe('Đấu Chiến staff mesh', () => {
  it('maps the painted surface once around the rim with the seam at local +X, ends on the ring bands', () => {
    const g = buildStaffGeometry(.9944, 32);
    const body = g.uvs.slice(0, 2 * 33 * 2);
    const us = body.filter((_, i) => i % 2 === 0), vs = body.filter((_, i) => i % 2 === 1);
    expect(Math.min(...us)).toBe(0);
    expect(Math.max(...us)).toBe(1); // one wrap: 0 at the seam, 1 back at the seam, never beyond (no tiling)
    expect(new Set(vs)).toEqual(new Set([0, 1]));
    expect(g.positions[0]).toBeCloseTo(T.STAFF_RADIUS); // u = 0 sits on local +X
    expect(g.positions[2]).toBeCloseTo(0);
    const capUvs = g.uvs.slice(2 * 2 * 33);
    expect(capUvs.filter((_, i) => i % 2 === 1).every(v => v === .9944)).toBe(true);
    expect(g.normals).toHaveLength(g.positions.length);
    expect(Math.max(...g.positions.filter((_, i) => i % 3 === 1))).toBeCloseTo(T.STAFF_LENGTH);
  });

  it('winds every triangle (body and both caps) the same way as its authored outward normal', () => {
    const g = buildStaffGeometry(.9944, 16);
    const at = (i: number) => ({ x: g.positions[i * 3], y: g.positions[i * 3 + 1], z: g.positions[i * 3 + 2] });
    for (let t = 0; t < g.indices.length; t += 3) {
      const [a, b, c] = [at(g.indices[t]), at(g.indices[t + 1]), at(g.indices[t + 2])];
      const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
      const cross = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
      const n = [0, 1, 2].map(k => g.indices[t + k]).reduce((sum, i) => ({ x: sum.x + g.normals[i * 3], y: sum.y + g.normals[i * 3 + 1],
        z: sum.z + g.normals[i * 3 + 2] }), { x: 0, y: 0, z: 0 });
      expect(cross.x * n.x + cross.y * n.y + cross.z * n.z, `triangle ${t / 3}`).toBeGreaterThan(0);
    }
  });

  it('builds a rotation whose local Y is the staff axis and local X is the far side of the staff', () => {
    const look = { x: 0, y: -.62, z: -.78 };
    for (const angle of [T.LIE_ANGLE, T.RAISE_ANGLE, .3]) {
      for (const dir of [{ x: 0, z: -1 }, { x: 1, z: 0 }, { x: -.6, z: .8 }]) {
        const axis = staffAxis(dir, angle), basis = staffBasis(axis, look);
        const rotation = Vector3.RotationFromAxis(new Vector3(basis.x.x, basis.x.y, basis.x.z),
          new Vector3(basis.y.x, basis.y.y, basis.y.z), new Vector3(basis.z.x, basis.z.y, basis.z.z));
        const matrix = Matrix.RotationYawPitchRoll(rotation.y, rotation.x, rotation.z);
        const y = Vector3.TransformNormal(new Vector3(0, 1, 0), matrix), x = Vector3.TransformNormal(new Vector3(1, 0, 0), matrix);
        expect(y.x).toBeCloseTo(axis.x, 4); expect(y.y).toBeCloseTo(axis.y, 4); expect(y.z).toBeCloseTo(axis.z, 4);
        expect(x.x).toBeCloseTo(basis.x.x, 4); expect(x.y).toBeCloseTo(basis.x.y, 4); expect(x.z).toBeCloseTo(basis.x.z, 4);
        expect(x.x * look.x + x.y * look.y + x.z * look.z).toBeGreaterThan(0); // seam faces away from the camera
        expect(x.x * axis.x + x.y * axis.y + x.z * axis.z).toBeCloseTo(0, 4);
      }
    }
  });

  it('survives a staff pointing straight along the look direction', () => {
    const basis = staffBasis({ x: 0, y: -.62, z: -.78 }, { x: 0, y: -.62, z: -.78 });
    expect(Math.hypot(basis.x.x, basis.x.y, basis.x.z)).toBeCloseTo(1);
  });
});

describe('Đấu Chiến timeline', () => {
  it('grows and lifts the staff during the windup, then holds the last pose for a late resolve', () => {
    const start = T.raisePose(0, .25, false), end = T.raisePose(.25, .25, false);
    expect(start.scale).toBeCloseTo(T.GROW_FROM);
    expect(start.alpha).toBe(0);
    expect(end.angle).toBeCloseTo(T.RAISE_ANGLE);
    expect(end.scale).toBeCloseTo(1);
    expect(T.raisePose(2, .25, false)).toEqual(T.raisePose(.25, .25, false));
    expect(T.raisePose(.1, .25, true)).toEqual({ angle: .35, scale: 1, alpha: 1 });
  });

  it('slams fast and accelerating, touches down at SLAM_SECONDS, rebounds slightly, then fades', () => {
    expect(T.slamPose(0, false).angle).toBeCloseTo(T.RAISE_ANGLE);
    expect(T.slamPose(T.SLAM_SECONDS / 2, false).angle).toBeGreaterThan((T.RAISE_ANGLE + T.LIE_ANGLE) / 2); // launch curve: slow start
    expect(T.slamPose(T.SLAM_SECONDS - .001, false).landed).toBe(false);
    expect(T.slamPose(T.SLAM_SECONDS, false)).toMatchObject({ landed: true, angle: T.LIE_ANGLE });
    const peak = T.slamPose(T.SLAM_SECONDS + T.REBOUND_SECONDS / 2, false).angle;
    expect(peak).toBeCloseTo(T.REBOUND_ANGLE);
    expect(T.slamPose(T.SLAM_SECONDS + T.REBOUND_SECONDS, false).angle).toBeCloseTo(T.LIE_ANGLE);
    expect(T.slamPose(T.STAFF_LIFE, false).alpha).toBe(0);
    expect(T.contactDelay(false)).toBe(T.SLAM_SECONDS);
    expect(T.contactDelay(true)).toBe(0);
    expect(T.slamPose(0, true)).toMatchObject({ landed: true, angle: T.LIE_ANGLE });
  });

  it('rests the staff on the ground when it lies and lifts the pivot to the hand when raised', () => {
    expect(T.pivotHeight(T.LIE_ANGLE)).toBeLessThan(T.STAFF_RADIUS + .1);
    expect(T.pivotHeight(T.RAISE_ANGLE)).toBeCloseTo(T.HAND_HEIGHT);
  });

  it('spirals the clouds in and keeps the lane telegraph until the staff lands', () => {
    expect(T.cloudPose(0, 0, .25, false).radius).toBeGreaterThan(T.cloudPose(0, .25, .25, false).radius);
    expect(T.cloudPose(0, .25, .25, false).alpha).toBeCloseTo(.9);
    expect(T.laneAlpha(.25, .25, undefined, false)).toBeGreaterThan(T.laneAlpha(0, .25, undefined, false));
    expect(T.laneAlpha(.25, .25, .12, false)).toBe(0);
    expect(T.laneAlpha(.1, .25, undefined, true)).toBe(.5);
  });

  it('reveals the fracture toward the lane end, holds, then closes over 0.7 s', () => {
    expect(T.fractureHead(0, false)).toBe(0);
    expect(T.fractureHead(T.FRACTURE_REVEAL, false)).toBe(1);
    expect(T.fractureHead(.02, false)).toBeGreaterThan(.02 / T.FRACTURE_REVEAL); // the head leads (ease-out)
    expect(T.fracturePose(T.FRACTURE_HOLD, false)).toEqual({ alpha: 1, squeeze: 1 });
    expect(T.fracturePose(T.FRACTURE_HOLD + T.FRACTURE_CLOSE / 2, false).squeeze).toBeLessThan(1);
    expect(T.fracturePose(T.FRACTURE_LIFE, false).alpha).toBe(0);
    expect(T.FRACTURE_CLOSE).toBe(.7);
    expect(T.fractureHead(0, true)).toBe(1);
    expect(T.fractureLife(true)).toBeLessThan(T.fractureLife(false));
  });

  it('runs the rock bursts outward along the lane, once each, one burst in the middle with reduced motion', () => {
    const starts = T.BURST_DISTANCES.map((_, i) => T.burstStart(i, false));
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    expect(starts[0]).toBe(0);
    expect(T.burstFrame(0, false)).toBe(0);
    expect(T.burstFrame(99, false)).toBe(T.BURST_FRAMES - 1);
    expect(T.burstAlpha(T.BURST_LIFE, false)).toBe(0);
    expect(T.burstDistances(true)).toEqual([T.BURST_DISTANCES[2]]);
    expect(T.shockArrival(0, false)).toBe(0);
    expect(T.shockArrival(D.staffLength, false)).toBeCloseTo((T.BURST_DISTANCES.length - 1) * T.BURST_STAGGER);
    expect(T.shockArrival(5, true)).toBe(0);
  });

  it('plays the clone cloud once, holds a dim seal, then folds away', () => {
    expect(T.clonePose('arrive', 0, 0, false).frame).toBe(0);
    expect(T.clonePose('arrive', T.ARRIVAL_LIFE - .001, 0, false).frame).toBe(T.ARRIVAL_FRAMES - 1);
    expect(T.clonePose('hold', 3, 1, false).frame).toBe(T.HOLD_FRAME);
    expect(T.clonePose('hold', 3, 1, true).scale).toBe(1);
    expect(T.clonePose('exit', T.EXIT_SECONDS, 0, false).alpha).toBe(0);
    expect(T.clonePose('exit', 0, 0, false).alpha).toBe(1);
  });

  it('swings the clone staff down fast, contacts on frame 3 and fades after the last frame', () => {
    expect(T.hitFrame(0, false)).toBe(0);
    expect(T.hitFrame(T.HIT_CONTACT_SECONDS, false)).toBe(3);
    expect(T.hitFrame(99, false)).toBe(T.HIT_FRAMES - 1);
    expect(T.hitAlpha(T.HIT_LIFE, false)).toBe(0);
    expect(T.hitFrame(0, true)).toBe(3);
    expect(T.hitLife(true)).toBeLessThan(T.hitLife(false));
  });
});

function strikeRig() {
  const { art, live } = fakeArt();
  const spray = { rise: vi.fn() };
  const bank = { spray: vi.fn(() => spray) };
  const staffs = { acquire: vi.fn(() => fakeMesh()), pose: vi.fn(), release: vi.fn() };
  const lanes = { acquire: vi.fn(() => fakeMesh()), place: vi.fn(), release: vi.fn() };
  const strikes = new DouzhanStrikes(art as never, bank as never, staffs as never, lanes as never);
  const touchdown = vi.fn();
  const run = (seconds: number, step = .016) => { for (let t = 0; t < seconds; t += step) strikes.tick(step, up, touchdown); };
  return { strikes, staffs, lanes, touchdown, run, live, spray };
}
const origin = new Vector3(2, 0, 3), dir = { x: 0, z: -1 };

describe('Đấu Chiến strike lifecycle', () => {
  it('lifts the staff on the cast, touches down once after the resolve, then releases everything', () => {
    const rig = strikeRig();
    rig.strikes.begin('u1', origin, dir, .25, false);
    expect(rig.spray.rise).toHaveBeenCalledTimes(1);
    rig.run(.25);
    expect(rig.touchdown).not.toHaveBeenCalled();
    expect(rig.live.size).toBe(T.CLOUD_COUNT);
    expect(rig.lanes.place).toHaveBeenCalled();
    expect(rig.strikes.resolve('u1', origin, dir, [new Vector3(2, 0, -4)], false, .25)).toBe(true);
    rig.run(T.SLAM_SECONDS - .03);
    expect(rig.touchdown).not.toHaveBeenCalled();
    rig.run(.08);
    expect(rig.touchdown).toHaveBeenCalledTimes(1);
    expect(rig.touchdown.mock.calls[0][2]).toHaveLength(1);
    rig.run(T.STAFF_LIFE + .1);
    expect(rig.touchdown).toHaveBeenCalledTimes(1);
    expect(rig.staffs.release).toHaveBeenCalled();
    expect(rig.lanes.release).toHaveBeenCalled();
    expect(rig.live.size).toBe(0);
  });

  it('still plays when the ability arrives without a cast (lobby, reconnect)', () => {
    const rig = strikeRig();
    expect(rig.strikes.resolve('u1', origin, dir, [], false, .25)).toBe(false);
    rig.run(.5);
    expect(rig.touchdown).toHaveBeenCalledTimes(1);
  });

  it('touches down at once with reduced motion and starts no spray', () => {
    const rig = strikeRig();
    rig.strikes.begin('u1', origin, dir, .25, true);
    expect(rig.spray.rise).not.toHaveBeenCalled();
    rig.strikes.resolve('u1', origin, dir, [], true, .25);
    rig.run(.05);
    expect(rig.touchdown).toHaveBeenCalledTimes(1);
  });

  it('cleans up a cast that never resolves after the windup plus grace, with no impact', () => {
    const rig = strikeRig();
    rig.strikes.begin('u1', origin, dir, .25, false);
    rig.run(.25 + T.CAST_GRACE + .5);
    expect(rig.touchdown).not.toHaveBeenCalled();
    expect(rig.live.size).toBe(0);
    expect(rig.staffs.release).toHaveBeenCalled();
    expect(rig.lanes.release).toHaveBeenCalled();
  });

  it('replaces a pending cast of the same caster and returns everything on clear()', () => {
    const rig = strikeRig();
    rig.strikes.begin('u1', origin, dir, .25, false);
    rig.run(.1);
    rig.strikes.begin('u1', origin, { x: 1, z: 0 }, .25, false);
    rig.run(.1);
    rig.strikes.clear();
    expect(rig.live.size).toBe(0);
    expect(rig.staffs.release.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

function cloneRig() {
  const { art, live } = fakeArt();
  const clones = new DouzhanClones(scene, art as never);
  let time = 0;
  const tick = (seconds: number, ids: string[], at = new Vector3(5, 0, 5)) => {
    for (let t = 0; t < seconds; t += .05) { for (const id of ids) clones.mark(id, at, false); time += .05; clones.tick(.05, time, up); }
  };
  return { clones, art, live, tick };
}
const frames = (art: ReturnType<typeof fakeArt>['art']): number[] => art.frame.mock.calls.map(call => call[1] as number);

describe('Đấu Chiến clones follow the snapshot', () => {
  it('plays the arrival cloud at each clone first seen right after summon-h012, near its point', () => {
    const rig = cloneRig();
    rig.clones.arm(new Vector3(5, 0, 5));
    rig.tick(.1, ['a', 'b', 'c']);
    expect(frames(rig.art)).toContain(0);
    rig.tick(T.ARRIVAL_LIFE + .2, ['a', 'b', 'c']);
    expect(frames(rig.art)).toContain(T.ARRIVAL_FRAMES - 1);
    expect(rig.live.size).toBe(3);
  });

  it('gives a clone seen without a summon (reconnect) or far from its point only the seal, no arrival', () => {
    const rig = cloneRig();
    rig.tick(.2, ['late']);
    expect(frames(rig.art).every(frame => frame === T.HOLD_FRAME)).toBe(true);
    const far = cloneRig();
    far.clones.arm(new Vector3(40, 0, 40));
    far.tick(.2, ['far']);
    expect(frames(far.art).every(frame => frame === T.HOLD_FRAME)).toBe(true);
  });

  it('closes the arrival window after ARRIVAL_WINDOW seconds', () => {
    const rig = cloneRig();
    rig.clones.arm(new Vector3(5, 0, 5));
    rig.tick(T.ARRIVAL_WINDOW + .2, ['first']);
    rig.art.frame.mockClear();
    rig.tick(.2, ['first', 'second']);
    expect(frames(rig.art).every(frame => frame === T.HOLD_FRAME)).toBe(true);
  });

  it('folds the cloud away quickly when the unit is gone and keeps no fake clone', () => {
    const rig = cloneRig();
    rig.tick(1, ['a']);
    expect(rig.live.size).toBe(1);
    rig.tick(T.EXIT_SECONDS + .1, []);
    expect(rig.live.size).toBe(0);
    rig.tick(1, []);
    expect(rig.live.size).toBe(0);
  });

  it('never keeps a seal past the safety cap even if the snapshot still has the unit', () => {
    const rig = cloneRig();
    rig.tick(T.CLONE_CAP + 1, ['stuck']);
    expect(rig.live.size).toBe(0);
    rig.tick(1, ['stuck']);
    expect(rig.live.size).toBe(0);
    rig.tick(.3, []); // unit finally gone, then a new clone with the same id may appear again
    rig.tick(.2, ['stuck']);
    expect(rig.live.size).toBe(1);
  });

  it('draws a clone strike only for clone events and mirrors it toward the screen side of the attacker', () => {
    const rig = cloneRig();
    rig.clones.hit(new Vector3(0, 0, 0), new Vector3(-3, 0, 0), false, false);
    rig.clones.hit(new Vector3(0, 0, 0), new Vector3(3, 0, 0), false, true);
    rig.clones.tick(.01, .01, up);
    const scales = rig.art.acquire.mock.results.map(result => (result.value as ReturnType<typeof fakeMesh>).scaling.x);
    expect(scales).toHaveLength(2);
    expect(Math.sign(scales[0])).not.toBe(Math.sign(scales[1])); // camera at +Z: +X reads as screen-left
    expect(Math.abs(scales[1])).toBeGreaterThan(Math.abs(scales[0])); // a crit echo is bigger
    rig.clones.clear();
    expect(rig.live.size).toBe(0);
  });
});

describe('Đấu Chiến routing and registration', () => {
  it('is a direct HeroVfx that handles the five h012 ability ids and leaves the basic attack alone', () => {
    const text = source('visual-douzhan.ts');
    expect(text).toContain('implements HeroVfx');
    for (const id of ['skill-${D.id}', 'summon-${D.id}', 'clone-attack-${D.id}', 'clone-crit-${D.id}', 'buddha-shadow-${D.id}'])
      expect(text).toContain(id);
    expect(text).not.toMatch(/trait-\$\{D\.id\}|trait-h012/);
    expect(text).toContain('default: return false');
  });

  it('draws the heavy layers in the foreground pass and the fracture decal on the ground', () => {
    const text = source('visual-douzhan.ts');
    for (const id of ['cloud', 'slam', 'hit']) expect(text).toMatch(new RegExp(`prepare\\('${id}'[^;]*foreground: true`));
    expect(text).toMatch(/prepare\('fracture'[^;]*depthAlways: true/);
    expect(text).toMatch(/prepare\('cloud-hold'[^;]*depthAlways: true/); // the long-held clone seal never covers monsters
    expect(source('visual-douzhan-clones.ts')).toContain("'cloud-hold'");
    expect(source('visual-douzhan-staff.ts')).toContain('COMBAT_DRAW_GROUP.skill');
    expect(source('visual-douzhan-staff.ts')).toContain('Engine.ALWAYS');
  });

  it('is registered on the kit and no longer on the legacy adapter', () => {
    expect(source('visual-effects.ts')).toContain('this.heroKit.register(this.douzhan)');
    expect(source('visual-effects.ts')).not.toMatch(/douzhan:\s*this\.douzhan/);
    expect(source('visual-hero-adapters-war.ts')).not.toMatch(/h012|douzhan/i);
    expect(source('visual-effects.ts')).toContain("this.douzhan.mark('clone'");
    expect(readFileSync(resolve(__dirname, '../src/battlefield.ts'), 'utf8')).toContain("registerReplay('h012'");
  });

  it('keeps the new modules small', () => {
    for (const file of ['visual-douzhan.ts', 'visual-douzhan-strike.ts', 'visual-douzhan-impact.ts', 'visual-douzhan-clones.ts',
      'visual-douzhan-staff.ts', 'visual-douzhan-lane.ts', 'visual-douzhan-replay.ts', 'visual-douzhan-timeline.ts'])
      expect(source(file).split('\n').length, file).toBeLessThan(200);
  });
});

describe('Đấu Chiến replay', () => {
  const make = () => {
    const vfx = { cast: vi.fn(() => true), ability: vi.fn(() => true), mark: vi.fn() };
    return { vfx, replay: new DouzhanReplay(vfx) };
  };

  it('plays the real sequence: cast, windup, ability, summon, then three snapshot clones for a few seconds', () => {
    const { vfx, replay } = make();
    expect(replay.start('skill', new Vector3(0, 0, -9), false, new Vector3(0, 0, 0))).toBe(true);
    expect(vfx.cast).toHaveBeenCalledTimes(1);
    expect((vfx.cast.mock.calls[0] as unknown as [GameEvent])[0].direction).toEqual({ x: 0, z: -1 });
    replay.tick(.1);
    expect(vfx.ability).not.toHaveBeenCalled();
    replay.tick(.2);
    expect(vfx.ability.mock.calls.map(call => (call as unknown as [GameEvent])[0].skillId)).toEqual(['skill-h012', 'summon-h012']);
    replay.tick(.05);
    expect(vfx.mark).toHaveBeenCalledTimes(3);
    expect(vfx.mark.mock.calls.every(call => (call as unknown[])[0] === 'clone')).toBe(true);
    replay.tick(5);
    const marks = vfx.mark.mock.calls.length;
    replay.tick(1);
    expect(vfx.mark.mock.calls.length).toBe(marks);
  });

  it('runs the lobby ability without a cast, three clone strikes, and rejects unknown kinds', () => {
    const { vfx, replay } = make();
    expect(replay.start('lobby', new Vector3(0, 0, -9), false, new Vector3())).toBe(true);
    expect(vfx.cast).not.toHaveBeenCalled();
    replay.tick(.01);
    expect(vfx.ability).toHaveBeenCalledTimes(2);
    const clone = make();
    expect(clone.replay.start('clone', new Vector3(0, 0, -9), false, new Vector3())).toBe(true);
    expect(clone.vfx.ability.mock.calls.map(call => (call as unknown as [GameEvent])[0].skillId)).toEqual(Array(3).fill('clone-attack-h012'));
    expect(clone.replay.start('nope', new Vector3(), false)).toBe(false);
  });

  it('clear() cancels a pending resolve', () => {
    const { vfx, replay } = make();
    replay.start('skill', new Vector3(0, 0, -9), false, new Vector3());
    replay.clear();
    replay.tick(1);
    expect(vfx.ability).not.toHaveBeenCalled();
  });
});
