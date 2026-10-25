import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TRUONG_DAO_LANG as B } from '../../../content/truong-dao-lang-design.js';
import { arrayFrame, boltHitFrame, boltReach, boltUvs, castArrayPose, charge, iceShatter, iceSpread, sealPose,
  truongChainTargets, zoneAlpha, zoneArrayPose, zoneStartAge, ARRAY_HOLD_ALPHA, ARRAY_RISE, ARRAY_VISUAL_SCALE, ARRAY_PLANE_SIZE,
  SEAL_GROUND_SIZE } from '../src/visual-truong-dao-lang-timeline.js';
import { TruongStatusTracker } from '../src/battlefield-truong-dao-lang.js';
import { TruongReplay } from '../src/visual-truong-dao-lang-replay.js';
import type { VisualTruongDaoLang } from '../src/visual-truong-dao-lang.js';

describe('Trương Đạo Lăng timing', () => {
  it('reduces only the airborne cluster; the ground seal spans the full server radius', () => {
    expect(ARRAY_VISUAL_SCALE).toBe(.75);
    expect(ARRAY_PLANE_SIZE).toBe(27*.75);
    expect(SEAL_GROUND_SIZE*.82).toBeCloseTo(B.radius*2);
    expect(B.radius).toBe(9);
    const source = readFileSync(resolve(__dirname,'../src/visual-truong-dao-lang-array.ts'),'utf8');
    expect(source).toContain("this.art.acquire('array')");
    expect(source).not.toContain("books.spawn('truong-array'");
    expect(source).toContain('this.art.release(parts.seal)');
    expect(source).toContain("m.setFloat('uTime', time)"); // Rim/ice shaders animate instead of freezing at t=0.
  });

  it('gathers the swords overhead, slams them down, holds thinner, then lifts them away', () => {
    const gather = castArrayPose(0, B.windup, false), peak = castArrayPose(B.windup, B.windup, false);
    expect(gather.lift).toBeCloseTo(ARRAY_RISE);
    expect(peak.lift).toBeLessThan(ARRAY_RISE);
    expect(peak.alpha).toBeGreaterThan(gather.alpha);
    expect(zoneArrayPose(0, B.freezeSeconds, false).lift).toBeCloseTo(ARRAY_RISE*.75);
    expect(zoneArrayPose(.2, B.freezeSeconds-.2, false).lift).toBeLessThan(0); // overshoot into the ground
    const hold = zoneArrayPose(1.2, 1.3, false);
    expect(hold.lift).toBe(0);
    expect(hold.alpha).toBeCloseTo(ARRAY_HOLD_ALPHA);
    const exit = zoneArrayPose(2.4, .05, false);
    expect(exit.lift).toBeGreaterThan(1);
    expect(exit.alpha).toBeLessThan(.15);
    expect(zoneArrayPose(.1, 2, true)).toEqual({ lift: 0, alpha: .6 });
  });

  it('joins a zone first seen late in the hold pose with the ice fully spread', () => {
    const age = zoneStartAge(1.2);
    expect(age).toBeCloseTo(B.freezeSeconds - 1.2);
    expect(zoneArrayPose(age, 1.2, false)).toEqual({ lift: 0, alpha: ARRAY_HOLD_ALPHA });
    expect(iceSpread(age)).toBe(1);
    expect(zoneStartAge(B.freezeSeconds + 1)).toBe(0);
  });

  it('spreads the ice from the impact, shatters it only in the last beat, and spins the seal in', () => {
    expect(iceSpread(0)).toBeCloseTo(.06);
    expect(iceSpread(.45)).toBe(1);
    expect(iceShatter(2)).toBe(0);
    expect(iceShatter(0)).toBe(1);
    expect(sealPose(0, B.windup).scale).toBeCloseTo(.6);
    expect(sealPose(B.windup, B.windup).scale).toBeCloseTo(1);
    expect(sealPose(1, B.windup, 2).alpha).toBeCloseTo(.7);
    expect(charge(B.windup*2, B.windup)).toBe(1);
  });

  it('grows each strike downward from the sky without stretching the strip', () => {
    expect(boltReach(0, .26)).toBe(0);
    expect(boltReach(.26*.3, .26)).toBe(1);
    const base = [0,0, 1,0, 1,1, 0,1]; // Babylon CreatePlane: bottom-left, bottom-right, top-right, top-left.
    expect(boltUvs(base, 1)).toEqual([1,0, 1,1, 0,1, 0,0]); // head (u=1) on the ground edge
    expect(boltUvs(base, .25)).toEqual([1,0, 1,1, .75,1, .75,0]); // only the leading quarter shows
  });
  it('passes the full ordered server chain through the battlefield to effects.show', () => {
    const targets = ['third', 'first', 'sixth', 'second', 'fifth', 'fourth'];
    const points = new Map(targets.map((id, i) => [id, new Vector3(i, 0, 0)]));
    expect(truongChainTargets({ skillId: 'trait-h040', target: 'third', targets }, id => points.get(id)))
      .toEqual(targets.map(id => points.get(id)));
    expect(truongChainTargets({ skillId: 'trait-h040', targets: ['missing', 'first'] }, id => points.get(id)))
      .toEqual([points.get('first')]);
    expect(truongChainTargets({ skillId: 'trait-h040', target: 'second' }, id => points.get(id)))
      .toEqual([points.get('second')]);
    expect(truongChainTargets({ skillId: 'trait-h019', targets }, id => points.get(id))).toBeUndefined();
    // Pin the boundary: dropping the fourth argument previously discarded every target after the first.
    const source = readFileSync(resolve(__dirname, '../src/battlefield.ts'), 'utf8');
    expect(source).toContain('truongChainTargets(event,');
    expect(source).toContain('this.effects.show(event, position, source?.root.position, chain)');
  });

  it('plays the selected sheet entrance, holds while the server zone exists, then recovers', () => {
    expect(arrayFrame(B.freezeSeconds,false)).toBe(4);
    expect(arrayFrame(B.freezeSeconds-.24,false)).toBeLessThanOrEqual(7);
    expect(arrayFrame(1,false)).toBeGreaterThanOrEqual(8);
    expect(arrayFrame(1,false)).toBeLessThanOrEqual(11);
    expect(arrayFrame(.1,false)).toBeGreaterThanOrEqual(12);
    expect(arrayFrame(0,false)).toBe(15);
    expect(zoneAlpha(1)).toBe(1);
    expect(zoneAlpha(-1)).toBe(0);
  });

  it('keeps reduced-motion swords stationary and all impact indices within the atlas', () => {
    for (const remaining of [2.5,1,.1]) expect(arrayFrame(remaining,true)).toBe(10);
    expect(boltHitFrame(-1)).toBe(0);
    expect(boltHitFrame(0)).toBe(0);
    expect(boltHitFrame(.44)).toBe(7);
    expect(boltHitFrame(50)).toBe(7);
  });
});

