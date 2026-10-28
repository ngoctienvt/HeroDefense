import type { GameState, Unit } from '../../contracts/src/types.js';
import { gearModsOf } from './gear-stats.js';

type Shield = { amount: number; remaining: number };
const amounts = new WeakMap<Shield, number>();
const untracked = new WeakMap<Unit, number>();

/** Reduce received recovery, including replacement shields, and keep expiry accounting aligned. */
export function settleGearRecovery(state: GameState, unit: Unit): void {
  const runtime = unit.gearRuntime ??= {};
  const shields: Shield[] = [];
  for (const shield of [unit.lanternShield, unit.divineShield, unit.tierShield, unit.mistShield,
    unit.frostShield, ...(unit.tierGoldShields ?? []), ...(unit.nuwaShields ?? [])]) {
    if (shield) shields.push(shield);
  }
  const trackedTotal = shields.reduce((sum, shield) => sum + shield.amount, 0);
  const bare = Math.max(0, unit.shield - trackedTotal);
  const bareBefore = untracked.get(unit) ?? Math.min(bare, runtime.shieldSeen ?? bare);
  if (gearModsOf(state, unit).uniques.has('blood-pact') && unit.hp > 0 && (runtime.hpSeen ?? unit.hp) > 0) {
    unit.hp -= Math.max(0, unit.hp - (runtime.hpSeen ?? unit.hp)) * .6;
    // Compare each shield object rather than net total: replacing a 40 shield with
    // a new 100 shield receives 100, even though total shield only grew by 60.
    let removed = Math.max(0, bare - bareBefore) * .6;
    for (const shield of shields) {
      const cut = Math.max(0, shield.amount - (amounts.get(shield) ?? 0)) * .6;
      shield.amount -= cut;
      removed += cut;
    }
    unit.shield = Math.max(0, unit.shield - removed);
  }
  for (const shield of shields) amounts.set(shield, shield.amount);
  const retained = shields.reduce((sum, shield) => sum + shield.amount, 0);
  untracked.set(unit, Math.max(0, unit.shield - retained));
  runtime.hpSeen = unit.hp; runtime.shieldSeen = unit.shield;
}
