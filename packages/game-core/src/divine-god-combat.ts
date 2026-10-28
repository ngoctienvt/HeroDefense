import { DE_TUAN, NHU_LAI, NGUYEN_THUY } from '../../../content/new-divine-design.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { applyEnemyStatus, criticalDamageAgainst, knockEnemyBack } from './combat-status.js';
import { effectiveUnitAttack, solarCritMultiplier } from './stats.js';
import { distance, event, isDeployed, nextId } from './rules.js';
import { tryHardControl } from './crowd-control.js';
import { markGearNativeCrit } from './gear-stats.js';

type Hurt = (source: Unit, enemy: Enemy, damage: number, penetration?: number, direct?: boolean) => void;

/** Đế Tuấn's damage multiplier against bosses while transformed. */
function solarBossBonus(unit: Unit, enemy: Enemy): number {
  return unit.berserk && enemy.kind === 'boss' ? 1 + DE_TUAN.bossBonus : 1;
}

export function deTuanAttack(state: GameState, unit: Unit, target: Enemy, hurt: Hurt): void {
  const amount = effectiveUnitAttack(unit) * DE_TUAN.strikePower * (unit.berserk
    ? solarCritMultiplier(state, unit, DE_TUAN.critMultiplier) : 1);
  const hit = (unit.berserk ? criticalDamageAgainst(target, amount) : amount) * solarBossBonus(unit, target);
  if (unit.berserk) markGearNativeCrit(unit, target, hit);
  hurt(unit, target, hit);
  if (unit.berserk) {
    const nearby = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0
      && distance(enemy, target) <= 2.5);
    for (const enemy of nearby) hurt(unit, enemy, effectiveUnitAttack(unit));
    event(state, { kind: 'trait', source: unit.id, target: target.id,
      targets: nearby.map(enemy => enemy.id), x: target.x, z: target.z,
      zone: unit.zone, skillId: 'crow-burst-h01I' });
  }
  unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + 16);
  event(state, { kind: 'trait', source: unit.id, target: target.id, targets: [target.id],
    x: target.x, z: target.z, zone: unit.zone, skillId: 'trait-h01I', isCrit: !!unit.berserk });
}

export function stepSolarAura(state: GameState, dt: number, hurt: Hurt): void {
  for (const caster of Object.values(state.units)) {
    if (!isDeployed(caster) || caster.heroId !== DE_TUAN.id) continue;
    for (const enemy of Object.values(state.enemies)) {
      if (enemy.zone !== caster.zone || distance(enemy, caster) > DE_TUAN.auraRadius) continue;
      hurt(caster, enemy, effectiveUnitAttack(caster) * DE_TUAN.auraDps * dt);
      if (state.enemies[enemy.id]) applyEnemyStatus(enemy, caster, 0, 'sunder', .3, DE_TUAN.auraSunder);
    }
  }
}

export function deTuanAbility(state: GameState, caster: Unit, hurt: Hurt): void {
  const inRange = Object.values(state.enemies).filter(enemy => enemy.zone === caster.zone
    && enemy.hp > 0 && distance(enemy, caster) <= DE_TUAN.skillRadius);
  const main = [...inRange].sort((a, b) => b.hp - a.hp)[0];
  const attack = effectiveUnitAttack(caster);
  for (const enemy of inRange) {
    hurt(caster, enemy, attack * (enemy === main ? DE_TUAN.skillPower : DE_TUAN.skillSplashPower),
      enemy.armor * DE_TUAN.skillPierce);
  }
  caster.berserk = { remaining: DE_TUAN.berserkSeconds, attackSpeed: 1, lifesteal: 0, critChance: 1 };
  event(state, { kind: 'ability', source: caster.id, target: main?.id, x: caster.x, z: caster.z,
    zone: caster.zone, targets: inRange.map(enemy => enemy.id), skillId: 'skill-h01I', ability: 'nova' });
}

export function nhuLaiAttack(state: GameState, caster: Unit, target: Enemy, hurt: Hurt): void {
  // Guardian basic attacks hit one target; the Buddha aura still protects the team.
  hurt(caster, target, effectiveUnitAttack(caster));
  if (state.enemies[target.id]) {
    target.attackWeak = { remaining: 3, strength: NHU_LAI.weak };
    knockEnemyBack(state, target, .35, caster);
  }
  event(state, { kind: 'trait', source: caster.id, target: target.id, targets: [target.id],
    x: target.x, z: target.z, zone: caster.zone, skillId: 'trait-h01J' });
}

