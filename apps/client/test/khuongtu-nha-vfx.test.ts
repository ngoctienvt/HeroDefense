import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { KHUONGTU as K } from '../../../content/khuongtu-nha-design.js';
import atlases from '../src/visual-kit-atlases.json';
import palettes from '../src/visual-kit-palettes.json';
import { ZoneModel } from '../src/visual-khuongtu-nha-zone-model.js';
import { KhuongtuReplay } from '../src/visual-khuongtu-nha-replay.js';
import { ARRAY_SIZE, ARRAY_SOLID_FRACTION, arrayPose, BOLT_FRAMES, BOLT_INTERVAL, BOLT_LIFE, BOLT_STRIKE_SECONDS, boltAlpha,
  boltFrame, CAST_GRACE, CHAIN_LIFE, chainAlpha, chainDelay, chainReveal, chainWidth, CLOSE_SECONDS, DEFAULT_WINDUP, HOLD_CYCLE,
  MARK_LOSS, MARK_WAIT, OPEN_SECONDS, SCORCH_RADIUS, SCROLL_CURL_FIRST, SCROLL_OPEN_FRAME, scrollPose } from '../src/visual-khuongtu-nha-timeline.js';
import type { VisualKhuongTuNha } from '../src/visual-khuongtu-nha.js';

const ROOT = resolve(__dirname, '../../..');
const source = (file: string): string => readFileSync(resolve(__dirname, '../src', file), 'utf8');
const pose = (age: number, extra: { closeAge?: number; reduced?: boolean; pulse?: number } = {}) =>
  ({ age, reduced: false, pulse: 0, ...extra });

describe('Khương Tử Nha layout follows gameplay and the measured art', () => {
  it('sizes the seal so its stone ring edge sits at the R7 zone edge', () => {
    expect(K.zoneRadius).toBe(7);
    const edge = ARRAY_SIZE * ARRAY_SOLID_FRACTION;
    expect(edge).toBeGreaterThan(K.zoneRadius * .95);
    expect(edge).toBeLessThanOrEqual(K.zoneRadius);
  });

  it('keeps every runtime asset and both sheet manifest entries on disk', () => {
    for (const file of ['scroll', 'bolt-hit', 'bolt', 'array'])
      expect(existsSync(resolve(ROOT, 'apps/client/public/assets', `vfx-khuongtu-nha-${file}.webp`)), file).toBe(true);
    const list = (atlases as { atlases: { id: string; frames: number; tile: string; framesDir: string }[] }).atlases;
    const scroll = list.find(entry => entry.id === 'khuongtu-nha-scroll'), hit = list.find(entry => entry.id === 'khuongtu-nha-bolt-hit');
    expect(scroll).toMatchObject({ frames: 16, tile: '4x4' });
    expect(hit).toMatchObject({ frames: BOLT_FRAMES, tile: '4x2' });
    for (const entry of [scroll, hit]) expect(existsSync(resolve(ROOT, entry?.framesDir ?? 'missing'))).toBe(true);
    expect(Object.keys((palettes as { materials: object }).materials)).toEqual(expect.arrayContaining(['jade', 'gold', 'earth']));
  });

  it('keeps the eight server bolts 0.625 s apart and a strike inside that gap', () => {
    expect(K.boltCount).toBe(8);
    expect(BOLT_INTERVAL).toBeCloseTo(.625);
    expect(BOLT_LIFE).toBeLessThan(BOLT_INTERVAL);
    expect(BOLT_STRIKE_SECONDS).toBeCloseTo(.18);
  });
});

describe('Khương Tử Nha scroll and seal timeline', () => {
  it('unfurls the scroll completely within 0.2 s of the cast, then shimmers between the open frames', () => {
    expect(scrollPose(pose(0), 0).frame).toBe(0);
    expect(scrollPose(pose(OPEN_SECONDS - .001), 0).frame).toBeLessThanOrEqual(SCROLL_OPEN_FRAME);
    expect(scrollPose(pose(OPEN_SECONDS), 0).frame).toBe(HOLD_CYCLE[0]);
    const frames = new Set([0, 1, 2, 3].map(i => scrollPose(pose(OPEN_SECONDS + i * .22 + .01), 0).frame));
    expect([...frames].every(frame => frame >= 4 && frame <= 7)).toBe(true);
    expect(frames.size).toBeGreaterThan(1);
    const early = scrollPose(pose(.05), 0), done = scrollPose(pose(.3), 0);
    expect(early.frame).toBeLessThan(done.frame + 1);
    expect(done.alpha).toBe(1);
  });

  it('pulses the scroll when a bolt lands and holds a single open frame with reduced motion', () => {
    expect(scrollPose(pose(1, { pulse: .14 }), 0).scale).toBeGreaterThan(scrollPose(pose(1), 0).scale);
    expect(scrollPose(pose(.01, { reduced: true }), 3)).toEqual({ frame: SCROLL_OPEN_FRAME, alpha: 1, scale: 1, lift: 0 });
  });

  it('rolls the scroll into its axle over the curl frames and retracts the seal to the centre in 0.35 s', () => {
    expect(CLOSE_SECONDS).toBeCloseTo(.35);
    expect(scrollPose(pose(5, { closeAge: 0 }), 0).frame).toBe(SCROLL_CURL_FIRST);
    expect(scrollPose(pose(5, { closeAge: CLOSE_SECONDS - .001 }), 0).frame).toBe(15);
    expect(scrollPose(pose(5, { closeAge: CLOSE_SECONDS }), 0).alpha).toBeCloseTo(0);
    const open = arrayPose(pose(5), 0), closing = arrayPose(pose(5, { closeAge: CLOSE_SECONDS - .01 }), 0);
    expect(closing.scale).toBeLessThan(open.scale * .2);
    expect(closing.alpha).toBeLessThan(.1);
    expect(arrayPose(pose(5, { closeAge: .2 }), 0).scale).toBeLessThan(open.scale);
  });

  it('gathers the seal lines in from a wider start; reduced motion keeps it still', () => {
    expect(arrayPose(pose(0), 0).scale).toBeGreaterThan(1.2);
    expect(arrayPose(pose(.5), 0).scale).toBeCloseTo(1);
    expect(arrayPose(pose(.01, { reduced: true }), 3)).toEqual({ alpha: 1, scale: 1, spin: 0 });
  });
});

