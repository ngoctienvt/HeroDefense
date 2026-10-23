import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GALE_EXIT, GALE_FLIGHT, TIEU_BACH_LONG as L, dragonStrip, galeCharge, galeDirection,
  galeLane, galePose, galeProgress, galeReplayDirection, galeStrikeDelay, galeTargets, galeUvs } from '../src/visual-tieu-bach-long-timeline.js';
import { isModernTier3Event, isTier3SupportRecipient } from '../src/visual-tier3-heroes.js';
import layout from '../src/visual-tieu-bach-long-layout.json';
import atlases from '../src/visual-kit-atlases.json';

describe('Tiểu Bạch Long jade gale', () => {
  it('keeps the server 12 by 3.5 attack lane and separates support routing', () => {
    expect(L).toMatchObject({ id: 'h00L', skill: 'tier3-tier4-h00L', length: 12, width: 3.5 });
    expect(isModernTier3Event(L.skill)).toBe(true); expect(isModernTier3Event('trait-h00L')).toBe(false);
    expect(isTier3SupportRecipient(L.skill)).toBe(false); expect(isTier3SupportRecipient('tier3-tier4-h00K')).toBe(true);
  });
  it('uses validated event direction and holds still when missing or degenerate', () => {
    const at = { x: 2, z: 4 };
    expect(galeDirection({}, at)).toBeUndefined();
    expect(galeDirection({ direction: { x: 0, z: 0 } }, at)).toBeUndefined();
    expect(galeDirection({ direction: { x: Infinity, z: 1 } }, at)).toBeUndefined();
    expect(galeDirection({ direction: { x: -3, z: 4 } }, at)).toEqual({ x: -.6, z: .8 });
  });
  it('holds real windup and keeps reduced motion on a fixed authored gathering frame', () => {
    expect(galeCharge(.25, .25, false)).toEqual(galeCharge(.5, .25, false));
    expect(galeCharge(.25, .25, false).frame).toBe(3);
    expect(galeCharge(.25, .25, false).alpha).toBeGreaterThan(galeCharge(0, .25, false).alpha);
    expect(galeCharge(0, .25, true)).toMatchObject({ frame: 2, scale: .9 });
    expect(galeCharge(.2, .25, true)).toMatchObject({ frame: 2, scale: .9 });
  });
  it('computes an explicit replay direction without relying on unsupported event point fields', () => {
    expect(galeReplayDirection({ x: 2, z: 4 }, { x: -1, z: 8 })).toEqual({ x: -.6, z: .8 });
    expect(galeReplayDirection({ x: 2, z: 4 }, { x: 2, z: 4 })).toBeUndefined();
    expect(galeReplayDirection({ x: 2, z: 4 }, { x: Infinity, z: 4 })).toBeUndefined();
    const source = readFileSync(new URL('../src/visual-tieu-bach-long.ts', import.meta.url), 'utf8');
    expect(source).toContain('galeReplayDirection(origin, at)');
  });
  it('matches every hit delay to the eased head passing the confirmed target', () => {
    const origin = { x: 3, z: -2 }, dir = { x: .6, z: .8 };
    for (const along of [0, 1, 3, 6, 10, 12]) {
      const target = { x: origin.x + dir.x * along, z: origin.z + dir.z * along };
      const delay = galeStrikeDelay(origin, target, dir, false);
      expect(galeProgress(delay) * L.length).toBeCloseTo(along, 6);
    }
    expect(galeStrikeDelay(origin, { x: 9, z: 9 }, undefined, false)).toBe(0);
    expect(galeStrikeDelay(origin, { x: 9, z: 9 }, dir, true)).toBe(0);
    expect(galePose(.2, false).echo).toBeLessThan(galePose(.2, false).progress);
    expect(galePose(GALE_FLIGHT + GALE_EXIT, false).alpha).toBeCloseTo(0, 8);
  });
  it('reveals the real right-facing head at constant motif height without inflating the full picture', () => {
    expect(layout.dragon.head).toBe('right'); expect(layout.lane.head).toBe('right');
    const b = layout.dragon.bounds, early = dragonStrip(.1, b), full = dragonStrip(1, b);
    expect(early.length).toBeCloseTo(1.2); expect(full.length).toBe(7); expect(early.height).toBe(full.height);
    const uv = galeUvs([0, 0, 1, 0, 0, 1, 1, 1], .25, b);
    expect(uv[0]).toBeCloseTo(b.right - (b.right - b.left) * .25); expect(uv[2]).toBe(b.right);
    expect(uv[1]).toBeCloseTo(1 - b.bottom); expect(uv[5]).toBeCloseTo(1 - b.top);
  });
  it('places the exact ground footprint in each world direction without using billboard axes', () => {
    const origin = { x: 3, z: 2 };
    for (const dir of [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]) {
      const lane = galeLane(origin, dir, 1);
      expect(lane.length).toBe(12); expect(lane.width).toBe(3.5);
      expect(lane.x - dir.x * lane.length / 2).toBeCloseTo(origin.x);
      expect(lane.z - dir.z * lane.length / 2).toBeCloseTo(origin.z);
      expect(Math.cos(lane.yaw)).toBeCloseTo(dir.x); expect(-Math.sin(lane.yaw)).toBeCloseTo(dir.z);
    }
    expect(galeLane(origin, { x: 1, z: 0 }, .5)).toMatchObject({ x: 6, z: 2, length: 6, width: 3.5 });
  });
  it('samples only confirmed targets under cap and never invents a target for an empty resolve', () => {
    expect(galeTargets([])).toEqual([]);
    const targets = Array.from({ length: 100 }, (_, x) => ({ x, y: 0, z: 0 })), sample = galeTargets(targets);
    expect(sample).toHaveLength(48); expect(sample.every(p => targets.includes(p))).toBe(true);
    expect(galeTargets([{ x: NaN, y: 0, z: 0 }, targets[0]])).toEqual([targets[0]]);
  });
  it('matches row-major atlases and retains cleanup/pass contracts without creating slow or root timers', () => {
    for (const [id, l] of Object.entries(layout)) {
      expect(atlases.atlases.find(a => a.id === `tieu-bach-long-${id}`))
        .toMatchObject({ frames: l.frames, tile: `${l.columns}x${l.rows}`, depthWrite: false, quality: 90 });
      expect(l.frames).toBe(l.columns * l.rows);
    }
    const source = (name: string) => readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
    const art = source('visual-tieu-bach-long-art'), hero = source('visual-tieu-bach-long'), charge = source('visual-tieu-bach-long-charge');
    expect(art).toContain("['charge', 'dragon', 'hit']"); expect(art).toContain("acquire('lane', true)");
    expect(art).toContain('resetStrip(mesh)'); expect(art).toContain('this.flights.length = 0; this.hits.length = 0');
    expect(hero).toContain('this.charge.clear(); this.pieces.clear(); this.bank.clear()');
    expect(hero).toContain('previewTargets: true'); expect(hero).not.toContain('markSlow'); expect(hero).not.toContain('markRoot');
    expect(charge).toContain("m.setFloat('uTime', c.reduced ? 0 : time)");
  });
});
