import { describe, it, expect, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HeavenCharge } from '../src/visual-duong-tien-charge.js';
import { VisualDuongTien } from '../src/visual-duong-tien.js';
import { DUONG_TIEN as D, BEAM_REVEAL, SCORCH_LIFE, FORM_CLOSE, heavenDirection, heavenCharge, beamContactDelay, eyeBeamState, eyeScorchState, warGodPose } from '../src/visual-duong-tien-timeline.js';
/** Regression sources only; not executed after user's request to self-check. */
describe('Dương Tiễn eye line and own-provenance war god form', () => {
  it('uses true direction and cubic beam arrival, with UV/length reveal and contracting bounded scar', () => {
    expect(heavenDirection(undefined, undefined, { x: 3, z: 0 })).toBeUndefined();
    expect(heavenDirection({ x: NaN, z: 0 }, { x: 1, z: 1 }, { x: -2, z: 1 })).toEqual({ x: -1, z: 0 });
    expect(beamContactDelay({ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 12, z: 0 }, false)).toBe(BEAM_REVEAL);
    expect(eyeBeamState(BEAM_REVEAL / 2, false).reveal).toBeCloseTo(.125);
    const scar = eyeScorchState(1.1, false); expect(scar.tail).toBeGreaterThan(0); expect(scar.width).toBeLessThan(1);
    expect(eyeScorchState(SCORCH_LIFE, false).alpha).toBe(0); expect(eyeScorchState(.5, true)).toMatchObject({ head: 1, tail: 0, width: 1 });
  });
  it('holds late casts and uses independent unfolding/folding with a clear static reduced pose', () => {
    expect(heavenCharge(.25, .25, false)).toEqual(heavenCharge(.5, .25, false));
    expect(warGodPose(6, .01, undefined, false, true).width).toBeLessThan(1);
    expect(warGodPose(3, 0, undefined, false, false).width).toBe(1);
    expect(warGodPose(3, 1, FORM_CLOSE, false, true)).toMatchObject({ frame: 15, alpha: 0 });
    expect(warGodPose(3, 1, .1, true, true)).toMatchObject({ frame: 3, width: 1 });
  });
  it('sets charge uTime on each frame within the exact lane and releases on watchdog', () => {
    const charge = Object.create(HeavenCharge.prototype) as HeavenCharge;
    const mesh = { position: Vector3.Zero(), rotation: Vector3.Zero(), scaling: Vector3.One(), alphaIndex: 0 }, material = { setFloat: vi.fn() }, lane = { mesh, material };
    const pool = { acquire: vi.fn(() => lane), release: vi.fn(), releaseAll: vi.fn() };
    const art = { paint: { planes: { acquire: vi.fn(), release: vi.fn() }, frame: vi.fn() }, placeEye: vi.fn() };
    Object.assign(charge, { art, pool, entries: new Map() });
    charge.begin('caster', Vector3.Zero(), { x: 0, z: -1 }, .25, false); charge.tick(.05, 1); charge.tick(.05, 1.05);
    expect(material.setFloat).toHaveBeenCalledWith('uTime', 1.05); expect(mesh.position.z).toBe(-6);
    expect(mesh.scaling.x).toBe(12); expect(mesh.scaling.z).toBeLessThanOrEqual(3);
    charge.tick(.5, 1.55); expect(pool.release).toHaveBeenCalledWith(lane);
    charge.begin('static', Vector3.Zero(), { x: 1, z: 0 }, .25, true); charge.tick(.05, 3);
    expect(material.setFloat).toHaveBeenCalledWith('uTime', 0); charge.clear(); expect(pool.releaseAll).toHaveBeenCalledOnce();
  });
  it('withheld source never revives a stale cast, while actual contacts survive', () => {
    const hero = Object.create(VisualDuongTien.prototype) as VisualDuongTien;
    const art = { prepare: vi.fn(), strike: vi.fn() }, charge = { cancel: vi.fn() };
    Object.assign(hero, { art, charge }); const target = new Vector3(4, 0, 1);
    hero.ability({ id: 1, kind: 'ability', source: 'dead', skillId: D.skill }, Vector3.Zero(), target, false, { hasOrigin: false, targets: [target] });
    expect(charge.cancel).toHaveBeenCalledWith('dead'); expect(art.strike).toHaveBeenCalledWith(undefined, undefined, [target], false);
    expect(hero.ability({ id: 2, kind: 'attack', skillId: D.skill }, Vector3.Zero(), target, false)).toBe(false);
  });
});
