import { CHUCDUNG as C } from '../../../content/chucdung-design.js';
import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { applyEnemyStatus, blessedNormalDamage } from './combat-status.js';
import { distance, event, nextId } from './rules.js';
import { effectiveUnitAttack } from './stats.js';

type Damage = (caster: Unit, enemy: Enemy, damage: number, trueDamage?: boolean) => void;

/** Burn scales with Chúc Dung's attack so it keeps pace with rank and equipment. */
export function chucdungBurnDps(caster: Unit): number {
  return effectiveUnitAttack(caster) * C.burnPower;
}

export function chucdungBurn(enemy: Enemy, caster: Unit): void {
  const previous = enemy.burn, dps = chucdungBurnDps(caster);
  if (!previous || previous.damagePerSecond <= dps) enemy.burn = {
    remaining: C.burnSeconds, damagePerSecond: dps, casterId: caster.id,
  };
}

export function chucdungAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  // Mages no longer splash basic attacks: the lava orb hits one target; the ember trail stays.
  const hits = [target];
  for (const enemy of hits) {
    hurt(unit, enemy, blessedNormalDamage(state, unit, enemy, effectiveUnitAttack(unit)));
    if (state.enemies[enemy.id]) chucdungBurn(enemy, unit);
  }
  (state.groundEffects ??= []).push({ id: nextId(state, 'ember'), kind: 'chucdung-ember',
    x: target.x, z: target.z, zone: unit.zone, radius: C.splashRadius,
    remaining: C.emberSeconds, damagePerSecond: 0, burnDps: chucdungBurnDps(unit), casterId: unit.id });
  event(state, { kind: 'attack', source: unit.id, target: target.id,
    targets: hits.map(enemy => enemy.id), x: target.x, z: target.z, zone: unit.zone,
    geometry: 'single', skillId: 'trait-h01H', value: effectiveUnitAttack(unit) });
}

export function chucdungAbility(state: GameState, unit: Unit, point: Vec, hurt: Damage): void {
  const hits = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0
    && distance(enemy, point) <= C.lavaRadius);
  for (const enemy of hits) {
    hurt(unit, enemy, effectiveUnitAttack(unit) * C.eruptionPower);
    if (state.enemies[enemy.id]) chucdungBurn(enemy, unit);
  }
  if (state.phase !== 'lobby') (state.groundEffects ??= []).push({
    id: nextId(state, 'lava'), kind: 'chucdung-lava', x: point.x, z: point.z,
    zone: unit.zone, radius: C.lavaRadius, remaining: C.lavaSeconds,
    damagePerSecond: effectiveUnitAttack(unit) * C.lavaDpsPower,
    slowStrength: C.lavaSlow, casterId: unit.id,
  });
  event(state, { kind: 'ability', source: unit.id, targets: hits.map(enemy => enemy.id),
    x: point.x, z: point.z, zone: unit.zone, ability: 'nova',
    skillId: 'skill-h01H', value: effectiveUnitAttack(unit) * C.eruptionPower });
}

export function stepChucdungGround(state: GameState, dt: number, hurt: Damage): void {
  for (const ground of state.groundEffects ?? []) {
    if (ground.kind !== 'chucdung-ember' && ground.kind !== 'chucdung-lava') continue;
    const caster = state.units[ground.casterId];
    const elapsed = Math.min(dt, Math.max(0, ground.remaining));
    if (!caster || elapsed <= 0) { ground.remaining = Math.max(0, ground.remaining - dt); continue; }
    for (const enemy of Object.values(state.enemies)) {
      if (enemy.zone !== ground.zone || enemy.hp <= 0 || distance(enemy, ground) > ground.radius) continue;
      if (ground.kind === 'chucdung-ember') {
        chucdungBurn(enemy, caster);
      } else {
        applyEnemyStatus(enemy, caster, 0, 'slow', .2, C.lavaSlow);
        hurt(caster, enemy, ground.damagePerSecond * elapsed, true);
      }
    }
    ground.remaining = Math.max(0, ground.remaining - dt);
    if (ground.remaining < 1e-6) ground.remaining = 0;
  }
}
