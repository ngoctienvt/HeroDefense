import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { resolveBossKitSkill, startBossKitWindup, stepBossPassives } from './boss-kits/index.js';
import { ENEMY_ARCHETYPES } from './enemy-archetypes.js';
import {
  type EnemySkillHelpers,
  type HurtHeroFn,
  resolveChieftainTemplateSkill,
  startChieftainTemplateWindup,
} from './enemy-skill-templates.js';
import { distance, isDeployed } from './rules.js';
import { createInitialEnemySkills } from './wave-plan.js';

export function hasActiveEnemySkillWindup(enemy: Enemy): boolean {
  return Boolean(enemy.skills?.some(skill => skill.windup !== undefined));
}

export function stepEnemySkills(
  state: GameState,
  enemy: Enemy,
  dt: number,
  units: readonly Unit[],
  anchored: Set<string>,
  hurtHero: HurtHeroFn,
  canStunHero: (state: GameState, unit: Unit) => boolean,
): boolean {
  if (enemy.zone !== 0 || enemy.hp <= 0) return false;

  if (enemy.monsterId === 'b001' && !enemy.kit && !enemy.skills) {
    enemy.kit = 'hac-phong';
    enemy.rank ??= 'boss';
    enemy.skills = createInitialEnemySkills(ENEMY_ARCHETYPES.b001);
  }

  const helpers: EnemySkillHelpers = {
    state,
    enemy,
    units,
    hurtHero,
    canStunHero,
  };

  if (enemy.kit) {
    stepBossPassives(helpers);
  }

  const skills = enemy.skills;
  if (!skills || !skills.length) return false;

  const disabled =
    (enemy.silence ?? 0) > 0 ||
    (enemy.sealed ?? 0) > 0 ||
    (enemy.stun ?? 0) > 0 ||
    (enemy.frozen ?? 0) > 0;

  const activeSkill = skills.find(s => s.windup !== undefined);
  if (activeSkill && activeSkill.windup) {
    if (disabled) {
      activeSkill.windup = undefined;
      activeSkill.cooldown = Math.min(
        activeSkill.maxCooldown,
        enemy.rank === 'chieftain' ? 2.5 : 1.5,
      );
      return false;
    }
    anchored.add(enemy.id);
    enemy.windup = undefined;
    activeSkill.windup.remaining -= dt;
    if (activeSkill.windup.remaining <= 1e-6) {
      const locked = activeSkill.windup;
      activeSkill.windup = undefined;
      activeSkill.cooldown = activeSkill.maxCooldown;
      if (enemy.kit) {
        resolveBossKitSkill(helpers, activeSkill, locked);
      } else {
        resolveChieftainTemplateSkill(helpers, activeSkill, locked);
      }
    }
    return true;
  }

  const engaged =
    enemy.z >= -8 ||
    units.some(unit => unit.zone === 0 && isDeployed(unit) && distance(unit, enemy) <= 12);
  if (!engaged || disabled) return false;

  for (const skill of skills) {
    skill.cooldown = Math.max(0, skill.cooldown - dt);
  }

  for (const skill of skills) {
    if (skill.cooldown > 0) continue;
    const started = enemy.kit
      ? startBossKitWindup(helpers, skill)
      : startChieftainTemplateWindup(helpers, skill);
    if (started) {
      anchored.add(enemy.id);
      enemy.windup = undefined;
      return true;
    }
  }

  return false;
}
