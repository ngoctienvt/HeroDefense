import { THAIBACH as T } from '../../../content/thaibach-design.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { blessedNormalDamage } from './combat-status.js';
import { distance, event, isDeployed } from './rules.js';
import { effectiveUnitAttack } from './stats.js';

type Damage = (enemy: Enemy, amount: number) => void;

/** Owned, deployable heroes (no summons) — the only ones Thái Bạch protects. */
const ownedHeroes = (state: GameState, owner: string): Unit[] => Object.values(state.units)
  .filter(ally => ally.owner === owner && ally.slot >= 0 && ally.summonDuration === undefined);
const fallen = (ally: Unit): boolean => ally.hp <= 0 && ally.respawn > 0;

export function thaibachAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  hurt(target, blessedNormalDamage(state, unit, target, effectiveUnitAttack(unit) * T.boltPower));
  const ally = ownedHeroes(state, unit.owner).filter(candidate => isDeployed(candidate)
    && candidate.zone === unit.zone && candidate.hp < candidate.maxHp && distance(candidate, unit) <= T.healRadius)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (ally) ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * T.healRatio);
  event(state, { kind: 'attack', source: unit.id, target: target.id, targets: [target.id],
    x: target.x, z: target.z, zone: unit.zone, geometry: 'single', skillId: 'trait-h015',
    value: effectiveUnitAttack(unit) * T.boltPower });
  if (ally) event(state, { kind: 'trait', source: unit.id, target: ally.id, x: ally.x, z: ally.z,
    zone: ally.zone, ability: 'heal', skillId: 'star-heal-h015', value: ally.maxHp * T.healRatio });
}

/** The skill is worth casting when someone fell or a nearby owned ally is hurt or stunned. */
export function thaibachHasWork(state: GameState, unit: Unit): boolean {
  return ownedHeroes(state, unit.owner).some(ally => fallen(ally) || (isDeployed(ally)
    && ally.zone === unit.zone && distance(ally, unit) <= 12 && (ally.hp < ally.maxHp || (ally.stun ?? 0) > 0)));
}

export function thaibachAbility(state: GameState, unit: Unit): void {
  const heroes = ownedHeroes(state, unit.owner);
  const revive = heroes.filter(fallen).sort((a, b) => effectiveUnitAttack(b) - effectiveUnitAttack(a))[0];
  if (revive) {
    revive.hp = revive.maxHp * T.reviveHpRatio;
    revive.respawn = 0;
    revive.zone = unit.zone; revive.x = unit.x + 1.2; revive.z = unit.z - .8;
    revive.target = null; revive.destination = null;
    revive.divineImmortal = Math.max(revive.divineImmortal ?? 0, T.reviveInvulnerable);
    event(state, { kind: 'trait', source: unit.id, target: revive.id, targets: [revive.id],
      x: revive.x, z: revive.z, zone: unit.zone, ability: 'heal', skillId: 'revive-h015' });
    return;
  }
  const ally = heroes.filter(candidate => isDeployed(candidate) && candidate.zone === unit.zone
    && distance(candidate, unit) <= 12).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (!ally) return;
  const amount = effectiveUnitAttack(unit) * T.healPower;
  ally.hp = Math.min(ally.maxHp, ally.hp + amount);
  ally.stun = 0;
  ally.haste = { remaining: T.hasteSeconds, amount: Math.max(ally.haste?.amount ?? 0, T.haste),
    attackBonus: ally.haste?.attackBonus, cooldownReduction: ally.haste?.cooldownReduction };
  event(state, { kind: 'ability', source: unit.id, target: ally.id, targets: [ally.id],
    x: ally.x, z: ally.z, zone: ally.zone, ability: 'heal', skillId: 'skill-h015', value: amount });
}

/**
 * Trường Canh Hộ Mệnh: a lethal hit on an owned hero near a ready Thái Bạch is
 * survived at 1 HP plus 25% Máu, with brief invulnerability. Returns true when saved.
 */
export function tryStarGuard(state: GameState, unit: Unit): boolean {
  if (unit.hp > 0 || unit.slot < 0 || unit.summonDuration !== undefined) return false;
  const guardian = Object.values(state.units).find(caster => caster.heroId === T.id
    && caster.owner === unit.owner && isDeployed(caster) && (caster.starGuardCooldown ?? 0) <= 0
    && caster.zone === unit.zone && distance(caster, unit) <= T.guardRadius);
  if (!guardian) return false;
  guardian.starGuardCooldown = T.guardCooldown;
  unit.hp = 1 + unit.maxHp * T.guardHealRatio;
  unit.divineImmortal = Math.max(unit.divineImmortal ?? 0, T.guardInvulnerable);
  event(state, { kind: 'trait', source: guardian.id, target: unit.id, targets: [unit.id],
    x: unit.x, z: unit.z, zone: unit.zone, ability: 'shield', skillId: 'star-guard-h015' });
  return true;
}
