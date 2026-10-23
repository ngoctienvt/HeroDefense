import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { VisualActor } from './visual-actors.js';
import { vothuongKills } from './visual-vothuong-kills.js';
import { CRIT_HP_RATIO, DEFAULT_WINDUP, MARK_ENERGY_RATIO, VOTHUONG_ID, VOTHUONG_SKILL } from './visual-vothuong-timeline.js';

/** Snapshot fields the marker reads (subsets of Enemy/Unit, so tests need no full GameState). */
export type VothuongEnemy = { id: string; zone: number; hp: number; maxHp: number; sunder?: { remaining: number } };
export type VothuongUnit = { heroId: string; zone: number; hp?: number; energy?: number; maxEnergy?: number };

/** Server crit condition for the snipe (combat.ts): Phá Giáp, or under 35% HP. */
export function snipeCrits(enemy: VothuongEnemy): boolean {
  return Boolean(enemy.sunder && enemy.sunder.remaining > 0) || enemy.hp / Math.max(1, enemy.maxHp) < CRIT_HP_RATIO;
}

/**
 * The enemy the next snipe will pick (combat.ts sorts enemies by lowest HP) when it also meets the crit condition,
 * shown only while some deployed Vô Thường in the zone has built up most of his Nộ (MARK_ENERGY_RATIO, a
 * presentation choice so the board is not marked all game). Undefined when nothing qualifies.
 */
export function pickMarkTarget(enemies: readonly VothuongEnemy[], units: readonly VothuongUnit[], zone: number): string | undefined {
  const ready = units.some(unit => unit.heroId === VOTHUONG_ID && unit.zone === zone && (unit.hp ?? 1) > 0
    && (unit.energy ?? 0) >= (unit.maxEnergy ?? 100) * MARK_ENERGY_RATIO);
  if (!ready) return undefined;
  let best: VothuongEnemy | undefined;
  for (const enemy of enemies) if (enemy.zone === zone && enemy.hp > 0 && (!best || enemy.hp < best.hp)) best = enemy;
  return best && snipeCrits(best) ? best.id : undefined;
}

/**
 * Which enemy wears the death mark right now. Computed from each snapshot (`refresh`), read by the actor loop
 * (`marked`); debug replays force it briefly. Pure presentation; gameplay never reads this.
 */
export class VothuongTracker {
  private target: string | undefined;
  private forced = new Map<string, number>();

  constructor(private now: () => number = () => performance.now() / 1000) {}

  refresh(enemies: readonly VothuongEnemy[], units: readonly VothuongUnit[], zone: number): void {
    const next = pickMarkTarget(enemies, units, zone);
    if (next !== this.target) debug('visual.vothuong.mark.target', { present: next !== undefined });
    this.target = next;
  }

  marked(id: string): boolean { return this.target === id || (this.forced.get(id) ?? 0) > this.now(); }

  force(id: string, seconds: number): void { this.forced.set(id, this.now() + seconds); }

  /** Records a `death` event so the same tick's ability event knows its victim died. */
  noteDeath(event: GameEvent): void {
    if (event.kind === 'death') vothuongKills.note(event.target);
  }

  clear(): void { this.target = undefined; this.forced.clear(); vothuongKills.clear(); }
}

export type VothuongReplayTarget = {
  showCast(event: GameEvent, at: Vector3): void;
  show(event: GameEvent, at: Vector3, origin?: Vector3, targets?: readonly Vector3[]): void;
};

/** Distance of the stand-in victim when no enemy is in view (world units, in front of him). */
const STAND_IN_DISTANCE = 7;

/**
 * `?debug=1` only: a client-only snipe from the first Vô Thường in view, so the skill can be reviewed without waiting
 * for 100 Nộ. `kind` undefined/'skill' = the kill (windup → chain → cut → soul flies back, death mark beforehand);
 * 'hit' = a survivor (no soul). Victim = nearest enemy in view, else a point in front of him.
 */
export function replayVothuong(actors: Map<string, VisualActor>, zone: number, effects: VothuongReplayTarget,
  tracker: VothuongTracker, kind: 'skill' | 'hit', focus?: (x: number, z: number) => void): boolean {
  const entries = [...actors.entries()].filter(([, actor]) => actor.zone === zone && actor.hp > 0 && !actor.dying);
  const caster = entries.find(([, actor]) => actor.heroId === VOTHUONG_ID);
  if (!caster) { debug('visual.vothuong.replay.skip', { reason: 'no-caster' }); return false; }
  const [sourceId, source] = caster;
  const from = source.root.position.clone();
  const enemy = entries.filter(([, actor]) => !actor.heroId)
    .sort((a, b) => a[1].root.position.subtract(from).length() - b[1].root.position.subtract(from).length())[0];
  const targetId = enemy?.[0] ?? 'replay-target';
  const at = enemy ? enemy[1].root.position.clone() : new Vector3(from.x + STAND_IN_DISTANCE, 0, from.z);
  focus?.(from.x, from.z);
  const base = { source: sourceId, target: targetId, zone, x: at.x, z: at.z } as const;
  tracker.force(targetId, DEFAULT_WINDUP + 1.2);
  effects.showCast({ ...base, id: -50, kind: 'cast', ability: 'chain', skillId: VOTHUONG_SKILL, windup: DEFAULT_WINDUP }, from);
  setTimeout(() => {
    if (kind === 'skill') vothuongKills.note(targetId);
    const origin = source.root.position.clone();
    effects.show({ ...base, id: -51, kind: 'ability', ability: 'chain', skillId: VOTHUONG_SKILL, targets: [targetId] }, at, origin);
  }, DEFAULT_WINDUP * 1000);
  debug('visual.vothuong.replay', { kind, enemy: Boolean(enemy) });
  return true;
}
