import { SHENNONG as S } from '../../../content/shennong-design.js';
import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { blessedNormalDamage } from './combat-status.js';
import { distance, event, isDeployed, nextId } from './rules.js';
import { effectiveUnitAttack } from './stats.js';

type Damage = (caster: Unit, enemy: Enemy, amount: number, trueDamage?: boolean) => void;

export function shennongAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  const attack = effectiveUnitAttack(unit);
  // Mages no longer splash basic attacks: the whip poisons its one target only.
  const hits = [target];
  for (const enemy of hits) {
    hurt(unit, enemy, blessedNormalDamage(state, unit, enemy, attack));
    if (state.enemies[enemy.id] && (enemy.poison?.damagePerSecond ?? 0) <= attack * S.normalPoisonPower)
      enemy.poison = { remaining: S.normalPoisonSeconds,
        damagePerSecond: attack * S.normalPoisonPower, casterId: unit.id };
  }
  const allies = Object.values(state.units).filter(ally => isDeployed(ally) && ally.zone === unit.zone
    && distance(ally, target) <= S.normalHealRadius && ally.summonDuration === undefined);
  for (const ally of allies) ally.hp = Math.min(ally.maxHp, ally.hp + S.normalHeal);
  event(state, { kind: 'attack', source: unit.id, target: target.id,
    targets: hits.map(enemy => enemy.id), x: target.x, z: target.z, zone: unit.zone,
    geometry: 'single', skillId: 'trait-h01E', value: attack });
  if (allies.length) event(state, { kind: 'trait', source: unit.id,
    targets: allies.map(ally => ally.id), x: target.x, z: target.z, zone: unit.zone,
    ability: 'heal', skillId: 'herb-heal-h01E', value: S.normalHeal });
}

function spawnTree(state: GameState, caster: Unit, point: Vec, index: number): Unit {
  const angle = index * Math.PI * 2 / S.trees;
  const tree: Unit = {
    id: nextId(state, 'ancient-tree'), heroId: 'summon_shennong_tree', owner: caster.owner,
    rank: 1, slot: -99, x: point.x + Math.cos(angle) * 4.2,
    z: point.z + Math.sin(angle) * 4.2, hp: S.treeHp, maxHp: S.treeHp,
    attack: 0, armor: 18, range: 0, cooldown: 0, abilityCooldown: 0,
    target: null, destination: null, savedPosition: null, stopped: true,
    orderMode: 'hold', equipment: [0, 0, 0], deaths: 0, respawn: 0,
    shield: 0, zone: caster.zone, kills: 0, block: S.treeBlock,
    summonKind: 'ancient-tree', summonerId: caster.id, summonDuration: S.zoneSeconds,
  };
  state.units[tree.id] = tree;
  return tree;
}

export function shennongAbility(state: GameState, unit: Unit, point: Vec, hurt: Damage): void {
  const attack = effectiveUnitAttack(unit);
  const hits = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0
    && distance(enemy, point) <= S.zoneRadius);
  for (const enemy of hits) {
    hurt(unit, enemy, attack * S.eruptionPower);
    if (state.enemies[enemy.id]) hurt(unit, enemy, attack * S.eruptionTruePower, true);
  }
  if (state.phase !== 'lobby') {
    (state.groundEffects ??= []).push({ id: nextId(state, 'shennong-grove'), kind: 'shennong-grove',
      x: point.x, z: point.z, zone: unit.zone, radius: S.zoneRadius,
      remaining: S.zoneSeconds, damagePerSecond: 0,
      burnDps: attack * S.zoneDpsPower, healPerSecond: attack * S.healPowerPerSecond,
      casterId: unit.id });
    for (let i = 0; i < S.trees; i++) spawnTree(state, unit, point, i);
  }
  event(state, { kind: 'ability', source: unit.id, targets: hits.map(enemy => enemy.id),
    x: point.x, z: point.z, zone: unit.zone, ability: 'nova', skillId: 'skill-h01E',
    value: attack * S.eruptionPower });
}

export function stepShennongGrove(state: GameState, dt: number, hurt: Damage): void {
  for (const grove of state.groundEffects ?? []) {
    if (grove.kind !== 'shennong-grove') continue;
    const caster = state.units[grove.casterId];
    const elapsed = Math.min(dt, Math.max(0, grove.remaining));
    if (!caster || elapsed <= 0) { grove.remaining = Math.max(0, grove.remaining - dt); continue; }
    for (const enemy of Object.values(state.enemies)) {
      if (enemy.zone !== grove.zone || enemy.hp <= 0 || distance(enemy, grove) > grove.radius) continue;
      enemy.attackWeak = { remaining: Math.max(.3, dt + .02), strength: S.weakness };
      enemy.attackSlow = { remaining: Math.max(.3, dt + .02), strength: S.weakness };
      hurt(caster, enemy, (grove.burnDps ?? 0) * elapsed, true);
    }
    for (const ally of Object.values(state.units)) {
      if (!isDeployed(ally) || ally.zone !== grove.zone || ally.summonDuration !== undefined) continue;
      ally.hp = Math.min(ally.maxHp, ally.hp + (grove.healPerSecond ?? 0) * elapsed);
    }
    grove.remaining = Math.max(0, grove.remaining - dt);
  }
}
