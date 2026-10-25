import { TUONG_THAN as T } from '../../../content/tuong-than-design.js';
import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { MELEE_CLEAVE_SECONDARY } from '../../contracts/src/combat-profiles.js';
import { applyEnemyStatus, blessedNormalDamage } from './combat-status.js';
import { panguDirection } from './pangu-combat.js';
import { distance, event, isDeployed, nextId } from './rules.js';
import { effectiveUnitAttack } from './stats.js';
import { createUnit } from './unit-factory.js';

type Damage = (caster: Unit, enemy: Enemy, amount: number, direct?: boolean) => void;

function summon(state: GameState, caster: Unit, at: { x: number; z: number },
  kind: 'blood-warrior' | 'blood-general', index: number): Unit {
  const general = kind === 'blood-general';
  const soldier = createUnit(state, caster.owner, T.id);
  const angle = index * Math.PI * 2 / (general ? T.generalCount : T.warriorCap);
  soldier.id = nextId(state, 'blood');
  soldier.slot = -99; soldier.zone = caster.zone;
  soldier.x = at.x + Math.cos(angle) * 1.8;
  soldier.z = at.z + Math.sin(angle) * 1.8;
  soldier.guardPosition = { x: soldier.x, z: soldier.z };
  soldier.orderMode = 'hold'; soldier.summonerId = caster.id;
  soldier.summonKind = kind;
  soldier.summonDuration = general ? T.generalSeconds : T.warriorSeconds;
  soldier.maxHp = general ? T.generalHp : T.warriorHp;
  soldier.hp = soldier.maxHp;
  soldier.attack = general ? T.generalAttack : T.warriorAttack;
  soldier.range = 2.8; soldier.block = 0; soldier.energy = 0;
  state.units[soldier.id] = soldier;
  event(state, { kind: 'trait', source: caster.id, target: soldier.id,
    x: soldier.x, z: soldier.z, zone: caster.zone,
    skillId: general ? 'blood-general-h03Z' : 'blood-warrior-h03Z' });
  return soldier;
}

export function countBloodDeath(state: GameState, zone: number, at: { x: number; z: number }): void {
  for (const caster of Object.values(state.units)) {
    if (caster.heroId !== T.id || caster.summonKind || !isDeployed(caster)
      || caster.zone !== zone) continue;
    caster.bloodDeathCount = (caster.bloodDeathCount ?? 0) + 1;
    if (caster.bloodDeathCount < T.deathThreshold) continue;
    caster.bloodDeathCount = 0;
    const warriors = Object.values(state.units).filter(unit =>
      unit.summonKind === 'blood-warrior' && unit.summonerId === caster.id);
    if (warriors.length < T.warriorCap) summon(state, caster, at, 'blood-warrior', warriors.length);
  }
}

export function tuongThanAttack(state: GameState, caster: Unit, target: Enemy, hurt: Damage): void {
  const direction = panguDirection(caster, target);
  const hits = Object.values(state.enemies).filter(enemy => enemy.zone === caster.zone
    && enemy.hp > 0 && distance(caster, enemy) <= T.cleaveRadius
    && (enemy.x - caster.x) * direction.x + (enemy.z - caster.z) * direction.z >= 0);
  caster.energy = Math.min(caster.maxEnergy ?? 100, (caster.energy ?? 0) + T.rageOnAttack);
  for (const enemy of hits) {
    const before = enemy.hp;
    const share = enemy.id === target.id ? 1 : MELEE_CLEAVE_SECONDARY;
    hurt(caster, enemy, blessedNormalDamage(state, caster, enemy, effectiveUnitAttack(caster) * share));
    const gained = Math.max(0, before - enemy.hp) * T.conversion;
    caster.hp = Math.min(caster.maxHp, caster.hp + gained);
    caster.shield = Math.min(caster.maxHp * T.shieldCapRatio, caster.shield + gained);
    if (state.enemies[enemy.id]) {
      enemy.bleed = { remaining: T.bleedSeconds, bonusDamage: 0,
        damagePerSecond: T.bleedDps, casterId: caster.id };
      enemy.burn = { remaining: T.bleedSeconds,
        damagePerSecond: T.burnDps, casterId: caster.id };
    }
  }
  event(state, { kind: 'attack', source: caster.id, target: target.id,
    targets: hits.map(enemy => enemy.id), x: target.x, z: target.z,
    direction, zone: caster.zone, geometry: 'frontal_cleave', skillId: 'trait-h03Z' });
}

