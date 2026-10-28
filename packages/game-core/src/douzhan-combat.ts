import { DOUZHAN as D } from '../../../content/douzhan-design.js';
import { bondExtraClones } from './bond-runtime.js';
import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { MELEE_CLEAVE_SECONDARY } from '../../contracts/src/combat-profiles.js';
import { applyEnemyStatus, criticalDamageAgainst, effectiveEnemyArmor } from './combat-status.js';
import { panguDirection, inPanguRift } from './pangu-combat.js';
import { distance, event, nextId, random } from './rules.js';
import { effectiveUnitAttack } from './stats.js';
import { createUnit } from './unit-factory.js';
import { markGearNativeCrit } from './gear-stats.js';

type Damage = (source: Unit, enemy: Enemy, damage: number, penetration?: number) => void;

export function douzhanAttack(state: GameState, unit: Unit, target: Enemy, hurt: Damage): void {
  const direction = panguDirection(unit, target), critical = random(state) < D.critChance + (unit.critBlessing?.chance ?? 0);
  const attack = effectiveUnitAttack(unit);
  const damage = attack * (critical ? D.critMultiplier : 1);
  const hits = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0
    && distance(unit, enemy) <= D.cleaveRadius
    && (enemy.x - unit.x) * direction.x + (enemy.z - unit.z) * direction.z >= -1e-6);
  unit.attackCount = (unit.attackCount ?? 0) + 1;
  unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + (critical ? D.rageOnCrit : D.rageOnAttack));
  for (const enemy of hits) {
    const share = enemy.id === target.id ? 1 : MELEE_CLEAVE_SECONDARY;
    const hit = critical ? criticalDamageAgainst(enemy, damage * share) : damage * share;
    if (critical) markGearNativeCrit(unit, enemy, hit);
    hurt(unit, enemy, hit, effectiveEnemyArmor(enemy) * D.armorPierce);
    if (critical && state.enemies[enemy.id]) {
      hurt(unit, enemy, attack * D.critFollowUpPower * share);
      event(state, { kind: 'trait', source: unit.id, target: enemy.id, x: enemy.x, z: enemy.z,
        zone: unit.zone, value: attack * D.critFollowUpPower * share, skillId: 'buddha-shadow-h012' });
    }
  }
  event(state, { kind: 'attack', source: unit.id, target: target.id, targets: hits.map(enemy => enemy.id),
    x: target.x, z: target.z, zone: unit.zone, direction, value: damage, isCrit: critical,
    geometry: 'frontal_cleave', traitType: 'crit_pierce', skillId: 'trait-h012' });
  if (!critical) return;
  for (const clone of Object.values(state.units)) {
    if (clone.summonKind !== 'buddha-clone' || clone.summonerId !== unit.id || clone.hp <= 0 || clone.zone !== unit.zone) continue;
    const echoTarget = state.enemies[target.id];
    if (!echoTarget) continue;
    const echoDamage = clone.attack * D.critMultiplier;
    hurt(clone, echoTarget, criticalDamageAgainst(echoTarget, echoDamage),
      effectiveEnemyArmor(echoTarget) * D.armorPierce);
    event(state, { kind: 'trait', source: clone.id, target: echoTarget.id, x: echoTarget.x, z: echoTarget.z,
      zone: unit.zone, value: echoDamage, isCrit: true, skillId: 'clone-crit-h012' });
  }
}

export function douzhanAbility(state: GameState, unit: Unit, direction: Vec, hurt: Damage): void {
  const attack = effectiveUnitAttack(unit), hits: string[] = [];
  for (const enemy of Object.values(state.enemies)) {
    if (enemy.zone !== unit.zone || !inPanguRift(unit, direction, enemy, D.staffLength, D.staffWidth)) continue;
    hurt(unit, enemy, attack * D.staffPower);
    hits.push(enemy.id);
    if (state.enemies[enemy.id]) applyEnemyStatus(enemy, unit, 0, 'sunder', D.sunderSeconds, D.sunderPercent);
  }
  const focus = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone)
    .sort((a, b) => distance(a, unit) - distance(b, unit))[0];
  const center = focus ?? unit;
  for (const clone of Object.values(state.units)) {
    if (clone.summonKind === 'buddha-clone' && clone.summonerId === unit.id) delete state.units[clone.id];
  }
  const cloneCount = D.cloneCount + bondExtraClones(state, unit);
  for (let index = 0; index < cloneCount; index++) {
    const angle = Math.PI * 2 * index / cloneCount;
    const position = { x: center.x + Math.cos(angle) * 1.8, z: center.z + Math.sin(angle) * 1.8 };
    const clone = createUnit(state, unit.owner, D.id);
    clone.id = nextId(state, 'clone'); clone.slot = -99; clone.zone = unit.zone;
    clone.x = position.x; clone.z = position.z; clone.guardPosition = position;
    clone.orderMode = 'hold'; clone.stopped = false;
    clone.summonKind = 'buddha-clone'; clone.summonerId = unit.id; clone.summonDuration = D.cloneSeconds;
    clone.attack = attack * D.cloneAttackRatio;
    clone.maxHp = Math.max(1, unit.maxHp * D.cloneAttackRatio * (unit.gearRuntime?.castScale ?? 1)); clone.hp = clone.maxHp;
    clone.armor = unit.armor; clone.energy = 0;
    state.units[clone.id] = clone;
  }
  event(state, { kind: 'ability', source: unit.id, targets: hits, x: unit.x, z: unit.z,
    zone: unit.zone, direction, ability: 'cleave', skillId: 'skill-h012', value: attack * D.staffPower });
  event(state, { kind: 'trait', source: unit.id, x: center.x, z: center.z, zone: unit.zone,
    skillId: 'summon-h012', value: cloneCount });
}

export function stepDouzhanClone(state: GameState, clone: Unit, hurt: Damage): void {
  if (clone.cooldown > 0 || (clone.stun ?? 0) > 0) return;
  const target = Object.values(state.enemies).filter(enemy => enemy.zone === clone.zone && enemy.hp > 0
    && distance(enemy, clone) <= D.range).sort((a, b) => distance(a, clone) - distance(b, clone))[0];
  if (!target) return;
  hurt(clone, target, clone.attack, effectiveEnemyArmor(target) * D.armorPierce);
  clone.cooldown = D.interval;
  event(state, { kind: 'attack', source: clone.id, target: target.id, x: target.x, z: target.z,
    zone: clone.zone, value: clone.attack, skillId: 'clone-attack-h012' });
}
