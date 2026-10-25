import type { Enemy, EnemySkillState, GameState, Unit, Vec } from '../../contracts/src/types.js';
import { BALANCE_SCALE } from './balance-curve.js';
import { clampToZone } from './battlefield-layout.js';
import { distance, event, isDeployed } from './rules.js';

export type HurtHeroFn = (state: GameState, unit: Unit, damage: number, attacker: Enemy) => void;

export interface EnemySkillHelpers {
  state: GameState;
  enemy: Enemy;
  units: readonly Unit[];
  hurtHero: HurtHeroFn;
  canStunHero: (state: GameState, unit: Unit) => boolean;
}

export function aimDirection(from: Vec, to: Vec): Vec {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.001) return { x: 0, z: 1 };
  return { x: dx / len, z: dz / len };
}

export function unitsInLine(
  units: readonly Unit[],
  origin: Vec,
  direction: Vec,
  length: number,
  width: number,
): Unit[] {
  const halfWidth = width * 0.5;
  return units.filter(unit => {
    if (unit.zone !== 0 || !isDeployed(unit)) return false;
    const rx = unit.x - origin.x;
    const rz = unit.z - origin.z;
    const along = rx * direction.x + rz * direction.z;
    if (along < -0.5 || along > length) return false;
    const perp = Math.abs(rx * -direction.z + rz * direction.x);
    return perp <= halfWidth + 0.65;
  });
}

export function unitsInCone(
  units: readonly Unit[],
  origin: Vec,
  direction: Vec,
  radius: number,
  angleDegrees: number,
): Unit[] {
  const cosHalf = Math.cos((angleDegrees * 0.5 * Math.PI) / 180);
  return units.filter(unit => {
    if (unit.zone !== 0 || !isDeployed(unit)) return false;
    const d = distance(origin, unit);
    if (d > radius) return false;
    if (d < 0.25) return true;
    const dx = (unit.x - origin.x) / d;
    const dz = (unit.z - origin.z) / d;
    return dx * direction.x + dz * direction.z >= cosHalf;
  });
}

export function pushHeroFrom(unit: Unit, origin: Vec, amount: number): void {
  const dx = unit.x - origin.x;
  const dz = unit.z - origin.z;
  const len = Math.hypot(dx, dz) || 1;
  const next = clampToZone(0, {
    x: unit.x + (dx / len) * amount,
    z: unit.z + (dz / len) * amount,
  });
  unit.x = next.x;
  unit.z = next.z;
}

export function nearestHero(enemy: Enemy, units: readonly Unit[], maxRange = 14): Unit | undefined {
  return units
    .filter(u => u.zone === 0 && isDeployed(u) && distance(u, enemy) <= maxRange)
    .sort((a, b) => distance(a, enemy) - distance(b, enemy))[0];
}

export function farthestHeroInRange(enemy: Enemy, units: readonly Unit[], maxRange = 11): Unit | undefined {
  return units
    .filter(u => u.zone === 0 && isDeployed(u) && distance(u, enemy) <= maxRange)
    .sort((a, b) => distance(b, enemy) - distance(a, enemy))[0];
}

export function startChieftainTemplateWindup(
  helpers: EnemySkillHelpers,
  skill: EnemySkillState,
): boolean {
  const { state, enemy, units } = helpers;
  const nearest = nearestHero(enemy, units, 12);
  if (!nearest) return false;

  switch (skill.id) {
    case 'template-A': {
      const windup = 0.9;
      skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z } };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        skillId: 'enemy-slam-windup',
        windup,
        radius: 3.8,
        telegraph: 'circle',
      });
      return true;
    }
    case 'template-A+': {
      const windup = 0.9;
      skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z } };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        skillId: 'enemy-heavy-slam-windup',
        windup,
        radius: 4.2,
        telegraph: 'circle',
      });
      return true;
    }
    case 'template-B': {
      const windup = 0.95;
      const direction = aimDirection(enemy, nearest);
      skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z }, direction };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        direction,
        skillId: 'enemy-pierce-windup',
        windup,
        length: 9,
        width: 2.2,
        telegraph: 'line',
      });
      return true;
    }
    case 'template-C': {
      const target = farthestHeroInRange(enemy, units, 10) ?? nearest;
      const windup = 0.85;
      const point = clampToZone(0, { x: target.x, z: target.z });
      skill.windup = { remaining: windup, point };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        target: target.id,
        x: point.x,
        z: point.z,
        zone: 0,
        skillId: 'enemy-leap-windup',
        windup,
        radius: 3.0,
        telegraph: 'circle',
      });
      return true;
    }
    case 'template-C+': {
      const target = farthestHeroInRange(enemy, units, 10.5) ?? nearest;
      const windup = 0.9;
      const point = clampToZone(0, { x: target.x, z: target.z });
      skill.windup = { remaining: windup, point };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        target: target.id,
        x: point.x,
        z: point.z,
        zone: 0,
        skillId: 'enemy-heavy-leap-windup',
        windup,
        radius: 3.4,
        telegraph: 'circle',
      });
      return true;
    }
    case 'template-D': {
      const windup = 0.75;
      skill.windup = { remaining: windup, point: { x: enemy.x, z: enemy.z } };
      event(state, {
        kind: 'cast',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        skillId: 'enemy-warcry-windup',
        windup,
        radius: 5.5,
        telegraph: 'circle',
      });
      return true;
    }
    default:
      return false;
  }
}

