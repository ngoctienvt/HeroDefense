import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { VisualLoiChanTu, stormFocus } from '../src/visual-loi-chan-tu.js';
import { StormCharge } from '../src/visual-loi-chan-tu-charge.js';
import { StormBarrage } from '../src/visual-loi-chan-tu-barrage.js';
import { StormBurn } from '../src/visual-loi-chan-tu-burn.js';
import { StormArt } from '../src/visual-loi-chan-tu-art.js';
import { LOI as L, BOLT_CONTACT, PULSE_LIFE, STORM_CLOSE, BURN_CLOSE, stormCharge, boltPose, stormPose, staticBurnPose } from '../src/visual-loi-chan-tu-timeline.js';
import inventory from '../../../assets/vfx-source/loi-chan-tu/active-inventory.json';
import layout from '../src/visual-loi-chan-tu-layout.json';
const mesh = () => ({ position: Vector3.Zero(), scaling: Vector3.One(), rotation: Vector3.Zero(), visibility: 1, alphaIndex: 0, billboardMode: 0, rotationQuaternion: null });
const paint = () => ({ planes: { acquire: vi.fn(), release: vi.fn() }, frame: vi.fn(), place: vi.fn(), ground: vi.fn(), clear: vi.fn() });

describe('Lôi Chấn Tử event-driven thunder barrage and true electric burn', () => {
  it('holds a canceled/late cast safely, accelerates a feather bolt and ends real contact exactly once', () => {
    expect(stormCharge(.25, .25, false)).toEqual(stormCharge(.5, .25, false));
    expect(stormCharge(.2, .25, false).scale).toBeGreaterThan(stormCharge(.05, .25, false).scale);
    expect(boltPose(BOLT_CONTACT / 2, false).headHeight).toBeGreaterThan(5);
    expect(boltPose(BOLT_CONTACT, false)).toMatchObject({ headHeight: 0, visible: false, hitFrame: 0 });
    expect(boltPose(PULSE_LIFE, false).alpha).toBe(0);
    expect(stormPose(.1, STORM_CLOSE, false)).toMatchObject({ alpha: 0, border: false });
    for (const age of [.01, .1, .23]) {
      expect(stormCharge(age, .25, true)).toEqual(stormCharge(0, .25, true));
      expect(boltPose(age, true)).toMatchObject({ headHeight: 0, visible: false, hitFrame: 1 });
    }
  });
  it('electric residue loops only the live side-arcs and discharges/coils after real marker loss', () => {
    for (const remaining of [3, 2.7, 2, 1, .01]) expect(staticBurnPose(remaining, undefined, false).frame).toBeLessThan(12);
    expect(staticBurnPose(1, 0, false).frame).toBe(12); expect(staticBurnPose(1, BURN_CLOSE, false)).toMatchObject({ frame: 15, alpha: 0 });
    expect(staticBurnPose(1, BURN_CLOSE / 2, false).scale).toBeLessThan(1);
    expect(staticBurnPose(1, BURN_CLOSE / 2, true)).toMatchObject({ frame: 4, scale: 1 });
    expect(stormPose(1, 0, false).border).toBe(false);
    expect(L.radius / layout.warning.radialEdge * layout.warning.radialEdge).toBeCloseTo(6.5);
  });
  it('initial ability schedules no hit; exact trait pulse uses actual focus/targets even with caster missing', () => {
    const hero = Object.create(VisualLoiChanTu.prototype) as VisualLoiChanTu;
    const art = { prepare: vi.fn(), pulse: vi.fn() }, charge = { begin: vi.fn(), cancel: vi.fn() }, bank = { after: vi.fn() }, barrage = { mark: vi.fn() };
    Object.assign(hero, { art, charge, bank, barrage });
    const event: GameEvent = { id: 1, source: 'dead', kind: 'ability', skillId: L.skill, x: 8, z: -4 }, origin = Vector3.Zero(), target = new Vector3(7, 0, -4);
    hero.ability(event, origin, origin, false, { hasOrigin: false, targets: [] });
    expect(charge.cancel).toHaveBeenCalledWith('dead'); expect(art.pulse).not.toHaveBeenCalled(); expect(bank.after).not.toHaveBeenCalled(); expect(barrage.mark).not.toHaveBeenCalled();
    hero.ability({ ...event, kind: 'trait', skillId: L.pulse }, origin, origin, false, { hasOrigin: false, targets: [target] });
    expect(art.pulse).toHaveBeenCalledWith(new Vector3(8, 0, -4), [target], false);
    expect(hero.ability({ ...event, kind: 'attack', skillId: L.pulse }, origin, origin, false)).toBe(false);
    expect(hero.ability({ ...event, kind: 'trait', skillId: 'tier3-tier4-pulse-h00M' }, origin, origin, false)).toBe(false);
    expect(stormFocus(event, origin)).toEqual(new Vector3(8, 0, -4));
  });
  it('refreshes animated shader time at fixed actual aim/R6.5 and watchdog drops charge without impact', () => {
    const charge = Object.create(StormCharge.prototype) as StormCharge, painted = paint(), m = mesh(), material = { setFloat: vi.fn() };
    painted.planes.acquire.mockReturnValue(mesh()); const layer = { mesh: m, material }, pool = { acquire: vi.fn(() => layer), release: vi.fn(), releaseAll: vi.fn() };
    Object.assign(charge, { art: { paint: painted }, pool, entries: new Map() }); const aim = new Vector3(4, 0, 2);
    charge.begin('caster', aim, .25, false); charge.tick(.05, 1); charge.tick(.05, 1.05);
    expect(material.setFloat).toHaveBeenCalledWith('uTime', 1); expect(material.setFloat).toHaveBeenCalledWith('uTime', 1.05);
    expect(m.position).toEqual(new Vector3(4, .045, 2)); expect(m.scaling).toEqual(new Vector3(13, 1, 13));
    expect(painted.place.mock.calls[1][3]).toBeGreaterThan(painted.place.mock.calls[0][3]);
    charge.tick(.5, 1.55); expect(pool.release).toHaveBeenCalledWith(layer);
    charge.begin('reduced', aim, .25, true); charge.tick(.1, 2); expect(material.setFloat).toHaveBeenCalledWith('uTime', 0);
    charge.clear(); expect(pool.releaseAll).toHaveBeenCalledOnce();
  });
  it('snapshot alone opens a barrage and retry-loads cold cloud/warning; border ends immediately on state loss', () => {
    const barrage = Object.create(StormBarrage.prototype) as StormBarrage, painted = paint(), material = { setFloat: vi.fn() }, layer = { mesh: mesh(), material };
    const pool = { acquire: vi.fn(() => layer), release: vi.fn(), releaseAll: vi.fn() }; Object.assign(barrage, { art: { paint: painted }, pool, entries: new Map() });
    const at = Vector3.Zero(); barrage.mark('server', at, 6.5, 1.2, false); barrage.tick(.01, 4);
    expect(painted.place).not.toHaveBeenCalled(); painted.planes.acquire.mockImplementation(() => mesh());
    barrage.mark('server', at, 6.5, 1.1, false); barrage.tick(.01, 4.1);
    expect(painted.place).toHaveBeenCalled(); expect(painted.ground.mock.calls[0][3]).toBe(6.5);
    expect(pool.acquire).toHaveBeenCalledOnce(); expect(material.setFloat).toHaveBeenCalledWith('uTime', 4.1);
    barrage.tick(.05, 4.15); expect(pool.release).toHaveBeenCalledExactlyOnceWith(layer);
    expect(painted.ground.mock.calls.at(-1)?.[3]).toBeLessThan(6.5);
    barrage.tick(.4, 4.55); expect(painted.planes.release.mock.calls.length).toBeGreaterThanOrEqual(2);
    barrage.clear(); expect(pool.releaseAll).toHaveBeenCalledOnce();
  });
  it('burn refresh updates one actual marker without re-spawning art, and marker removal plays independent discharge', () => {
    const burn = Object.create(StormBurn.prototype) as StormBurn, painted = paint(); painted.planes.acquire.mockReturnValue(mesh());
    Object.assign(burn, { art: { paint: painted }, entries: new Map() }); const at = Vector3.Zero();
    burn.mark('victim', at, 1, false); burn.tick(.01); burn.mark('victim', at, 3, false); burn.tick(.01);
    expect(painted.planes.acquire).toHaveBeenCalledOnce(); expect(painted.frame.mock.calls.at(-1)?.[2]).toBe(0);
    burn.tick(.01); expect(painted.frame.mock.calls.at(-1)?.[2]).toBe(12); burn.tick(.4);
    expect(painted.planes.release).toHaveBeenCalledOnce(); burn.clear();
  });
  it('one pulse has one bounded focus impact and small target sparks, no repeated R1.5 blast per victim', () => {
    const art = Object.create(StormArt.prototype) as StormArt, painted = paint(), sprays = { ring: vi.fn() }, bank = { ring: vi.fn(), spray: vi.fn(() => sprays) };
    Object.assign(art, { paint: painted, bank, strikes: [], scene: { activeCamera: null } }); const focus = Vector3.Zero(), victims = [new Vector3(1, 0, 0), new Vector3(-1, 0, 0)];
    art.pulse(focus, victims, false); art.tick(.07); expect(bank.ring).not.toHaveBeenCalled(); art.tick(.07);
    expect(bank.ring).toHaveBeenCalledTimes(2); expect(bank.ring.mock.calls.every(c => c[0].equals(focus))).toBe(true);
    expect(bank.ring.mock.calls[0][1]).toBe(1.5); expect(sprays.ring).toHaveBeenCalledTimes(3);
    art.tick(.14); expect(bank.ring).toHaveBeenCalledTimes(2);
    art.pulse(focus, victims, false); art.clear(); art.tick(1); expect(bank.ring).toHaveBeenCalledTimes(2);
  });
  it('feather head points down at the true pulse location, keeps source aspect and reduced mode emits no spray', () => {
    const art = Object.create(StormArt.prototype) as StormArt, painted = paint(), bolt = mesh(), bank = { ring: vi.fn(), spray: vi.fn() };
    painted.planes.acquire.mockReturnValue(bolt); Object.assign(art, { paint: painted, bank, strikes: [], scene: { activeCamera: null } });
    const at = new Vector3(6, 0, -3); art.pulse(at, [], false); art.tick(.07);
    expect(bolt.position.x).toBe(6); expect(bolt.position.z).toBe(-3); expect(bolt.position.y).toBeGreaterThan(7);
    expect(bolt.scaling.x / bolt.scaling.y).toBeCloseTo(layout.bolt.aspect);
    art.clear(); art.pulse(at, [at], true); art.tick(.01); expect(bank.spray).not.toHaveBeenCalled();
  });
  it('preserves exact source and output hashes, art warning flags and foreground/ground passes', () => {
    expect(Object.keys(inventory)).toHaveLength(5);
    for (const item of Object.values(inventory)) {
      expect(createHash('sha256').update(readFileSync(new URL('../../../' + item.raw, import.meta.url))).digest('hex')).toBe(item.sha256);
      expect(createHash('sha256').update(readFileSync(new URL('../../../' + item.output, import.meta.url))).digest('hex')).toBe(item.outputSha256);
    }
    expect(inventory.warning.sourceStatus).toBe('BLOCKED_ART'); expect(inventory.bolt.sourceStatus).toBe('BLOCKED_ART'); expect(inventory.burn.sourceStatus).toBe('BLOCKED_ART');
    expect(layout.cloud.frames).toBe(8); expect(layout.burn.frames).toBe(16);
    const source = readFileSync(new URL('../src/visual-loi-chan-tu-art.ts', import.meta.url), 'utf8');
    expect(source).toContain("['cloud', 'bolt', 'hit', 'burn']");
    expect(readFileSync(new URL('../src/visual-loi-chan-tu-barrage.ts', import.meta.url), 'utf8')).toContain("acquire('warning', true)");
    const main = readFileSync(new URL('../src/visual-loi-chan-tu.ts', import.meta.url), 'utf8');
    expect(main).toContain('this.previews.length = 0'); expect(main).toContain('this.bank.clear()'); expect(main).toContain('this.pending = 0');
  });
});
