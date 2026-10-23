import { BO_DE, NHIEN_DANG } from '../../../content/new-divine-design.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { applyEnemyStatus } from './combat-status.js';
import { effectiveUnitAttack } from './stats.js';
import { distance, event, isDeployed, nextId } from './rules.js';

type Hurt = (source: Unit, enemy: Enemy, damage: number) => void;

export function lanternAttack(state: GameState, caster: Unit, first: Enemy, hurt: Hurt): void {
  // Guardian basic attacks hit one target; the lantern aura still burns the crowd.
  const hits = [first];
  hurt(caster, first, effectiveUnitAttack(caster));
  caster.energy = Math.min(caster.maxEnergy ?? 100, (caster.energy ?? 0) + 10);
  event(state, { kind: 'trait', source: caster.id, target: first.id,
    targets: hits.map(enemy => enemy.id), x: first.x, z: first.z,
    zone: caster.zone, skillId: 'trait-h03W' });
}

export function stepLanternAura(state: GameState, dt: number, hurt: Hurt): void {
  for (const caster of Object.values(state.units)) {
    if (!isDeployed(caster) || caster.heroId !== NHIEN_DANG.id) continue;
    for (const enemy of Object.values(state.enemies)) {
      if (enemy.zone !== caster.zone || distance(enemy, caster) > NHIEN_DANG.auraRadius) continue;
      hurt(caster, enemy, effectiveUnitAttack(caster) * NHIEN_DANG.auraDps * dt);
      if (state.enemies[enemy.id]) enemy.attackWeak = { remaining: .3, strength: NHIEN_DANG.weak };
    }
  }
}

export function lanternAbility(state: GameState, caster: Unit): void {
  const allies = Object.values(state.units).filter(unit => isDeployed(unit)
    && unit.owner === caster.owner && unit.zone === caster.zone
    && distance(unit, caster) <= NHIEN_DANG.radius);
  for (const ally of allies) {
    const amount = effectiveUnitAttack(caster) * NHIEN_DANG.shieldPower + ally.maxHp * NHIEN_DANG.shieldHp;
    if (ally.lanternShield) ally.shield = Math.max(0, ally.shield - ally.lanternShield.amount);
    ally.shield += amount;
    ally.lanternShield = { remaining: NHIEN_DANG.duration, amount, casterId: caster.id };
    event(state, { kind: 'trait', source: caster.id, target: ally.id,
      x: ally.x, z: ally.z, zone: ally.zone, skillId: 'shield-h03W', value: amount });
  }
  (state.groundEffects ??= []).push({ id: nextId(state, 'lantern'), kind: 'lantern-cage',
    x: caster.x, z: caster.z, zone: caster.zone, radius: NHIEN_DANG.radius,
    remaining: NHIEN_DANG.duration, casterId: caster.id,
    slowStrength: NHIEN_DANG.slow, damagePerSecond: 0 });
  event(state, { kind: 'ability', source: caster.id, x: caster.x, z: caster.z,
    zone: caster.zone, ability: 'shield', skillId: 'skill-h03W', targets: allies.map(ally => ally.id) });
}

export function bodhiAttack(state: GameState, caster: Unit, first: Enemy, hurt: Hurt): void {
  // Supports attack one target: the whisk no longer chains.
  const selected = [first.id];
  hurt(caster, first, effectiveUnitAttack(caster));
  if (state.enemies[first.id]) applyEnemyStatus(first, caster, 0, 'slow', 2, .35);
  const ally = Object.values(state.units).filter(unit => isDeployed(unit)
    && unit.owner === caster.owner && unit.zone === caster.zone)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (ally) ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * BO_DE.healRatio);
  event(state, { kind: 'trait', source: caster.id, target: first.id, targets: selected,
    x: first.x, z: first.z, zone: caster.zone, skillId: 'trait-h03X' });
}

export function bodhiAbility(state: GameState, caster: Unit): void {
  const allies = Object.values(state.units).filter(unit => isDeployed(unit)
    && unit.owner === caster.owner && unit.zone === caster.zone
    && distance(unit, caster) <= BO_DE.radius);
  for (const ally of allies)
    ally.hp = Math.min(ally.maxHp, ally.hp + effectiveUnitAttack(caster) * BO_DE.healPower);
  const chosen = allies.filter(ally => ally.id !== caster.id)
    .sort((a, b) => effectiveUnitAttack(b) - effectiveUnitAttack(a) || a.id.localeCompare(b.id)).slice(0, 2);
  for (const ally of chosen) {
    if (ally.energyType === 'cooldown') ally.abilityCooldown = 0;
    else ally.energy = ally.maxEnergy ?? 100;
    ally.empower = { remaining: BO_DE.buffSeconds, attackBonus: BO_DE.attackBonus, armorPierce: 0 };
    ally.bodhiBlessing = { remaining: BO_DE.buffSeconds };
    event(state, { kind: 'trait', source: caster.id, target: ally.id,
      x: ally.x, z: ally.z, zone: ally.zone, skillId: 'blessing-h03X' });
  }
  event(state, { kind: 'ability', source: caster.id, x: caster.x, z: caster.z,
    zone: caster.zone, ability: 'heal', skillId: 'skill-h03X', targets: chosen.map(ally => ally.id) });
}
