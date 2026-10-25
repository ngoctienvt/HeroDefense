import { PHUONG_HOANG as P } from '../../../content/phuong-hoang-design.js';
import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { applyEnemyStatus, blessedNormalDamage } from './combat-status.js';
import { distance, event, isDeployed, nextId } from './rules.js';
import { effectiveUnitAttack } from './stats.js';

type Damage = (caster: Unit, enemy: Enemy, amount: number, direct?: boolean) => void;

export function phuongHoangAttack(state: GameState, caster: Unit, target: Enemy, hurt: Damage): void {
  const shots = Object.values(state.enemies).filter(enemy => enemy.zone === caster.zone
    && enemy.hp > 0 && distance(enemy, caster) <= caster.range)
    .sort((a, b) => (a.id === target.id ? -1 : b.id === target.id ? 1
      : distance(a, caster) - distance(b, caster))).slice(0, P.shots);
  caster.energy = Math.min(caster.maxEnergy ?? 100, (caster.energy ?? 0) + P.rageOnAttack);
  // Each feather strikes only its own target; the old burst around every feather is gone.
  for (const enemy of shots) {
    hurt(caster, enemy, blessedNormalDamage(state, caster, enemy, effectiveUnitAttack(caster)));
    if (!state.enemies[enemy.id]) continue;
    enemy.poison = { remaining: P.normalStatusSeconds,
      damagePerSecond: P.poisonDps, casterId: caster.id };
    enemy.burn = { remaining: P.normalStatusSeconds,
      damagePerSecond: P.burnDps, casterId: caster.id };
  }
  event(state, { kind: 'attack', source: caster.id, target: target.id,
    targets: shots.map(enemy => enemy.id), x: target.x, z: target.z,
    zone: caster.zone, geometry: 'multishot', skillId: 'trait-h041' });
}

/** Niết Bàn is ready when its cooldown (phoenixCycle) has run out. */
export function canPhoenixRebirth(caster: Unit): boolean {
  return !caster.summonKind && !caster.phoenixEgg && (caster.phoenixCycle ?? 0) <= 0;
}

export function startPhoenixEgg(state: GameState, caster: Unit): void {
  if (caster.phoenixEgg) return;
  caster.phoenixEgg = { remaining: P.eggSeconds };
  caster.phoenixCycle = P.rebirthCooldown;
  caster.hp = 1; caster.shield = 0;
  caster.pendingAbility = undefined;
  event(state, { kind: 'trait', source: caster.id,
    x: caster.x, z: caster.z, zone: caster.zone,
    skillId: 'phoenix-egg-h041' });
}

export function stepPhoenixEggs(state: GameState, dt: number, hurt: Damage): void {
  for (const caster of Object.values(state.units)) {
    if (caster.heroId !== P.id || caster.summonKind || !isDeployed(caster)) continue;
    if (caster.phoenixEgg) {
      caster.phoenixEgg.remaining -= dt;
      if (caster.phoenixEgg.remaining > 0) continue;
      caster.phoenixEgg = undefined;
      caster.hp = caster.maxHp;
      const hits = Object.values(state.enemies).filter(enemy => enemy.zone === caster.zone
        && enemy.hp > 0 && distance(enemy, caster) <= P.eggRadius);
      for (const enemy of hits) hurt(caster, enemy, effectiveUnitAttack(caster) * P.eggPower);
      event(state, { kind: 'trait', source: caster.id,
        targets: hits.map(enemy => enemy.id), x: caster.x, z: caster.z,
        zone: caster.zone, skillId: 'phoenix-rebirth-h041',
        value: effectiveUnitAttack(caster) * P.eggPower });
      continue;
    }
    // Rebirth only answers lethal damage; this just counts its cooldown down.
    if ((caster.phoenixCycle ?? 0) > 0) caster.phoenixCycle = Math.max(0, (caster.phoenixCycle ?? 0) - dt);
  }
}

export function phuongHoangAbility(state: GameState, caster: Unit, point: Vec, hurt: Damage): void {
  const hits = Object.values(state.enemies).filter(enemy => enemy.zone === caster.zone && enemy.hp > 0);
  for (const enemy of hits) {
    hurt(caster, enemy, effectiveUnitAttack(caster) * P.skillPower);
    if (state.enemies[enemy.id]) enemy.burn = {
      remaining: P.carpetSeconds, damagePerSecond: P.burnDps, casterId: caster.id,
    };
  }
  if (state.phase !== 'lobby') (state.groundEffects ??= []).push({
    id: nextId(state, 'phoenix-carpet'), kind: 'phoenix-carpet',
    x: point.x, z: point.z, zone: caster.zone, casterId: caster.id,
    radius: P.radius, remaining: P.carpetSeconds,
    damagePerSecond: effectiveUnitAttack(caster) * P.rainPower / P.rainSeconds,
    burnDps: effectiveUnitAttack(caster) * P.carpetBurnPower, healPerSecond: effectiveUnitAttack(caster) * P.healRatioPerSecond,
    rainRemaining: P.rainSeconds,
  });
  event(state, { kind: 'ability', source: caster.id,
    targets: hits.map(enemy => enemy.id), x: point.x, z: point.z,
    zone: caster.zone, ability: 'nova', skillId: 'skill-h041',
    value: effectiveUnitAttack(caster) * P.skillPower });
}

export function stepPhoenixCarpet(state: GameState, dt: number, hurt: Damage): void {
  for (const ground of state.groundEffects ?? []) {
    if (ground.kind !== 'phoenix-carpet' || ground.remaining <= 0) continue;
    const caster = state.units[ground.casterId];
    const activeDt = Math.min(dt, ground.remaining);
    const rainDt = Math.min(activeDt, ground.rainRemaining ?? 0);
    ground.remaining -= dt;
    ground.rainRemaining = Math.max(0, (ground.rainRemaining ?? 0) - dt);
    if (!caster) continue;
    for (const enemy of Object.values(state.enemies)) {
      if (enemy.zone !== ground.zone || enemy.hp <= 0 || distance(enemy, ground) > ground.radius) continue;
      if (rainDt > 0) {
        hurt(caster, enemy, ground.damagePerSecond * rainDt);
        if (state.enemies[enemy.id]) applyEnemyStatus(enemy, caster, 0, 'sunder', rainDt + .12, P.sunder);
      }
      if (state.enemies[enemy.id]) hurt(caster, enemy, (ground.burnDps ?? 0) * activeDt, true);
    }
    for (const ally of Object.values(state.units)) {
      if (!isDeployed(ally) || ally.zone !== ground.zone || ally.summonKind
        || distance(ally, ground) > ground.radius) continue;
      ally.hp = Math.min(ally.maxHp, ally.hp + (ground.healPerSecond ?? 0) * activeDt);
    }
  }
}
