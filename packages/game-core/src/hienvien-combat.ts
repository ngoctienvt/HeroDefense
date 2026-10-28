import { HIENVIEN as H } from '../../../content/hienvien-design.js';
import { bondOnCrit } from './bond-runtime.js';
import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { applyEnemyStatus, criticalDamageAgainst, effectiveEnemyArmor } from './combat-status.js';
import { distance, event, nextId, random } from './rules.js';
import { effectiveUnitAttack, solarCritMultiplier } from './stats.js';
import { startTierBarrage } from './tier-skill-pulses.js';
import { markGearNativeCrit } from './gear-stats.js';

type Damage = (enemy: Enemy, amount: number, penetration?: number) => void;

export function hienvienAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  const length = distance(unit, target) || 1;
  const center = Math.atan2((target.z - unit.z) / length, (target.x - unit.x) / length);
  const hits = new Set<string>();
  unit.attackCount = (unit.attackCount ?? 0) + 1;
  unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + H.ragePerAttack);
  for (let sword = 0; sword < H.swords; sword++) {
    const angle = center + (sword - (H.swords - 1) / 2) * H.swordFanRadians;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    for (const enemy of Object.values(state.enemies)) {
      if (enemy.zone !== unit.zone || enemy.hp <= 0) continue;
      const vx = enemy.x - unit.x, vz = enemy.z - unit.z;
      const along = vx * dx + vz * dz;
      if (along < 0 || along > H.swordLength || Math.abs(vx * dz - vz * dx) > H.swordWidth) continue;
      hits.add(enemy.id);
      const critical = random(state) < (unit.critBlessing?.chance ?? 0);
      const amount = effectiveUnitAttack(unit) * (critical ? solarCritMultiplier(state, unit, 2) : 1);
      const hit = critical ? criticalDamageAgainst(enemy, amount) : amount;
      if (critical) { markGearNativeCrit(unit, enemy, hit); bondOnCrit(state, unit, enemy); }
      hurt(enemy, hit, effectiveEnemyArmor(enemy) * H.armorPierce);
    }
  }
  event(state, { kind: 'attack', source: unit.id, target: target.id,
    targets: [...hits], x: target.x, z: target.z, zone: unit.zone,
    geometry: 'linear_pierce', skillId: 'trait-h01F', value: effectiveUnitAttack(unit),
    direction: { x: Math.cos(center), z: Math.sin(center) }, strikeIndex: unit.attackCount });
}

export function hienvienAbility(state: GameState, unit: Unit, point: Vec, hurt: Damage): void {
  const attack = effectiveUnitAttack(unit);
  const enemies = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone
    && enemy.hp > 0 && distance(enemy, point) <= H.giantRadius);
  const damage = attack * H.giantPower * solarCritMultiplier(state, unit, H.giantCritMultiplier);
  for (const enemy of enemies) {
    hurt(enemy, criticalDamageAgainst(enemy, damage));
    if (state.enemies[enemy.id]) applyEnemyStatus(enemy, unit, 0, 'sunder', H.rainSeconds, H.rainSunder);
  }
  startTierBarrage(state, unit, H.id, point, H.giantRadius,
    H.rainSwords, H.rainSeconds, attack * H.rainPower);
  if (state.phase !== 'lobby') (state.groundEffects ??= []).push({
    id: nextId(state, 'xuanyuan'), kind: 'xuanyuan-sword',
    x: point.x, z: point.z, zone: unit.zone, radius: H.giantRadius,
    remaining: H.rainSeconds, damagePerSecond: 0, casterId: unit.id,
  });
  const allies = Object.values(state.units).filter(ally => ally.owner === unit.owner
    && ally.slot >= 0 && ally.hp > 0 && ally.respawn <= 0);
  for (const ally of allies) {
    ally.haste = { remaining: H.blessingSeconds,
      amount: Math.max(ally.haste?.amount ?? 0, H.blessingHaste),
      attackBonus: ally.haste?.attackBonus,
      cooldownReduction: ally.haste?.cooldownReduction };
    ally.critBlessing = { remaining: H.blessingSeconds,
      chance: Math.max(ally.critBlessing?.chance ?? 0, H.blessingCrit) };
  }
  event(state, { kind: 'ability', source: unit.id, targets: enemies.map(enemy => enemy.id),
    x: point.x, z: point.z, zone: unit.zone, ability: 'nova', skillId: 'skill-h01F',
    value: damage, isCrit: true });
  event(state, { kind: 'trait', source: unit.id, targets: allies.map(ally => ally.id),
    x: point.x, z: point.z, zone: unit.zone, skillId: 'imperial-blessing-h01F',
    value: H.blessingCrit });
}
