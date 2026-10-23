import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';
import { BAOQUATU_ID, BAOQUATU_SKILL, DEFAULT_WINDUP, PLANT_SECONDS } from './visual-baoquatu-timeline.js';

/** Spell reach (catalog `range` 7.5): the debug replay picks the nearest enemy inside it. */
const REPLAY_RANGE = 7.5;
/** How far ahead of Bảo Quả Tử the replay blasts when no enemy is in range. */
const EMPTY_FIELD_DISTANCE = 5;

export type PlantMarker = { id: string; position: Vector3; zone: number };

/**
 * Debug replays have no server `summon_plant`, so the tracker holds client-only plants for the 6 s the real
 * one lives; the snapshot loop marks both kinds the same way. Pure presentation.
 */
export class BaoquatuTracker {
  private forced = new Map<string, { position: Vector3; zone: number; until: number }>();

  constructor(private now: () => number = () => performance.now() / 1000) {}

  forcePlant(id: string, position: Vector3, zone: number, seconds: number): void {
    this.forced.set(id, { position: position.clone(), zone, until: this.now() + seconds });
  }

  /** Forced plants still alive; expired ones are dropped here. */
  plants(): PlantMarker[] {
    const now = this.now();
    const live: PlantMarker[] = [];
    for (const [id, plant] of this.forced) {
      if (plant.until <= now) { this.forced.delete(id); continue; }
      live.push({ id, position: plant.position, zone: plant.zone });
    }
    return live;
  }

  clear(): void { this.forced.clear(); }
}

export type BaoquatuReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
};

/**
 * `?debug=1` only: client-only events on the first Bảo Quả Tử in view, so the skill can be reviewed without
 * waiting for the cooldown. Blasts the nearest enemy within 7.5 (or a point ahead / the given point when the
 * field is empty): windup → seed → burst → plant + mist for 6 s.
 */
export function replayBaoquatu(actors: Map<string, VisualActor>, zone: number, effects: BaoquatuReplayTarget,
  tracker: BaoquatuTracker, focus?: (x: number, z: number) => void, options: { point?: { x: number; z: number } } = {}): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === BAOQUATU_ID);
  if (!caster) { debug('visual.baoquatu.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const origin = source.root.position.clone();
  const nearest = entries.filter(([, actor]) => !actor.heroId && actor.root.position.subtract(origin).length() <= REPLAY_RANGE)
    .sort((a, b) => a[1].root.position.subtract(origin).length() - b[1].root.position.subtract(origin).length())[0];
  const point = options.point ? new Vector3(options.point.x, 0, options.point.z)
    : nearest ? nearest[1].root.position.clone() : new Vector3(origin.x, 0, origin.z + EMPTY_FIELD_DISTANCE);
  focus?.(point.x, point.z);
  const base = { source: sourceId, zone } as const;
  effects.showCast({ ...base, id: -40, kind: 'cast', ability: 'nova', skillId: BAOQUATU_SKILL, x: point.x, z: point.z,
    windup: DEFAULT_WINDUP }, origin);
  setTimeout(() => {
    effects.show({ ...base, id: -41, kind: 'ability', ability: 'nova', skillId: BAOQUATU_SKILL,
      target: nearest?.[0], targets: nearest ? [nearest[0]] : [], x: point.x, z: point.z }, point, origin, [point]);
    tracker.forcePlant(`replay-plant-${sourceId}`, point, zone, PLANT_SECONDS);
  }, DEFAULT_WINDUP * 1000);
  debug('visual.baoquatu.replay', { enemy: Boolean(nearest) });
  return true;
}
