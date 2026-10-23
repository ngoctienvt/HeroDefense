import type { EnemySkillState } from '../../../contracts/src/types.js';
import { BALANCE_SCALE } from '../balance-curve.js';
import { clampToZone } from '../battlefield-layout.js';
import {
  type EnemySkillHelpers,
  aimDirection,
  farthestHeroInRange,
  nearestHero,
  pushHeroFrom,
  unitsInLine,
} from '../enemy-skill-templates.js';
import { distance, event, isDeployed } from '../rules.js';

export function startChucDungCongCongWindup(
  helpers: EnemySkillHelpers,
  skill: EnemySkillState,
): boolean {
  const { state, enemy, units } = helpers;
  const nearest = nearestHero(enemy, units, 14);
  if (!nearest) return false;

  switch (skill.id) {
    case 'boss-meteor-cataclysm': {
      const target = farthestHeroInRange(enemy, units, 13) ?? nearest;
      const point = clampToZone(0, { x: target.x, z: target.z });
      const windup = 1.15;
      skill.windup = { remaining: windup, point };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        target: target.id,
        x: point.x,
        z: point.z,
        zone: 0,
        skillId: 'boss-meteor-cataclysm-windup',
        windup,
        radius: 5.0,
        telegraph: 'circle',
      });
      return true;
    }
    case 'boss-blazing-spear': {
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
        skillId: 'boss-blazing-spear-windup',
        windup,
        length: 10,
        width: 2.4,
        telegraph: 'line',
      });
      return true;
    }
    case 'boss-abyssal-deluge': {
      const windup = 1.05;
      skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z } };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        skillId: 'boss-abyssal-deluge-windup',
        windup,
        radius: 5.2,
        telegraph: 'circle',
      });
      return true;
    }
    case 'boss-monolith-ram': {
      const target = farthestHeroInRange(enemy, units, 12) ?? nearest;
      const direction = aimDirection(enemy, target);
      const windup = 1.15;
      skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z }, direction };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        target: target.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        direction,
        skillId: 'boss-monolith-ram-windup',
        windup,
        length: 10,
        width: 3.0,
        telegraph: 'line',
      });
      return true;
    }
    default:
      return false;
  }
}

export function resolveChucDungCongCongSkill(
  helpers: EnemySkillHelpers,
  skill: EnemySkillState,
  locked: NonNullable<EnemySkillState['windup']>,
): void {
  const { state, enemy, units, hurtHero, canStunHero } = helpers;
  const powerScale = BALANCE_SCALE.skillPower;

  switch (skill.id) {
    case 'boss-meteor-cataclysm': {
      const point = locked.point ?? { x: enemy.x, z: enemy.z };
      const radius = 5.0;
      const damage = Math.round(enemy.attack * 2.0 * powerScale);
      const hits = units.filter(u => u.zone === 0 && isDeployed(u) && distance(u, point) <= radius);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0) {
          unit.bonusArmor = { remaining: 4, amount: -5 };
        }
      }
      event(state, {
        kind: 'ability',
        source: enemy.id,
        x: point.x,
        z: point.z,
        zone: 0,
        targets: hits.map(u => u.id),
        skillId: 'boss-meteor-cataclysm',
        radius,
        value: damage,
      });
      break;
    }
    case 'boss-blazing-spear': {
      const direction = locked.direction ?? { x: 0, z: 1 };
      const length = 10;
      const width = 2.4;
      const damage = Math.round(enemy.attack * 1.75 * powerScale);
      const hits = unitsInLine(units, enemy, direction, length, width);
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
        skillId: 'boss-blazing-spear',
        length,
        width,
        value: damage,
      });
      break;
    }
    case 'boss-abyssal-deluge': {
      const radius = 5.2;
      const damage = Math.round(enemy.attack * 1.7 * powerScale);
      const hits = units.filter(u => u.zone === 0 && isDeployed(u) && distance(u, enemy) <= radius);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0) {
          const dx = enemy.x - unit.x;
          const dz = enemy.z - unit.z;
          const len = Math.hypot(dx, dz) || 1;
          const pull = Math.min(1.4, Math.max(0, len - 1.8));
          const pulled = clampToZone(0, {
            x: unit.x + (dx / len) * pull,
            z: unit.z + (dz / len) * pull,
          });
          unit.x = pulled.x;
          unit.z = pulled.z;
          if (canStunHero(state, unit)) {
            unit.stun = Math.max(unit.stun ?? 0, 0.7);
          }
        }
      }
      event(state, {
        kind: 'ability',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        targets: hits.map(u => u.id),
        skillId: 'boss-abyssal-deluge',
        radius,
        value: damage,
      });
      break;
    }
    case 'boss-monolith-ram': {
      const direction = locked.direction ?? { x: 0, z: 1 };
      const origin = { x: enemy.x, z: enemy.z };
      const hits = unitsInLine(units, origin, direction, 10, 3.0);
      const dest = clampToZone(0, {
        x: enemy.x + direction.x * 6.0,
        z: enemy.z + direction.z * 6.0,
      });
      enemy.x = dest.x;
      enemy.z = dest.z;
      const damage = Math.round(enemy.attack * 2.05 * powerScale);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0 && canStunHero(state, unit)) {
          unit.stun = Math.max(unit.stun ?? 0, 1.0);
          pushHeroFrom(unit, origin, 1.5);
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
        skillId: 'boss-monolith-ram',
        length: 10,
        width: 3.0,
        value: damage,
      });
      break;
    }
  }
}
