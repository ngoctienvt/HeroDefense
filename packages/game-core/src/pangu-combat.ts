import { PANGU as P } from '../../../content/pangu-design.js';
import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { MELEE_CLEAVE_SECONDARY } from '../../contracts/src/combat-profiles.js';
import { applyEnemyStatus, criticalDamageAgainst, effectiveEnemyArmor, knockEnemyBack } from './combat-status.js';
import { distance, event, isDeployed, nextId, random } from './rules.js';
import { effectiveUnitAttack } from './stats.js';

type Damage = (enemy: Enemy, damage: number, penetration?: number) => void;
export function panguDirection(from: Vec, to: Vec): Vec {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  return length > .001 ? { x: (to.x - from.x) / length, z: (to.z - from.z) / length } : { x: 0, z: 1 };
}
export function inPanguRift(origin: Vec, direction: Vec, point: Vec, length: number, width: number): boolean {
  const x = point.x - origin.x, z = point.z - origin.z;
  const along = x * direction.x + z * direction.z;
  return along >= 0 && along <= length && Math.abs(x * direction.z - z * direction.x) <= width / 2;
}
export function panguAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): boolean {
  unit.attackCount = (unit.attackCount ?? 0) + 1;
  const third = unit.attackCount % 3 === 0;
  const direction = panguDirection(unit, target), critical = random(state) < P.critChance + (unit.critBlessing?.chance ?? 0);
  const damage = effectiveUnitAttack(unit) * (third ? P.strikePower : 1) * (critical ? P.critMultiplier : 1);
  const hits = Object.values(state.enemies).filter(e => e.zone === unit.zone && e.hp > 0 && (third
    ? inPanguRift(unit, direction, e, P.strikeLength, P.strikeWidth)
    : distance(unit, e) <= P.cleaveRadius && (e.x - unit.x) * direction.x + (e.z - unit.z) * direction.z >= -1e-6));
  unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + (critical ? 24 : 14));
  for (const enemy of hits) {
    // Normal sweeps favour the chosen target; the third-strike rift keeps full damage along its line.
    const dealt = damage * (third || enemy.id === target.id ? 1 : MELEE_CLEAVE_SECONDARY);
    hurt(enemy, critical ? criticalDamageAgainst(enemy, dealt) : dealt,
      effectiveEnemyArmor(enemy) * P.armorPierce);
    if (third && state.enemies[enemy.id]) {
      enemy.bleed = { remaining: 3, bonusDamage: .1 };
      knockEnemyBack(state, enemy, .6, unit);
    }
  }
  event(state, { kind: 'attack', source: unit.id, target: target.id, targets: hits.map(e => e.id),
    x: target.x, z: target.z, zone: unit.zone, direction, value: damage, isCrit: critical,
    geometry: third ? 'linear_pierce' : 'frontal_cleave', traitType: third ? 'nth_strike' : 'crit_pierce',
    skillId: third ? 'nth-h01B' : 'trait-h01B' });
  return critical;
}

export function panguAbility(state: GameState, unit: Unit, point: Vec, direction: Vec, hurt: Damage, trueHurt: Damage): void {
  const attack = effectiveUnitAttack(unit), hits: string[] = [];
  for (const enemy of Object.values(state.enemies)) {
    if (enemy.zone !== unit.zone || distance(enemy, point) > P.blastRadius) continue;
    // Evaluate before this cast applies its own armor break.
    const critical = Boolean(enemy.sunder) || enemy.hp < enemy.maxHp * .5 || random(state) < P.critChance;
    const damage = attack * P.blastPower * (critical ? P.critMultiplier : 1);
    hurt(enemy, critical ? criticalDamageAgainst(enemy, damage) : damage,
      effectiveEnemyArmor(enemy) * P.armorPierce);
    hits.push(enemy.id);
    if (state.enemies[enemy.id]) applyEnemyStatus(enemy, unit, 0, 'sunder', P.sunderSeconds, P.sunder);
  }
  (state.groundEffects ??= []).push({ id: nextId(state, 'rift'), kind: 'pangu-rift', x: unit.x, z: unit.z,
    zone: unit.zone, direction, length: P.riftLength, width: P.riftWidth, radius: P.blastRadius,
    remaining: P.riftSeconds, damagePerSecond: attack * P.riftDps, slowStrength: P.riftSlow, casterId: unit.id });
  const globalHits = Object.values(state.enemies).filter(e => e.zone === 0);
  for (const enemy of globalHits) trueHurt(enemy, attack * P.cataclysmPower);
  for (const ally of Object.values(state.units)) if (ally.owner === unit.owner && isDeployed(ally)) {
    ally.empower = { remaining: P.empowerSeconds, attackBonus: P.empowerAttack, armorPierce: P.empowerPierce };
  }
  event(state, { kind: 'trait', source: unit.id, targets: globalHits.map(e => e.id),
    x: unit.x, z: unit.z, zone: 0, ability: 'nova', skillId: 'cataclysm-h01B', value: attack * P.cataclysmPower });
  event(state, { kind: 'ability', source: unit.id, targets: hits, x: point.x, z: point.z,
    direction, zone: unit.zone, ability: 'cleave', skillId: 'skill-h01B', value: attack * P.blastPower });
}

export function stepPanguRifts(state: GameState, dt: number, hurt: (unit: Unit, enemy: Enemy, damage: number) => void): void {
  for (const ground of state.groundEffects ?? []) {
    if (ground.kind !== 'pangu-rift') continue;
    const caster = state.units[ground.casterId], elapsed = Math.min(dt, Math.max(0, ground.remaining));
    if (caster && ground.direction && elapsed > 0) for (const enemy of Object.values(state.enemies)) {
      if (enemy.zone !== ground.zone || !inPanguRift(ground, ground.direction, enemy, ground.length ?? P.riftLength, ground.width ?? P.riftWidth)) continue;
      hurt(caster, enemy, ground.damagePerSecond * elapsed);
      if (state.enemies[enemy.id]) applyEnemyStatus(enemy, caster, 0, 'slow', elapsed + .1, ground.slowStrength ?? P.riftSlow);
    }
    ground.remaining = Math.max(0, ground.remaining - dt);
  }
}