export function tuongThanAbility(state: GameState, caster: Unit, hurt: Damage): void {
  const hits = Object.values(state.enemies).filter(enemy => enemy.zone === caster.zone
    && enemy.hp > 0 && distance(enemy, caster) <= T.seaRadius);
  for (const enemy of hits) {
    hurt(caster, enemy, effectiveUnitAttack(caster) * T.seaPower);
    if (state.enemies[enemy.id]) hurt(caster, enemy, effectiveUnitAttack(caster) * T.drainPower, true);
  }
  caster.hp = caster.maxHp;
  for (const ally of Object.values(state.units)) {
    if (!isDeployed(ally) || ally.zone !== caster.zone || ally.summonKind) continue;
    ally.shield += T.teamShield;
    ally.mistShield = { remaining: T.seaSeconds,
      amount: (ally.mistShield?.amount ?? 0) + T.teamShield };
  }
  for (const general of Object.values(state.units)) {
    if (general.summonKind === 'blood-general' && general.summonerId === caster.id)
      delete state.units[general.id];
  }
  for (let index = 0; index < T.generalCount; index++)
    summon(state, caster, caster, 'blood-general', index);
  if (state.phase !== 'lobby') (state.groundEffects ??= []).push({
    id: nextId(state, 'blood-sea'), kind: 'blood-sea',
    x: caster.x, z: caster.z, zone: caster.zone, casterId: caster.id,
    radius: T.seaRadius, remaining: T.seaSeconds, damagePerSecond: T.seaDps,
  });
  event(state, { kind: 'ability', source: caster.id, targets: hits.map(enemy => enemy.id),
    x: caster.x, z: caster.z, zone: caster.zone, ability: 'nova',
    skillId: 'skill-h03Z', value: effectiveUnitAttack(caster) * T.seaPower });
}

export function stepBloodSea(state: GameState, dt: number, hurt: Damage): void {
  for (const ground of state.groundEffects ?? []) {
    if (ground.kind !== 'blood-sea' || ground.remaining <= 0) continue;
    const caster = state.units[ground.casterId];
    const activeDt = Math.min(dt, ground.remaining);
    ground.remaining -= dt;
    if (!caster) continue;
    let stolen = 0;
    for (const enemy of Object.values(state.enemies)) {
      if (enemy.zone !== ground.zone || enemy.hp <= 0 || distance(enemy, ground) > ground.radius) continue;
      const before = enemy.hp;
      hurt(caster, enemy, ground.damagePerSecond * activeDt, true);
      stolen += Math.max(0, before - enemy.hp);
      if (state.enemies[enemy.id]) {
        applyEnemyStatus(enemy, caster, 0, 'slow', activeDt + .15, T.slow);
        applyEnemyStatus(enemy, caster, 0, 'sunder', activeDt + .15, T.sunder);
      }
    }
    const allies = Object.values(state.units).filter(ally => isDeployed(ally)
      && ally.zone === ground.zone && !ally.summonKind);
    for (const ally of allies) ally.hp = Math.min(ally.maxHp, ally.hp + stolen / Math.max(1, allies.length));
  }
}

export function stepBloodSoldier(state: GameState, soldier: Unit, hurt: Damage): void {
  if (soldier.cooldown > 0 || (soldier.stun ?? 0) > 0) return;
  const target = Object.values(state.enemies).filter(enemy => enemy.zone === soldier.zone
    && enemy.hp > 0 && distance(enemy, soldier) <= soldier.range)
    .sort((a, b) => distance(a, soldier) - distance(b, soldier))[0];
  if (!target) return;
  hurt(soldier, target, soldier.attack);
  soldier.cooldown = soldier.summonKind === 'blood-general' ? T.generalInterval : T.warriorInterval;
  event(state, { kind: 'attack', source: soldier.id, target: target.id,
    x: target.x, z: target.z, zone: soldier.zone,
    skillId: soldier.summonKind === 'blood-general' ? 'blood-general-hit-h03Z' : 'blood-warrior-hit-h03Z' });
}
