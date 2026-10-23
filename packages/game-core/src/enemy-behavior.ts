import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { enemyRouteFor } from './battlefield-layout.js';
import { contactDistance, enemyRadius, retreatFromTarget } from './crowd-movement.js';
import {
  atSlot, claimSlot, refreshSlot, releaseSlot, RETARGET_MARGIN, ringRadius, slotApproachGoal, slotPoint, usesRing,
  wrapAngle, type Rings,
} from './enemy-engagement.js';
import { hasActiveEnemySkillWindup } from './enemy-skill-runner.js';
import { distance, event, isDeployed } from './rules.js';
import type { SpatialGrid } from './spatial-grid.js';
import { walkEnemyWithPathing } from './unit-pathing.js';

/** Fraction of the attack interval spent winding up before damage lands (Warcraft "damage point"). */
export const ENEMY_WINDUP_SHARE = .35;
/** Extra distance a target may drift (knockback, a step) before an ongoing swing is cancelled. */
const WINDUP_LEASH = .8;
const AGGRO = { melee: 8, ranged: 10 } as const;
/** Bonus distance that lets guardians win ties when enemies pick a hero. */
const GUARDIAN_PULL = .35;
/** Blocked this long short of its slot but already in reach: swing from where it stands. */
const STALL_SWING = .4;
/** Blocked this long out of reach: give the slot up and claim one on the reachable side. */
const STALL_RESLOT = 1.5;

/** Server-only approach progress toward the ring slot (never broadcast). */
const approachProgress = new WeakMap<Enemy, { gap: number; stalled: number }>();

function stalledFor(enemy: Enemy, gap: number, dt: number): number {
  const progress = approachProgress.get(enemy);
  if (!progress || gap < progress.gap - .05) {
    approachProgress.set(enemy, { gap, stalled: 0 });
    return 0;
  }
  progress.stalled += dt;
  return progress.stalled;
}

export type EnemyTickContext = {
  state: GameState;
  dt: number;
  /** Deployed, targetable units this tick. */
  units: Unit[];
  unitGrid: SpatialGrid<Unit>;
  enemyGrid: SpatialGrid<Enemy>;
  rings: Rings;
  /** Enemies standing their ground (swinging or holding a slot); soft collisions push them less. */
  anchored: Set<string>;
  isGuardian: (unit: Unit) => boolean;
  /** Apply one landed enemy hit (damage, lifesteal, boss splash) and emit its `attack` event. */
  strike: (enemy: Enemy, target: Unit) => void;
};

export function enemyBaseRange(enemy: Enemy): number {
  return enemy.attackRange ?? (enemy.kind === 'melee' ? 1.8 : 5);
}

export function enemyAttackReach(enemy: Enemy, unit: Unit): number {
  return Math.max(enemyBaseRange(enemy), contactDistance(unit, enemy) + .15);
}

export function enemyAttackInterval(enemy: Enemy): number {
  return (enemy.attackInterval ?? (enemy.kind === 'boss' ? 1.4 : 1.2)) / (1 - (enemy.attackSlow?.strength ?? 0));
}

export function enemyWindupSeconds(enemy: Enemy): number {
  return enemyAttackInterval(enemy) * ENEMY_WINDUP_SHARE;
}

function stats(state: GameState): NonNullable<GameState['engagementStats']> {
  return state.engagementStats ??= { swings: 0, cancelled: 0, switched: 0, overflow: 0 };
}

function isDisabled(enemy: Enemy): boolean {
  return (enemy.stun ?? 0) > 0 || (enemy.frozen ?? 0) > 0;
}

function pace(enemy: Enemy, dt: number): number {
  return enemy.speed * dt * (1 - (enemy.slow ? enemy.slowStrength ?? .5 : 0));
}

function walkTo(ctx: EnemyTickContext, enemy: Enemy, goal: Vec, amount: number): boolean {
  const reach = amount + 6;
  return walkEnemyWithPathing(enemy, goal, amount,
    ctx.unitGrid.near(enemy, enemy.zone, reach), ctx.enemyGrid.near(enemy, enemy.zone, reach));
}

