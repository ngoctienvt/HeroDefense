import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { VisualNguuMaVuong } from '../src/visual-nguu-ma-vuong.js';
import { NguuMaVuongArt } from '../src/visual-nguu-ma-vuong-art.js';
import { NGUU_MA_VUONG as N, HOOF_CONTACT, QUAKE_LIFE, FISSURE_LIFE, ROCK_CLUSTERS,
  hornCharge, hoofShock, spikePose, dustDirection, quakePlaneSize } from '../src/visual-nguu-ma-vuong-timeline.js';
import { isModernTier3Event, isTier3SupportRecipient } from '../src/visual-tier3-heroes.js';
import layout from '../src/visual-nguu-ma-vuong-layout.json';
import atlases from '../src/visual-kit-atlases.json';
import inventory from '../../../assets/vfx-source/nguu-ma-vuong/active-inventory.json';

describe('Ngưu Ma Vương single hoofquake', () => {
  beforeEach(() => vi.stubGlobal('location', { search: '' }));
  afterEach(() => vi.unstubAllGlobals());
  it('claims only the confirmed ultimate and keeps previous routes', () => {
    expect(N).toMatchObject({ id: 'h00P', skill: 'tier3-tier4-h00P', radius: 5.5 });
    expect(isModernTier3Event(N.skill)).toBe(true); expect(isModernTier3Event('trait-h00P')).toBe(false);
    expect(isModernTier3Event('tier3-tier4-h00O')).toBe(true); expect(isModernTier3Event('tier3-tier4-pulse-h00M')).toBe(true);
    expect(isTier3SupportRecipient(N.skill)).toBe(false);
  });
  it('uses caster-centered windup and strikes real post-knockback victims without aim or crit inference', () => {
    const hero = Object.create(VisualNguuMaVuong.prototype) as VisualNguuMaVuong;
    const pieces = { prepare: vi.fn(), strike: vi.fn() }, charge = { begin: vi.fn(), cancel: vi.fn() };
    Object.assign(hero, { pieces, charge });
    const origin = new Vector3(2, 0, 3), aim = new Vector3(14, 0, 9), victim = new Vector3(8, 0, 3);
    const event: GameEvent = { id: 1, kind: 'ability', source: 'bull', skillId: N.skill, x: aim.x, z: aim.z };
    hero.cast({ ...event, kind: 'cast', windup: .25 }, aim, false, origin);
    expect(charge.begin).toHaveBeenCalledWith('bull', origin, .25, false);
    hero.ability(event, origin, aim, false, { targets: [victim], hasOrigin: true });
    expect(pieces.strike).toHaveBeenCalledWith(origin, [victim], false); expect(charge.cancel).toHaveBeenCalledWith('bull');
    hero.ability(event, origin, aim, true, { targets: [], hasOrigin: false });
    expect(pieces.strike).toHaveBeenLastCalledWith(undefined, [], true);
    expect(hero.ability({ ...event, kind: 'attack', skillId: 'trait-h00P' }, origin, aim, false)).toBe(false);
  });
  it('holds cast, keeps fixed radius, and uses static reduced poses through the exit', () => {
    expect(hornCharge(.25, .25, false)).toEqual(hornCharge(.4, .25, false));
    expect(hornCharge(.05, .25, true).scale).toBe(1); expect(hornCharge(.2, .25, true).frame).toBe(2);
    for (let i = 0; i < 100; i++) expect(hoofShock(i / 100, false).scale).toBeLessThanOrEqual(1);
    expect(hoofShock(QUAKE_LIFE, false).alpha).toBe(0); expect(hoofShock(FISSURE_LIFE, false).fissure).toBeCloseTo(0);
    expect(spikePose(.1, .03, true)).toMatchObject({ reveal: 1, height: 1 });
    expect(spikePose(1.1, .03, true)).toMatchObject({ reveal: 1, height: 1 });
    expect(spikePose(1.4, .03, false).reveal).toBe(0);
  });
  it('uses measured ellipse centers and bounds every texel corner in the projected circle at several camera elevations', () => {
    expect(layout.quake.sourceRingCenters).toEqual([240, 535, 820, 1095]);
    expect(layout.quake.sourceFloorBottoms).toEqual([291, 594, 895, 1168]);
    expect(layout.quake.anchorY).toBeLessThan(.75); expect(layout.quake.footprintHull.length).toBeGreaterThan(8);
    for (const elevation of [.35, .5, .669, .85, 1]) {
      const size = quakePlaneSize(N.radius, elevation, layout.quake.footprintHull, layout.quake.footprintPadding);
      for (const [x, y] of layout.quake.footprintHull) expect(Math.hypot(x * size, y * size / elevation)).toBeLessThanOrEqual(N.radius);
    }
    expect(quakePlaneSize(N.radius, 0, layout.quake.footprintHull, 0)).toBe(0);
    expect(quakePlaneSize(N.radius, NaN, layout.quake.footprintHull, 0)).toBe(0);
  });
  it('keeps irregular interior clusters inside R and separates emergence/sinking from radial size', () => {
    const radii = ROCK_CLUSTERS.map(rock => Math.hypot(rock.x, rock.z));
    expect(new Set(radii.map(r => r.toFixed(1))).size).toBeGreaterThan(3);
    expect(new Set(ROCK_CLUSTERS.map(rock => rock.size)).size).toBeGreaterThan(4);
    for (const rock of ROCK_CLUSTERS) {
      expect(Math.hypot(rock.x, rock.z) + rock.size * layout.spike.horizontalEdge).toBeLessThan(N.radius);
      for (let age = 0; age < 1.5; age += .03) {
        const pose = spikePose(age, rock.delay, false);
        expect(pose.reveal).toBeGreaterThanOrEqual(0); expect(pose.reveal).toBeLessThanOrEqual(1);
      }
    }
  });
  it('derives dust directions from the actual caster/victim and leaves overlap without an invented axis', () => {
    expect(layout.hit.head).toBe('right');
    expect(dustDirection({ x: 1, z: 2 }, { x: 7, z: 2 })).toEqual({ x: 1, z: 0 });
    expect(dustDirection({ x: 1, z: 2 }, { x: -5, z: 2 })).toEqual({ x: -1, z: 0 });
    expect(dustDirection({ x: 1, z: 2 }, { x: 1, z: -4 })).toEqual({ x: 0, z: -1 });
    expect(dustDirection({ x: 1, z: 2 }, { x: 1, z: 2 })).toBeUndefined();
  });
  it('emits one center impact, follows every real victim and never repeats damage-like pulses for spikes', () => {
    const pieces = Object.create(NguuMaVuongArt.prototype) as NguuMaVuongArt;
    const planes = { acquire: vi.fn(), release: vi.fn(), mapUvs: vi.fn() }, art = { planes, clear: vi.fn() };
    const spray = { ring: vi.fn() }, bank = { ring: vi.fn(), spray: vi.fn(() => spray) };
    Object.assign(pieces, { scene: { activeCamera: null }, art, bank, shocks: [], hits: [] });
    const origin = new Vector3(3, 0, 2), a = new Vector3(9, 0, 2), b = origin.clone();
    pieces.strike(origin, [a, b], false); pieces.tick(HOOF_CONTACT + .01);
    expect(bank.ring).toHaveBeenCalledTimes(3); expect(bank.ring).toHaveBeenCalledWith(origin, N.radius, 'nguumavuong', expect.any(Object));
    pieces.tick(.1); pieces.tick(.1); expect(bank.ring).toHaveBeenCalledTimes(3);
    pieces.tick(FISSURE_LIFE); const count = bank.ring.mock.calls.length; pieces.tick(.1);
    expect(bank.ring).toHaveBeenCalledTimes(count); pieces.clear(); expect(art.clear).toHaveBeenCalledOnce();
  });
  it.each([false, true])('retains material, chips and ground contact without a caster axis (reduced=%s)', reduced => {
    const pieces = Object.create(NguuMaVuongArt.prototype) as NguuMaVuongArt;
    const mesh = { visibility: 0, rotationQuaternion: null };
    const planes = { acquire: vi.fn(() => mesh), release: vi.fn() };
    const art = { planes, frame: vi.fn(), place: vi.fn(), clear: vi.fn() };
    const spray = { ring: vi.fn() }, bank = { ring: vi.fn(), spray: vi.fn(() => spray) };
    Object.assign(pieces, { scene: { activeCamera: null }, art, bank, shocks: [], hits: [] });
    const target = new Vector3(4, 0, 7);
    pieces.strike(undefined, [target], reduced); pieces.tick(HOOF_CONTACT + .01);
    expect(planes.acquire).toHaveBeenCalledWith('quake');
    expect(art.frame).toHaveBeenCalledWith(mesh, 'quake', reduced ? 5 : 4);
    expect(art.place).toHaveBeenCalledWith(mesh, 'quake', target, 2.2);
    expect(bank.ring).toHaveBeenCalledWith(target, .65, 'nguumavuong', expect.any(Object));
    expect(spray.ring).toHaveBeenCalledTimes(reduced ? 0 : 1);
    pieces.clear(); expect(planes.release).toHaveBeenCalledWith(mesh);
  });
  it('retains own art/source hashes, correct pass, chip provenance, cleanup and no custom status/zone', () => {
    for (const [id, item] of Object.entries(layout))
      expect(atlases.atlases.find(a => a.id === `nguu-ma-vuong-${id}`))
        .toMatchObject({ frames: item.frames, tile: `${item.columns}x${item.rows}`, quality: 90, depthWrite: false });
    expect(layout.fissure.radialEdge).toBeGreaterThan(.4); expect(inventory.chip.rect).toEqual([195, 159, 213, 181]);
    const source = (name: string) => readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
    const art = source('visual-nguu-ma-vuong-art'), hero = source('visual-nguu-ma-vuong'), charge = source('visual-nguu-ma-vuong-charge');
    expect(art).toContain("['charge', 'quake', 'hit']"); expect(art).toContain("acquire('fissure', true)");
    expect(art).toContain('resetStrip(h.mesh)'); expect(art).toContain('billboardCenter(at, height, 1, up)');
    expect(art).toContain('this.shocks.length = 0; this.hits.length = 0; this.art.clear()');
    expect(charge).toContain("m.setFloat('uTime', c.reduced ? 0 : time)");
    expect(hero).toContain('syntheticTargets: true'); expect(hero).not.toContain('groundEffects'); expect(hero).not.toContain('stun');
  });
});
