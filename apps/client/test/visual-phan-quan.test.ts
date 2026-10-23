import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { deployed, enemy, game } from '../../../packages/game-core/test/fixtures.js';
import { Tier3Snapshot } from '../src/battlefield-tier3-snapshot.js';
import { VisualPhanQuan } from '../src/visual-phan-quan.js';
import { PhanQuanLinks } from '../src/visual-phan-quan-links.js';
import { PHAN_QUAN as P, INK_SWEEP, LINK_EXIT, inkYaw, inkReveal, inkAlpha, ledgerCharge,
  bondExit, shackleFrame, LEDGER_SIZE, LEDGER_LIFT } from '../src/visual-phan-quan-timeline.js';
import { isModernTier3Event, isTier3SupportRecipient } from '../src/visual-tier3-heroes.js';
import layout from '../src/visual-phan-quan-layout.json';
import atlases from '../src/visual-kit-atlases.json';

describe('Phán Quan front verdict and proven soul links', () => {
  beforeEach(() => vi.stubGlobal('location', { search: '' }));
  afterEach(() => vi.unstubAllGlobals());
  it('uses the actual ultimate only and preserves previous modern routes', () => {
    expect(P).toMatchObject({ id: 'h00O', skill: 'tier3-tier4-h00O', radius: 4.8, seconds: 4 });
    expect(isModernTier3Event(P.skill)).toBe(true); expect(isModernTier3Event('trait-h00O')).toBe(false);
    expect(isModernTier3Event('tier3-tier4-pulse-h00M')).toBe(true);
    expect(isModernTier3Event('tier3-tier4-h00N')).toBe(true); expect(isTier3SupportRecipient(P.skill)).toBe(false);
  });
  it('keeps all processed arc alpha in the source front half and maps source minus X to every cardinal', () => {
    expect(layout.arc.forward).toBe('negative-x'); expect(layout.arc.rearAlphaPixels).toBe(0);
    expect(layout.arc.bounds.right).toBeLessThanOrEqual(.5);
    expect(layout.arc.radialEdge).toBeGreaterThan(.3);
    for (const d of [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]) {
      const forward = Vector3.TransformNormal(new Vector3(-1, 0, 0), Matrix.RotationY(inkYaw(d)));
      expect(forward.x).toBeCloseTo(d.x); expect(forward.z).toBeCloseTo(d.z);
    }
    expect(inkReveal(0, false)).toBe(0); expect(inkReveal(INK_SWEEP, false)).toBe(1);
    expect(inkReveal(.01, true)).toBe(1); expect(inkAlpha(INK_SWEEP + .4)).toBeCloseTo(0);
  });
  it('starts reconnect links from snapshot provenance, including dead or moved casters, and ignores equal-share lookalikes', () => {
    const state = game(), caster = deployed(state, P.id);
    const a = enemy(state, caster, { x: 2, z: 3 }), b = enemy(state, caster, { x: 4, z: 3 });
    const group = [a.id, b.id];
    a.soulLink = { remaining: 1.2, group, sharePercent: .4, casterId: caster.id };
    b.soulLink = { remaining: 1.1, group, sharePercent: .4, casterId: caster.id };
    const zone = caster.zone; caster.zone += 1; caster.hp = 0;
    const snapshot = new Tier3Snapshot(); snapshot.update(state);
    const sink = { markTier3: vi.fn(), markTier3Link: vi.fn() };
    snapshot.draw(sink, zone, id => id === a.id ? { at: new Vector3(2.1, 0, 3), zone, alive: true } : undefined);
    expect(sink.markTier3).toHaveBeenCalledTimes(2); expect(sink.markTier3Link).toHaveBeenCalledOnce();
    expect(sink.markTier3Link).toHaveBeenCalledWith(P.id, expect.any(String), new Vector3(2.1, 0, 3), new Vector3(4, 0, 3), 1.1);
    expect(snapshot.ownsLink(a.id)).toBe(true);
    a.soulLink = { remaining: 2, group, sharePercent: .4 }; b.soulLink = { ...a.soulLink };
    sink.markTier3.mockClear(); sink.markTier3Link.mockClear(); snapshot.draw(sink, zone, () => undefined);
    expect(snapshot.ownsLink(a.id)).toBe(false); expect(sink.markTier3Link).not.toHaveBeenCalled(); expect(sink.markTier3).not.toHaveBeenCalled();
    snapshot.clear(); expect(snapshot.ownsLink(b.id)).toBe(false);
  });
  it('does not claim links belonging to another source or create links from ability targets alone', () => {
    const hero = Object.create(VisualPhanQuan.prototype) as VisualPhanQuan;
    const pieces = { prepare: vi.fn(), sweep: vi.fn() }, charge = { cancel: vi.fn() }, links = { markPair: vi.fn(), markShackle: vi.fn() };
    Object.assign(hero, { pieces, charge, links });
    const origin = new Vector3(0, 0, 0), target = new Vector3(2, 0, 0);
    const event: GameEvent = { id: 1, kind: 'ability', source: 'judge', skillId: P.skill, x: 4, z: 0 };
    hero.ability(event, origin, target, false, { targets: [target], hasOrigin: true });
    expect(pieces.sweep).toHaveBeenCalledWith(origin, new Vector3(1, 0, 0), [target], false);
    expect(links.markPair).not.toHaveBeenCalled(); expect(links.markShackle).not.toHaveBeenCalled();
    hero.ability(event, origin, target, true, { targets: [], hasOrigin: false });
    expect(pieces.sweep).toHaveBeenLastCalledWith(undefined, undefined, [], true);
    const state = game(), wrong = deployed(state, 'h00I'), victim = enemy(state, wrong);
    victim.soulLink = { remaining: 4, group: [victim.id], sharePercent: .4, casterId: wrong.id };
    const snapshot = new Tier3Snapshot(); snapshot.update(state); expect(snapshot.ownsLink(victim.id)).toBe(false);
  });
  it('keeps one pair mesh across markers, follows endpoints and retracts on missing status', () => {
    const links = Object.create(PhanQuanLinks.prototype) as PhanQuanLinks;
    const mesh = { visibility: 1, billboardMode: 0, rotationQuaternion: null, position: Vector3.Zero(), scaling: Vector3.One() };
    const art = { planes: { acquire: vi.fn(() => mesh), release: vi.fn() }, crop: vi.fn(), frame: vi.fn(), place: vi.fn() };
    const glows = { acquire: vi.fn(), release: vi.fn(), releaseAll: vi.fn() };
    Object.assign(links, { scene: { activeCamera: null }, pieces: { art }, pairs: new Map(), shackles: new Map(), glows });
    links.markPair('pair', Vector3.Zero(), new Vector3(3, 0, 0), 1.2, false); links.tick(.05, 1);
    expect(art.planes.acquire).toHaveBeenCalledOnce(); const length = mesh.scaling.x;
    links.markPair('pair', Vector3.Zero(), new Vector3(4, 0, 0), 1.1, false); links.tick(.05, 1.05);
    expect(art.planes.acquire).toHaveBeenCalledOnce(); expect(mesh.scaling.x).toBeGreaterThan(length);
    links.tick(.1, 1.15); expect(mesh.scaling.x).toBeLessThan(4);
    links.tick(LINK_EXIT, 1.4); expect(art.planes.release).toHaveBeenCalledWith(mesh); expect(mesh.rotationQuaternion).toBeNull();
    links.clear(); expect(glows.releaseAll).toHaveBeenCalled();
  });
  it('holds the measured closed shackle subset and plays break/drop only during exit', () => {
    for (let i = 0; i < 60; i++) expect(shackleFrame(i / 10, 2, 0, false, false)).toBeLessThanOrEqual(8);
    expect(shackleFrame(1, 2, .1, false, false)).toBeGreaterThanOrEqual(12);
    expect(shackleFrame(1, .1, 0, false, false)).toBeGreaterThanOrEqual(12);
    expect(shackleFrame(1, .1, .2, false, true)).toBe(6);
    expect(bondExit(2, LINK_EXIT)).toBe(1); expect(ledgerCharge(.25, .25)).toEqual(ledgerCharge(.4, .25));
    expect(LEDGER_SIZE).toBeGreaterThan(5); expect(LEDGER_LIFT).toBeGreaterThan(4);
  });
  it('retains half-disk/pass/UV/cap/reduced/cleanup contracts', () => {
    for (const [id, item] of Object.entries(layout))
      expect(atlases.atlases.find(a => a.id === `phan-quan-${id}`))
        .toMatchObject({ frames: item.frames, tile: `${item.columns}x${item.rows}`, quality: 90, depthWrite: false });
    const source = (name: string) => readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
    const art = source('visual-phan-quan-art'), charge = source('visual-phan-quan-charge'), links = source('visual-phan-quan-links');
    expect(art).toContain("['ledger', 'arc', 'hit']"); expect(art).toContain('P.radius / layout.arc.radialEdge');
    expect(art).toContain('mesh.scaling.set(size, size * q, 1)'); expect(charge).toContain("m.setFloat('uArc', Math.PI / 2)");
    expect(charge).toContain("m.setFloat('uTime', c.reduced ? 0 : time)");
    expect(links).toContain('resetStrip(pair.mesh)'); expect(links).toContain('this.pairs.clear(); this.shackles.clear()');
    expect(links).toContain('pair.reduced ? 1 : 1 - exit'); expect(links).toContain('node.reduced ? 0 : -.3 * exit');
    expect(source('battlefield')).toContain('if (this.tier3.ownsLink(enemy.id)) continue');
  });
});
