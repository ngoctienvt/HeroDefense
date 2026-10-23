import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { deployed, game } from '../../../packages/game-core/test/fixtures.js';
import { Tier3Snapshot } from '../src/battlefield-tier3-snapshot.js';
import { VisualChungQuy } from '../src/visual-chung-quy.js';
import { ChungQuyArt } from '../src/visual-chung-quy-art.js';
import { CHUNG_QUY as C, FLIGHT, EXIT, sealCharge, sealFlight, fireHold, talismanShape } from '../src/visual-chung-quy-timeline.js';
import { isModernTier3Event, isModernTier3Pulse, isTier3SupportRecipient } from '../src/visual-tier3-heroes.js';
import { unitDirection } from '../src/visual-kit-timeline.js';
import layout from '../src/visual-chung-quy-layout.json';
import atlases from '../src/visual-kit-atlases.json';

describe('Chung Quỳ server-owned seal and ghostfire', () => {
  beforeEach(() => vi.stubGlobal('location', { search: '' }));
  afterEach(() => vi.unstubAllGlobals());
  it('owns only the ultimate and keeps prior pulse/support/summon routes', () => {
    expect(C).toMatchObject({ id: 'h00N', skill: 'tier3-tier4-h00N', radius: 5.2, seconds: 4 });
    expect(isModernTier3Event(C.skill)).toBe(true);
    expect(isModernTier3Event('tier3-tier4-summon-h00N')).toBe(false);
    expect(isModernTier3Event('trait-h00N')).toBe(false);
    expect(isModernTier3Pulse('tier3-tier4-pulse-h00M')).toBe(true);
    expect(isTier3SupportRecipient('tier3-tier4-h00K')).toBe(true);
    expect(isTier3SupportRecipient(C.skill)).toBe(false);
  });
  it('routes native ground center/radius/remaining only with actual Chung Quỳ caster provenance', () => {
    const state = game(), caster = deployed(state, C.id);
    const ground = { casterId: caster.id, zone: caster.zone, x: 8, z: 2, radius: 5.2,
      remaining: 1.4, damagePerSecond: 90, kind: 'tier-fire' as const };
    state.groundEffects = [ground]; const snapshot = new Tier3Snapshot(); snapshot.update(state);
    const sink = { markTier3: vi.fn() };
    expect(snapshot.ownsGround(ground, caster.zone)).toBe(true);
    snapshot.draw(sink, caster.zone, () => undefined);
    expect(sink.markTier3).toHaveBeenCalledWith(C.id, 'ghost-fire', expect.any(String), new Vector3(8, 0, 2), 1.4, 5.2);
    const groundZone = ground.zone; caster.zone += 1; caster.hp = 0;
    expect(snapshot.ownsGround(ground, groundZone)).toBe(true);
    sink.markTier3.mockClear(); snapshot.draw(sink, groundZone, () => undefined);
    expect(sink.markTier3).toHaveBeenCalledWith(C.id, 'ghost-fire', expect.any(String), new Vector3(8, 0, 2), 1.4, 5.2);
    caster.zone = groundZone; caster.hp = 10;
    sink.markTier3.mockClear(); caster.heroId = 'h00P';
    expect(snapshot.ownsGround(ground, caster.zone)).toBe(false);
    snapshot.draw(sink, caster.zone, () => undefined); expect(sink.markTier3).not.toHaveBeenCalled();
    caster.heroId = C.id;
    expect(snapshot.ownsGround({ ...ground, remaining: 0 }, caster.zone)).toBe(false);
    expect(snapshot.ownsGround({ ...ground, kind: 'tier-water' }, caster.zone)).toBe(false);
    expect(snapshot.ownsGround({ ...ground, radius: NaN }, caster.zone)).toBe(false);
    expect(snapshot.ownsGround({ ...ground, casterId: 'unknown' }, caster.zone)).toBe(false);
    expect(snapshot.ownsGround(ground, caster.zone + 1)).toBe(false);
    snapshot.clear(); expect(snapshot.ownsGround(ground, caster.zone)).toBe(false);
  });
  it('uses confirmed aim and target positions without inventing silence or fallback targets', () => {
    const hero = Object.create(VisualChungQuy.prototype) as VisualChungQuy;
    const pieces = { prepare: vi.fn(), launch: vi.fn() }, charge = { cancel: vi.fn() };
    Object.assign(hero, { pieces, charge });
    const origin = new Vector3(1, 0, 2), aim = new Vector3(8, 0, 3), victim = new Vector3(7, 0, 2);
    const event: GameEvent = { id: 1, kind: 'ability', source: 'caster', skillId: C.skill, x: 8, z: 3, targets: ['victim'] };
    expect(hero.ability(event, origin, aim, false, { targets: [victim], hasOrigin: true })).toBe(true);
    expect(pieces.launch).toHaveBeenCalledWith(origin, aim, expect.any(Vector3), [victim], false);
    expect(charge.cancel).toHaveBeenCalledWith('caster'); pieces.launch.mockClear();
    hero.ability(event, origin, aim, true, { targets: [], hasOrigin: false });
    expect(pieces.launch).toHaveBeenCalledWith(undefined, aim, undefined, [], true);
    pieces.launch.mockClear(); hero.ability({ ...event, x: undefined }, origin, aim, false);
    expect(pieces.launch).not.toHaveBeenCalled();
    expect(hero.ability({ ...event, kind: 'trait', skillId: 'tier3-tier4-summon-h00N' }, origin, aim, false)).toBe(false);
  });
  it('holds a native late-join ground directly, does not reset age and exits without leaving an active sigil', () => {
    const pieces = Object.create(ChungQuyArt.prototype) as ChungQuyArt;
    const planes = { acquire: vi.fn(() => ({ visibility: 0 })), release: vi.fn(), clear: vi.fn() };
    const art = { planes, ground: vi.fn(), frame: vi.fn(), place: vi.fn(), clear: vi.fn() };
    Object.assign(pieces, { art, grounds: new Map(), strikes: [], hits: [] });
    const at = new Vector3(5, 0, 3);
    pieces.mark('native', at, 4.8, 1.2, false); pieces.tick(.1);
    expect(art.ground).toHaveBeenCalledWith(expect.any(Object), 'sigil', at, 4.8);
    expect(planes.acquire).not.toHaveBeenCalledWith('slam');
    pieces.mark('native', at, 4.8, 1.1, false); pieces.tick(.1);
    expect(art.frame).toHaveBeenLastCalledWith(expect.any(Object), 'flame', 7);
    const calls = art.ground.mock.calls.length;
    pieces.tick(.05); expect(planes.release).toHaveBeenCalled(); expect(art.ground).toHaveBeenCalledTimes(calls);
    pieces.tick(EXIT); const count = art.place.mock.calls.length; pieces.tick(.1);
    expect(art.place).toHaveBeenCalledTimes(count);
    pieces.clear(); expect(art.clear).toHaveBeenCalledOnce();
  });
  it('holds cast at its final pose and collapses fire in the last half second', () => {
    expect(sealCharge(.25, .25)).toEqual(sealCharge(.4, .25));
    expect(sealFlight(0)).toBe(0); expect(sealFlight(FLIGHT)).toBe(1);
    expect(fireHold(4)).toEqual(fireHold(1.2));
    expect(fireHold(.1).alpha).toBeLessThan(fireHold(.5).alpha);
    expect(fireHold(.1).scale).toBeLessThan(fireHold(.5).scale);
    expect(fireHold(2, EXIT).alpha).toBe(0);
  });
  it('keeps a right-leading talisman, true world directions and constant natural strip height', () => {
    expect(layout.talisman.head).toBe('right');
    const a = talismanShape(.2, layout.talisman.bounds), b = talismanShape(1, layout.talisman.bounds);
    expect(a.height).toBe(b.height); expect(a.length).toBeLessThan(b.length);
    expect(unitDirection({ x: -3, z: 2 }, { x: 1, z: 2 })).toEqual({ x: -1, z: 0 });
    expect(unitDirection({ direction: { x: 0, z: 1 } }, { x: 0, z: 0 })).toEqual({ x: 0, z: 1 });
    expect(unitDirection({}, { x: 0, z: 0 })).toBeUndefined();
  });
  it('retains measured atlas, foreground/world, cleanup and same-gate legacy suppression contracts', () => {
    for (const [id, item] of Object.entries(layout))
      expect(atlases.atlases.find(a => a.id === `chung-quy-${id}`))
        .toMatchObject({ frames: item.frames, tile: `${item.columns}x${item.rows}`, quality: 90, depthWrite: false });
    expect(layout.sigil.radialEdge).toBeGreaterThan(.4); expect(layout.sigil.radialEdge).toBeLessThan(.5);
    const source = (name: string) => readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
    expect(source('visual-chung-quy-art')).toContain("['talisman', 'slam', 'hit']");
    expect(source('visual-chung-quy-art')).toContain('resetStrip(s.flight)');
    expect(source('visual-chung-quy-art')).toContain('this.grounds.clear()');
    expect(source('visual-chung-quy-charge')).toContain("m.setFloat('uTime', c.reduced ? 0 : time)");
    expect(source('visual-chung-quy-charge')).toContain('const scale = c.reduced ? 1 : pose.scale');
    expect(source('visual-chung-quy-art')).toContain('2.1 * (g.reduced ? 1 : pose.scale)');
    expect(source('battlefield')).toContain('else if (!this.tier3.ownsGround(ground, this.zone))');
    expect(source('visual-chung-quy')).toContain('syntheticTargets: true, syntheticGround: true');
  });
});
