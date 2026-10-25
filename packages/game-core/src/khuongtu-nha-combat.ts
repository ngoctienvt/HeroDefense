import { KHUONGTU as K } from '../../../content/khuongtu-nha-design.js';
import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { applyEnemyStatus, blessedNormalDamage } from './combat-status.js';
import { distance, event, nextId } from './rules.js';
import { effectiveUnitAttack } from './stats.js';
import { tryHardControl, zoneControlled } from './crowd-control.js';

type Damage = (caster: Unit, enemy: Enemy, damage: number) => void;

export function khuongtuAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  const hits: Enemy[] = [target], available = Object.values(state.enemies)
    .filter(enemy => enemy.zone === unit.zone && enemy.hp > 0 && enemy.id !== target.id);
  while (hits.length < K.chainTargets) {
    const previous = hits[hits.length - 1];
    const next = available.filter(enemy => distance(enemy, previous) <= K.chainReach)
      .sort((a, b) => distance(a, previous) - distance(b, previous))[0];
    if (!next) break;
    hits.push(next); available.splice(available.indexOf(next), 1);
  }
  const amount = effectiveUnitAttack(unit);
  for (const enemy of hits) hurt(unit, enemy, blessedNormalDamage(state, unit, enemy, amount));
  event(state, { kind: 'attack', source: unit.id, target: target.id,
    targets: hits.map(enemy => enemy.id), x: target.x, z: target.z,
    zone: unit.zone, geometry: 'bounce', skillId: 'trait-h019', value: amount });
}

/** Slow/armor break always land; the boss seal rolls once per enemy per scroll. */
function applyZoneStatuses(state: GameState, enemy: Enemy, caster: Unit,
  rolls: { controlRolls?: Record<string, boolean> }): void {
  applyEnemyStatus(enemy, caster, 0, 'slow', .2, K.slowStrength);
  applyEnemyStatus(enemy, caster, 0, 'sunder', .2, K.sunderPercent);
  if (enemy.kind === 'boss' && zoneControlled(state, caster, enemy, rolls))
    enemy.sealed = Math.max(enemy.sealed ?? 0, .2);
}

export function khuongtuAbility(state: GameState, caster: Unit, point: Vec, hurt: Damage): void {
  const targets = Object.values(state.enemies).filter(enemy => enemy.zone === caster.zone
    && distance(enemy, point) <= K.zoneRadius);
  if (state.phase === 'lobby') {
    for (let i = 0; i < K.boltCount && targets.length; i++) {
      targets.sort((a, b) => b.hp - a.hp);
      const hit = targets[0];
      hurt(caster, hit, effectiveUnitAttack(caster) * K.powerPerBolt);
      if (state.enemies[hit.id]) tryHardControl(state, caster, hit, 'stun', K.stunSeconds);
      else targets.shift();
    }
    const rolls = {};
    for (const enemy of targets) applyZoneStatuses(state, enemy, caster, rolls);
  } else {
    const scroll = { id: nextId(state, 'scroll'), kind: 'phong-than' as const,
      x: point.x, z: point.z, zone: caster.zone, radius: K.zoneRadius,
      remaining: K.zoneSeconds, damagePerSecond: 0, casterId: caster.id,
      boltsRemaining: K.boltCount, boltClock: 0, controlRolls: {} as Record<string, boolean>,
      boltDamage: effectiveUnitAttack(caster) * K.powerPerBolt };
    (state.groundEffects ??= []).push(scroll);
    for (const enemy of targets) applyZoneStatuses(state, enemy, caster, scroll);
  }
  event(state, { kind: 'ability', source: caster.id, targets: targets.map(enemy => enemy.id),
    x: point.x, z: point.z, zone: caster.zone, ability: 'nova', skillId: 'skill-h019',
    value: effectiveUnitAttack(caster) * K.powerPerBolt });
}

export function stepPhongThan(state: GameState, dt: number, hurt: Damage): void {
  for (const zone of state.groundEffects ?? []) {
    if (zone.kind !== 'phong-than') continue;
    const caster = state.units[zone.casterId], elapsed = Math.min(dt, Math.max(0, zone.remaining));
    if (!caster || elapsed <= 0) { zone.remaining = Math.max(0, zone.remaining - dt); continue; }
    const targets = Object.values(state.enemies).filter(enemy => enemy.zone === zone.zone
      && enemy.hp > 0 && distance(enemy, zone) <= zone.radius);
    for (const enemy of targets) applyZoneStatuses(state, enemy, caster, zone);
    zone.boltClock = (zone.boltClock ?? 0) + elapsed;
    const interval = K.zoneSeconds / K.boltCount;
    while ((zone.boltClock ?? 0) + 1e-6 >= interval && (zone.boltsRemaining ?? 0) > 0) {
      zone.boltClock = (zone.boltClock ?? 0) - interval;
      zone.boltsRemaining = (zone.boltsRemaining ?? 0) - 1;
      const target = targets.filter(enemy => state.enemies[enemy.id])
        .sort((a, b) => b.hp - a.hp)[0];
      if (!target) continue;
      hurt(caster, target, zone.boltDamage ?? effectiveUnitAttack(caster) * K.powerPerBolt);
      if (state.enemies[target.id]) tryHardControl(state, caster, target, 'stun', K.stunSeconds);
      event(state, { kind: 'trait', source: caster.id, target: target.id,
        x: target.x, z: target.z, zone: zone.zone, skillId: 'bolt-h019',
        value: zone.boltDamage ?? effectiveUnitAttack(caster) * K.powerPerBolt });
    }
    zone.remaining = Math.max(0, zone.remaining - dt);
    if (zone.remaining < 1e-6) zone.remaining = 0;
  }
}