/** Units this enemy may consider, nearest-first with a small guardian preference. */
function candidates(ctx: EnemyTickContext, enemy: Enemy, aggro: number): Unit[] {
  const pool = enemy.zone === 0 ? ctx.unitGrid.near(enemy, 0, aggro) : ctx.units.filter(unit => unit.zone === enemy.zone);
  const limit = enemy.zone === 0 ? aggro : Infinity;
  const score = (unit: Unit) => distance(unit, enemy) - (ctx.isGuardian(unit) ? GUARDIAN_PULL : 0);
  return pool.filter(unit => unit.zone === enemy.zone && isDeployed(unit) && distance(unit, enemy) <= limit)
    .sort((a, b) => score(a) - score(b));
}

/** Continue a swing in progress. Returns true while the enemy is committed to it this tick. */
function continueWindup(ctx: EnemyTickContext, enemy: Enemy): boolean {
  const windup = enemy.windup!;
  const victim = ctx.state.units[windup.target];
  if (isDisabled(enemy) || !victim || !ctx.units.includes(victim) || !isDeployed(victim) || victim.zone !== enemy.zone
    || distance(enemy, victim) > enemyAttackReach(enemy, victim) + WINDUP_LEASH) {
    enemy.windup = undefined;
    // A cancelled swing does not spend the attack; it retries shortly.
    enemy.cooldown = Math.min(enemy.cooldown, .2);
    stats(ctx.state).cancelled++;
    return false;
  }
  ctx.anchored.add(enemy.id);
  windup.remaining -= ctx.dt;
  if (windup.remaining <= 0) {
    enemy.windup = undefined;
    ctx.strike(enemy, victim);
  }
  return true;
}

/** Begin a swing: the `cast` event lets the client hold the wind-up pose until the `attack` lands. */
function tryStartSwing(ctx: EnemyTickContext, enemy: Enemy, target: Unit): void {
  ctx.anchored.add(enemy.id);
  if (enemy.cooldown > 0 || isDisabled(enemy)) return;
  const windup = enemyWindupSeconds(enemy);
  enemy.windup = { remaining: windup, target: target.id };
  enemy.cooldown = enemyAttackInterval(enemy);
  stats(ctx.state).swings++;
  event(ctx.state, { kind: 'cast', source: enemy.id, target: target.id, x: target.x, z: target.z,
    skillId: 'monster-windup', windup });
}

/**
 * A marching enemy whose straight path crosses the crowd around a surrounded hero
 * orbits that crowd instead of shoving into it (local avoidance alone gridlocks a pack).
 */
function crowdBypass(ctx: EnemyTickContext, enemy: Enemy, goal: Vec): Vec | undefined {
  let best: { point: Vec; gap: number } | undefined;
  for (const hero of ctx.unitGrid.near(enemy, enemy.zone, 14)) {
    if (hero.zone !== enemy.zone || !(ctx.rings.get(hero.id)?.length)) continue;
    const radius = ringRadius(hero, enemy) + enemyRadius(enemy) * 2 + .3;
    const gap = distance(enemy, hero);
    if (gap > radius + 6 || distance(goal, hero) < radius || (best && gap >= best.gap)) continue;
    const sx = goal.x - enemy.x, sz = goal.z - enemy.z, length = Math.hypot(sx, sz) || 1;
    const along = Math.max(0, Math.min(length, ((hero.x - enemy.x) * sx + (hero.z - enemy.z) * sz) / length));
    const closest = Math.hypot(enemy.x + sx / length * along - hero.x, enemy.z + sz / length * along - hero.z);
    if (closest >= radius) continue;
    const current = Math.atan2(enemy.z - hero.z, enemy.x - hero.x);
    const turn = wrapAngle(Math.atan2(goal.z - hero.z, goal.x - hero.x) - current);
    const orbit = gap < radius - .2 ? radius + .3 : Math.min(gap, radius + 1);
    const heading = gap < radius - .2 ? current : current + (turn >= 0 ? 1 : -1) * .6;
    best = { gap, point: { x: hero.x + Math.cos(heading) * orbit, z: hero.z + Math.sin(heading) * orbit } };
  }
  return best?.point;
}

/** Index of the waypoint that ends the route segment closest to `point`. */
export function nearestRouteSegmentEnd(route: readonly Vec[], point: Vec): number {
  let best = 1, bestGap = Infinity;
  for (let index = 1; index < route.length; index++) {
    const from = route[index - 1], to = route[index];
    const sx = to.x - from.x, sz = to.z - from.z, lengthSq = sx * sx + sz * sz || 1;
    const t = Math.max(0, Math.min(1, ((point.x - from.x) * sx + (point.z - from.z) * sz) / lengthSq));
    const gap = Math.hypot(from.x + sx * t - point.x, from.z + sz * t - point.z);
    // Standing at (or past) a segment's end counts toward the next segment.
    const end = t >= 1 && index + 1 < route.length ? index + 1 : index;
    if (gap < bestGap - 1e-6) { best = end; bestGap = gap; }
  }
  return best;
}