export function resolveChieftainTemplateSkill(
  helpers: EnemySkillHelpers,
  skill: EnemySkillState,
  locked: NonNullable<EnemySkillState['windup']>,
): void {
  const { state, enemy, units, hurtHero, canStunHero } = helpers;
  const powerScale = BALANCE_SCALE.skillPower;

  switch (skill.id) {
    case 'template-A': {
      const radius = 3.8;
      const damage = Math.round(enemy.attack * 1.5 * powerScale);
      const hits = units.filter(u => u.zone === 0 && isDeployed(u) && distance(u, enemy) <= radius);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0 && canStunHero(state, unit)) {
          unit.stun = Math.max(unit.stun ?? 0, 0.5);
          pushHeroFrom(unit, enemy, 0.5);
        }
      }
      event(state, {
        kind: 'ability',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        targets: hits.map(u => u.id),
        skillId: 'enemy-slam',
        radius,
        value: damage,
      });
      break;
    }
    case 'template-A+': {
      const radius = 4.2;
      const damage = Math.round(enemy.attack * 1.85 * powerScale);
      const hits = units.filter(u => u.zone === 0 && isDeployed(u) && distance(u, enemy) <= radius);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0) {
          unit.bonusArmor = { remaining: 3.5, amount: -5 };
          if (canStunHero(state, unit)) {
            unit.stun = Math.max(unit.stun ?? 0, 0.65);
            pushHeroFrom(unit, enemy, 0.65);
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
        skillId: 'enemy-heavy-slam',
        radius,
        value: damage,
      });
      break;
    }
    case 'template-B': {
      const direction = locked.direction ?? { x: 0, z: 1 };
      const length = 9;
      const width = 2.2;
      const damage = Math.round(enemy.attack * 1.65 * powerScale);
      const hits = unitsInLine(units, enemy, direction, length, width);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
      }
      event(state, {
        kind: 'ability',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        direction,
        targets: hits.map(u => u.id),
        skillId: 'enemy-pierce',
        length,
        width,
        value: damage,
      });
      break;
    }
    case 'template-C': {
      const dest = clampToZone(0, locked.point ?? { x: enemy.x, z: enemy.z });
      enemy.x = dest.x;
      enemy.z = dest.z;
      const radius = 3.0;
      const damage = Math.round(enemy.attack * 1.45 * powerScale);
      const hits = units.filter(u => u.zone === 0 && isDeployed(u) && distance(u, enemy) <= radius);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
      }
      event(state, {
        kind: 'ability',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        targets: hits.map(u => u.id),
        skillId: 'enemy-leap',
        radius,
        value: damage,
      });
      break;
    }
    case 'template-C+': {
      const dest = clampToZone(0, locked.point ?? { x: enemy.x, z: enemy.z });
      enemy.x = dest.x;
      enemy.z = dest.z;
      const radius = 3.4;
      const damage = Math.round(enemy.attack * 1.75 * powerScale);
      const hits = units.filter(u => u.zone === 0 && isDeployed(u) && distance(u, enemy) <= radius);
      for (const unit of hits) {
        hurtHero(state, unit, damage, enemy);
        if (unit.hp > 0 && canStunHero(state, unit)) {
          unit.stun = Math.max(unit.stun ?? 0, 0.6);
        }
      }
      event(state, {
        kind: 'ability',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        targets: hits.map(u => u.id),
        skillId: 'enemy-heavy-leap',
        radius,
        value: damage,
      });
      break;
    }
    case 'template-D': {
      const radius = 5.5;
      const shieldAmount = Math.max(150, Math.round(enemy.maxHp * 0.18));
      enemy.shield = Math.max(enemy.shield ?? 0, shieldAmount);
      const allies = Object.values(state.enemies).filter(
        other => other.zone === 0 && other.hp > 0 && distance(other, enemy) <= radius,
      );
      for (const ally of allies) {
        ally.armorBuff = { remaining: 5, amount: 5 };
      }
      event(state, {
        kind: 'ability',
        source: enemy.id,
        x: enemy.x,
        z: enemy.z,
        zone: 0,
        supportTargets: allies.map(a => a.id),
        skillId: 'enemy-warcry',
        radius,
        value: shieldAmount,
      });
      break;
    }
  }
}
