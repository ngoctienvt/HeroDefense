import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { deployed, game } from '../../../packages/game-core/test/fixtures.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { Tier3Snapshot } from '../src/battlefield-tier3-snapshot.js';
import { VisualTinhVe } from '../src/visual-tinh-ve.js';
import { CRATER_LIFE, STONE_FALL, STONE_HIT, TINH_VE as T, barrageSeconds, stoneCharge,
  stoneFall, stoneImpact, stoneTrail, stoneTrailUvs } from '../src/visual-tinh-ve-timeline.js';
import { isModernTier3Event, isModernTier3Pulse, isTier3SupportRecipient } from '../src/visual-tier3-heroes.js';
import layout from '../src/visual-tinh-ve-layout.json';
import atlases from '../src/visual-kit-atlases.json';

describe('Tinh Vệ confirmed stone barrage', () => {
  beforeEach(() => vi.stubGlobal('location', { search: '' }));
  afterEach(() => vi.unstubAllGlobals());
  it('routes only the actual ultimate and pulse IDs without support classification', () => {
    expect(T).toMatchObject({ skill: 'tier3-tier4-h00M', pulse: 'tier3-tier4-pulse-h00M', radius: 5.5, hitRadius: 1.25 });
    expect(isModernTier3Event(T.skill)).toBe(true); expect(isModernTier3Event(T.pulse)).toBe(true);
    expect(isModernTier3Pulse(T.pulse)).toBe(true); expect(isModernTier3Pulse('trait-h00M')).toBe(false);
    expect(isTier3SupportRecipient(T.pulse)).toBe(false);
  });
  it('interprets remaining as a pulse count with a partial next interval', () => {
    expect(barrageSeconds({ remaining: 8, interval: .25, timer: .25 })).toBe(2);
    expect(barrageSeconds({ remaining: 3, interval: .25, timer: .05 })).toBeCloseTo(.55);
    expect(barrageSeconds({ remaining: 1, interval: .25, timer: .08 })).toBe(.08);
    expect(barrageSeconds({ remaining: 0, interval: .25, timer: .25 })).toBe(0);
    expect(barrageSeconds({ remaining: 2, interval: .25, timer: -.01 })).toBe(.25);
    expect(barrageSeconds({ remaining: 3.5, interval: .25, timer: .05 })).toBe(0);
    expect(barrageSeconds({ remaining: 3, interval: NaN, timer: .05 })).toBe(0);
  });
  it('marks only a live snapshot barrage at its actual center/radius and merges identical warning borders', () => {
    const state = game(), unit = deployed(state, 'h00M');
    const pulse = { casterId: unit.id, heroId: 'h00M', zone: unit.zone, x: 8, z: 3, radius: 5.5,
      remaining: 3, interval: .25, timer: .05, power: 1, hitCount: {} };
    state.tierPulses = [pulse, { ...pulse, remaining: 8, timer: .25 }];
    const snapshot = new Tier3Snapshot(); snapshot.update(state);
    const sink = { markTier3: vi.fn() };
    snapshot.draw(sink, unit.zone, () => undefined);
    expect(sink.markTier3).toHaveBeenCalledOnce();
    expect(sink.markTier3).toHaveBeenCalledWith('h00M', 'barrage', expect.any(String), new Vector3(8, 0, 3), 2, 5.5);
    sink.markTier3.mockClear(); unit.hp = 0; snapshot.draw(sink, unit.zone, () => undefined);
    expect(sink.markTier3).not.toHaveBeenCalled();
    unit.hp = 10; state.tierPulses = []; snapshot.draw(sink, unit.zone, () => undefined);
    expect(sink.markTier3).not.toHaveBeenCalled(); snapshot.clear();
    state.tierPulses = [pulse]; snapshot.draw(sink, unit.zone, () => undefined);
    expect(sink.markTier3).not.toHaveBeenCalled();
  });
  it('creates no rocks from the main ability and exactly one rock per confirmed pulse center, not per victim', () => {
    const hero = Object.create(VisualTinhVe.prototype) as VisualTinhVe;
    const pieces = { prepare: vi.fn(), call: vi.fn(), pulse: vi.fn() }, charge = { cancel: vi.fn() };
    Object.assign(hero, { pieces, charge });
    const origin = new Vector3(0, 0, 0), aim = new Vector3(10, 0, 2);
    const main: GameEvent = { id: 1, kind: 'ability', source: 'caster', skillId: T.skill, x: 10, z: 2, targets: [] };
    expect(hero.ability(main, origin, aim, false, { targets: [], hasOrigin: true })).toBe(true);
    expect(pieces.call).toHaveBeenCalledOnce(); expect(pieces.pulse).not.toHaveBeenCalled();
    const pulse: GameEvent = { ...main, id: 2, kind: 'trait', skillId: T.pulse, x: 8, z: 3, targets: ['a', 'b'] };
    hero.ability(pulse, origin, aim, false, { targets: [new Vector3(8, 0, 3), new Vector3(8.5, 0, 3)], hasOrigin: true });
    expect(pieces.pulse).toHaveBeenCalledOnce(); expect(pieces.pulse).toHaveBeenCalledWith(new Vector3(8, 0, 3), origin, false);
    pieces.pulse.mockClear();
    hero.ability({ ...pulse, x: undefined }, origin, aim, false, { targets: [aim], hasOrigin: true });
    expect(pieces.pulse).not.toHaveBeenCalled();
    hero.ability(pulse, origin, aim, true, { targets: [], hasOrigin: false });
    expect(pieces.pulse).toHaveBeenCalledWith(new Vector3(8, 0, 3), undefined, true);
  });
  it('holds charge then lands at the real point and uses impact frames after the in-flight rock frame', () => {
    expect(stoneCharge(.25, .25, false)).toEqual(stoneCharge(.4, .25, false));
    expect(stoneCharge(.1, .25, true)).toMatchObject({ frame: 1, scale: .85 });
    expect(stoneFall(0)).toMatchObject({ progress: 0, height: 6, offset: 1.8, arrived: false });
    expect(stoneFall(STONE_FALL)).toMatchObject({ progress: 1, height: 0, offset: 0, arrived: true });
    expect(stoneImpact(0, false).frame).toBe(1); expect(stoneImpact(.1, true).frame).toBe(2);
    expect(stoneImpact(STONE_HIT, false).alpha).toBeCloseTo(0);
    expect(stoneImpact(CRATER_LIFE, false).craterAlpha).toBeCloseTo(0);
  });
  it('reveals the right-leading trail proportionally with constant natural height', () => {
    const b = layout.trail.bounds; expect(layout.trail.head).toBe('right');
    const early = stoneTrail(.1, b), full = stoneTrail(1, b);
    expect(early.height).toBe(full.height); expect(early.length).toBeLessThan(full.length);
    const uv = stoneTrailUvs([0, 0, 1, 0], .25, b);
    expect(uv[0]).toBeCloseTo(b.right - .25 * (b.right - b.left)); expect(uv[2]).toBe(b.right);
  });
  it('retains atlas, footprint, foreground and pool cleanup contracts', () => {
    for (const [id, item] of Object.entries(layout))
      expect(atlases.atlases.find(a => a.id === `tinh-ve-${id}`))
        .toMatchObject({ frames: item.frames, tile: `${item.columns}x${item.rows}`, quality: 90, depthWrite: false });
    expect(layout.warning.radialEdge).toBeGreaterThan(.4); expect(layout.crater.radialEdge).toBeLessThan(.5);
    const source = (name: string) => readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
    const art = source('visual-tinh-ve-art'), hero = source('visual-tinh-ve'), charge = source('visual-tinh-ve-charge');
    expect(art).toContain("['call', 'boulder', 'trail', 'hit']"); expect(art).toContain("acquire('warning', true)");
    expect(art).toContain('resetStrip(s.trail)'); expect(art).toContain('this.warnings.clear()');
    expect(hero).toContain('previewPulses: true'); expect(hero).toContain('this.preview = undefined; this.charge.clear(); this.pieces.clear(); this.bank.clear()');
    expect(charge).toContain("m.setFloat('uTime', c.reduced ? 0 : time)");
  });
});
