import { HERO_BY_ID } from '../../../content/catalog.js';
import {
  CARRY_CROWD_COUNT, CARRY_CROWD_RADIUS, CARRY_EXECUTE_THRESHOLD, CARRY_STACK_SECONDS,
} from '../../contracts/src/carry-passives.js';
import type { CarryPassiveConfig, Enemy, GameState, Unit } from '../../contracts/src/types.js';
import type { Hurt } from './attack-geometry.js';
import { distance } from './rules.js';

type CarryStat = NonNullable<GameState['carryStats']>[string];
function carryStat(state: GameState, unit: Unit): CarryStat {
  return ((state.carryStats ??= {})[unit.heroId] ??= { attacks: 0, bonus: 0, healed: 0, guarded: 0 });
}

/** Summons share a hero id with their caster but never inherit the carry passive. */
export function carryPassiveOf(unit: Unit): CarryPassiveConfig | undefined {
  return unit.summonKind ? undefined : HERO_BY_ID[unit.heroId]?.carryPassive;
}

/** Damage multiplier for the basic attack's primary target, read before the attack resolves. */
export function carryDamageMultiplier(unit: Unit, target: Enemy, passive: CarryPassiveConfig): number {
  let bonus = 0;
  if (passive.focus && unit.carryFocus?.target === target.id)
    bonus += passive.focus.perStack * Math.min(passive.focus.maxStacks, unit.carryFocus.stacks);
  if (passive.longShot && distance(unit, target) >= passive.longShot.minDistance) bonus += passive.longShot.bonus;
  if (passive.execute && target.hp / Math.max(1, target.maxHp) < CARRY_EXECUTE_THRESHOLD) bonus += passive.execute;
  if (passive.bossBonus && target.kind === 'boss') bonus += passive.bossBonus;
  return 1 + bonus;
}

/**
 * Wraps a basic attack's hurt callback: only hits the carry itself lands on the primary target
 * get the damage bonus, feed lifesteal and can trigger kill momentum. Cleave, bounce and
 * multishot neighbours pass through untouched so the passive never scales with crowd size.
 */
export function carryHurt(state: GameState, unit: Unit, target: Enemy, passive: CarryPassiveConfig, hurt: Hurt): Hurt {
  const multiplier = carryDamageMultiplier(unit, target, passive);
  return (enemy, damage, penetration, source) => {
    if (enemy.id !== target.id || (source && source.id !== unit.id)) {
      hurt(enemy, damage, penetration, source);
      return;
    }
    const hpBefore = enemy.hp;
    hurt(enemy, damage * multiplier, penetration, source);
    const dealt = Math.max(0, hpBefore - Math.max(0, enemy.hp));
    const stat = carryStat(state, unit);
    stat.bonus += dealt - dealt / multiplier;
    if (passive.lifesteal && dealt > 0 && unit.hp > 0) {
      const healed = Math.min(unit.maxHp - unit.hp, dealt * passive.lifesteal);
      unit.hp += healed;
      stat.healed += healed;
    }
    if (passive.momentum && hpBefore > 0 && !state.enemies[enemy.id])
      unit.carryMomentum = { remaining: CARRY_STACK_SECONDS, amount: passive.momentum };
  };
}

/** Advances fervor and focus after one completed basic attack. */
export function recordCarryAttack(state: GameState, unit: Unit, target: Enemy, passive: CarryPassiveConfig): void {
  carryStat(state, unit).attacks++;
  if (passive.fervor) unit.carryFervor = {
    stacks: Math.min(passive.fervor.maxStacks, (unit.carryFervor?.stacks ?? 0) + 1),
    remaining: CARRY_STACK_SECONDS,
  };
  if (passive.focus) unit.carryFocus = unit.carryFocus?.target === target.id
    ? { target: target.id, stacks: Math.min(passive.focus.maxStacks, unit.carryFocus.stacks + 1) }
    : { target: target.id, stacks: 1 };
}

/** Attack-speed share added by fervor stacks and kill momentum. */
export function carryAttackSpeedBonus(unit: Unit): number {
  const passive = carryPassiveOf(unit);
  if (!passive) return 0;
  const fervor = passive.fervor && unit.carryFervor ? passive.fervor.perStack * unit.carryFervor.stacks : 0;
  return fervor + (unit.carryMomentum?.amount ?? 0);
}

/** Damage-taken multiplier from crowd guard while the carry stands inside a pack. */
export function carryDamageTakenMultiplier(state: GameState, unit: Unit): number {
  const guard = carryPassiveOf(unit)?.crowdGuard;
  if (!guard) return 1;
  let nearby = 0;
  for (const enemy of Object.values(state.enemies)) {
    if (enemy.zone === unit.zone && enemy.hp > 0 && distance(enemy, unit) <= CARRY_CROWD_RADIUS
      && ++nearby >= CARRY_CROWD_COUNT) {
      carryStat(state, unit).guarded++;
      return 1 - guard;
    }
  }
  return 1;
}

/** Expires idle fervor stacks and momentum; called once per simulation step. */
export function tickCarryPassives(state: GameState, dt: number): void {
  for (const unit of Object.values(state.units)) {
    if (unit.carryFervor) {
      unit.carryFervor.remaining -= dt;
      if (unit.carryFervor.remaining <= 0) unit.carryFervor = undefined;
    }
    if (unit.carryMomentum) {
      unit.carryMomentum.remaining -= dt;
      if (unit.carryMomentum.remaining <= 0) unit.carryMomentum = undefined;
    }
    if (unit.carryFocus && !state.enemies[unit.carryFocus.target]) unit.carryFocus = undefined;
  }
}