/** March along the lane; reaching the end damages the shared crystal and removes the enemy. */
function walkRoute(ctx: EnemyTickContext, enemy: Enemy): void {
  const { state } = ctx;
  const players = Object.keys(state.players);
  const route = enemyRouteFor(players, enemy.owner);
  // An enemy that left the lane to fight resumes from the lane segment it now stands
  // beside, never walking back to a waypoint it already passed while chasing.
  let remaining = pace(enemy, ctx.dt), waypoint = Math.max(enemy.pathIndex ?? 1, nearestRouteSegmentEnd(route, enemy));
  enemy.pathIndex = waypoint;
  const detour = waypoint < route.length ? crowdBypass(ctx, enemy, route[waypoint]) : undefined;
  if (detour) { walkTo(ctx, enemy, detour, remaining); return; }
  while (remaining > .0001 && waypoint < route.length) {
    const gap = distance(enemy, route[waypoint]);
    if (gap < .15) { waypoint++; continue; }
    const step = Math.min(remaining, gap);
    const arrived = walkTo(ctx, enemy, route[waypoint], step);
    remaining -= step;
    if (arrived) waypoint++;
    else break;
  }
  enemy.pathIndex = waypoint;
  if (waypoint >= route.length) {
    state.baseHp = Math.max(0, state.baseHp - enemy.leak);
    delete state.enemies[enemy.id];
  }
}

/** Melee and bosses: hold a ring slot around one hero, overflow retargets or keeps marching. */
function stepRingFighter(ctx: EnemyTickContext, enemy: Enemy, rooted: boolean): void {
  const { state, rings } = ctx;
  const wasFighting = enemy.target !== null;
  const pool = candidates(ctx, enemy, AGGRO.melee);
  const near = (prey: Unit) => ctx.unitGrid.near(prey, prey.zone, ringRadius(prey, enemy) + 4);
  let prey = enemy.engage ? state.units[enemy.engage.target] : undefined;
  if (prey && (!ctx.units.includes(prey) || !isDeployed(prey))) { releaseSlot(rings, enemy); prey = undefined; }
  if (prey && enemy.zone === 0 && distance(prey, enemy) > AGGRO.melee + 4) { releaseSlot(rings, enemy); prey = undefined; }
  if (prey && distance(enemy, prey) > enemyAttackReach(enemy, prey) + .15) {
    // Still chasing: take a hero that can be hit right now, or one clearly closer.
    const current = distance(enemy, prey);
    for (const other of pool) {
      if (other === prey) continue;
      const gap = distance(enemy, other);
      if (gap > enemyAttackReach(enemy, other) && gap > current - RETARGET_MARGIN) continue;
      if (claimSlot(rings, other, enemy, near(other))) { prey = other; stats(state).switched++; break; }
    }
  }
  if (prey && !refreshSlot(rings, prey, enemy, near(prey))) prey = undefined;
  if (!prey) for (const other of pool) if (claimSlot(rings, other, enemy, near(other))) { prey = other; break; }
  // Its hero just fell or left: look a little wider for the next fight before marching on.
  if (!prey && wasFighting && enemy.zone === 0) for (const other of candidates(ctx, enemy, AGGRO.melee + 4)) {
    if (!pool.includes(other) && claimSlot(rings, other, enemy, near(other))) { prey = other; break; }
  }

  if (!prey) {
    enemy.target = null;
    if (pool.length) stats(state).overflow++;
    if (rooted) return;
    if (enemy.zone === 0) { walkRoute(ctx, enemy); return; }
    const nearest = pool[0];
    if (!nearest) return;
    const gap = distance(enemy, nearest) || 1, hold = ringRadius(nearest, enemy) + enemyRadius(enemy) * 2;
    if (gap > hold + .1) walkTo(ctx, enemy, {
      x: nearest.x + (enemy.x - nearest.x) / gap * hold, z: nearest.z + (enemy.z - nearest.z) / gap * hold,
    }, Math.min(pace(enemy, ctx.dt), gap - hold));
    return;
  }

  enemy.target = prey.id;
  const angle = enemy.engage!.angle, reach = enemyAttackReach(enemy, prey);
  const inReach = distance(enemy, prey) <= reach + .15;
  if (atSlot(prey, enemy, angle, reach) || (rooted && inReach)) {
    approachProgress.delete(enemy);
    tryStartSwing(ctx, enemy, prey);
    return;
  }
  if (rooted) return;
  const stalled = stalledFor(enemy, distance(enemy, slotPoint(prey, enemy, angle)), ctx.dt);
  if (inReach && stalled >= STALL_SWING) {
    // Body-blocked short of its slot but already touching the hero: fight from here.
    tryStartSwing(ctx, enemy, prey);
    return;
  }
  if (stalled >= STALL_RESLOT) {
    approachProgress.delete(enemy);
    releaseSlot(rings, enemy);
    if (!claimSlot(rings, prey, enemy, near(prey))) { enemy.target = null; return; }
  }
  walkTo(ctx, enemy, slotApproachGoal(prey, enemy, enemy.engage!.angle), pace(enemy, ctx.dt));
}

