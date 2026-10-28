import { KIMSI as K } from '../../../content/kimsi-design.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { MELEE_CLEAVE_SECONDARY } from '../../contracts/src/combat-profiles.js';
import { criticalDamageAgainst, effectiveEnemyArmor } from './combat-status.js';
import { distance, event, random } from './rules.js';
import { effectiveUnitAttack, solarCritMultiplier } from './stats.js';
import { markGearNativeCrit } from './gear-stats.js';

type Damage = (enemy: Enemy, amount: number, penetration?: number) => void;

function cutAndBleed(enemy: Enemy, unit: Unit): void {
  enemy.armorCuts = { remaining: K.bleedSeconds,
    amount: Math.min(K.armorCutLimit, (enemy.armorCuts?.amount ?? 0) + K.armorCutPerStrike) };
  enemy.bleed = { remaining: K.bleedSeconds, bonusDamage: enemy.bleed?.bonusDamage ?? 0,
    damagePerSecond: K.bleedDps, casterId: unit.id };
}

export function kimsiAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  const length = distance(unit, target) || 1;
  const dx = (target.x - unit.x) / length, dz = (target.z - unit.z) / length;
  const hits = Object.values(state.enemies).filter(enemy => {
    if (enemy.zone !== unit.zone || enemy.hp <= 0 || distance(enemy, unit) > K.cleaveRadius) return false;
    const vx = enemy.x - unit.x, vz = enemy.z - unit.z;
    return vx * dx + vz * dz >= -0.001;
  });
  const strikes = random(state) < K.doubleChance ? 2 : 1;
  const critChance = (unit.berserk?.critChance ?? 0) + (unit.critBlessing?.chance ?? 0);
  for (let strike = 0; strike < strikes; strike++) {
    unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + K.ragePerStrike);
    const critical = random(state) < critChance;
    const damage = effectiveUnitAttack(unit) * (critical ? solarCritMultiplier(state, unit, K.critMultiplier) : 1);
    for (const enemy of hits) {
      if (!state.enemies[enemy.id]) continue;
      const dealt = damage * (enemy.id === target.id ? 1 : MELEE_CLEAVE_SECONDARY);
      const hit = critical ? criticalDamageAgainst(enemy, dealt) : dealt;
      if (critical) markGearNativeCrit(unit, enemy, hit);
      hurt(enemy, hit);
      if (state.enemies[enemy.id]) cutAndBleed(enemy, unit);
    }
    event(state, { kind: 'attack', source: unit.id, target: target.id,
      targets: hits.map(enemy => enemy.id), x: target.x, z: target.z, zone: unit.zone,
      geometry: 'frontal_cleave', traitType: 'double_strike', skillId: 'trait-h016',
      direction: { x: dx, z: dz }, value: damage, isCrit: critical });
  }
}

export function kimsiAbility(state: GameState, unit: Unit, hurt: Damage): void {
  const hits = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone
    && enemy.hp > 0 && distance(enemy, unit) <= K.stormRadius);
  const affected: string[] = [];
  for (const enemy of hits) {
    affected.push(enemy.id);
    hurt(enemy, effectiveUnitAttack(unit) * K.stormPower, effectiveEnemyArmor(enemy));
    if (state.enemies[enemy.id]) cutAndBleed(enemy, unit);
  }
  unit.berserk = { remaining: K.berserkSeconds,
    attackSpeed: K.berserkAttackSpeed, lifesteal: 0, critChance: K.berserkCritChance };
  event(state, { kind: 'ability', source: unit.id, targets: affected,
    x: unit.x, z: unit.z, zone: unit.zone, ability: 'nova', skillId: 'skill-h016',
    value: effectiveUnitAttack(unit) * K.stormPower });
}
