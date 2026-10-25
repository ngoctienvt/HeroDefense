import type { Enemy, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { applyEnemyStatus, knockEnemyBack } from './combat-status.js';
import { distance, event, isDeployed } from './rules.js';
import { effectiveUnitAttack } from './stats.js';
import { startTierBarrage } from './tier-skill-pulses.js';
import { tryHardControl } from './crowd-control.js';
import { empowerAllyMax, grantBlockBonus, hasteAllyMax, healAlly, supportAmount } from './ally-scaled-support.js';
import { TIER3_TIER4_REWORK } from '../../../content/tier3-tier4-rework.js';

type Hit = (enemy: Enemy, damage: number, penetration?: number, trueDamage?: boolean) => void;
const TIER3_IDS = new Set(['h00J', 'h00K', 'h00L', 'h00M', 'h00N', 'h00O', 'h00P', 'h00Q', 'h03Q', 'h03R', 'h03S']);

export function isTier3Hero(id: string): boolean { return TIER3_IDS.has(id); }

function inLine(origin: Vec, direction: Vec, point: Vec, length: number, width: number): boolean {
  const forward = (point.x - origin.x) * direction.x + (point.z - origin.z) * direction.z;
  const side = Math.abs((point.x - origin.x) * direction.z - (point.z - origin.z) * direction.x);
  return forward >= 0 && forward <= length && side <= width / 2;
}

function directionTo(origin: Vec, point: Vec): Vec {
  const x = point.x - origin.x, z = point.z - origin.z, length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

export function resolveTier3Ability(state: GameState, unit: Unit, aim: Vec, hit: Hit): void {
  const attack = effectiveUnitAttack(unit) * (1 + unit.equipment[2] * .25);
  const enemies = Object.values(state.enemies).filter(e => e.zone === unit.zone && e.hp > 0);
  const allies = Object.values(state.units).filter(u => isDeployed(u) && u.zone === unit.zone && u.owner === unit.owner);
  const direction = directionTo(unit, aim);
  let affected: string[] = [];
  let supportTargets: string[] | undefined;
  const strike = (enemy: Enemy, damage: number, penetration = 0, trueDamage = false): void => {
    affected.push(enemy.id);
    hit(enemy, damage, penetration, trueDamage);
  };
  const area = (center: Vec, radius: number): Enemy[] => enemies.filter(e => distance(e, center) <= radius);

  switch (unit.heroId) {
    case 'h00J': {
      // Guardian, not a control specialist: a larger block cap pulls enemies onto
      // Bát Giới every tick instead of a rolled taunt.
      for (const enemy of area(unit, 5)) {
        knockEnemyBack(state, enemy, .35, unit);
        affected.push(enemy.id);
      }
      grantBlockBonus(unit, TIER3_TIER4_REWORK.h00J.blockBonusSeconds, TIER3_TIER4_REWORK.h00J.blockBonus);
      const amount = attack * 2.5 + unit.maxHp * .18;
      const previous = unit.shield;
      unit.shield = Math.max(unit.shield, amount);
      if (unit.shield > previous) unit.tierShield = { remaining: 5, amount: unit.shield - previous, kind: 'water' };
      break;
    }
    case 'h00K': {
      const recipients = allies.filter(u => u.id !== unit.id && distance(u, unit) <= 8)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 3);
      for (const ally of recipients) {
        healAlly(ally, supportAmount(attack * 2.6, ally, TIER3_TIER4_REWORK.h00K.recipientMaxHpRatio));
        if (!ally.ward || ally.ward.reduction <= .3) ally.ward = { remaining: 4, reduction: .3 };
        ally.abilityCooldown = Math.max(0, ally.abilityCooldown - 2);
      }
      affected = recipients.map(u => u.id);
      break;
    }
    case 'h00L': {
      for (const enemy of enemies.filter(e => inLine(unit, direction, e, 12, 3.5))) {
        const weakened = Boolean(enemy.poison) || enemy.slow > 0;
        strike(enemy, attack * 3.1);
        if (weakened && state.enemies[enemy.id]) applyEnemyStatus(enemy, unit, 0, 'slow', 2, TIER3_TIER4_REWORK.h00L.slow);
      }
      break;
    }
    case 'h00M': {
      startTierBarrage(state, unit, unit.heroId, aim, 5.5, 8, 2, attack * .65);
      break;
    }
    case 'h00N': {
      for (const enemy of area(aim, 5.2)) {
        strike(enemy, attack * 2.8);
        if (state.enemies[enemy.id]) tryHardControl(state, unit, enemy, 'silence', 3);
      }
      (state.groundEffects ??= []).push({ x: aim.x, z: aim.z, zone: unit.zone, radius: 5.2,
        remaining: 4, damagePerSecond: attack * .9, casterId: unit.id, kind: 'tier-fire' });
      break;
    }
    case 'h00O': {
      const hits = area(unit, 4.8).filter(e => inLine(unit, direction, e, 4.8, 9.6));
      for (const enemy of hits) strike(enemy, attack * 3.4, 0, enemy.hp / enemy.maxHp < .35);
      const linked = affected.slice(0, 5);
      for (const id of linked) {
        const enemy = state.enemies[id];
        if (enemy) enemy.soulLink = { remaining: 4, group: linked, sharePercent: .4, casterId: unit.id };
      }
      break;
    }
    case 'h00P': {
      for (const enemy of area(unit, 5.5)) {
        const critical = enemy.slow > 0 || Boolean(enemy.burn);
        strike(enemy, attack * 3.5 * (critical ? 2 : 1));
        if (!state.enemies[enemy.id]) continue;
        knockEnemyBack(state, enemy, TIER3_TIER4_REWORK.h00P.knockback, unit);
        applyEnemyStatus(enemy, unit, 0, 'slow', 1.8, TIER3_TIER4_REWORK.h00P.slow);
      }
      break;
    }
    case 'h00Q': {
      for (const enemy of enemies.filter(e => inLine(unit, direction, e, 10, 6))) {
        const chilled = enemy.slow > 0;
        strike(enemy, attack * 2.7);
        if (!state.enemies[enemy.id]) continue;
        knockEnemyBack(state, enemy, 2.5, unit);
        if (chilled) tryHardControl(state, unit, enemy, 'frozen', 2);
      }
      (state.groundEffects ??= []).push({ x: aim.x, z: aim.z, zone: unit.zone, radius: 5,
        remaining: 4, damagePerSecond: attack * .6, casterId: unit.id, slowStrength: .5, kind: 'tier-water' });
      break;
    }
    case 'h03Q': {
      supportTargets = [];
      for (const enemy of area(aim, 5)) {
        strike(enemy, attack * 3);
        if (state.enemies[enemy.id]) applyEnemyStatus(enemy, unit, 0, 'sunder', 5, .35);
      }
      for (const ally of allies.filter(u => distance(u, unit) <= 6)) {
        healAlly(ally, supportAmount(attack, ally, TIER3_TIER4_REWORK.h03Q.recipientMaxHpRatio));
        empowerAllyMax(ally, 5, .2);
        supportTargets.push(ally.id);
      }
      break;
    }
    case 'h03R': {
      for (const ally of allies.filter(u => distance(u, unit) <= 9)) {
        healAlly(ally, supportAmount(attack * 2.8, ally, TIER3_TIER4_REWORK.h03R.recipientMaxHpRatio));
        ally.stun = 0;
        hasteAllyMax(ally, 5, .3);
        ally.tierBuff = { remaining: 5, kind: 'poison' };
        affected.push(ally.id);
      }
      break;
    }
    case 'h03S': {
      const hits = enemies.filter(e => inLine(unit, direction, e, 8, 2));
      for (const enemy of hits) {
        strike(enemy, attack * 2.2);
        if (state.enemies[enemy.id]) enemy.attackWeak = { remaining: 4, strength: .3 };
      }
      for (const ally of allies.filter(u => distance(u, unit) <= 8 && (u.block ?? 0) > 0)) {
        ally.shield = Math.max(ally.shield, attack * 2.6 + ally.maxHp * .15);
        affected.push(ally.id);
      }
      if (hits.length >= 10 || hits.some(e => e.kind === 'boss')) state.players[unit.owner].gold += 25;
      break;
    }
  }
  event(state, { kind: 'ability', source: unit.id, target: affected[0], targets: affected,
    x: aim.x, z: aim.z, zone: unit.zone, direction, ...(supportTargets ? { supportTargets } : {}),
    skillId: `tier3-tier4-${unit.heroId}` });
}

export function burstTier3WaterShield(state: GameState, unit: Unit, hit: Hit): void {
  if (unit.tierShield?.kind !== 'water') return;
  unit.tierShield = undefined;
  const attack = effectiveUnitAttack(unit);
  const targets: string[] = [];
  for (const enemy of Object.values(state.enemies)) {
    if (enemy.zone !== unit.zone || distance(enemy, unit) > 5) continue;
    targets.push(enemy.id);
    hit(enemy, attack * 2.2);
    if (state.enemies[enemy.id]) applyEnemyStatus(enemy, unit, 0, 'slow', 3, .5);
  }
  event(state, { kind: 'trait', source: unit.id, targets, x: unit.x, z: unit.z, zone: unit.zone,
    skillId: 'water-shield-burst-h00J' });
}
