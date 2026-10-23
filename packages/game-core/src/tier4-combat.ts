import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { applyEnemyStatus, knockEnemyBack } from './combat-status.js';
import { distance, event, isDeployed } from './rules.js';
import { attackInterval, effectiveUnitAttack } from './stats.js';
import { startTierBarrage } from './tier-skill-pulses.js';
import { createUnit } from './unit-factory.js';
import { tryHardControl } from './crowd-control.js';
import { amplifyEnemyDamageMax, empowerAllyMax, hasteAllyMax, healAlly, supportAmount } from './ally-scaled-support.js';
import { TIER3_TIER4_REWORK } from '../../../content/tier3-tier4-rework.js';

type Hit = (source: Unit, enemy: Enemy, damage: number, penetration?: number, trueDamage?: boolean) => void;
const TIER4_IDS = new Set(['h00R', 'h00S', 'h00T', 'h00U', 'h00V', 'h00W', 'h00X', 'h00Y', 'h00Z', 'h010', 'h03T', 'h03U', 'h03V']);
export function isTier4Hero(id: string): boolean { return TIER4_IDS.has(id); }

function directionTo(origin: Vec, point: Vec): Vec {
  const x = point.x - origin.x, z = point.z - origin.z, length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}
function inLine(origin: Vec, direction: Vec, point: Vec, length: number, width: number): boolean {
  const forward = (point.x - origin.x) * direction.x + (point.z - origin.z) * direction.z;
  const side = Math.abs((point.x - origin.x) * direction.z - (point.z - origin.z) * direction.x);
  return forward >= 0 && forward <= length && side <= width / 2;
}

