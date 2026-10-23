import { NUWA as N } from '../../../content/nuwa-design.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { applyEnemyStatus, blessedNormalDamage } from './combat-status.js';
import { distance, event } from './rules.js';
import { effectiveUnitAttack } from './stats.js';

type Damage = (enemy: Enemy, amount: number) => void;

function grantShield(unit: Unit, amount: number, seconds: number): void {
  if (amount <= 0) return;
  unit.shield += amount;
  (unit.nuwaShields ??= []).push({ amount, remaining: seconds });
}

export function nuwaAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  // Supports attack one target: a single five-colour stone, no extra stones or bounces.
  hurt(target, blessedNormalDamage(state, unit, target, effectiveUnitAttack(unit) * N.bounceDamageRatio));
  if (state.enemies[target.id]) applyEnemyStatus(target, unit, 0, 'slow', N.slowSeconds, N.slowStrength);
  const allies = Object.values(state.units).filter(ally => ally.slot >= 0 && ally.hp > 0
    && ally.respawn <= 0 && ally.zone === unit.zone && distance(ally, unit) <= N.supportRadius);
  for (const ally of allies) {
    ally.hp = Math.min(ally.maxHp, ally.hp + N.attackHeal);
    grantShield(ally, N.attackShield, N.attackShieldSeconds);
  }
  event(state, { kind: 'attack', source: unit.id, target: target.id,
    targets: [target.id], x: target.x, z: target.z, zone: unit.zone,
    geometry: 'single', skillId: 'trait-h01C', value: effectiveUnitAttack(unit) });
  event(state, { kind: 'trait', source: unit.id, targets: allies.map(ally => ally.id),
    x: unit.x, z: unit.z, zone: unit.zone, ability: 'shield', skillId: 'stone-blessing-h01C',
    value: N.attackShield });
}

export function nuwaAbility(state: GameState, unit: Unit, hurt: Damage): void {
  const attack = effectiveUnitAttack(unit);
  const enemies = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0);
  for (const enemy of enemies) {
    hurt(enemy, attack * N.stoneRainPower);
    if (state.enemies[enemy.id]) applyEnemyStatus(enemy, unit, 0, 'slow', N.rainSlowSeconds, N.rainSlow);
  }
  const allies = Object.values(state.units).filter(ally => ally.slot >= 0 && ally.summonDuration === undefined);
  const revived: string[] = [];
  for (const ally of allies) {
    if (ally.hp <= 0 && ally.respawn > 0) {
      ally.hp = ally.maxHp * N.reviveHpRatio;
      ally.respawn = 0;
      // Return beside Nữ Oa so a revived hero rejoins the fight she is in.
      ally.zone = unit.zone; ally.x = unit.x + (revived.length % 3 - 1) * 1.2; ally.z = unit.z - 1;
      ally.target = null; ally.destination = null;
      revived.push(ally.id);
    }
    const healing = attack * N.abilityHealPower;
    const missing = Math.max(0, ally.maxHp - ally.hp);
    ally.hp = Math.min(ally.maxHp, ally.hp + healing);
    grantShield(ally, Math.max(0, healing - missing), N.abilityShieldSeconds);
    if (!ally.ward || ally.ward.reduction <= N.ward)
      ally.ward = { remaining: N.blessingSeconds, reduction: N.ward, kind: 'five-color' };
  }
  event(state, { kind: 'ability', source: unit.id, targets: enemies.map(enemy => enemy.id),
    x: unit.x, z: unit.z, zone: unit.zone, ability: 'nova', skillId: 'skill-h01C',
    value: attack * N.stoneRainPower });
  event(state, { kind: 'trait', source: unit.id, targets: allies.map(ally => ally.id),
    x: unit.x, z: unit.z, zone: unit.zone, ability: 'heal', skillId: 'blessing-h01C',
    value: attack * N.abilityHealPower });
  if (revived.length) event(state, { kind: 'trait', source: unit.id, targets: revived,
    x: unit.x, z: unit.z, zone: unit.zone, ability: 'heal', skillId: 'revive-h01C' });
}
