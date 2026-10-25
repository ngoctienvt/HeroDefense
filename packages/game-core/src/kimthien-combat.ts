import { KIMTHIEN as K } from '../../../content/kimthien-design.js';
import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { blessedNormalDamage } from './combat-status.js';
import { distance, event, isDeployed, nextId } from './rules.js';
import { effectiveUnitAttack } from './stats.js';

type Damage = (caster: Unit, enemy: Enemy, damage: number, trueDamage?: boolean) => void;

export function kimthienAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  const attack = effectiveUnitAttack(unit);
  // Mages no longer splash basic attacks: the lotus lands on its one target only.
  const hits = [target];
  for (const enemy of hits) {
    hurt(unit, enemy, blessedNormalDamage(state, unit, enemy, attack));
    if (state.enemies[enemy.id]) enemy.pureLand = {
      remaining: K.pureLandSeconds, bonusDamage: K.pureLandBonus,
    };
  }
  for (const ally of Object.values(state.units)) {
    if (!isDeployed(ally) || ally.owner !== unit.owner || ally.zone !== unit.zone
      || distance(ally, unit) > K.rageGiftRadius) continue;
    if (ally.energyType !== 'rage_on_attack' && ally.energyType !== 'rage_on_hit') continue;
    ally.energy = Math.min(ally.maxEnergy ?? 100, (ally.energy ?? 0) + K.rageGift);
  }
  event(state, { kind: 'attack', source: unit.id, target: target.id,
    targets: hits.map(enemy => enemy.id), x: target.x, z: target.z, zone: unit.zone,
    geometry: 'single', traitType: 'pure_land', skillId: 'trait-h013', value: attack });
}

export function kimthienAbility(state: GameState, unit: Unit, point: Vec, hurt: Damage): void {
  if (state.phase === 'lobby') {
    for (const enemy of Object.values(state.enemies)) {
      if (enemy.zone !== unit.zone || distance(enemy, point) > K.zoneRadius) continue;
      hurt(unit, enemy, effectiveUnitAttack(unit) * K.attackPowerPerSecond * K.zoneSeconds);
    }
  } else {
    (state.groundEffects ??= []).push({ id: nextId(state, 'bowl'), kind: 'golden-bowl',
      x: point.x, z: point.z, zone: unit.zone, radius: K.zoneRadius,
      remaining: K.zoneSeconds, damagePerSecond: effectiveUnitAttack(unit) * K.attackPowerPerSecond,
      pullSpeed: K.pullSpeed, casterId: unit.id });
  }
  event(state, { kind: 'ability', source: unit.id, x: point.x, z: point.z,
    zone: unit.zone, ability: 'nova', skillId: 'skill-h013', value: effectiveUnitAttack(unit) * K.attackPowerPerSecond * K.zoneSeconds });
}

export function stepKimthienBowls(state: GameState, dt: number, hurt: Damage): void {
  for (const bowl of state.groundEffects ?? []) {
    if (bowl.kind !== 'golden-bowl') continue;
    const caster = state.units[bowl.casterId], elapsed = Math.min(dt, Math.max(0, bowl.remaining));
    if (!caster || elapsed <= 0) { bowl.remaining = Math.max(0, bowl.remaining - dt); continue; }
    for (const enemy of Object.values(state.enemies)) {
      if (enemy.zone !== bowl.zone || distance(enemy, bowl) > bowl.radius) continue;
      const gap = distance(enemy, bowl);
      if (gap > .01) {
        const pull = Math.min(gap, (bowl.pullSpeed ?? K.pullSpeed) * elapsed);
        enemy.x += (bowl.x - enemy.x) / gap * pull;
        enemy.z += (bowl.z - enemy.z) / gap * pull;
      }
      hurt(caster, enemy, bowl.damagePerSecond * elapsed);
    }
    bowl.remaining = Math.max(0, bowl.remaining - dt);
  }
}
