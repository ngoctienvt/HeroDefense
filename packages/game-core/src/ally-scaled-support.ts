import type { Enemy, Unit } from '../../contracts/src/types.js';

/**
 * Support helpers for Huyền–Tiên heroes. Their own attack falls far behind
 * Thánh/Thần late in a match, so heals and shields add a share of the
 * recipient's max HP, and percentage buffs/debuffs of one kind keep the
 * strongest value instead of stacking: a weaker cast never overwrites or
 * extends a stronger active effect.
 */

/** Caster-attack part plus a share of the recipient's own max HP. */
export function supportAmount(power: number, recipient: Pick<Unit, 'maxHp'>, recipientMaxHpRatio = 0): number {
  return power + recipient.maxHp * Math.max(0, recipientMaxHpRatio);
}

/** Heals the ally and returns the part that overflowed its max HP. */
export function healAlly(ally: Unit, amount: number): number {
  const missing = Math.max(0, ally.maxHp - ally.hp);
  ally.hp = Math.min(ally.maxHp, ally.hp + amount);
  return Math.max(0, amount - missing);
}

/** Percentage attack buff: a stronger active bonus is left untouched. */
export function empowerAllyMax(ally: Unit, seconds: number, attackBonus: number): void {
  const current = ally.empower;
  if (current && current.attackBonus > attackBonus) return;
  ally.empower = { remaining: seconds, attackBonus, armorPierce: current?.armorPierce ?? 0 };
}

/** Percentage attack-speed buff: a stronger active bonus is left untouched. */
export function hasteAllyMax(ally: Unit, seconds: number, amount: number, attackBonus?: number): void {
  const current = ally.haste;
  if (current && current.amount > amount) return;
  ally.haste = attackBonus ? { remaining: seconds, amount, attackBonus } : { remaining: seconds, amount };
}

/** Extra block cap for a guardian; the larger bonus wins. */
export function grantBlockBonus(unit: Unit, seconds: number, amount: number): void {
  if (unit.blockBonus && unit.blockBonus.amount > amount) return;
  unit.blockBonus = { remaining: seconds, amount };
}

/** "Takes more damage" debuff (stored as `pureLand`): the stronger bonus wins. */
export function amplifyEnemyDamageMax(enemy: Enemy, seconds: number, bonusDamage: number): void {
  const current = enemy.pureLand;
  if (current && current.bonusDamage > bonusDamage) return;
  enemy.pureLand = { remaining: seconds, bonusDamage };
}
