import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent, Vec } from '../../../packages/contracts/src/types.js';
import { PANGU as P } from '../../../content/pangu-design.js';
import type { AbilityExtra } from './visual-kit-hero.js';
import type { PanguRiftGround } from './visual-pangu-rift.js';

export interface PanguReplayTarget {
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean;
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean;
  markRift(ground: PanguRiftGround, reduced: boolean): void;
}

/** Fake zone-0 enemies for the cataclysm preview: a loose ring around the locked point. */
export function replayQuakePoints(point: Vector3): Vector3[] {
  return Array.from({ length: 7 }, (_, i) => {
    const angle = i * 2.399, radius = 2 + (i % 3) * 1.6;
    return new Vector3(point.x + Math.cos(angle) * radius, 0, point.z + Math.sin(angle) * radius);
  });
}

/**
 * `?debug=1` preview, advanced by the module clock (client only, nothing reaches the server). Mirrors the
 * server order: cast (windup) → cataclysm trait + ability on the locked point → rift snapshot for 5 s.
 * kind: 'ultimate' (default) or 'rift' (fissure only, already torn).
 */
export class PanguReplay {
  private run?: { age: number; caster: Vector3; point: Vector3; dir: Vec; reduced: boolean; struck: boolean; kind: string };

  constructor(private vfx: PanguReplayTarget) {}

  start(kind: string, caster: Vector3, point: Vector3, reduced: boolean): boolean {
    if (kind !== 'ultimate' && kind !== 'rift') return false;
    const dx = point.x - caster.x, dz = point.z - caster.z, length = Math.hypot(dx, dz);
    const dir = length > .001 ? { x: dx / length, z: dz / length } : { x: 1, z: 0 };
    this.run = { age: kind === 'rift' ? P.windup + P.riftSeconds * .3 : 0, caster: caster.clone(), point: point.clone(),
      dir, reduced, struck: kind === 'rift', kind };
    if (kind === 'ultimate') this.vfx.cast(this.event('skill', 'cast'), caster, reduced);
    return true;
  }

  private event(prefix: string, kind: GameEvent['kind']): GameEvent {
    const run = this.run!;
    return { id: -4011, kind, skillId: `${prefix}-h01B`, source: 'debug-pangu', x: run.point.x, z: run.point.z,
      direction: run.dir, windup: P.windup };
  }

  tick(dt: number): void {
    const run = this.run;
    if (!run) return;
    run.age += dt;
    const after = run.age - P.windup;
    if (after < 0) return;
    if (!run.struck) {
      run.struck = true;
      const quakes = replayQuakePoints(run.point);
      this.vfx.ability(this.event('cataclysm', 'trait'), run.caster, quakes[0], run.reduced, { targets: quakes, hasOrigin: true });
      this.vfx.ability(this.event('skill', 'ability'), run.caster, run.point, run.reduced, { targets: [], hasOrigin: true });
    }
    const remaining = P.riftSeconds - after;
    if (remaining <= 0) { this.clear(); return; }
    this.vfx.markRift({ id: 'debug-pangu-rift', kind: 'pangu-rift', x: run.caster.x, z: run.caster.z, zone: 0,
      direction: run.dir, length: P.riftLength, width: P.riftWidth, radius: P.blastRadius, remaining,
      damagePerSecond: 0, casterId: 'debug-pangu' }, run.reduced);
  }

  clear(): void { this.run = undefined; }
}
