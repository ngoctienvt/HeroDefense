import type { AbilityEffect, Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { walk } from './rules.js';
import { enemyRoute } from './battlefield-layout.js';

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
  } else if (status === 'stun') enemy.stun = Math.max(enemy.stun ?? 0, seconds);
  else if (status === 'root') enemy.root = Math.max(enemy.root ?? 0, seconds);
  else if (status === 'sunder') {
    const next = strength < 1 ? enemy.armor * strength : strength;
    const previous = enemy.sunder ? (enemy.sunder.percent ? enemy.armor * enemy.sunder.amount : enemy.sunder.amount) : 0;
    if (next >= previous) enemy.sunder = { remaining: seconds, amount: strength, percent: strength < 1 };
  }
}
export function knockEnemyBack(state: GameState, enemy: Enemy, amount: number): void {
  if (amount <= 0) return;
  if (enemy.zone) { enemy.z -= Math.min(amount, 3); return; }
  const players = Object.keys(state.players);
  const route = enemyRoute(players.length, Math.max(0, players.indexOf(enemy.owner)));
  const previous = route[Math.max(0, Math.min(route.length - 1, (enemy.pathIndex ?? 1) - 1))];
  walk(enemy, previous, Math.min(amount, 3));
}
export function effectiveEnemyArmor(enemy: Enemy): number {
  const amount = enemy.sunder?.amount ?? 0;
  const base = enemy.armor + (enemy.armorBuff?.amount ?? 0);
  return Math.max(0, base - (enemy.sunder?.percent ? base * amount : amount));
}
