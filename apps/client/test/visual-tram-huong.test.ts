import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { VisualTramHuong } from '../src/visual-tram-huong.js';
import { TramHuongArt } from '../src/visual-tram-huong-art.js';
import { VisualEffects } from '../src/visual-effects.js';
import { TRAM_HUONG as T, AXE_CONTACT, AXE_LIFE, FISSURE_LIFE, LOTUS_LIFE,
  lampCharge, axePose, fissurePose, lotusPose, splitDirection } from '../src/visual-tram-huong-timeline.js';
import { isModernTier3Event, isTier3SupportRecipient } from '../src/visual-tier3-heroes.js';
import layout from '../src/visual-tram-huong-layout.json';
import atlases from '../src/visual-kit-atlases.json';
import inventory from '../../../assets/vfx-source/tram-huong/active-inventory.json';

describe('Trầm Hương golden axe and confirmed lotus receipts', () => {
  beforeEach(() => vi.stubGlobal('location', { search: '' }));
  afterEach(() => vi.unstubAllGlobals());
  it('claims only the ultimate, preserving normal attacks and separate damage feedback', () => {
    expect(T).toMatchObject({ id: 'h03Q', skill: 'tier3-tier4-h03Q', radius: 5 });
    expect(isModernTier3Event(T.skill)).toBe(true); expect(isModernTier3Event('trait-h03Q')).toBe(false);
    expect(isTier3SupportRecipient(T.skill)).toBe(false);
  });
  it('charges the actual aim and receives only resolved monster and support positions', () => {
    const hero = Object.create(VisualTramHuong.prototype) as VisualTramHuong;
    const pieces = { prepare: vi.fn(), strike: vi.fn(), receipt: vi.fn() }, charge = { begin: vi.fn(), cancel: vi.fn() };
    Object.assign(hero, { pieces, charge });
    const origin = Vector3.Zero(), aim = new Vector3(8, 0, 2), victim = new Vector3(9, 0, 1), ally = new Vector3(-2, 0, 0);
    const event: GameEvent = { id: 1, kind: 'ability', source: 'axe', skillId: T.skill, direction: { x: 0, z: -3 } };
    hero.cast({ ...event, kind: 'cast', windup: .25 }, aim, false, origin);
    expect(charge.begin).toHaveBeenCalledWith('axe', origin, aim, .25, false);
    hero.ability(event, origin, aim, false, { hasOrigin: true, targets: [victim], supportTargets: [ally] });
    expect(pieces.strike).toHaveBeenCalledWith(aim, { x: 0, z: -1 }, [victim], false);
    expect(pieces.receipt).toHaveBeenCalledWith([ally], false); expect(charge.cancel).toHaveBeenCalledWith('axe');
    hero.ability({ ...event, direction: undefined }, origin, aim, true, { hasOrigin: false, targets: [] });
    expect(pieces.strike).toHaveBeenLastCalledWith(aim, undefined, [], true);
    expect(pieces.receipt).toHaveBeenLastCalledWith([], true);
    expect(hero.ability({ ...event, kind: 'attack' }, origin, aim, false)).toBe(false);
  });
  it('clones the optional sixth argument into registry without turning support into damage targets', () => {
    const effects = Object.create(VisualEffects.prototype) as VisualEffects;
    const ability = vi.fn(() => true); Object.assign(effects, { heroKit: { ability }, reduced: { matches: false } });
    const event: GameEvent = { id: 2, kind: 'ability', skillId: T.skill };
    const origin = Vector3.Zero(), aim = new Vector3(5, 0, 0), hit = new Vector3(6, 0, 0), ally = new Vector3(1, 0, 0);
    effects.show(event, aim, origin, [hit], undefined, [ally]);
    const extra = ability.mock.calls[0] as unknown as [GameEvent, Vector3, Vector3, boolean,
      { targets: Vector3[]; supportTargets: Vector3[] }];
    expect(extra[4].targets).toEqual([hit]); expect(extra[4].supportTargets).toEqual([ally]);
    expect(extra[4].supportTargets[0]).not.toBe(ally);
    ally.x = 100; expect(extra[4].supportTargets[0].x).toBe(1);
  });
  it('holds the cast pose, accelerates the axe once, settles rocks and closes the actual fissure', () => {
    expect(lampCharge(.25, .25, false)).toEqual(lampCharge(.5, .25, false));
    expect(axePose(0, false)).toMatchObject({ frame: 2, lift: 6 });
    expect(axePose(AXE_CONTACT / 2, false).lift).toBeGreaterThan(3);
    expect(axePose(AXE_CONTACT, false)).toMatchObject({ frame: 3, lift: 0 });
    expect(axePose(AXE_LIFE, false).alpha).toBe(0); expect(axePose(AXE_LIFE, false).settle).toBeGreaterThan(0);
    expect(fissurePose(.3, false).width).toBe(1); expect(fissurePose(FISSURE_LIFE, false).width).toBe(0);
    expect(lotusPose(.7, false).scale).toBeLessThan(lotusPose(.3, false).scale);
    expect(lotusPose(LOTUS_LIFE, false).alpha).toBe(0);
    for (const age of [.1, .4, .9]) {
      expect(lampCharge(age, .25, true)).toMatchObject({ frame: 2, scale: 1 });
      expect(axePose(age, true)).toMatchObject({ frame: 5, lift: 0, settle: 0 });
      expect(fissurePose(age, true).width).toBe(1); expect(lotusPose(age, true).scale).toBe(1);
    }
  });
  it('uses the real axis, never a fixed fallback, including invalid and zero event directions', () => {
    expect(splitDirection({ x: 3, z: 4 }, undefined, { x: 0, z: 0 })).toEqual({ x: .6, z: .8 });
    expect(splitDirection({ x: 0, z: 0 }, { x: 0, z: 1 }, { x: -3, z: 1 })).toEqual({ x: -1, z: 0 });
    expect(splitDirection({ x: NaN, z: 0 }, { x: 2, z: 1 }, { x: 2, z: 7 })).toEqual({ x: 0, z: 1 });
    expect(splitDirection(undefined, { x: 1, z: 1 }, { x: 1, z: 1 })).toBeUndefined();
    expect(splitDirection(undefined, undefined, { x: 7, z: 4 })).toBeUndefined();
  });
  it('fires one contact and three material layers for each confirmed target; clear removes pending work', () => {
    const pieces = Object.create(TramHuongArt.prototype) as TramHuongArt;
    const planes = { acquire: vi.fn(), release: vi.fn() }, art = { planes, clear: vi.fn() };
    const spray = { ring: vi.fn() }, bank = { ring: vi.fn(), spray: vi.fn(() => spray) };
    Object.assign(pieces, { art, bank, strikes: [], hits: [], receipts: [] });
    const at = new Vector3(5, 0, 1), targets = [new Vector3(6, 0, 1), new Vector3(4, 0, 0)];
    pieces.strike(at, undefined, targets, false); pieces.receipt([Vector3.Zero()], false);
    pieces.tick(AXE_CONTACT / 2); expect(bank.ring).not.toHaveBeenCalled();
    pieces.tick(AXE_CONTACT / 2); expect(bank.ring).toHaveBeenCalledTimes(3); expect(spray.ring).toHaveBeenCalledTimes(6);
    pieces.tick(.05); expect(bank.ring).toHaveBeenCalledTimes(3);
    pieces.strike(at, undefined, targets, false); pieces.clear(); pieces.tick(.3);
    expect(bank.ring).toHaveBeenCalledTimes(3); expect(art.clear).toHaveBeenCalledOnce();
  });
  it('keeps reduced contacts static and emits no spray', () => {
    const pieces = Object.create(TramHuongArt.prototype) as TramHuongArt;
    const bank = { ring: vi.fn(), spray: vi.fn() };
    Object.assign(pieces, { art: { planes: { acquire: vi.fn(), release: vi.fn() } }, bank, strikes: [], hits: [], receipts: [] });
    pieces.strike(Vector3.Zero(), undefined, [new Vector3(1, 0, 0)], true); pieces.tick(.01);
    expect(bank.ring).toHaveBeenCalledTimes(2); expect(bank.spray).not.toHaveBeenCalled();
  });
  it('retains measured grids, RGBA source provenance and short action/ground passes', () => {
    for (const [id, item] of Object.entries(layout)) {
      expect(atlases.atlases.find(a => a.id === `tram-huong-${id}`)).toMatchObject({ frames: item.frames,
        tile: `${item.columns}x${item.rows}`, quality: 90, depthWrite: false });
      const entry = inventory[id as keyof typeof layout];
      expect(createHash('sha256').update(readFileSync(new URL(`../../../${entry.raw}`, import.meta.url))).digest('hex')).toBe(entry.sha256);
    }
    expect(layout.axe.sourceFloorOrigins).toEqual([300, 592, 852, 1070]);
    expect(inventory.axe.sourceRects[4]).toEqual([0, 312, 354, 608]);
    expect(inventory.fissure.sourceRotationCCW).toBe(90); expect(layout.fissure.radialEdge).toBeGreaterThan(.35);
    const source = (name: string) => readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
    expect(source('visual-tram-huong-art')).toContain("['lamp', 'axe', 'hit']");
    expect(source('visual-tram-huong-art')).toContain("acquire('fissure', true)");
    expect(source('visual-tram-huong-art')).toContain("acquire('lotus', true)");
    expect(source('visual-tram-huong-charge')).toContain("m.setFloat('uTime', c.reduced ? 0 : time)");
    expect(source('visual-tram-huong-charge')).toContain('c.windup + .3');
    expect(source('visual-tram-huong')).not.toContain('empower.remaining');
  });
});
