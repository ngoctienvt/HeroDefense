import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { CHUCDUNG as C } from '../../../content/chucdung-design.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';

export type ChucdungReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
  markHero(heroId: string, kind: string, id: string, at: Vector3): void;
};

/** Distance in front of the caster (away from the camera, -z) used when no enemy is in range. */
const FALLBACK_DISTANCE = 5;

/** Keeps a snapshot-style marker alive for `seconds`, one call per frame (markers expire after a frame). */
function holdMarker(seconds: number, mark: () => void): void {
  const end = performance.now() + seconds * 1000;
  const step = (): void => { mark(); if (performance.now() < end) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/**
 * `?debug=1` only: replays Chúc Dung's VFX on the first one in view with fake, client-only events.
 * kinds: `ultimate` (default: telegraph, eruption, 5s lava sea), `trait` (basic strike + embers),
 * `burst` (death explosion). The blast point is the nearest enemy, `point` if given, else in front of him.
 */
export function replayChucdung(actors: Map<string, VisualActor>, zone: number, effects: ChucdungReplayTarget,
  focus?: (x: number, z: number) => void,
  options: { kind?: 'ultimate' | 'trait' | 'burst'; point?: { x: number; z: number } } = {}): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === C.id);
  if (!caster) { debug('visual.chucdung.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const origin = source.root.position.clone();
  const nearest = entries.filter(([, actor]) => !actor.heroId)
    .map(([, actor]) => actor.root.position)
    .sort((a, b) => Vector3.Distance(a, origin) - Vector3.Distance(b, origin))[0];
  const point = options.point ? new Vector3(options.point.x, 0, options.point.z)
    : nearest ? new Vector3(nearest.x, 0, nearest.z) : new Vector3(origin.x, 0, origin.z - FALLBACK_DISTANCE);
  focus?.(point.x, point.z);
  const base = { source: sourceId, zone, x: point.x, z: point.z } as const;
  const kind = options.kind ?? 'ultimate';
  if (kind === 'trait' || kind === 'burst') {
    const skillId = kind === 'trait' ? 'trait-h01H' : 'burst-h01H';
    effects.show({ ...base, id: -12, kind: 'attack', skillId, geometry: 'impact_splash' }, point.clone(), origin);
    if (kind === 'trait') holdMarker(C.emberSeconds, () => effects.markHero(C.id, 'ember', 'replay-ember', point));
    debug('visual.chucdung.replay', { kind });
    return true;
  }
  effects.showCast({ ...base, id: -10, kind: 'cast', ability: 'nova', skillId: 'skill-h01H', windup: .25 }, point.clone());
  setTimeout(() => {
    effects.show({ ...base, id: -11, kind: 'ability', ability: 'nova', skillId: 'skill-h01H' }, point.clone(), origin);
    holdMarker(C.lavaSeconds, () => effects.markHero(C.id, 'lava', 'replay-lava', point));
  }, 250);
  debug('visual.chucdung.replay', { kind });
  return true;
}
