import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { game, deployed, summon } from '../../../packages/game-core/test/fixtures.js';
import { Battlefield } from '../src/battlefield.js';
import { Tier3Snapshot } from '../src/battlefield-tier3-snapshot.js';
import { VisualKhongTuoc } from '../src/visual-khong-tuoc.js';
import { KhongTuocArt } from '../src/visual-khong-tuoc-art.js';
import { KhongTuocStatus } from '../src/visual-khong-tuoc-status.js';
import { KhongTuocCharge } from '../src/visual-khong-tuoc-charge.js';
import { KHONG_TUOC as K, fanFrame, fanSize, featherPose, plumeFrame } from '../src/visual-khong-tuoc-timeline.js';
import { isTier3SupportRecipient, isModernTier3Event } from '../src/visual-tier3-heroes.js';
import layout from '../src/visual-khong-tuoc-layout.json';
import inventory from '../../../assets/vfx-source/khong-tuoc/active-inventory.json';
import atlases from '../src/visual-kit-atlases.json';

const mesh = () => ({ rotation: new Vector3(), setEnabled: vi.fn() });
describe('Khổng Tước exact support and material feathers', () => {
  beforeEach(() => vi.stubGlobal('location', { search: '' }));
  afterEach(() => vi.unstubAllGlobals());
  it('claims only support ultimate and its auxiliary application; ordinary attacks stay separate', () => {
    expect(K.radius).toBe(9); expect(isModernTier3Event(K.skill)).toBe(true);
    expect(isTier3SupportRecipient(K.skill)).toBe(true);
    expect(isTier3SupportRecipient('trait-h03R')).toBe(false); expect(isTier3SupportRecipient(K.hit)).toBe(false);
    const hero = Object.create(VisualKhongTuoc.prototype) as VisualKhongTuoc;
    expect(hero.ability({ id: 1, kind: 'attack', skillId: 'trait-h005' }, Vector3.Zero(), Vector3.Zero(), false)).toBe(false);
  });
  it('uses exact windup and caster position and never invents a missing caster fan at aim', () => {
    const hero = Object.create(VisualKhongTuoc.prototype) as VisualKhongTuoc;
    const art = { prepare: vi.fn(), play: vi.fn() }, charge = { begin: vi.fn(), cancel: vi.fn() }, bank = { ring: vi.fn() };
    Object.assign(hero, { art, charge, bank });
    const origin = Vector3.Zero(), aim = new Vector3(20, 0, 0), cast: GameEvent = { id: 1, kind: 'cast', skillId: K.skill, windup: .41 };
    hero.cast(cast, aim, false, origin); expect(charge.begin).toHaveBeenCalledWith('', origin, .41, false);
    hero.cast({ ...cast, windup: undefined }, aim, false, origin); hero.cast(cast, aim, false);
    expect(charge.begin).toHaveBeenCalledTimes(1);
    hero.ability({ ...cast, kind: 'ability' }, origin, aim, false, { targets: [], hasOrigin: false });
    expect(art.play).not.toHaveBeenCalled(); expect(bank.ring).not.toHaveBeenCalled();
    hero.ability({ ...cast, kind: 'ability' }, origin, aim, false, { targets: [], hasOrigin: true });
    expect(bank.ring).toHaveBeenCalledWith(origin, 9, 'peacock', expect.objectContaining({ hold: true }));
    expect(hero.replay(new Vector3(NaN, 0, 0), false)).toBe(false);
    expect(hero.replay(origin, false, 'arbitrary')).toBe(false);
  });
  it('keeps reduced poses still and bounds the whole fan to the true radius at multiple camera elevations', () => {
    expect(fanFrame(.1, .25, true)).toBe(fanFrame(.24, .25, true));
    expect(featherPose(.01, true).lift).toBe(featherPose(.2, true).lift);
    expect(plumeFrame(1, undefined, true)).toBe(plumeFrame(3, .1, true));
    expect(fanFrame(.6, .25, false)).toBe(3); expect(fanFrame(1.1, undefined, false)).toBe(15);
    const b = layout.fan.bounds;
    for (const upY of [.35, .74, .92]) {
      const size = fanSize(upY), elevation = Math.sqrt(1 - upY * upY);
      for (const x of [b.left, b.right]) for (const y of [b.top, b.bottom])
        expect(Math.hypot((x - .5) * size, (y - layout.fan.anchorY) * size / elevation)).toBeLessThanOrEqual(9.000001);
    }
  });
  it('tracks only actual living deployed poison buffs, including summons; clear removes historical state', () => {
    const state = game(), buffed = deployed(state, 'h005'), other = deployed(state, 'h003', 1), called = summon(state, 'h005');
    called.summonDuration = 3;
    for (const unit of [buffed, called]) unit.tierBuff = { kind: 'poison', remaining: 2 };
    other.tierBuff = { kind: 'fire', remaining: 3 };
    const tracker = new Tier3Snapshot(), sink = { markTier3: vi.fn() }, at = Vector3.Zero(); tracker.update(state);
    const point = () => ({ at, zone: buffed.zone, alive: true }); tracker.draw(sink, buffed.zone, point);
    expect(sink.markTier3.mock.calls.map(c => c[2])).toEqual([buffed.id, called.id]);
    expect(sink.markTier3).toHaveBeenCalledWith('h03R', 'venom-plume', buffed.id, at, 2);
    sink.markTier3.mockClear(); buffed.tierBuff = undefined; called.hp = 0; tracker.draw(sink, buffed.zone, point);
    expect(sink.markTier3).not.toHaveBeenCalled(); tracker.clear();
    buffed.tierBuff = { kind: 'poison', remaining: 5 }; tracker.draw(sink, buffed.zone, point); expect(sink.markTier3).not.toHaveBeenCalled();
  });
  it('retries cold painted phases at their current age, never after expiry or clear', () => {
    const art = Object.create(KhongTuocArt.prototype) as KhongTuocArt, ready = mesh(), draw = vi.fn();
    const planes = { acquire: vi.fn().mockReturnValue(undefined), release: vi.fn(), clear: vi.fn() };
    Object.assign(art, { pieces: [], planes }); art.play('fan', .8, draw);
    planes.acquire.mockReturnValue(ready); art.tick(.2); expect(draw).toHaveBeenLastCalledWith(.2, ready);
    art.tick(.7); expect(planes.release).toHaveBeenCalledWith(ready);
    planes.acquire.mockReturnValue(undefined); art.play('hit', .1, draw); art.tick(.2);
    planes.acquire.mockClear(); art.tick(.2); expect(planes.acquire).not.toHaveBeenCalled();
    art.play('hit', .5, draw); art.clear(); planes.acquire.mockClear(); art.tick(.1); expect(planes.acquire).not.toHaveBeenCalled();
  });
  it('retries each plume slot without changing side or resetting its snapshot age and folds on marker loss', () => {
    const left = mesh(), right = mesh(), acquire = vi.fn().mockReturnValue(undefined);
    const art = { planes: { acquire, release: vi.fn() }, place: vi.fn(), frame: vi.fn() };
    const status = new KhongTuocStatus(art as unknown as KhongTuocArt), at = Vector3.Zero();
    status.mark('u', at, 4, false); status.tick(.1);
    acquire.mockReturnValueOnce(undefined).mockReturnValueOnce(right).mockReturnValue(undefined);
    status.mark('u', at, 3.9, false); status.tick(.1);
    expect(art.place).toHaveBeenCalledWith(right, 'aura', new Vector3(1.15, 0, 0), 2.45, 2.45, 1.65);
    acquire.mockReturnValue(left); status.mark('u', at, 3.8, false); status.tick(.1);
    expect(art.place).toHaveBeenCalledWith(left, 'aura', new Vector3(-1.15, 0, 0), 2.45, 2.45, 1.65);
    expect(art.frame).toHaveBeenCalledWith(right, 'aura', plumeFrame(.58, undefined, false));
    status.tick(.15); expect(right.rotation.z).not.toBe(0); status.tick(.31);
    expect(art.planes.release).toHaveBeenCalledWith(left); expect(art.planes.release).toHaveBeenCalledWith(right);
    status.clear();
  });
  it('retries the cast fan without restarting its real windup', () => {
    const fan = mesh(), art = { planes: { acquire: vi.fn().mockReturnValue(undefined), release: vi.fn() }, fan: vi.fn() };
    const layer = () => ({ mesh: { position: Vector3.Zero(), scaling: { setAll: vi.fn() }, setEnabled: vi.fn() }, material: { setFloat: vi.fn() } });
    const charge = Object.create(KhongTuocCharge.prototype) as KhongTuocCharge;
    Object.assign(charge, { live: [], art, pool: { acquire: vi.fn().mockImplementation(layer), release: vi.fn() } });
    charge.begin('u', Vector3.Zero(), .25, false); art.planes.acquire.mockReturnValue(fan); charge.tick(.2, .2);
    expect(art.fan).toHaveBeenCalledWith(fan, Vector3.Zero(), 3, expect.any(Number), expect.any(Number));
    charge.tick(.4, .6); expect(art.planes.release).toHaveBeenCalledWith(fan); charge.clear();
  });
  it('routes auxiliary metadata before actor reactions or attack audio and accepts confirmed point after target removal', () => {
    const field = Object.create(Battlefield.prototype) as Battlefield, show = vi.fn(), audio = { play: vi.fn() };
    Object.assign(field, { actors: new Map(), tier6: { record: vi.fn() }, truongStatus: { record: vi.fn() }, zone: 0, effects: { show }, audio });
    const handle = field as unknown as { handleEvent(event: GameEvent): void };
    const event: GameEvent = { id: 9, kind: 'trait', skillId: K.hit, source: 'ally', target: 'gone', x: 3, z: 2, zone: 0 };
    handle.handleEvent(event); expect(show).toHaveBeenCalledWith(event, new Vector3(3, 0, 2), undefined, [new Vector3(3, 0, 2)]);
    expect(audio.play).not.toHaveBeenCalled(); show.mockClear(); handle.handleEvent({ ...event, zone: 1 }); expect(show).not.toHaveBeenCalled();
  });
  it('keeps all six source flags and hashes and packs actual grids with premultiplied quality90 assets', () => {
    expect(inventory).toHaveLength(6);
    for (const entry of inventory) {
      expect(createHash('sha256').update(readFileSync(new URL(`../../../${entry.source}`, import.meta.url))).digest('hex')).toBe(entry.sha256);
      expect(entry.sourceStatus).toBe('BLOCKED_ART'); expect(entry.route).toBe('codex-image_gen');
      expect(atlases.atlases.find(a => a.id === `khong-tuoc-${entry.id}`)).toMatchObject({ quality: 90, depthWrite: false });
    }
    expect(layout.fan.frames).toBe(16); expect(layout.blessing.frames).toBe(8); expect(layout.aura.frames).toBe(16);
    const artSource = readFileSync(new URL('../src/visual-khong-tuoc-art.ts', import.meta.url), 'utf8');
    expect(artSource).toContain("['fan', 'feather', 'blessing', 'hit']");
  });
});