describe('Khương Tử Nha bolt strike (one target, no area blast)', () => {
  it('plays the strike frames in 0.18 s and the shard tail after, then fades out', () => {
    expect(boltFrame(0, false)).toBe(0);
    expect(boltFrame(BOLT_STRIKE_SECONDS - .001, false)).toBe(4);
    expect(boltFrame(BOLT_LIFE - .001, false)).toBe(BOLT_FRAMES - 1);
    expect(boltFrame(.1, true)).toBe(3);
    expect(boltAlpha(0)).toBe(1);
    expect(boltAlpha(BOLT_LIFE)).toBeCloseTo(0);
  });

  it('leaves only a small burnt dot and never reuses the R7 radius per strike', () => {
    expect(SCORCH_RADIUS).toBeLessThan(K.zoneRadius / 4);
    expect(source('visual-khuongtu-nha-bolts.ts')).not.toContain('zoneRadius');
    expect(source('visual-khuongtu-nha-bolts.ts')).not.toContain('K.');
  });
});

describe('Khương Tử Nha chain (basic attack)', () => {
  it('jumps link by link, head first, and keeps the strip width in a readable band', () => {
    expect(chainDelay(0)).toBe(0);
    expect(chainDelay(3)).toBeGreaterThan(chainDelay(2));
    expect(chainReveal(0)).toBe(0);
    expect(chainReveal(.2)).toBe(1);
    expect(chainAlpha(CHAIN_LIFE)).toBeCloseTo(0);
    expect(chainWidth(.5)).toBe(.5);
    expect(chainWidth(20)).toBe(1.1);
  });
});

describe('Khương Tử Nha zone lifecycle', () => {
  it('pairs a resolve with its cast, re-anchors on the server point and keeps the zone open until the snapshot ends it', () => {
    const model = new ZoneModel();
    model.cast('u1', 0, 0, DEFAULT_WINDUP, false);
    model.step(DEFAULT_WINDUP);
    const { item, hadCast } = model.confirm('u1', .4, -.2, false);
    expect(hadCast).toBe(true);
    expect(item).toMatchObject({ x: .4, z: -.2, confirmed: true });
    expect(model.items).toHaveLength(1);
    model.mark('scroll-1', .4, -.2, 5, false);
    for (let i = 0; i < 120; i++) { model.mark('scroll-1', .4, -.2, 4 - i * .03, false); model.step(1 / 30); }
    expect(item?.closeAge).toBeUndefined();
    model.mark('scroll-1', .4, -.2, CLOSE_SECONDS - .01, false);
    expect(item?.closeAge).toBe(0);
    expect(model.step(CLOSE_SECONDS + .01)).toEqual([item]);
    expect(model.items).toHaveLength(0);
  });

  it('closes a cancelled cast after its windup + grace with no confirmation', () => {
    const model = new ZoneModel();
    const item = model.cast('u1', 0, 0, DEFAULT_WINDUP, false);
    model.step(DEFAULT_WINDUP + CAST_GRACE - .05);
    expect(item?.closeAge).toBeUndefined();
    model.step(.1);
    expect(item?.closeAge).toBeDefined();
    expect(item?.confirmed).toBe(false);
  });

  it('closes a practice-lobby resolve (no ground effect) and a zone whose marker disappears', () => {
    const model = new ZoneModel();
    const lobby = model.confirm('u1', 3, 3, false);
    expect(lobby.hadCast).toBe(false);
    model.step(MARK_WAIT - .05);
    expect(lobby.item?.closeAge).toBeUndefined();
    model.step(.1);
    expect(lobby.item?.closeAge).toBeDefined();
    const live = new ZoneModel();
    const zone = live.confirm('u1', 0, 0, false).item;
    live.mark('scroll-2', 0, 0, 3, false);
    live.step(.1);
    live.step(MARK_LOSS + .01);
    expect(zone?.closeAge).toBeDefined();
  });

  it('joins a zone already running (reconnect) fully open, with no opening replay and no cast pairing', () => {
    const model = new ZoneModel();
    const item = model.mark('scroll-9', 1, 1, 2.5, false);
    expect(item?.age).toBeGreaterThan(OPEN_SECONDS);
    expect(scrollPose(item ?? pose(0), 0).frame).toBeGreaterThanOrEqual(4);
    expect(item?.confirmed).toBe(true);
  });

  it('keeps two casters apart and pulses only the zone a bolt lands in', () => {
    const model = new ZoneModel();
    model.cast('a', -10, 0, DEFAULT_WINDUP, false);
    model.cast('b', 10, 0, DEFAULT_WINDUP, false);
    const a = model.confirm('a', -10, 0, false).item, b = model.confirm('b', 10, 0, false).item;
    expect(a).not.toBe(b);
    model.pulse(11, 1);
    expect(b?.pulse).toBeGreaterThan(0);
    expect(a?.pulse).toBe(0);
  });

  it('replaces a still-unconfirmed cast of the same caster instead of stacking previews', () => {
    const model = new ZoneModel();
    const first = model.cast('a', 0, 0, DEFAULT_WINDUP, false);
    model.cast('a', 1, 1, DEFAULT_WINDUP, false);
    expect(first?.closeAge).toBeDefined();
  });
});

