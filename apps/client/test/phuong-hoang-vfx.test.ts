import { describe, expect, it } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { PhoenixReplay } from '../src/visual-phuong-hoang-replay.js';
import { PHUONG_HOANG as P } from '../../../content/phuong-hoang-design.js';
import { carpetPose, chargePose, EXTINGUISH_SECONDS, flameFrame, phoenixDirection, rainFrame,
  validPhoenixGround } from '../src/visual-phuong-hoang-timeline.js';

describe('Phượng Hoàng server/snapshot VFX contracts', () => {
  it('charges across the supplied windup, holds its maximum, and never expands beyond R9', () => {
    for (const windup of [.25, .8]) {
      let previous = chargePose(0, windup);
      for (let i = 1; i <= 100; i++) {
        const next = chargePose(i / 100 * windup, windup);
        expect(next.scale).toBeGreaterThanOrEqual(previous.scale);
        expect(next.alpha).toBeGreaterThanOrEqual(previous.alpha);
        expect(next.scale * P.radius).toBeLessThanOrEqual(P.radius);
        previous = next;
      }
      expect(chargePose(windup * 2, windup).scale).toBe(1);
    }
  });

  it('reconstructs a late snapshot without restarting rain, while the carpet remains active', () => {
    const remaining = P.carpetSeconds - P.rainSeconds - .1;
    expect(carpetPose(remaining, false).active).toBe(true);
    expect(carpetPose(remaining, false).intro).toBe(1);
    expect(rainFrame(0, 4.1, false)).toBeUndefined();
    expect(rainFrame(-.1, 4.1, false)).toBeUndefined();
    // Pausing/repeating a snapshot must not expire its active status using the local visual clock.
    for (const clock of [0, 10, 1000]) expect(rainFrame(2, clock, false)).toBeGreaterThanOrEqual(4);
  });

  it('plays the sparse closing feather frames only before server rain expiry', () => {
    expect(rainFrame(.34, 0, false)).toBe(12);
    expect(rainFrame(.001, 0, false)).toBe(15);
    expect(rainFrame(0, 0, false)).toBeUndefined();
    expect(rainFrame(Number.NaN, 0, false)).toBeUndefined();
  });

  it('folds and lifts flames in the final snapshot interval rather than only changing opacity', () => {
    const hold = carpetPose(EXTINGUISH_SECONDS + .1, false);
    const ending = carpetPose(EXTINGUISH_SECONDS / 2, false);
    expect(hold.end).toBe(0);
    expect(ending.flameHeight).toBeLessThan(hold.flameHeight);
    expect(ending.inward).toBeLessThan(hold.inward);
    expect(ending.emberLift).toBeGreaterThan(hold.emberLift);
    expect(carpetPose(0, false).active).toBe(false);
  });

  it('keeps reduced motion static but still gated by the snapshot lifetime', () => {
    expect(chargePose(.01, .25, true).scale).toBe(chargePose(.24, .25, true).scale);
    expect(flameFrame(0, true)).toBe(flameFrame(100, true));
    expect(carpetPose(.1, true).end).toBe(0);
    expect(rainFrame(.1, 100, true)).toBe(6);
    expect(rainFrame(0, 100, true)).toBeUndefined();
  });

  it('uses server direction first, derives missing direction, and never invents an axis', () => {
    expect(phoenixDirection({ direction: { x: -2, z: 0 }, x: 5, z: 0 }, { x: 0, z: 0 }))
      .toEqual({ x: -1, z: 0 });
    expect(phoenixDirection({ x: 0, z: 3 }, { x: 0, z: 0 })).toEqual({ x: 0, z: 1 });
    expect(phoenixDirection({ x: 0, z: 0 }, { x: 0, z: 0 })).toBeUndefined();
    expect(phoenixDirection({}, { x: 0, z: 0 })).toBeUndefined();
  });

  it('rejects corrupt or expired snapshot boundaries', () => {
    expect(validPhoenixGround(P.radius, P.carpetSeconds, P.rainSeconds)).toBe(true);
    for (const args of [[0, 6, 4], [9, 0, 0], [NaN, 6, 4], [9, Infinity, 4], [9, 6, -1]])
      expect(validPhoenixGround(args[0], args[1], args[2])).toBe(false);
  });
});

describe('Phượng Hoàng rebirth presentation replay', () => {
  function setup() {
    const events: GameEvent[] = [];
    let grounds = 0;
    const replay = new PhoenixReplay({
      cast: event => { events.push(event); return true; },
      ability: event => { events.push(event); return true; },
      markCarpet: () => { grounds++; },
    });
    return { replay, events, groundCount: () => grounds };
  }

  it('hides only the chosen actor for the real egg duration and fires rebirth exactly once', () => {
    const { replay, events, groundCount } = setup();
    const at = new Vector3(1, 0, 2);
    expect(replay.start('rebirth', at, at, false, 'hero')).toBe(true);
    expect(replay.egg('other-hero', at)).toBe(false);
    expect(replay.egg('hero', at)).toBe(true);
    replay.tick(P.eggSeconds - .01);
    const moved = new Vector3(4, 0, -2);
    expect(replay.egg('hero', moved)).toBe(true);
    expect(events).toHaveLength(0);
    replay.tick(.02);
    expect(replay.egg('hero', moved)).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'trait', skillId: 'phoenix-rebirth-h041', source: 'hero', x: 4, z: -2 });
    replay.tick(.3);
    expect(events).toHaveLength(1);
    expect(groundCount()).toBe(0);
  });

  it('clears the visibility override on cancellation and never fires a late rebirth', () => {
    const { replay, events } = setup();
    const at = Vector3.Zero();
    replay.start('rebirth', at, at, true, 'hero');
    replay.tick(.2);
    replay.clear();
    expect(replay.egg('hero', at)).toBe(false);
    replay.tick(5);
    expect(events).toHaveLength(0);
  });

  it('rejects rebirth without an actor identity instead of hiding an arbitrary hero', () => {
    const { replay } = setup();
    expect(replay.start('rebirth', Vector3.Zero(), Vector3.Zero(), false)).toBe(false);
  });
});
