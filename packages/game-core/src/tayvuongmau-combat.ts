import { TAYVUONGMAU as T } from '../../../content/tayvuongmau-design.js';
import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { applyEnemyStatus, blessedNormalDamage, effectiveEnemyArmor } from './combat-status.js';
import { distance, event, isDeployed } from './rules.js';
import { effectiveUnitAttack } from './stats.js';

type Damage = (enemy: Enemy, amount: number, penetration?: number) => void;

export function tayvuongmauAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  const others = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone
    && enemy.id !== target.id && enemy.hp > 0 && distance(enemy, unit) <= unit.range)
    .sort((a, b) => distance(a, unit) - distance(b, unit))
    .slice(0, T.pins - 1);
  const hits = [target, ...others], amount = effectiveUnitAttack(unit);
  for (const enemy of hits) {
    hurt(enemy, blessedNormalDamage(state, unit, enemy, amount), effectiveEnemyArmor(enemy) * T.normalSunder);
    if (state.enemies[enemy.id]) applyEnemyStatus(enemy, unit, 0, 'sunder',
      T.normalSunderSeconds, T.normalSunder);
  }
  unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + T.ragePerAttack);
  event(state, { kind: 'attack', source: unit.id, target: target.id,
    targets: hits.map(enemy => enemy.id), x: target.x, z: target.z, zone: unit.zone,
    geometry: 'multishot', skillId: 'trait-h01A', value: amount });
}

export function tayvuongmauAbility(state: GameState, unit: Unit, point: Vec, hurt: Damage): void {
  const enemies = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone
    && enemy.hp > 0 && distance(enemy, point) <= T.rainRadius);
  const amount = effectiveUnitAttack(unit) * T.rainPower;
  for (const enemy of enemies) {
    hurt(enemy, amount);
    if (state.enemies[enemy.id]) applyEnemyStatus(enemy, unit, 0, 'sunder',
      T.rainSunderSeconds, T.rainSunder);
  }
  event(state, { kind: 'ability', source: unit.id,
    targets: enemies.map(enemy => enemy.id), x: point.x, z: point.z,
    zone: unit.zone, ability: 'nova', skillId: 'skill-h01A', value: amount });

  const recipients = Object.values(state.units).filter(ally => ally.owner === unit.owner
    && ally.zone === unit.zone && isDeployed(ally) && distance(ally, point) <= T.rainRadius)
    .sort((a, b) => effectiveUnitAttack(b) - effectiveUnitAttack(a))
    .slice(0, T.peachCount);
  for (const ally of recipients) {
    const heal = ally.maxHp * T.peachHealRatio * (unit.gearRuntime?.castScale ?? 1);
    ally.hp = Math.min(ally.maxHp, ally.hp + heal);
    ally.empower = { remaining: T.peachSeconds,
      attackBonus: Math.max(T.peachAttackBonus, ally.empower?.attackBonus ?? 0),
      armorPierce: ally.empower?.armorPierce ?? 0, kind: 'peach' };
    ally.haste = { remaining: Math.max(T.peachSeconds, ally.haste?.remaining ?? 0),
      amount: Math.max(T.peachHaste, ally.haste?.amount ?? 0),
      attackBonus: ally.haste?.attackBonus,
      cooldownReduction: ally.haste?.cooldownReduction };
    event(state, { kind: 'ability', source: unit.id, target: ally.id,
      targets: [ally.id], x: ally.x, z: ally.z, zone: unit.zone,
      ability: 'heal', skillId: 'peach-h01A', value: heal });
  }
}