describe('Trương Đạo Lăng status provenance', () => {
  it('requires both a confirmed recipient event and an actual snapshot status', () => {
    let now = 0;
    const tracker = new TruongStatusTracker(() => now);
    tracker.record({ id:1,kind:'ability',skillId:'skill-h040',targets:['enemy'] });
    expect(tracker.active('frozen','enemy',0)).toBe(false); // failed freeze roll
    expect(tracker.active('frozen','enemy',2.5)).toBe(true);
    expect(tracker.active('frozen','other',2.5)).toBe(false);
    tracker.record({ id:2,kind:'trait',skillId:'bolt-h040',target:'enemy' });
    expect(tracker.active('sunder','enemy',3)).toBe(true);
    expect(tracker.active('sunder','enemy',0)).toBe(false);
    expect(tracker.active('sunder','enemy',3)).toBe(false); // Other source reapplied it after h040 expired.
    now = 10;
    expect(tracker.active('frozen','enemy',2.5)).toBe(false);
    tracker.clear();
    expect(tracker.active('sunder','enemy',3)).toBe(false);
  });
});

describe('Trương Đạo Lăng local replay lifecycle', () => {
  const setup = () => {
    const vfx = { cast: vi.fn<VisualTruongDaoLang['cast']>(() => true),
      ability: vi.fn<VisualTruongDaoLang['ability']>(() => true),
      mark: vi.fn<VisualTruongDaoLang['mark']>(), markZone: vi.fn<VisualTruongDaoLang['markZone']>() };
    return { vfx, replay: new TruongReplay(vfx) };
  };

  it('waits for windup, emits exactly 21 bolts, and stops snapshot markers at the design durations', () => {
    const { vfx, replay } = setup();
    replay.start('skill', Vector3.Zero(), false);
    replay.tick(B.windup - .01);
    expect(vfx.ability).not.toHaveBeenCalled();
    for (let i = 0; i < 120; i++) replay.tick(.05);
    const bolts = vfx.ability.mock.calls.filter(([event]) => event.skillId === 'bolt-h040');
    expect(bolts).toHaveLength(B.bolts);
    expect(bolts.map(([event]) => event.strikeIndex)).toEqual(Array.from({ length: 21 }, (_, i) => i));
    const marks = vfx.markZone.mock.calls.length;
    const buffs = vfx.mark.mock.calls.length;
    replay.tick(1);
    expect(vfx.markZone).toHaveBeenCalledTimes(marks);
    expect(vfx.mark).toHaveBeenCalledTimes(buffs);
  });

  it('cancels every queued strike when the scene is cleared', () => {
    const { vfx, replay } = setup();
    replay.start('skill', Vector3.Zero(), true);
    replay.clear(); replay.tick(10);
    expect(vfx.ability).not.toHaveBeenCalled();
    expect(vfx.markZone).not.toHaveBeenCalled();
    expect(replay.start('unknown', Vector3.Zero(), true)).toBe(false);
  });
});
