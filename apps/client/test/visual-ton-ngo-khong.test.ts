import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MONKEY as M, CONTACT, STAFF_LIFE, CRACK_LIFE, artFrame, crackState, freshClone, inMonkeyLane, monkeyDirection, raisedStaff, slamStaff } from '../src/visual-ton-ngo-khong-timeline.js';
import { MonkeyClones } from '../src/visual-ton-ngo-khong-clones.js';
import { MonkeyCharge, monkeyChargeState } from '../src/visual-ton-ngo-khong-charge.js';
import { MonkeyAction } from '../src/visual-ton-ngo-khong-action.js';
import { monkeyStaffGeometry } from '../src/visual-ton-ngo-khong-staff.js';
import { VisualTonNgoKhong } from '../src/visual-ton-ngo-khong.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import inventory from '../../../assets/vfx-source/ton-ngo-khong/active-inventory.json';
import layout from '../src/visual-ton-ngo-khong-layout.json';
const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');

describe('Tôn Ngộ Không actual ruyi staff and snapshot clones', () => {
  it('holds raised staff on late resolve, accelerates one slam and closes the bounded lane', () => {
    expect(raisedStaff(.25, .25, false)).toEqual(raisedStaff(.5, .25, false));
    expect(slamStaff(CONTACT / 2, false).angle).toBeGreaterThan(.9);
    expect(slamStaff(CONTACT, false).angle).toBeLessThan(.05);
    expect(slamStaff(STAFF_LIFE, false).alpha).toBe(0);
    expect(crackState(.2, false).reveal).toBe(1); expect(crackState(CRACK_LIFE, false)).toMatchObject({ width: 0, alpha: 0 });
    for (const t of [.05, .4, 1]) {
      expect(raisedStaff(t, .25, true).angle).toBe(1.25); expect(slamStaff(t, true).angle).toBe(0);
      expect(crackState(t, true)).toMatchObject({ reveal: 1, width: 1 }); expect(artFrame(t, .8, 16, true)).toBe(3);
    }
    expect(inMonkeyLane({ x: 0, z: 0 }, { x: 0, z: -1 }, { x: 1.5, z: -9 })).toBe(true);
    expect(inMonkeyLane({ x: 0, z: 0 }, { x: 0, z: -1 }, { x: 1.501, z: -9 })).toBe(false);
    expect(inMonkeyLane({ x: 0, z: 0 }, { x: 0, z: -1 }, { x: 0, z: -9.001 })).toBe(false);
  });
  it('uses event axis or actual origin to aim, never a fixed fallback', () => {
    expect(monkeyDirection({ x: 3, z: 4 }, undefined, { x: 0, z: 0 })).toEqual({ x: .6, z: .8 });
    expect(monkeyDirection({ x: NaN, z: 0 }, { x: 3, z: 1 }, { x: -2, z: 1 })).toEqual({ x: -1, z: 0 });
    expect(monkeyDirection(undefined, undefined, { x: 7, z: 2 })).toBeUndefined();
    expect(monkeyDirection(undefined, { x: 0, z: 0 }, { x: 0, z: 0 })).toBeUndefined();
  });
  it('puffs only an actual newborn and unravels once when its touched marker is absent', () => {
    const art = { play: vi.fn() }, clones = new MonkeyClones(art as never), at = Vector3.Zero();
    expect(freshClone(6)).toBe(true); expect(freshClone(4)).toBe(false);
    clones.mark('reconnected', at, 3, false); clones.endFrame(); expect(art.play).not.toHaveBeenCalled();
    clones.mark('reconnected', at, 2.9, false); clones.mark('born', at, 6, false); clones.endFrame();
    expect(art.play).toHaveBeenCalledTimes(1); expect(art.play.mock.calls[0][0]).toBe('puff');
    clones.mark('reconnected', at, 2.8, false); clones.endFrame();
    expect(art.play.mock.calls[1][0]).toBe('unravel'); clones.clear(); clones.endFrame(); expect(art.play).toHaveBeenCalledTimes(2);
  });
  it('clear drops all pending slam targets and releases staff; canceled cast cannot impact', () => {
    const action = Object.create(MonkeyAction.prototype) as MonkeyAction;
    const art = { impact: vi.fn(), crack: vi.fn() }, staffs = { clear: vi.fn(), release: vi.fn(), acquire: vi.fn(), pose: vi.fn() };
    const charge = { begin: vi.fn(), cancel: vi.fn(), clear: vi.fn(), tick: vi.fn() };
    Object.assign(action, { art, staffs, charge, casts: new Map(), strikes: [] });
    const origin = Vector3.Zero(), dir = { x: 1, z: 0 }, target = new Vector3(5, 0, 0);
    action.begin('caster', origin, dir, .25, false); action.tick(.6);
    expect(art.impact).not.toHaveBeenCalled(); action.resolve('caster', origin, dir, [target], false);
    action.tick(.06); expect(art.impact).not.toHaveBeenCalled(); action.tick(.06);
    expect(art.impact).toHaveBeenCalledOnce(); expect(art.crack).toHaveBeenCalledWith(origin, dir, false);
    action.resolve('caster', origin, dir, [target], false); action.clear(); action.tick(1);
    expect(art.impact).toHaveBeenCalledOnce(); expect(staffs.clear).toHaveBeenCalledOnce();
  });
  it('claims only its ultimate or clone sweep, preserving ordinary attacks and no fake aim hits', () => {
    const hero = Object.create(VisualTonNgoKhong.prototype) as VisualTonNgoKhong;
    const action = { resolve: vi.fn(), begin: vi.fn() }, art = { prepare: vi.fn(), play: vi.fn(), impact: vi.fn() };
    Object.assign(hero, { action, art }); const origin = Vector3.Zero(), aim = new Vector3(8, 0, 0), target = new Vector3(5, 0, 0);
    const event: GameEvent = { id: 1, kind: 'ability', source: 'caster', skillId: M.skill };
    hero.ability(event, origin, aim, false, { hasOrigin: true, targets: [target] });
    expect(action.resolve).toHaveBeenCalledWith('caster', origin, { x: 1, z: 0 }, [target], false);
    hero.ability(event, origin, aim, false, { hasOrigin: false, targets: [] });
    expect(action.resolve).toHaveBeenLastCalledWith('caster', undefined, undefined, [], false);
    expect(hero.ability({ ...event, kind: 'attack' }, origin, aim, false)).toBe(false);
    expect(hero.cloneSweep({ ...event, kind: 'attack', skillId: 'trait-h00R' }, origin, [target], false, aim)).toBe(false);
    hero.cloneSweep({ ...event, kind: 'attack', skillId: M.cloneSkill }, origin, [target], false, aim);
    expect(art.impact).toHaveBeenCalledWith(target, false, true);
  });
  it('animates actual shader time and windup power inside a 9x3 lane, cancels and watchdog-cleans', () => {
    const charge = Object.create(MonkeyCharge.prototype) as MonkeyCharge;
    const material = { setFloat: vi.fn() }, mesh = { position: new Vector3(), scaling: new Vector3(), rotation: new Vector3(), alphaIndex: 0 };
    const layer = { material, mesh }, pool = { acquire: vi.fn(() => layer), release: vi.fn(), releaseAll: vi.fn() };
    Object.assign(charge, { pool, charges: new Map() });
    const at = Vector3.Zero(), dir = { x: 0, z: -1 };
    charge.begin('caster', at, dir, .25, false); charge.tick(.05, 10); const firstWidth = mesh.scaling.z;
    charge.tick(.05, 10.1); expect(mesh.scaling.z).toBeGreaterThan(firstWidth);
    expect(material.setFloat).toHaveBeenCalledWith('uTime', 10); expect(material.setFloat).toHaveBeenCalledWith('uTime', 10.1);
    for (const age of [0, .05, .12, .25, .5]) {
      const state = monkeyChargeState(age, .25, false, 20);
      expect(state.length).toBeLessThanOrEqual(9); expect(state.width).toBeLessThanOrEqual(3);
      expect(state.length).toBeGreaterThan(0); expect(state.alpha).toBeGreaterThan(0);
    }
    expect(mesh.position.z).toBe(-mesh.scaling.x / 2); expect(mesh.position.x).toBe(0);
    charge.cancel('caster'); expect(pool.release).toHaveBeenCalledWith(layer);
    charge.begin('reduced', at, dir, .25, true); charge.tick(.05, 30);
    expect(material.setFloat).toHaveBeenCalledWith('uTime', 0);
    expect(monkeyChargeState(.01, .25, true, 2)).toEqual(monkeyChargeState(.2, .25, true, 9));
    charge.tick(1, 31); expect(pool.release).toHaveBeenCalledTimes(2);
    charge.clear(); expect(pool.releaseAll).toHaveBeenCalledOnce();
  });
  it('cancels cached staff when the caller withholds dead/offzone source and shows only real targets', () => {
    const action = Object.create(MonkeyAction.prototype) as MonkeyAction, origin = Vector3.Zero(), target = new Vector3(4, 0, 0), oldMesh = {};
    const art = { impact: vi.fn(), crack: vi.fn() }, staffs = { release: vi.fn(), acquire: vi.fn(), clear: vi.fn() };
    const charge = { cancel: vi.fn(), clear: vi.fn(), tick: vi.fn() };
    const casts = new Map([['dead', { origin, dir: { x: 1, z: 0 }, mesh: oldMesh }]]);
    Object.assign(action, { art, staffs, charge, casts, strikes: [] });
    action.resolve('dead', undefined, undefined, [target], false); action.tick(.2, 10);
    expect(charge.cancel).toHaveBeenCalledWith('dead'); expect(staffs.release).toHaveBeenCalledWith(oldMesh);
    expect(art.impact).toHaveBeenCalledExactlyOnceWith(target, false); expect(art.crack).not.toHaveBeenCalled();
    expect(staffs.acquire).not.toHaveBeenCalled();
  });
  it('uses a closed dimensional mesh with cloud-cap profile and finite UVs', () => {
    const g = monkeyStaffGeometry(); expect(g.positions.length / 3).toBeGreaterThan(1300);
    expect(g.positions.every(Number.isFinite)).toBe(true); expect(g.uvs.every(v => v >= 0 && v <= 1)).toBe(true);
    expect(Math.max(...g.indices)).toBeLessThan(g.positions.length / 3);
    const topRadii = Array.from({ length: 65 }, (_, i) => Math.abs(g.positions[i * 21 * 3 + 1]));
    expect(Math.max(...topRadii)).toBeGreaterThan(Math.min(...topRadii) * 2);
    // Outward normal at the top-facing central ring prevents an inside-out lacquer surface.
    const i = 32 * 21 * 3; expect(g.normals[i + 1]).toBeGreaterThan(0);
  });
  it('retains source and output hashes, measured grids and foreground/world separation', () => {
    expect(Object.keys(inventory)).toHaveLength(6);
    for (const item of Object.values(inventory)) {
      const raw = readFileSync(new URL('../../../' + item.raw, import.meta.url)); expect(createHash('sha256').update(raw).digest('hex')).toBe(item.sha256);
      const packed = readFileSync(new URL('../../../' + item.output, import.meta.url)); expect(createHash('sha256').update(packed).digest('hex')).toBe(item.outputSha256);
    }
    expect(layout.burst.frames).toBe(16); expect(layout.puff.frames).toBe(8);
    const art = read('../src/visual-ton-ngo-khong-art.ts'), source = read('../src/visual-ton-ngo-khong.ts');
    expect(art).toContain("['burst', 'puff', 'sweep', 'unravel']"); expect(art).toContain("acquire('crack', true)");
    expect(source).toContain('this.clones.endFrame()'); expect(source).toContain('this.bank.clear()');
    expect(source).toContain('extra?.hasOrigin === true'); expect(source).not.toContain('summonKind =');
  });
});