describe('Khương Tử Nha routing and replay', () => {
  it('registers as a direct HeroVfx and no longer as a legacy adapter', () => {
    expect(source('visual-effects.ts')).toContain('this.heroKit.register(this.khuongtu)');
    expect(source('visual-effects.ts')).not.toContain('khuongtu: this.khuongtu');
    expect(source('visual-hero-adapters-myth.ts')).not.toContain("'h019'");
    expect(source('battlefield.ts')).toContain("registerReplay('h019'");
    expect(source('battlefield.ts')).toContain('markPhongThan(ground.id, new Vector3(ground.x, 0, ground.z), ground.remaining)');
  });

  it('draws the chain along the 3D link direction without mirroring and always resets pooled strips', () => {
    expect(source('visual-khuongtu-nha-chain.ts')).toContain('placeStrip(');
    expect(source('visual-khuongtu-nha-chain.ts')).toContain('resetStrip(');
  });

  it('draws the scroll in the foreground pass and the seal flat on the ground', () => {
    const main = source('visual-khuongtu-nha.ts');
    expect(main).toContain("prepare('scroll', '/assets/vfx-khuongtu-nha-scroll.webp', { foreground: true })");
    expect(main).toContain("prepare('boltHit', '/assets/vfx-khuongtu-nha-bolt-hit.webp', { foreground: true })");
    expect(source('visual-khuongtu-nha-zones.ts')).toContain("acquire('array', true)");
  });

  it('replays cast → resolve → marker every frame → eight bolts 0.625 s apart; lobby has no marker; attack has five targets', () => {
    const cast = vi.fn((..._args: unknown[]) => true), ability = vi.fn((..._args: unknown[]) => true), markZone = vi.fn();
    const replay = new KhuongtuReplay({ cast, ability, markZone } as unknown as Pick<VisualKhuongTuNha, 'cast' | 'ability' | 'markZone'>);
    const caster = new Vector3(0, 0, 0), point = new Vector3(0, 0, -6);
    expect(replay.start('nope', point, false, caster)).toBe(false);
    expect(replay.start('skill', point, false, caster)).toBe(true);
    expect(cast).toHaveBeenCalledTimes(1);
    expect(ability).not.toHaveBeenCalled();
    replay.tick(DEFAULT_WINDUP + .01);
    expect(ability).toHaveBeenCalledTimes(1);
    expect(ability.mock.calls[0][4]).toMatchObject({ hasOrigin: true });
    expect(markZone).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 400; i++) replay.tick(1 / 60);
    const bolts = ability.mock.calls.filter(call => (call[0] as { skillId: string }).skillId === 'bolt-h019');
    expect(bolts).toHaveLength(K.boltCount);
    expect(markZone.mock.calls.at(-1)?.[2]).toBeLessThan(.1);
    ability.mockClear(); markZone.mockClear();
    replay.start('lobby', point, false, caster);
    replay.tick(.01);
    expect(ability.mock.calls[0][4]).toMatchObject({ hasOrigin: false });
    replay.tick(1);
    expect(markZone).not.toHaveBeenCalled();
    replay.start('attack', point, false, caster);
    expect((ability.mock.calls.at(-1)?.[4] as { targets: unknown[] }).targets).toHaveLength(5);
    replay.start('bolt', point, false, caster);
    expect((ability.mock.calls.at(-1)?.[0] as { skillId: string }).skillId).toBe('bolt-h019');
  });
});
