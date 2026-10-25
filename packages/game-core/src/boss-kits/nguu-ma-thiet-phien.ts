import { BOSS_REACH_GROWTH } from '../crowd-movement.js';
import type { Enemy, EnemySkillState, GameState } from '../../../contracts/src/types.js';
import { BALANCE_SCALE } from '../balance-curve.js';
import { clampToZone } from '../battlefield-layout.js';
import {
  type EnemySkillHelpers,
  aimDirection,
  farthestHeroInRange,
  nearestHero,
  pushHeroFrom,
  unitsInCone,
  unitsInLine,
} from '../enemy-skill-templates.js';
import { distance, event, isDeployed } from '../rules.js';

export function checkTwinEnrage(state: GameState, enemy: Enemy): void {
  if (enemy.enraged || !enemy.linkId) return;
  const partner = state.enemies[enemy.linkId];
  if (partner && partner.hp > 0) return;
  enemy.enraged = true;
  enemy.attack = Math.round(enemy.attack * 1.35);
  enemy.speed = +(enemy.speed * 1.2).toFixed(2);
  const shieldGain = Math.round(enemy.maxHp * 0.15);
  enemy.shield = (enemy.shield ?? 0) + shieldGain;
  event(state, {
    kind: 'trait',
    source: enemy.id,
    x: enemy.x,
    z: enemy.z,
    zone: 0,
    skillId: 'boss-twin-enrage',
    value: shieldGain,
  });
}

export function startNguuMaThietPhienWindup(
  helpers: EnemySkillHelpers,
  skill: EnemySkillState,
): boolean {
  const { state, enemy, units } = helpers;
  const nearest = nearestHero(enemy, units, 14);
  if (!nearest) return false;

  switch (skill.id) {
    case 'boss-bull-charge': {
      const target = farthestHeroInRange(enemy, units, 12) ?? nearest;
      const direction = aimDirection(enemy, target);
      const windup = 1.0;
      skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z }, direction };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        target: target.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        direction,
        skillId: 'boss-bull-charge-windup',
        windup,
        length: 10,
        width: 2.8,
        telegraph: 'line',
      });
      return true;
    }
    case 'boss-earth-splitter': {
      const windup = 1.1;
      skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z } };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        skillId: 'boss-earth-splitter-windup',
        windup,
        radius: 4.8,
        telegraph: 'circle',
      });
      return true;
    }
    case 'boss-fan-gale': {
      const direction = aimDirection(enemy, nearest);
      const windup = 1.0;
      skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z }, direction };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        target: nearest.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        direction,
        skillId: 'boss-fan-gale-windup',
        windup,
        radius: 7.5,
        angle: 75,
        telegraph: 'cone',
      });
      return true;
    }
    case 'boss-fire-tempest': {
      const target = farthestHeroInRange(enemy, units, 12) ?? nearest;
      const point = clampToZone(0, { x: target.x, z: target.z });
      const windup = 1.05;
      skill.windup = { remaining: windup, point };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        target: target.id,
        x: point.x,
        z: point.z,
        zone: 0,
        skillId: 'boss-fire-tempest-windup',
        windup,
        radius: 4.5,
        telegraph: 'circle',
      });
      return true;
    }
    default:
      return false;
  }
}

export function resolveNguuMaThietPhienSkill(
  helpers: EnemySkillHelpers,
  skill: EnemySkillState,
  locked: NonNullable<EnemySkillState['windup']>,
): void {
  const { state, enemy, units, hurtHero, canStunHero } = helpers;
  const powerScale = BALANCE_SCALE.skillPower;

  switch (skill.id) {
    case 'boss-bull-charge': {
      const direction = locked.direction ?? { x: 0, z: 1 };
      const origin = { x: enemy.x, z: enemy.z };
      const hits = unitsInLine(units, origin, direction, 10, 2.8);
      const dest = clampToZone(0, {
        x: enemy.x + direction.x * 6.5,
        z: enemy.z + direction.z * 6.5,
      });
      enemy.x = dest.x;
      enemy.z = dest.z;
      const damage = Math.round(enemy.attack * 1.7 * powerScale);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0 && canStunHero(state, unit)) {
          unit.stun = Math.max(unit.stun ?? 0, 0.7);
          pushHeroFrom(unit, origin, 1.2);
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
        skillId: 'boss-bull-charge',
        length: 10,
        width: 2.8,
        value: damage,
      });
      break;
    }
    case 'boss-earth-splitter': {
      const radius = 4.8 + BOSS_REACH_GROWTH;
      const damage = Math.round(enemy.attack * 1.9 * powerScale);
      const hits = units.filter(u => u.zone === 0 && isDeployed(u) && distance(u, enemy) <= radius);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0 && canStunHero(state, unit)) {
          unit.stun = Math.max(unit.stun ?? 0, 0.9);
          pushHeroFrom(unit, enemy, 0.8);
        }
      }
      enemy.armorBuff = { remaining: 5, amount: 6 };
      event(state, {
        kind: 'ability',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        targets: hits.map(u => u.id),
        skillId: 'boss-earth-splitter',
        radius,
        value: damage,
      });
      break;
    }
    case 'boss-fan-gale': {
      const direction = locked.direction ?? { x: 0, z: 1 };
      const radius = 7.5 + BOSS_REACH_GROWTH;
      const damage = Math.round(enemy.attack * 1.55 * powerScale);
      const hits = unitsInCone(units, enemy, direction, radius, 75);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0) {
          pushHeroFrom(unit, enemy, 2.2);
          unit.cooldown = Math.max(unit.cooldown, 0.8);
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
        skillId: 'boss-fan-gale',
        radius,
        angle: 75,
        value: damage,
      });
      break;
    }
    case 'boss-fire-tempest': {
      const point = locked.point ?? { x: enemy.x, z: enemy.z };
      const radius = 4.5 + BOSS_REACH_GROWTH;
      const damage = Math.round(enemy.attack * 1.75 * powerScale);
      const hits = units.filter(u => u.zone === 0 && isDeployed(u) && distance(u, point) <= radius);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0) {
          unit.bonusArmor = { remaining: 3.5, amount: -4 };
        }
      }
      event(state, {
        kind: 'ability',
        source: enemy.id,
        x: point.x,
        z: point.z,
        zone: 0,
        targets: hits.map(u => u.id),
        skillId: 'boss-fire-tempest',
        radius,
        value: damage,
      });
      break;
    }
  }
}