/** Archers keep a band behind the melee ring and back off when a hero closes in. */
function stepRanged(ctx: EnemyTickContext, enemy: Enemy, rooted: boolean): void {
  const pool = candidates(ctx, enemy, AGGRO.ranged);
  let prey = enemy.target ? ctx.state.units[enemy.target] : undefined;
  if (prey && (!pool.includes(prey))) prey = undefined;
  if (prey && distance(enemy, prey) > enemyAttackReach(enemy, prey)) {
    const current = distance(enemy, prey);
    const better = pool.find(other => other !== prey && (distance(enemy, other) <= enemyAttackReach(enemy, other)
      || distance(enemy, other) < current - RETARGET_MARGIN));
    if (better) { prey = better; stats(ctx.state).switched++; }
  }
  prey ??= pool[0];
  if (!prey) {
    enemy.target = null;
    if (!rooted && enemy.zone === 0) walkRoute(ctx, enemy);
    return;
  }
  enemy.target = prey.id;
  const range = enemyBaseRange(enemy), reach = enemyAttackReach(enemy, prey), gap = distance(enemy, prey);
  if (gap <= reach) {
    const preferred = Math.max(contactDistance(prey, enemy) + .5, range * .75);
    if (!rooted && gap < preferred) {
      const away = retreatFromTarget(enemy, prey, pace(enemy, ctx.dt), enemy.zone);
      walkTo(ctx, enemy, away, pace(enemy, ctx.dt));
    }
    tryStartSwing(ctx, enemy, prey);
    return;
  }
  const approach = Math.max(0, gap - range * .9);
  if (!rooted && approach > .05) walkTo(ctx, enemy, prey, Math.min(pace(enemy, ctx.dt), approach));
}

/** Outside the combat phase enemies only hit what is already in reach, else follow lane or chase. */
function stepOutsideCombat(ctx: EnemyTickContext, enemy: Enemy, rooted: boolean): void {
  const score = (unit: Unit) => distance(unit, enemy) - (ctx.isGuardian(unit) ? GUARDIAN_PULL : 0);
  const target = ctx.units.filter(unit => unit.zone === enemy.zone && isDeployed(unit)
    && distance(unit, enemy) <= enemyAttackReach(enemy, unit)).sort((a, b) => score(a) - score(b))[0];
  enemy.target = target?.id ?? null;
  if (target) { tryStartSwing(ctx, enemy, target); return; }
  if (rooted) return;
  if (enemy.zone === 0) { walkRoute(ctx, enemy); return; }
  const prey = ctx.units.filter(unit => unit.zone === enemy.zone && isDeployed(unit))
    .sort((a, b) => distance(a, enemy) - distance(b, enemy))[0];
  if (prey) walkTo(ctx, enemy, prey, pace(enemy, ctx.dt));
}

/** One tick of targeting, movement and attacking for an enemy whose statuses were already advanced. */
export function stepEnemyBehavior(ctx: EnemyTickContext, enemy: Enemy): void {
  if (hasActiveEnemySkillWindup(enemy)) {
    ctx.anchored.add(enemy.id);
    return;
  }
  if (enemy.windup && continueWindup(ctx, enemy)) return;
  const rooted = isDisabled(enemy) || (enemy.root ?? 0) > 0;
  if (ctx.state.phase !== 'combat') stepOutsideCombat(ctx, enemy, rooted);
  else if (usesRing(enemy)) stepRingFighter(ctx, enemy, rooted);
  else stepRanged(ctx, enemy, rooted);
}
