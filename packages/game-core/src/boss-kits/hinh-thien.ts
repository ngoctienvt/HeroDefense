import { BOSS_REACH_GROWTH } from '../crowd-movement.js';
import type { Enemy, EnemySkillState, GameState } from '../../../contracts/src/types.js';
import { BALANCE_SCALE } from '../balance-curve.js';
import {
  type EnemySkillHelpers,
  aimDirection,
  nearestHero,
  pushHeroFrom,
  unitsInCone,
} from '../enemy-skill-templates.js';
import { distance, event, isDeployed } from '../rules.js';

export function checkHinhThienEnrage(state: GameState, enemy: Enemy): void {
  if (enemy.enraged || enemy.hp > enemy.maxHp * 0.4) return;
  enemy.enraged = true;
  enemy.attack = Math.round(enemy.attack * 1.3);
  enemy.lifestealOnHit = Math.max(enemy.lifestealOnHit ?? 0, Math.round(enemy.maxHp * 0.015));
  const shieldGain = Math.round(enemy.maxHp * 0.2);
  enemy.shield = (enemy.shield ?? 0) + shieldGain;
  event(state, {
    kind: 'trait',
    source: enemy.id,
    x: enemy.x,
    z: enemy.z,
    zone: 0,
    skillId: 'boss-hinhthien-enrage',
    value: shieldGain,
  });
}

export function startHinhThienWindup(
  helpers: EnemySkillHelpers,
  skill: EnemySkillState,
): boolean {
  const { state, enemy, units } = helpers;
  const nearest = nearestHero(enemy, units, 12);
  if (!nearest) return false;

  switch (skill.id) {
    case 'boss-axe-cleave': {
      const direction = aimDirection(enemy, nearest);
      const windup = 0.9;
      skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z }, direction };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        target: nearest.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        direction,
        skillId: 'boss-axe-cleave-windup',
        windup,
        radius: 4.8,
        angle: 120,
        telegraph: 'cone',
      });
      return true;
    }
    case 'boss-shield-bash': {
      const windup = 0.95;
      skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z } };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        skillId: 'boss-shield-bash-windup',
        windup,
        radius: 4.4,
        telegraph: 'circle',
      });
      return true;
    }
    case 'boss-defiant-roar': {
      const windup = 1.1;
      skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z } };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        skillId: 'boss-defiant-roar-windup',
        windup,
        radius: 6.0,
        telegraph: 'circle',
      });
      return true;
    }
    default:
      return false;
  }
}

export function resolveHinhThienSkill(
  helpers: EnemySkillHelpers,
  skill: EnemySkillState,
  locked: NonNullable<EnemySkillState['windup']>,
): void {
  const { state, enemy, units, hurtHero, canStunHero } = helpers;
  const powerScale = BALANCE_SCALE.skillPower;

  switch (skill.id) {
    case 'boss-axe-cleave': {
      const direction = locked.direction ?? { x: 0, z: 1 };
      const radius = 4.8 + BOSS_REACH_GROWTH;
      const damage = Math.round(enemy.attack * 1.85 * powerScale);
      const hits = unitsInCone(units, enemy, direction, radius, 120);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0) {
          unit.bonusArmor = { remaining: 4, amount: -6 };
        }
      }
      event(state, {
        kind: 'ability',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        direction,
        targets: hits.map(u => u.id),
        skillId: 'boss-axe-cleave',
        radius,
        angle: 120,
        value: damage,
      });
      break;
    }
    case 'boss-shield-bash': {
      const radius = 4.4 + BOSS_REACH_GROWTH;
      const damage = Math.round(enemy.attack * 1.6 * powerScale);
      const hits = units.filter(u => u.zone === 0 && isDeployed(u) && distance(u, enemy) <= radius);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0 && canStunHero(state, unit)) {
          unit.stun = Math.max(unit.stun ?? 0, 0.85);
        }
      }
      const shieldAmount = Math.round(enemy.maxHp * 0.14);
      enemy.shield = Math.max(enemy.shield ?? 0, shieldAmount);
      event(state, {
        kind: 'ability',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        targets: hits.map(u => u.id),
        skillId: 'boss-shield-bash',
        radius,
        value: damage,
      });
      break;
    }
    case 'boss-defiant-roar': {
      const radius = 6.0 + BOSS_REACH_GROWTH;
      const damage = Math.round(enemy.attack * 1.5 * powerScale);
      const hits = units.filter(u => u.zone === 0 && isDeployed(u) && distance(u, enemy) <= radius);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0) {
          pushHeroFrom(unit, enemy, 1.4);
        }
      }
      const allies = Object.values(state.enemies).filter(
        other => other.zone === 0 && other.hp > 0 && distance(other, enemy) <= 8,
      );
      for (const ally of allies) {
        ally.armorBuff = { remaining: 6, amount: 6 };
      }
      event(state, {
        kind: 'ability',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        targets: hits.map(u => u.id),
        supportTargets: allies.map(a => a.id),
        skillId: 'boss-defiant-roar',
        radius,
        value: damage,
      });
      break;
    }
  }
}
