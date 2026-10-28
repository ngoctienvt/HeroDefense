import { CONGCONG as C } from '../../../content/congcong-design.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { applyEnemyStatus, blessedNormalDamage, knockEnemyBack } from './combat-status.js';
import { distance, event, isDeployed } from './rules.js';
import { effectiveUnitAttack } from './stats.js';

type Damage = (enemy: Enemy, amount: number) => void;

export function congcongAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  const length = distance(unit, target) || 1;
  const dx = (target.x - unit.x) / length, dz = (target.z - unit.z) / length;
  // Guardians hold the line with block and aura; the halberd thrust hits one target.
  const hits = [target];
  hurt(target, blessedNormalDamage(state, unit, target, effectiveUnitAttack(unit)));
  unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + C.rageOnAttack);
  event(state, { kind: 'attack', source: unit.id, target: target.id,
    targets: hits.map(enemy => enemy.id), x: target.x, z: target.z, zone: unit.zone,
    geometry: 'single', traitType: 'orbit_aura', skillId: 'trait-h01G',
    value: effectiveUnitAttack(unit), direction: { x: dx, z: dz } });
}

export function stepCongcongAura(state: GameState): void {
  for (const unit of Object.values(state.units)) {
    if (unit.heroId !== C.id || !isDeployed(unit)) continue;
    for (const enemy of Object.values(state.enemies)) {
      if (enemy.zone !== unit.zone || enemy.hp <= 0 || distance(enemy, unit) > C.auraRadius) continue;
      applyEnemyStatus(enemy, unit, 0, 'slow', .2, C.auraSlow);
      if (!enemy.attackSlow || enemy.attackSlow.strength <= C.auraAttackSlow)
        enemy.attackSlow = { remaining: .2, strength: C.auraAttackSlow };
    }
  }
}

export function congcongAbility(state: GameState, unit: Unit, hurt: Damage): void {
  const attack = effectiveUnitAttack(unit);
  const enemies = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone
    && enemy.hp > 0 && distance(enemy, unit) <= C.waveRadius);
  for (const enemy of enemies) {
    hurt(enemy, attack * C.wavePower);
    if (state.enemies[enemy.id]) knockEnemyBack(state, enemy, C.knockback, unit);
  }
  const allies = Object.values(state.units).filter(ally => ally.owner === unit.owner
    && ally.zone === unit.zone && isDeployed(ally) && distance(ally, unit) <= C.shieldRadius);
  event(state, { kind: 'ability', source: unit.id,
    targets: enemies.map(enemy => enemy.id),
    x: unit.x, z: unit.z, zone: unit.zone, ability: 'nova', skillId: 'skill-h01G',
    value: attack * C.wavePower });
  for (const ally of allies) {
    const amount = attack * C.shieldAttackPower + ally.maxHp * C.shieldHpRatio * (unit.gearRuntime?.castScale ?? 1);
    ally.shield = Math.max(ally.shield, amount);
    ally.ward = { remaining: C.shieldSeconds, reduction: C.wardReduction, kind: 'black-water' };
    event(state, { kind: 'ability', source: unit.id, target: ally.id, targets: [ally.id],
      x: ally.x, z: ally.z, zone: unit.zone, ability: 'shield',
      skillId: 'shield-h01G', value: amount });
  }
}
