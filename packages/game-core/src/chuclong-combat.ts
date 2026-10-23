import { CHUCLONG as C } from '../../../content/chuclong-design.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { applyEnemyStatus, blessedNormalDamage, effectiveEnemyArmor } from './combat-status.js';
import { distance, event, isDeployed } from './rules.js';
import { tryHardControl } from './crowd-control.js';
import { effectiveUnitAttack } from './stats.js';

type Damage = (enemy: Enemy, amount: number, penetration?: number, direct?: boolean) => void;

export function chuclongAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  const length = distance(unit, target) || 1;
  const dx = (target.x - unit.x) / length, dz = (target.z - unit.z) / length;
  const hits: string[] = [];
  for (const enemy of Object.values(state.enemies)) {
    if (enemy.zone !== unit.zone || enemy.hp <= 0) continue;
    const vx = enemy.x - unit.x, vz = enemy.z - unit.z;
    const along = vx * dx + vz * dz;
    if (along < 0 || along > C.breathLength || Math.abs(vx * dz - vz * dx) > C.breathWidth) continue;
    hits.push(enemy.id);
    hurt(enemy, blessedNormalDamage(state, unit, enemy, effectiveUnitAttack(unit)),
      effectiveEnemyArmor(enemy) * C.breathSunder);
    if (state.enemies[enemy.id]) {
      enemy.burn = { remaining: C.breathBurnSeconds, damagePerSecond: C.breathBurnDps,
        casterId: unit.id, trueDamage: true };
      applyEnemyStatus(enemy, unit, 0, 'sunder', C.breathSunderSeconds, C.breathSunder);
    }
  }
  event(state, { kind: 'attack', source: unit.id, target: target.id, targets: hits,
    x: target.x, z: target.z, zone: unit.zone, geometry: 'linear_pierce',
    direction: { x: dx, z: dz }, skillId: 'trait-h01K', value: effectiveUnitAttack(unit) });
}

export function chuclongAbility(state: GameState, unit: Unit, hurt: Damage): void {
  const attack = effectiveUnitAttack(unit), hits: string[] = [];
  for (const enemy of Object.values(state.enemies)) {
    if (enemy.zone !== unit.zone || enemy.hp <= 0) continue;
    hits.push(enemy.id);
    hurt(enemy, attack * C.winterPower);
    if (state.enemies[enemy.id]) tryHardControl(state, unit, enemy, ['stun', 'frozen'], C.winterFreezeSeconds);
  }
  for (const ally of Object.values(state.units)) {
    if (!isDeployed(ally) || ally.zone !== unit.zone || ally.summonDuration !== undefined) continue;
    ally.abilityCooldown = Math.max(0, ally.abilityCooldown - C.cooldownGift);
  }
  event(state, { kind: 'ability', source: unit.id, targets: hits,
    x: unit.x, z: unit.z, zone: unit.zone, ability: 'nova',
    skillId: 'skill-h01K', value: attack * C.winterPower });
  if (state.phase === 'lobby') summer(state, unit, unit.zone, unit.x, unit.z, attack,
    (enemy, amount, direct) => hurt(enemy, amount, 0, direct));
  else (state.solarPhases ??= []).push({ casterId: unit.id, zone: unit.zone,
    x: unit.x, z: unit.z, remaining: C.phaseDelay, attack });
}

function summer(state: GameState, caster: Unit, zone: number, x: number, z: number, attack: number,
  hurt: (enemy: Enemy, amount: number, direct: boolean) => void): void {
  const hits: string[] = [];
  for (const enemy of Object.values(state.enemies)) {
    if (enemy.zone !== zone || enemy.hp <= 0) continue;
    hits.push(enemy.id);
    hurt(enemy, attack * C.summerPower, true);
    if (state.enemies[enemy.id]) enemy.burn = {
      remaining: C.summerBurnSeconds,
      damagePerSecond: attack * C.summerBurnPower / C.summerBurnSeconds,
      casterId: caster.id, trueDamage: true,
    };
  }
  event(state, { kind: 'trait', source: caster.id, targets: hits,
    x, z, zone, ability: 'nova',
    skillId: 'summer-h01K', value: attack * C.summerPower });
}

export function stepChuclongPhases(state: GameState, dt: number,
  hurt: (caster: Unit, enemy: Enemy, amount: number, direct: boolean) => void): void {
  for (const phase of state.solarPhases ?? []) {
    phase.remaining -= dt;
    if (phase.remaining > 0) continue;
    const caster = state.units[phase.casterId];
    if (caster) summer(state, caster, phase.zone, phase.x, phase.z, phase.attack, (enemy, amount, direct) =>
      hurt(caster, enemy, amount, direct));
  }
  state.solarPhases = state.solarPhases?.filter(phase => phase.remaining > 0);
}
