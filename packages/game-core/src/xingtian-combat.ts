import { XINGTIAN as X } from '../../../content/xingtian-design.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { MELEE_CLEAVE_SECONDARY } from '../../contracts/src/combat-profiles.js';
import { distance, event } from './rules.js';
import { effectiveUnitAttack, solarCritMultiplier } from './stats.js';
import { panguDirection } from './pangu-combat.js';
import { blessedNormalDamage, criticalDamageAgainst } from './combat-status.js';

type Damage = (enemy: Enemy, damage: number, penetration?: number) => void;

function missingHealthTenths(unit: Unit): number {
  return unit.maxHp > 0 ? Math.min(9, Math.floor((1 - unit.hp / unit.maxHp) * 10 + 1e-9)) : 0;
}

export function xingtianAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  unit.attackCount = (unit.attackCount ?? 0) + 1;
  const direction = panguDirection(unit, target);
  const damage = effectiveUnitAttack(unit);
  const lifesteal = missingHealthTenths(unit) * X.lifestealPerLostTenth;
  const hits = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0
    && distance(unit, enemy) <= X.cleaveRadius
    && (enemy.x - unit.x) * direction.x + (enemy.z - unit.z) * direction.z >= -1e-6);
  unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + X.rageOnAttack);
  for (const enemy of hits) {
    const before = enemy.hp;
    const share = enemy.id === target.id ? 1 : MELEE_CLEAVE_SECONDARY;
    hurt(enemy, blessedNormalDamage(state, unit, enemy, damage * share));
    unit.hp = Math.min(unit.maxHp, unit.hp + Math.max(0, before - enemy.hp) * lifesteal);
    if (state.enemies[enemy.id]) enemy.burn = {
      remaining: X.burnSeconds, damagePerSecond: X.burnDps, casterId: unit.id,
    };
  }
  event(state, { kind: 'attack', source: unit.id, target: target.id, targets: hits.map(enemy => enemy.id),
    x: target.x, z: target.z, zone: unit.zone, direction, value: damage,
    geometry: 'frontal_cleave', traitType: 'berserk', skillId: 'trait-h011' });

  if (!unit.berserk?.immortal) return;
  const wave = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0
    && inFireWave(unit, direction, enemy));
  for (const enemy of wave) hurt(enemy, blessedNormalDamage(state, unit, enemy, damage * X.fireWavePower), enemy.armor);
  event(state, { kind: 'trait', source: unit.id, target: target.id, targets: wave.map(enemy => enemy.id),
    x: unit.x, z: unit.z, zone: unit.zone, direction, value: damage * X.fireWavePower,
    ability: 'cleave', skillId: 'fire-wave-h011' });
}

function inFireWave(origin: Unit, direction: { x: number; z: number }, enemy: Enemy): boolean {
  const x = enemy.x - origin.x, z = enemy.z - origin.z;
  const along = x * direction.x + z * direction.z;
  return along >= 0 && along <= X.fireWaveLength
    && Math.abs(x * direction.z - z * direction.x) <= X.fireWaveHalfWidth;
}

export function xingtianAbility(state: GameState, unit: Unit, hurt: Damage): void {
  const attack = effectiveUnitAttack(unit), hits: string[] = [];
  for (const enemy of Object.values(state.enemies)) {
    if (enemy.zone !== unit.zone || distance(enemy, unit) > X.blastRadius) continue;
    const critical = (enemy.stun ?? 0) > 0 || Boolean(enemy.sunder);
    const damage = attack * X.blastPower * (critical
      ? solarCritMultiplier(state, unit, X.conditionalCritMultiplier) : 1);
    const x = enemy.x, z = enemy.z;
    hurt(enemy, critical ? criticalDamageAgainst(enemy, damage) : damage);
    hits.push(enemy.id);
    if (state.enemies[enemy.id]) {
      const dx = unit.x - x, dz = unit.z - z, length = Math.hypot(dx, dz);
      if (length > .01) {
        enemy.x += dx / length * Math.min(length, X.pullDistance);
        enemy.z += dz / length * Math.min(length, X.pullDistance);
      }
    }
  }
  unit.berserk = { remaining: X.berserkSeconds, attackSpeed: X.berserkAttackSpeed,
    lifesteal: 0, immortal: true };
  event(state, { kind: 'ability', source: unit.id, targets: hits, x: unit.x, z: unit.z,
    zone: unit.zone, ability: 'cleave', skillId: 'skill-h011', value: attack * X.blastPower });
}