export function nhuLaiAbility(state: GameState, caster: Unit, point: {x: number; z: number}, hurt: Hurt): void {
  const hit: string[] = [];
  for (const enemy of Object.values(state.enemies)) {
    if (enemy.zone !== caster.zone || distance(enemy, point) > NHU_LAI.skillRadius) continue;
    hurt(caster, enemy, effectiveUnitAttack(caster) * NHU_LAI.skillPower);
    if (state.enemies[enemy.id]) tryHardControl(state, caster, enemy, 'stun', NHU_LAI.stunSeconds);
    hit.push(enemy.id);
  }
  (state.groundEffects ??= []).push({ id: nextId(state, 'five-finger'), kind: 'five-finger',
    x: point.x, z: point.z, zone: caster.zone, radius: NHU_LAI.skillRadius,
    remaining: NHU_LAI.zoneSeconds, damagePerSecond: 0,
    casterId: caster.id, slowStrength: NHU_LAI.zoneSlow });
  for (const ally of Object.values(state.units)) {
    if (!isDeployed(ally) || ally.owner !== caster.owner) continue;
    const amount = effectiveUnitAttack(caster) * NHU_LAI.shieldPower + ally.maxHp * NHU_LAI.shieldHp * (caster.gearRuntime?.castScale ?? 1);
    if (ally.divineShield) ally.shield = Math.max(0, ally.shield - ally.divineShield.amount);
    ally.shield += amount;
    ally.divineShield = { remaining: NHU_LAI.shieldSeconds, amount };
    event(state, { kind: 'trait', source: caster.id, target: ally.id,
      x: ally.x, z: ally.z, zone: ally.zone, skillId: 'shield-h01J', value: amount });
  }
  event(state, { kind: 'ability', source: caster.id, x: point.x, z: point.z,
    zone: caster.zone, targets: hit, skillId: 'skill-h01J', ability: 'nova' });
}

export function nguyenThuyAttack(state: GameState, caster: Unit, target: Enemy, hurt: Hurt): void {
  // Supports attack one target: the sword qi marks and pierces only the chosen enemy.
  applyEnemyStatus(target, caster, 0, 'sunder', 3, NGUYEN_THUY.normalSunder);
  target.primordialMark = { remaining: 3, owner: caster.owner,
    casterId: caster.id, bonus: NGUYEN_THUY.vulnerableTrue };
  hurt(caster, target, effectiveUnitAttack(caster));
  event(state, { kind: 'trait', source: caster.id, target: target.id, targets: [target.id],
    x: target.x, z: target.z, zone: caster.zone, skillId: 'trait-h014' });
}

export function nguyenThuyAbility(state: GameState, caster: Unit, hurt: Hurt): void {
  const hit: string[] = [];
  for (const enemy of Object.values(state.enemies)) {
    if (enemy.zone !== caster.zone) continue;
    if (enemy.kind === 'boss') {
      enemy.shield = 0;
      enemy.armorBuff = undefined;
    }
    hurt(caster, enemy, effectiveUnitAttack(caster) * NGUYEN_THUY.skillPower, 0, true);
    hit.push(enemy.id);
  }
  for (const ally of Object.values(state.units)) {
    if (!isDeployed(ally) || ally.owner !== caster.owner) continue;
    ally.divineImmortal = Math.max(ally.divineImmortal ?? 0, NGUYEN_THUY.invulnerableSeconds);
    ally.primordialBlessing = { remaining: NGUYEN_THUY.buffSeconds };
    ally.empower = { remaining: NGUYEN_THUY.buffSeconds,
      attackBonus: Math.max(0, ally.empower?.attackBonus ?? 0), armorPierce: NGUYEN_THUY.armorPierce };
    event(state, { kind: 'trait', source: caster.id, target: ally.id,
      x: ally.x, z: ally.z, zone: ally.zone, skillId: 'blessing-h014' });
  }
  event(state, { kind: 'ability', source: caster.id, x: caster.x, z: caster.z,
    zone: caster.zone, targets: hit, skillId: 'skill-h014', ability: 'nova' });
}
