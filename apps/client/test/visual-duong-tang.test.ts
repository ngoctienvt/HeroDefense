import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { VisualDuongTang, dharmaAim } from '../src/visual-duong-tang.js';
import { DharmaCharge } from '../src/visual-duong-tang-charge.js';
import { DharmaGround } from '../src/visual-duong-tang-ground.js';
import { DharmaArt } from '../src/visual-duong-tang-art.js';
import { DUONG_TANG as D, FILLET_CONTACT, FILLET_LIFE, GROUND_CLOSE, chantState, filletState, groundPose, closingFilletFrame } from '../src/visual-duong-tang-timeline.js';
import inventory from '../../../assets/vfx-source/duong-tang/active-inventory.json';
import layout from '../src/visual-duong-tang-layout.json';
const mesh = () => ({ position: Vector3.Zero(), scaling: Vector3.One(), rotation: Vector3.Zero(), visibility: 1, alphaIndex: 0 });
const paint = () => ({ planes: { acquire: vi.fn(), release: vi.fn() }, frame: vi.fn(), place: vi.fn(), ground: vi.fn(), clear: vi.fn() });

describe('Đường Tăng real aim fillet and authoritative pure land', () => {
  it('charges, holds the last cast frame, drops/contracts once and retains static reduced poses', () => {
    expect(chantState(.25, .25, false)).toEqual(chantState(.5, .25, false));
    expect(chantState(.2, .25, false).size).toBeGreaterThan(chantState(.05, .25, false).size);
    expect(filletState(FILLET_CONTACT / 2, false).lift).toBeGreaterThan(2);
    expect(filletState(FILLET_CONTACT, false)).toMatchObject({ lift: 0, impact: true, frame: 9 });
    expect(filletState(FILLET_LIFE, false).alpha).toBe(0);
    for (const age of [.01, .1, .23]) {
      expect(chantState(age, .25, true)).toEqual(chantState(0, .25, true));
      expect(filletState(age, true)).toMatchObject({ frame: 8, lift: 0 });
    }
  });
  it('drops exact border immediately on marker loss while the inner seal collapses within R', () => {
    expect(groundPose(3, undefined, false)).toMatchObject({ scale: 1, border: true });
    expect(groundPose(3, 0, false).border).toBe(false); expect(groundPose(0, undefined, false).border).toBe(false);
    expect(groundPose(3, GROUND_CLOSE / 2, false).scale).toBeLessThan(1);
    expect(groundPose(3, GROUND_CLOSE, false)).toMatchObject({ scale: 0, alpha: 0 });
    expect(groundPose(3, GROUND_CLOSE / 2, true)).toMatchObject({ scale: 1, bellFrame: 3 });
    for (let age = 0; age <= GROUND_CLOSE; age += .01) expect(closingFilletFrame(age, false)).not.toBe(9);
    expect(closingFilletFrame(GROUND_CLOSE, false)).toBe(15);
    expect(layout.dharma.radialEdge).toBeGreaterThan(.48);
    const size = D.radius / layout.dharma.radialEdge; expect(size * layout.dharma.radialEdge).toBeCloseTo(6);
  });
  it('uses locked event coordinates over caster-adapter position and never turns a missing caster into a fake origin', () => {
    const event: GameEvent = { id: 1, kind: 'ability', source: 'caster', skillId: D.skill, x: 11, z: -5 };
    expect(dharmaAim(event, Vector3.Zero())).toEqual(new Vector3(11, 0, -5));
    const hero = Object.create(VisualDuongTang.prototype) as VisualDuongTang;
    const art = { prepare: vi.fn(), fillet: vi.fn() }, charge = { begin: vi.fn(), cancel: vi.fn() };
    Object.assign(hero, { art, charge }); const target = new Vector3(10, 0, -4);
    hero.cast({ ...event, kind: 'cast', windup: .25 }, Vector3.Zero(), false);
    expect(charge.begin).toHaveBeenCalledWith('caster', undefined, new Vector3(11, 0, -5), .25, false);
    hero.ability(event, Vector3.Zero(), Vector3.Zero(), false, { hasOrigin: false, targets: [target] });
    expect(charge.cancel).toHaveBeenCalledWith('caster'); expect(art.fillet).toHaveBeenCalledWith(new Vector3(11, 0, -5), [target], false);
    expect(hero.ability({ ...event, kind: 'attack' }, Vector3.Zero(), target, false)).toBe(false);
    expect(hero.cast({ ...event, skillId: 'tier3-tier4-h00R', kind: 'cast' }, target, false)).toBe(false);
  });
  it('updates charge shader uTime every frame, fixes aim R6 and watchdog-cleans without any fake impact', () => {
    const charge = Object.create(DharmaCharge.prototype) as DharmaCharge, painted = paint(), m = mesh(), material = { setFloat: vi.fn() };
    painted.planes.acquire.mockReturnValue(mesh());
    const layer = { mesh: m, material }, pool = { acquire: vi.fn(() => layer), release: vi.fn(), releaseAll: vi.fn() };
    Object.assign(charge, { scene: { activeCamera: null }, art: { paint: painted }, pool, entries: new Map() });
    const aim = new Vector3(8, 0, 3); charge.begin('cast', Vector3.Zero(), aim, .25, false);
    charge.tick(.05, 2); charge.tick(.05, 2.05);
    expect(material.setFloat).toHaveBeenCalledWith('uTime', 2); expect(material.setFloat).toHaveBeenCalledWith('uTime', 2.05);
    expect(m.position).toEqual(new Vector3(8, .045, 3)); expect(m.scaling).toEqual(new Vector3(12, 1, 12));
    expect(painted.place.mock.calls[1][3]).toBeGreaterThan(painted.place.mock.calls[0][3]);
    charge.tick(.5, 2.55); expect(pool.release).toHaveBeenCalledWith(layer); expect(painted.planes.release).toHaveBeenCalled();
    charge.begin('reduced', undefined, aim, .25, true); charge.tick(.05, 3);
    expect(material.setFloat).toHaveBeenCalledWith('uTime', 0); charge.clear(); expect(pool.releaseAll).toHaveBeenCalledOnce();
  });
  it('does not reset marker lifetime or replay cast when reconnecting; border releases before closing art', () => {
    const ground = Object.create(DharmaGround.prototype) as DharmaGround, painted = paint(), material = { setFloat: vi.fn() }, border = { mesh: mesh(), material };
    painted.planes.acquire.mockImplementation(() => mesh()); const art = { paint: painted, closeFillet: vi.fn() };
    const pool = { acquire: vi.fn(() => border), release: vi.fn(), releaseAll: vi.fn() };
    Object.assign(ground, { art, pool, entries: new Map() }); const at = Vector3.Zero();
    ground.mark('real', at, 6, 2.1, false); ground.tick(.01, 4);
    expect(painted.ground.mock.calls[0][3]).toBe(6); expect(art.closeFillet).not.toHaveBeenCalled();
    ground.mark('real', at, 6, 1.9, false); ground.tick(.01, 4.1);
    expect(pool.acquire).toHaveBeenCalledOnce(); expect(material.setFloat).toHaveBeenCalledWith('uTime', 4.1);
    ground.tick(.05, 4.15); expect(pool.release).toHaveBeenCalledExactlyOnceWith(border);
    expect(art.closeFillet).toHaveBeenCalledExactlyOnceWith(at, false, 6);
    expect(painted.ground.mock.calls.at(-1)?.[3]).toBeLessThan(6);
    ground.tick(.4, 4.55); expect(art.closeFillet).toHaveBeenCalledOnce(); ground.clear();
    expect(painted.planes.release.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
  it('one resolve produces exactly one hit with three material layers for every confirmed target', () => {
    const art = Object.create(DharmaArt.prototype) as DharmaArt, painted = paint(), spray = { ring: vi.fn() }, bank = { ring: vi.fn(), spray: vi.fn(() => spray) };
    Object.assign(art, { paint: painted, bank, fillets: [], hits: [] }); const aim = Vector3.Zero(), targets = [new Vector3(1, 0, 0), new Vector3(-2, 0, 1)];
    art.fillet(aim, targets, false); art.tick(.14); expect(bank.ring).not.toHaveBeenCalled();
    art.tick(.14); expect(bank.ring).toHaveBeenCalledTimes(2); expect(spray.ring).toHaveBeenCalledTimes(2);
    expect(bank.ring.mock.calls.map(c => c[0])).toEqual(targets); art.tick(.15); expect(bank.ring).toHaveBeenCalledTimes(2);
    art.fillet(aim, targets, false); art.clear(); art.tick(1); expect(bank.ring).toHaveBeenCalledTimes(2);
  });
  it('reduced mode keeps material/ground cues while omitting particle motion, and clear cancels pending replay', () => {
    const art = Object.create(DharmaArt.prototype) as DharmaArt, bank = { ring: vi.fn(), spray: vi.fn() };
    Object.assign(art, { paint: paint(), bank, fillets: [], hits: [] }); art.fillet(Vector3.Zero(), [new Vector3(2, 0, 0)], true); art.tick(.01);
    expect(bank.ring).toHaveBeenCalledOnce(); expect(bank.spray).not.toHaveBeenCalled();
    const source = readFileSync(new URL('../src/visual-duong-tang.ts', import.meta.url), 'utf8');
    expect(source).toContain('this.bank.clear()'); expect(source).toContain('this.previews.length = 0'); expect(source).toContain('this.replayPending = 0');
    expect(source).not.toContain('tryHardControl'); expect(source).not.toContain("mark('stun'");
  });
  it('preserves five exact art sources/hashes, measured rows and correct material passes', () => {
    expect(Object.keys(inventory)).toHaveLength(5);
    for (const item of Object.values(inventory)) {
      expect(createHash('sha256').update(readFileSync(new URL('../../../' + item.raw, import.meta.url))).digest('hex')).toBe(item.sha256);
      expect(createHash('sha256').update(readFileSync(new URL('../../../' + item.output, import.meta.url))).digest('hex')).toBe(item.outputSha256);
    }
    expect(inventory.fillet.sourceRects[0][3]).toBe(340); expect(layout.fillet.frames).toBe(16); expect(layout.bell.frames).toBe(8);
    const source = readFileSync(new URL('../src/visual-duong-tang-art.ts', import.meta.url), 'utf8');
    expect(source).toContain("['chant', 'fillet', 'hit']");
    expect(readFileSync(new URL('../src/visual-duong-tang-ground.ts', import.meta.url), 'utf8')).toContain("acquire('dharma', true)");
    expect(readFileSync(new URL('../../../assets/vfx-source/duong-tang/process-art.py', import.meta.url), 'utf8')).toContain('np.hypot');
  });
});

