import type { AbilityEffect, Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { random, walk } from './rules.js';
import { clampToZone, enemyRouteFor } from './battlefield-layout.js';
import { tryHardControl } from './crowd-control.js';

type Status = NonNullable<AbilityEffect['status']>;
export function applyEnemyStatus(enemy: Enemy, caster: Unit, power: number, status: Status,
  seconds: number, strength: number): void {
  if (seconds <= 0) return;
  if (status === 'slow') {
    enemy.slows ??= enemy.slow > 0 ? [{ remaining: enemy.slow, strength: enemy.slowStrength ?? .5 }] : [];
    enemy.slows.push({ remaining: seconds, strength: Math.min(.95, strength) });
    enemy.slow = Math.max(enemy.slow, seconds);
    enemy.slowStrength = Math.max(enemy.slowStrength ?? 0, Math.min(.95, strength));
  } else if (status === 'burn') {
    const damagePerSecond = power * strength / seconds;
    if (!enemy.burn || enemy.burn.damagePerSecond <= damagePerSecond) enemy.burn = { remaining: seconds, damagePerSecond, casterId: caster.id };
  } else if (status === 'stun' || status === 'root') {
    // Hard control must roll its tier chance through crowd-control.ts.
    throw new Error(`applyEnemyStatus cannot apply hard control '${status}'; use tryHardControl`);
  } else if (status === 'sunder') {
    const next = strength < 1 ? enemy.armor * strength : strength;
    const previous = enemy.sunder ? (enemy.sunder.percent ? enemy.armor * enemy.sunder.amount : enemy.sunder.amount) : 0;
    if (next >= previous) enemy.sunder = { remaining: seconds, amount: strength, percent: strength < 1 };
  }
}
/** Data-driven ability statuses: hard control rolls its tier chance, the rest always lands. */
export function applyAbilityStatus(state: GameState, enemy: Enemy, caster: Unit, power: number, status: Status,
  seconds: number, strength: number): void {
  if (status === 'stun' || status === 'root') tryHardControl(state, caster, enemy, status, seconds);
  else applyEnemyStatus(enemy, caster, power, status, seconds, strength);
}
/** Bosses only travel this share of a knockback so they stay engaged and keep casting. */
export const BOSS_KNOCKBACK_SHARE = .25;

/**
 * Push an enemy away from `from` (the attacker or blast centre). It never touches the
 * enemy's cooldown, swing or ring slot: it steps back into place and keeps fighting.
 * Without a source it falls back to the reverse lane direction.
 */
export function knockEnemyBack(state: GameState, enemy: Enemy, amount: number, from?: Vec): void {
  const travel = Math.min(amount, 3) * (enemy.kind === 'boss' ? BOSS_KNOCKBACK_SHARE : 1);
  if (travel <= 0) return;
  const dx = from ? enemy.x - from.x : 0, dz = from ? enemy.z - from.z : 0, length = Math.hypot(dx, dz);
  if (length > .001) {
    const pushed = clampToZone(enemy.zone, { x: enemy.x + dx / length * travel, z: enemy.z + dz / length * travel });
    enemy.x = pushed.x; enemy.z = pushed.z;
    return;
  }
  if (enemy.zone) {
    const pushed = clampToZone(enemy.zone, { x: enemy.x, z: enemy.z - travel });
    enemy.x = pushed.x; enemy.z = pushed.z;
    return;
  }
  const players = Object.keys(state.players);
  const route = enemyRouteFor(players, enemy.owner);
  const previous = route[Math.max(0, Math.min(route.length - 1, (enemy.pathIndex ?? 1) - 1))];
  walk(enemy, previous, travel);
}
export function effectiveEnemyArmor(enemy: Enemy): number {
  const amount = enemy.sunder?.amount ?? 0;
  const base = enemy.armor + (enemy.armorBuff?.amount ?? 0);
  return Math.max(0, base - (enemy.sunder?.percent ? base * amount : amount)
    - (enemy.armorCuts?.amount ?? 0));
}
export function criticalDamageAgainst(enemy: Enemy, amount: number): number {
  return amount * (1 + ((enemy.critVulnerability?.remaining ?? 0) > 0
    ? enemy.critVulnerability?.amount ?? 0 : 0));
}

/** Apply Hiên Viên's timed critical chance to a normal hit lacking its own crit roll. */
export function blessedNormalDamage(state: GameState, caster: Unit, enemy: Enemy, amount: number): number {
  const chance = caster.critBlessing?.chance ?? 0;
  return chance > 0 && random(state) < chance
    ? criticalDamageAgainst(enemy, amount * 2) : amount;
}