export function resolveTier4Ability(state: GameState, unit: Unit, aim: Vec, hit: Hit): void {
  const attack = effectiveUnitAttack(unit) * (1 + unit.equipment[2] * .25);
  const enemies = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0);
  const allies = Object.values(state.units).filter(ally => isDeployed(ally) && ally.owner === unit.owner && ally.zone === unit.zone);
  const direction = directionTo(unit, aim);
  const area = (center: Vec, radius: number): Enemy[] => enemies.filter(enemy => distance(enemy, center) <= radius);
  const ids: string[] = [];
  const strike = (enemy: Enemy, power: number, penetration = 0, trueDamage = false): void => {
    ids.push(enemy.id);
    hit(unit, enemy, power, penetration, trueDamage);
  };

  switch (unit.heroId) {
    case 'h00R': {
      for (const enemy of enemies.filter(e => inLine(unit, direction, e, 9, 3))) {
        strike(enemy, attack * 3.8);
        if (state.enemies[enemy.id]) {
          applyEnemyStatus(enemy, unit, 0, 'sunder', 4, .3);
          applyEnemyStatus(enemy, unit, 0, 'slow', 1.5, TIER3_TIER4_REWORK.h00R.slow);
        }
      }
      for (const clone of Object.values(state.units)) {
        if (clone.summonKind === 'monkey-clone' && clone.summonerId === unit.id) delete state.units[clone.id];
      }
      for (let index = 0; index < 2; index++) {
        const clone = createUnit(state, unit.owner, unit.heroId);
        clone.slot = -99; clone.zone = unit.zone;
        clone.x = aim.x + (index ? 1.6 : -1.6); clone.z = aim.z;
        clone.guardPosition = { x: clone.x, z: clone.z }; clone.orderMode = 'hold';
        clone.summonKind = 'monkey-clone'; clone.summonerId = unit.id; clone.summonDuration = 6;
        clone.maxHp = unit.maxHp * .5; clone.hp = clone.maxHp; clone.attack = attack * .45;
        clone.energy = 0; clone.block = 0; state.units[clone.id] = clone;
      }
      break;
    }
    case 'h00S': {
      for (const enemy of area(aim, 6)) {
        // 290% Công + 120% Công (thay phần rút 8% Máu hiện tại cũ).
        strike(enemy, attack * (2.9 + 1.2));
        if (state.enemies[enemy.id]) tryHardControl(state, unit, enemy, 'stun', 1.2);
      }
      (state.groundEffects ??= []).push({ x: aim.x, z: aim.z, zone: unit.zone, radius: 6,
        remaining: 4.5, damagePerSecond: 0, slowStrength: .5, casterId: unit.id, kind: 'tier-gold' });
      break;
    }
    case 'h00T': {
      startTierBarrage(state, unit, unit.heroId, aim, 6.5, 10, 2.5, attack * .45);
      break;
    }
    case 'h00U': {
      for (const enemy of enemies.filter(e => inLine(unit, direction, e, 12, 3))) strike(enemy, attack * 3.2, 0, true);
      unit.berserk = { remaining: 6, attackSpeed: .9, lifesteal: 0 };
      unit.empower = { remaining: 6, attackBonus: 0, armorPierce: .4 };
      unit.stun = 0;
      break;
    }
    case 'h00V': {
      const chain = enemies.filter(e => distance(e, aim) <= 6).sort((a, b) => distance(a, aim) - distance(b, aim));
      for (let index = 0; index < 8 && chain.length; index++) {
        const enemy = chain[index % chain.length];
        if (!state.enemies[enemy.id]) continue;
        const burnDamage = enemy.burn ? enemy.burn.damagePerSecond * enemy.burn.remaining : 0;
        strike(enemy, attack * 3 + burnDamage);
        if (state.enemies[enemy.id]) enemy.burn = undefined;
      }
      unit.empower = { remaining: 5.5, attackBonus: .6, armorPierce: 0 };
      unit.tierBuff = { remaining: 5.5, kind: 'nezha' };
      break;
    }
    case 'h00W': {
      for (const enemy of area(aim, 6)) {
        strike(enemy, attack * 2.8);
        if (state.enemies[enemy.id]) {
          applyEnemyStatus(enemy, unit, 0, 'slow', 4.5, .5);
          enemy.attackWeak = { remaining: 4.5, strength: .5 };
        }
      }
      for (const ally of allies.filter(u => distance(u, unit) <= 8)) {
        const previous = ally.shield;
        ally.shield = Math.max(ally.shield, attack * 2.8 + ally.maxHp * .2);
        (ally.tierGoldShields ??= []).push({ remaining: 5, amount: ally.shield - previous });
        ids.push(ally.id);
      }
      break;
    }
    case 'h00X': {
      const chain = enemies.filter(e => distance(e, unit) <= unit.range + 5)
        .sort((a, b) => Number(b.kind === 'boss') - Number(a.kind === 'boss') || distance(a, aim) - distance(b, aim)).slice(0, 7);
      for (const enemy of chain) {
        strike(enemy, attack * 3.1);
        if (!state.enemies[enemy.id]) continue;
        knockEnemyBack(state, enemy, 1.8, unit);
        applyEnemyStatus(enemy, unit, 0, 'slow', 1.8, TIER3_TIER4_REWORK.h00X.slow);
        applyEnemyStatus(enemy, unit, 0, 'sunder', 4, .4);
        amplifyEnemyDamageMax(enemy, 4, .25);
      }
      break;
    }
    case 'h00Y': {
      const linked = area(aim, 6.5).slice(0, 8);
      for (const enemy of linked) strike(enemy, attack * 2.5);
      const group = linked.filter(e => Boolean(state.enemies[e.id])).map(e => e.id);
      for (const id of group) state.enemies[id].soulLink = { remaining: 5, group, sharePercent: .5 };
      for (const ally of allies) {
        hasteAllyMax(ally, 5, .45);
        if (!ally.berserk) ally.berserk = { remaining: 5, attackSpeed: 0, lifesteal: .15 };
        else ally.berserk.lifesteal = Math.max(ally.berserk.lifesteal, .15);
      }
      break;
    }
    case 'h00Z': {
      for (const enemy of area(aim, 6.5)) {
        applyEnemyStatus(enemy, unit, 0, 'slow', 2.2, TIER3_TIER4_REWORK.h00Z.slow);
        applyEnemyStatus(enemy, unit, 0, 'sunder', 4, .3);
        ids.push(enemy.id);
      }
      startTierBarrage(state, unit, unit.heroId, aim, 6.5, 8, 4, attack * .45);
      break;
    }
    case 'h010': {
      const recipients = allies.filter(u => u.id !== unit.id && distance(u, unit) <= 8.5)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 4);
      for (const ally of recipients) {
        healAlly(ally, supportAmount(attack * 2.7, ally, TIER3_TIER4_REWORK.h010.recipientMaxHpRatio));
        const previous = ally.shield;
        ally.shield = Math.max(ally.shield, attack * 2.7);
        (ally.tierGoldShields ??= []).push({ remaining: 5, amount: ally.shield - previous });
        ally.stun = 0; ally.tierBuff = { remaining: 5, kind: 'fire' };
        ids.push(ally.id);
      }
      for (const ally of allies) empowerAllyMax(ally, 5, .3);
      break;
    }
    case 'h03T': {
      for (const enemy of area(unit, 5.5)) {
        const front = { x: unit.x + direction.x * 1.8, z: unit.z + direction.z * 1.8 };
        enemy.x = front.x; enemy.z = front.z;
        strike(enemy, attack * 2.4);
        if (state.enemies[enemy.id]) enemy.attackWeak = { remaining: 5, strength: .4 };
      }
      for (const ally of allies.filter(u => distance(u, unit) <= 5.5)) {
        const previous = ally.shield;
        ally.shield = Math.max(ally.shield, attack * 3 + ally.maxHp * .22);
        (ally.tierGoldShields ??= []).push({ remaining: 5, amount: ally.shield - previous });
        ally.ward = { remaining: 5, reduction: .4 };
        ally.reflect = { amount: .6 };
        ids.push(ally.id);
      }
      break;
    }
    case 'h03U': {
      const recipients = allies.filter(u => u.id !== unit.id && distance(u, unit) <= 8.5)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 4);
      for (const ally of recipients) {
        healAlly(ally, supportAmount(attack * 3.2, ally, TIER3_TIER4_REWORK.h03U.recipientMaxHpRatio));
        ally.tierImmortal = { remaining: 4, activeRemaining: 0 };
        ids.push(ally.id);
      }
      const strongest = [...allies].sort((a, b) => effectiveUnitAttack(b) - effectiveUnitAttack(a))[0];
      if (strongest) {
        if (strongest.energyType === 'cooldown') strongest.abilityCooldown = Math.max(0, strongest.abilityCooldown - 3);
        else strongest.energy = Math.min(strongest.maxEnergy ?? 100, (strongest.energy ?? 0) + 35);
      }
      break;
    }
    case 'h03V': {
      for (const enemy of enemies.filter(e => inLine(unit, direction, e, 13, 5.5))) {
        strike(enemy, attack * 3.7);
        if (state.enemies[enemy.id]) applyEnemyStatus(enemy, unit, 0, 'slow', 2.2, TIER3_TIER4_REWORK.h03V.slow);
      }
      unit.haste = { remaining: 4, amount: .5 };
      break;
    }
  }
  event(state, { kind: 'ability', source: unit.id, target: ids[0], targets: ids, x: aim.x, z: aim.z,
    zone: unit.zone, direction, skillId: `tier3-tier4-${unit.heroId}` });
}

export function stepMonkeyClone(state: GameState, clone: Unit, hit: Hit): void {
  if (clone.cooldown > 0 || clone.hp <= 0) return;
  const target = Object.values(state.enemies).filter(e => e.zone === clone.zone && e.hp > 0 && distance(e, clone) <= 3.2)
    .sort((a, b) => distance(a, clone) - distance(b, clone))[0];
  if (!target) return;
  const direction = directionTo(clone, target);
  const targets = Object.values(state.enemies).filter(enemy => enemy.zone === clone.zone && enemy.hp > 0
    && distance(enemy, clone) <= 3.2
    && (enemy.x - clone.x) * direction.x + (enemy.z - clone.z) * direction.z >= 0);
  for (const enemy of targets) hit(clone, enemy, clone.attack);
  clone.cooldown = attackInterval(state, clone);
  event(state, { kind: 'attack', source: clone.id, target: target.id, targets: targets.map(enemy => enemy.id),
    x: target.x, z: target.z, zone: clone.zone, skillId: 'monkey-clone-h00R', value: clone.attack });
}
