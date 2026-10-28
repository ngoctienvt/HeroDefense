import { HERO_BY_ID } from '../../../content/catalog.js';
import type { AttackGeometryConfig, Enemy, GameState, OnHitTraitConfig, Unit, Vec } from '../../contracts/src/types.js';
import { applyEnemyStatus, criticalDamageAgainst, knockEnemyBack } from './combat-status.js';
import { panguAttack } from './pangu-combat.js';
import { xingtianAttack } from './xingtian-combat.js';
import { douzhanAttack } from './douzhan-combat.js';
import { kimthienAttack } from './kimthien-combat.js';
import { hangngaAttack } from './hangnga-combat.js';
import { nuwaAttack } from './nuwa-combat.js';
import { thaibachAttack } from './thaibach-combat.js';
import { hienvienAttack } from './hienvien-combat.js';
import { shennongAttack } from './shennong-combat.js';
import { chuclongAttack } from './chuclong-combat.js';
import { fuxiAttack } from './fuxi-combat.js';
import { tuongThanAttack } from './tuong-than-combat.js';
import { phuongHoangAttack } from './phuong-hoang-combat.js';
import { tryHardControl } from './crowd-control.js';
import { truongAttack } from './truong-dao-lang-combat.js';
import { bodhiAttack, lanternAttack } from './divine-support-combat.js';
import { deTuanAttack, nguyenThuyAttack, nhuLaiAttack } from './divine-god-combat.js';
import { haungheAttack } from './hau-nghe-combat.js';
import { kimsiAttack } from './kimsi-combat.js';
import { khuongtuAttack } from './khuongtu-nha-combat.js';
import { chucdungAttack } from './chucdung-combat.js';
import { congcongAttack } from './congcong-combat.js';
import { tayvuongmauAttack } from './tayvuongmau-combat.js';
import { lucnhiAttack } from './lucnhi-combat.js';
import { distance, event, isDeployed, random } from './rules.js';
import { effectiveUnitAttack, solarCritMultiplier } from './stats.js';
import { gearModsOf, markGearNativeCrit } from './gear-stats.js';

export type Hurt = (enemy: Enemy, damage: number, penetration?: number, source?: Unit) => void;
export type UnitHurt = (unit: Unit, enemy: Enemy, damage: number, penetration?: number) => void;

interface AttackContext {
  isExtraStrike?: boolean;
  isFollowUp?: boolean;
  /** A replacement attack deliberately suppresses the hero's native attack and on-hit kit. */
  geometryOverride?: AttackGeometryConfig;
}

/** Check if point P is within a ray segment from start to start + dir*length with perpendicular width W. */
function isPointOnRaySegment(start: Vec, dir: Vec, length: number, width: number, point: Vec): boolean {
  const vx = point.x - start.x;
  const vz = point.z - start.z;
  const proj = vx * dir.x + vz * dir.z;
  if (proj < 0 || proj > length) return false;
  const perpDistSq = (vx * vx + vz * vz) - (proj * proj);
  return perpDistSq <= width * width;
}

/** Execute one of the 7 Attack Geometries. */
export function executeAttackGeometry(
  state: GameState,
  unit: Unit,
  target: Enemy,
  hurt: Hurt,
  context: AttackContext = {},
): void {
  const hero = HERO_BY_ID[unit.heroId];
  if (!context.geometryOverride) {
  if (unit.heroId === 'h01B') {
    if (panguAttack(state, unit, target, hurt) && !context.isFollowUp)
      triggerFollowUp(state, unit, target, 'crit', (u, e, d, p) => hurt(e, d, p, u));
    return;
  }
  if (unit.heroId === 'h011') {
    xingtianAttack(state, unit, target, (enemy, damage, penetration) => hurt(enemy, damage, penetration, unit));
    return;
  }
  if (unit.heroId === 'h012') {
    douzhanAttack(state, unit, target, (source, enemy, damage, penetration) =>
      hurt(enemy, damage, penetration, source));
    return;
  }
  if (unit.heroId === 'h013') {
    kimthienAttack(state, unit, target, (source, enemy, damage) => hurt(enemy, damage, 0, source));
    return;
  }
  if (unit.heroId === 'h018') {
    hangngaAttack(state, unit, target, (enemy, damage) => hurt(enemy, damage, 0, unit));
    return;
  }
  if (unit.heroId === 'h01C') {
    nuwaAttack(state, unit, target, (enemy, damage) => hurt(enemy, damage, 0, unit));
    return;
  }
  if (unit.heroId === 'h015') {
    thaibachAttack(state, unit, target, (enemy, damage) => hurt(enemy, damage, 0, unit));
    return;
  }
  if (unit.heroId === 'h01F') {
    hienvienAttack(state, unit, target, (enemy, damage, penetration) =>
      hurt(enemy, damage, penetration, unit));
    return;
  }
  if (unit.heroId === 'h01E') {
    shennongAttack(state, unit, target, (source, enemy, damage, direct) =>
      hurt(enemy, damage, direct ? enemy.armor : 0, source));
    return;
  }
  if (unit.heroId === 'h01K') {
    chuclongAttack(state, unit, target, (enemy, damage, penetration, direct) =>
      hurt(enemy, damage, direct ? enemy.armor : penetration, unit));
    return;
  }
  if (unit.heroId === 'h01D') {
    fuxiAttack(state, unit, target, (enemy, damage) => hurt(enemy, damage, 0, unit));
    return;
  }
  if (unit.heroId === 'h03Z') {
    tuongThanAttack(state, unit, target, (caster, enemy, damage) =>
      hurt(enemy, damage, 0, caster));
    return;
  }
  if (unit.heroId === 'h041') {
    phuongHoangAttack(state, unit, target, (caster, enemy, damage) =>
      hurt(enemy, damage, 0, caster));
    return;
  }
  if (unit.heroId === 'h040') {
    truongAttack(state, unit, target, (source, enemy, damage) =>
      hurt(enemy, damage, 0, source));
    return;
  }
  if (unit.heroId === 'h03W') {
    lanternAttack(state, unit, target, (source, enemy, damage) => hurt(enemy, damage, 0, source));
    return;
  }
  if (unit.heroId === 'h03X') {
    bodhiAttack(state, unit, target, (source, enemy, damage) => hurt(enemy, damage, 0, source));
    return;
  }
  if (unit.heroId === 'h01I') {
    deTuanAttack(state, unit, target, (source, enemy, damage, penetration) =>
      hurt(enemy, damage, penetration, source));
    return;
  }
  if (unit.heroId === 'h01J') {
    nhuLaiAttack(state, unit, target, (source, enemy, damage) => hurt(enemy, damage, 0, source));
    return;
  }
  if (unit.heroId === 'h014') {
    nguyenThuyAttack(state, unit, target, (source, enemy, damage) => hurt(enemy, damage, 0, source));
    return;
  }
  if (unit.heroId === 'h017') {
    haungheAttack(state, unit, target, (enemy, damage, penetration) =>
      hurt(enemy, damage, penetration, unit));
    return;
  }
  if (unit.heroId === 'h016') {
    kimsiAttack(state, unit, target, (enemy, damage, penetration) =>
      hurt(enemy, damage, penetration, unit));
    return;
  }
  if (unit.heroId === 'h019') {
    khuongtuAttack(state, unit, target, (source, enemy, damage) =>
      hurt(enemy, damage, 0, source));
    return;
  }
  if (unit.heroId === 'h01G') {
    // One frontal sweep event with direction (+10 Nộ); the generic cleave emitted one directionless event per hit.
    congcongAttack(state, unit, target, (enemy, damage) => hurt(enemy, damage, 0, unit));
    return;
  }
  if (unit.heroId === 'h01A') {
    tayvuongmauAttack(state, unit, target, (enemy, damage, penetration) =>
      hurt(enemy, damage, penetration, unit));
    return;
  }
  if (unit.heroId === 'h03Y') {
    lucnhiAttack(state, unit, target, (enemy, damage, penetration) =>
      hurt(enemy, damage, penetration, unit));
    return;
  }
  }
  const mods = gearModsOf(state, unit);
  const geometry: AttackGeometryConfig = context.geometryOverride ?? (unit.heroId === 'h00U' && unit.berserk
    ? { type: 'multishot', shots: 3 }
    : unit.heroId === 'h00V' && unit.tierBuff?.kind === 'nezha'
      ? { type: 'frontal_cleave', radius: 5, angle: Math.PI * 2 }
      : hero.attackGeometry ?? { type: 'single' });
  const trait: OnHitTraitConfig = context.geometryOverride ? { type: 'follow_up' } : unit.heroId === 'h00U' && unit.berserk
    ? { ...(hero.onHitTrait ?? {}), type: 'double_strike', percentArmorPierce: .4 }
    : hero.onHitTrait ?? { type: 'crit_pierce' };

  if (!context.geometryOverride) {
    unit.attackCount = (unit.attackCount ?? 0) + 1;
    unit.comboCount = unit.comboTarget === target.id ? (unit.comboCount ?? 0) + 1 : 1;
    unit.comboTarget = target.id;
  }

  const baseAttack = effectiveUnitAttack(unit);
  const enemiesInZone = Object.values(state.enemies).filter(e => e.zone === unit.zone && e.hp > 0);

  switch (geometry.type) {
    case 'single': {
      processSingleHit(state, unit, target, baseAttack, trait, geometry, hurt, context);
      if (trait.drainToGuardianRatio) {
        const guardian = Object.values(state.units).find(u => isDeployed(u) && u.zone === unit.zone && u.owner === unit.owner && u.heroId !== unit.heroId && HERO_BY_ID[u.heroId]?.role === 'guardian')
          ?? Object.values(state.units).filter(u => isDeployed(u) && u.zone === unit.zone && u.owner === unit.owner && u.hp < u.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (guardian) {
          const healAmt = baseAttack * trait.drainToGuardianRatio;
          guardian.hp = Math.min(guardian.maxHp, guardian.hp + healAmt);
          event(state, { kind: 'trait', source: unit.id, target: guardian.id, x: guardian.x, z: guardian.z, value: healAmt, ability: 'heal', skillId: `drain-${unit.heroId}` });
        }
      }
      break;
    }

    case 'frontal_cleave': {
      const radius = (geometry.radius ?? 2.2) * (1 + mods['cleave-radius']);
      const angle = geometry.angle ?? Math.PI;
      const cosThreshold = Math.cos(angle / 2);
      const forwardX = target.x - unit.x;
      const forwardZ = target.z - unit.z;
      const forwardLen = Math.hypot(forwardX, forwardZ) || 1;
      const dirX = forwardX / forwardLen;
      const dirZ = forwardZ / forwardLen;

      const hits = enemiesInZone.filter(e => {
        if (e.id === target.id) return true;
        const d = distance(e, unit);
        if (d > radius) return false;
        const toX = e.x - unit.x;
        const toZ = e.z - unit.z;
        return (toX * dirX + toZ * dirZ) / Math.max(0.01, d) >= cosThreshold;
      });

      for (const enemy of hits) {
        const isSec = enemy.id !== target.id;
        const dmg = isSec ? baseAttack * (geometry.cleaveSecondaryRatio ?? 1.0) : baseAttack;
        if (geometry.knockback) knockEnemyBack(state, enemy, geometry.knockback, unit);
        processSingleHit(state, unit, enemy, dmg, trait, geometry, hurt, context, isSec);
      }
      break;
    }

    case 'linear_pierce': {
      const length = (geometry.length ?? unit.range) * (1 + mods['pierce-length']);
      const width = geometry.width ?? 0.95;
      const forwardX = target.x - unit.x;
      const forwardZ = target.z - unit.z;
      const forwardLen = Math.hypot(forwardX, forwardZ) || 1;
      const dir = { x: forwardX / forwardLen, z: forwardZ / forwardLen };

      let hits = enemiesInZone.filter(e => {
        if (e.id === target.id) return true;
        return isPointOnRaySegment(unit, dir, length, width, e);
      });
      if (geometry.maxTargets && hits.length > geometry.maxTargets) {
        hits.sort((a, b) => distance(a, unit) - distance(b, unit));
        hits = hits.slice(0, geometry.maxTargets);
      }

      if (!context.geometryOverride && unit.heroId === 'h00D' && hits.length >= 2) {
        unit.abilityCooldown = Math.max(0, unit.abilityCooldown - 0.5);
      }

      for (const enemy of hits) {
        processSingleHit(state, unit, enemy, baseAttack, trait, geometry, hurt, context, enemy.id !== target.id);
      }
      break;
    }

    case 'multishot': {
      const shots = Math.max(2, Math.min(7, geometry.shots ?? 2));
      const otherTargets = enemiesInZone
        .filter(e => e.id !== target.id && distance(e, unit) <= unit.range)
        .sort((a, b) => distance(a, unit) - distance(b, unit))
        .slice(0, shots - 1);

      const allTargets = [target, ...otherTargets];
      let primaryHit = false;
      for (const enemy of allTargets) {
        if (geometry.knockback) knockEnemyBack(state, enemy, geometry.knockback, unit);
        if (!context.geometryOverride && unit.heroId === 'h03V') {
          const dx = enemy.x - unit.x, dz = enemy.z - unit.z, length = Math.hypot(dx, dz) || 1;
          const direction = { x: dx / length, z: dz / length };
          for (const pierced of enemiesInZone.filter(e => isPointOnRaySegment(unit, direction, unit.range, .55, e))
            .sort((a, b) => distance(a, unit) - distance(b, unit)).slice(0, 4)) {
            const isPrimary = pierced.id === target.id && !primaryHit;
            if (isPrimary) primaryHit = true;
            processSingleHit(state, unit, pierced, baseAttack, trait, geometry, hurt, context,
              !isPrimary);
          }
          continue;
        }
        processSingleHit(state, unit, enemy, baseAttack, trait, geometry, hurt, context, enemy.id !== target.id);
      }
      break;
    }

    case 'impact_splash': {
      processSingleHit(state, unit, target, baseAttack, trait, geometry, hurt, context);

      const splashRadius = geometry.radius ?? 2.5;
      const splashRatio = geometry.splashDamageRatio ?? 0.5;
      const splashDamage = baseAttack * splashRatio;

      const nearby = enemiesInZone.filter(e => e.id !== target.id && distance(e, target) <= splashRadius);
      const armorPen = trait.percentArmorPierce ? (target.armor * trait.percentArmorPierce) : 0;
      for (const splashEnemy of nearby) {
        hurt(splashEnemy, splashDamage, armorPen);
        if (trait.poisonDps && state.enemies[splashEnemy.id]) {
          splashEnemy.poison = { remaining: trait.poisonDuration ?? 3.0, damagePerSecond: trait.poisonDps, casterId: unit.id };
        }
        if (!context.geometryOverride && unit.heroId === 'h00G' && state.enemies[splashEnemy.id]) {
          applyEnemyStatus(splashEnemy, unit, 0, 'slow', 2.0, 0.25);
        }
        event(state, {
          kind: 'attack',
          source: unit.id,
          target: splashEnemy.id,
          x: splashEnemy.x,
          z: splashEnemy.z,
          value: splashDamage,
          geometry: 'impact_splash',
          skillId: `splash-${unit.heroId}`,
        });
      }
      break;
    }

    case 'bounce': {
      const charged = !context.geometryOverride && unit.heroId === 'h00T' && (target.slow > 0 || (target.frozen ?? 0) > 0);
      processSingleHit(state, unit, target, baseAttack * (charged ? 1.4 : 1), trait, geometry, hurt, context);

      const maxBounces = charged ? 6 : Math.max(1, Math.min(3, geometry.bounces ?? 2));
      const bounceRadius = geometry.bounceRadius ?? 4.0;
      const bounceDecay = geometry.bounceDecay ?? 0.25;

      let currentEnemy = target;
      const visited = new Set<string>([target.id]);

      for (let bounceIndex = 1; bounceIndex <= maxBounces; bounceIndex++) {
        const next = enemiesInZone
          .filter(e => !visited.has(e.id) && distance(e, currentEnemy) <= bounceRadius)
          .sort((a, b) => distance(a, currentEnemy) - distance(b, currentEnemy))[0];

        if (!next) break;
        visited.add(next.id);
        const ratio = Math.max(0.2, 1 - bounceDecay * bounceIndex);
        const bounceDamage = baseAttack * ratio * (charged ? 1.4 : 1);

        hurt(next, bounceDamage, 0);
        event(state, {
          kind: 'attack',
          source: unit.id,
          target: next.id,
          x: next.x,
          z: next.z,
          value: bounceDamage,
          geometry: 'bounce',
          skillId: context.geometryOverride ? 'gear-fate-defiance' : `bounce-${unit.heroId}`,
          origin: { x: currentEnemy.x, z: currentEnemy.z },
        });

        if (!context.geometryOverride && unit.heroId === 'h002' && state.enemies[next.id]) {
          next.poison = { remaining: 2.5, damagePerSecond: 15, casterId: unit.id };
          applyEnemyStatus(next, unit, 0, 'slow', 2.5, 0.10);
        }
        if (!context.geometryOverride && unit.heroId === 'h00I' && state.enemies[next.id]) {
          next.attackWeak = { remaining: 2.0, strength: 0.15 };
        }
        if (!context.geometryOverride && unit.heroId === 'h010' && state.enemies[next.id]) {
          next.burn = { remaining: 2, damagePerSecond: unit.attack * .2, casterId: unit.id };
          next.fireMark = 3;
        }

        currentEnemy = next;
      }
      break;
    }

    case 'boomerang': {
      const length = Math.max(6.0, Math.min(12.0, geometry.length ?? unit.range)) * (1 + mods['pierce-length']);
      const width = geometry.width ?? 1.0;
      const forwardX = target.x - unit.x;
      const forwardZ = target.z - unit.z;
      const forwardLen = Math.hypot(forwardX, forwardZ) || 1;
      const dir = { x: forwardX / forwardLen, z: forwardZ / forwardLen };

      const outwardHits = enemiesInZone.filter(e => isPointOnRaySegment(unit, dir, length, width, e));
      for (const enemy of outwardHits) {
        processSingleHit(state, unit, enemy, baseAttack, trait, geometry, hurt, context, enemy.id !== target.id);
      }

      const duration = 0.25;
      state.boomerangs = state.boomerangs ?? [];
      state.boomerangs.push({
        id: ++state.serial,
        casterId: unit.id,
        start: { x: unit.x, z: unit.z },
        end: { x: target.x, z: target.z },
        zone: unit.zone,
        remaining: duration,
        totalDuration: duration,
        damage: baseAttack * (geometry.returnDamageRatio ?? 1.0),
        penetration: 0,
        phase: 'return',
        hitIds: [],
        gearYin: unit.gearRuntime?.currentYin,
        gearMultiplier: unit.gearRuntime?.basicMultiplier,
      });
      break;
    }
  }

  // Berserk vine beams
  if (!context.geometryOverride && unit.heroId === 'h00A' && unit.berserk && !context.isExtraStrike && !context.isFollowUp) {
    const vineTargets = enemiesInZone.filter(e => e.id !== target.id && distance(e, unit) <= 4.5).slice(0, 2);
    for (const vineTarget of vineTargets) {
      hurt(vineTarget, baseAttack * 0.5, 0);
      applyEnemyStatus(vineTarget, unit, 0, 'slow', 1.5, .4);
      vineTarget.poison = { remaining: 2.0, damagePerSecond: 20, casterId: unit.id };
      event(state, { kind: 'attack', source: unit.id, target: vineTarget.id, x: vineTarget.x, z: vineTarget.z, value: baseAttack * 0.5, skillId: 'vine-beam-h00A' });
    }
  }
}

/** Process a single attack hit with on-hit trait calculations. */
function processSingleHit(
  state: GameState,
  unit: Unit,
  target: Enemy,
  baseDamage: number,
  trait: OnHitTraitConfig,
  geometry: AttackGeometryConfig,
  hurt: Hurt,
  context: AttackContext,
  isSecondaryTarget = false,
): void {
  if (!state.enemies[target.id]) return;
  if (context.geometryOverride) {
    hurt(target, baseDamage, 0);
    event(state, { kind: 'attack', source: unit.id, target: target.id, x: target.x, z: target.z,
      value: baseDamage, geometry: geometry.type, skillId: 'gear-fate-defiance', origin: { x: unit.x, z: unit.z } });
    return;
  }

  let damage = baseDamage;
  let penetration = trait.flatArmorPierce ?? 0;
  let isCrit = false;

  if (trait.percentArmorPierce && target.armor > 0) {
    penetration += target.armor * trait.percentArmorPierce;
  }

  // Bonus damage on low HP or debuffed targets (Vô Thường h00H: +30%)
  if (trait.bonusDamageLowHpOrDebuff) {
    if (target.hp / target.maxHp < 0.5 || (target.stun ?? 0) > 0 || Boolean(target.sunder)) {
      damage *= (1 + trait.bonusDamageLowHpOrDebuff);
    }
  }

  // Sunder on crit or chance
  if (trait.sunderChance && random(state) < trait.sunderChance) {
    applyEnemyStatus(target, unit, 0, 'sunder', trait.sunderDuration ?? 3.5, trait.sunderAmount ?? 3);
  }

  // 1. Tính toán hiệu ứng Nội tại Đánh tay (On-Hit Trait)
  switch (trait.type) {
    case 'crit_pierce': {
      const critChance = (unit.heroId === 'h00O' && (target.slow > 0 || Boolean(target.burn))
        ? .35 : trait.critChance ?? 0.25) + ((target.fireMark ?? 0) > 0 ? .15 : 0)
        + (unit.critBlessing?.chance ?? 0);
      const critMultiplier = solarCritMultiplier(state, unit, (trait.critMultiplier ?? 1.75)
        + (unit.tierBuff?.kind === 'fire' ? .25 : 0));

      if (random(state) < critChance) {
        damage *= critMultiplier;
        isCrit = true;
        damage = criticalDamageAgainst(target, damage);
        if (trait.sunderOnCrit) {
          applyEnemyStatus(target, unit, 0, 'sunder', trait.sunderOnCrit.duration, trait.sunderOnCrit.amount);
        }
      }
      break;
    }

    case 'nth_strike': {
      const interval = trait.nth ?? 3;
      const count = unit.attackCount ?? 1;

      if (count % interval === 0) {
        switch (trait.nthEffect) {
          case 'earthquake': {
            damage *= (trait.nthBonusMultiplier ?? 1.4);
            const eqRadius = trait.nthRadius ?? 2.5;
            for (const nearby of Object.values(state.enemies)) {
              if (nearby.zone === unit.zone && distance(nearby, target) <= eqRadius) {
                applyEnemyStatus(nearby, unit, 0, 'slow', trait.nthSlowDuration ?? 2.5, trait.nthSlow ?? 0.35);
              }
            }
            unit.ward = { remaining: trait.nthWardDuration ?? 2.5, reduction: trait.nthWardReduction ?? 0.25 };
            break;
          }
          case 'knockback':
            damage *= (trait.nthBonusMultiplier ?? 1);
            knockEnemyBack(state, target, trait.nthKnockback ?? 0.6, unit);
            break;
          case 'true_damage':
            penetration = 999;
            damage *= (trait.nthBonusMultiplier ?? 1.4);
            break;
          case 'stun':
            damage *= (trait.nthBonusMultiplier ?? 1.6);
            tryHardControl(state, unit, target, 'stun', trait.nthStunDuration ?? 0.6);
            knockEnemyBack(state, target, trait.nthKnockback ?? 0.6, unit);
            break;
          case 'sunder':
            applyEnemyStatus(target, unit, 0, 'sunder', 3.5, 3);
            break;
          case 'burst':
          default:
            damage *= (trait.nthBonusMultiplier ?? 1.3);
            break;
        }
        event(state, {
          kind: 'trait',
          source: unit.id,
          target: target.id,
          x: target.x,
          z: target.z,
          skillId: `nth-${unit.heroId}`,
          value: damage,
          traitType: 'nth_strike',
        });
      }
      break;
    }

    case 'double_strike': {
      if (!context.isExtraStrike && !context.isFollowUp && !isSecondaryTarget) {
        const doubleChance = trait.doubleChance ?? 0.3;
        if (random(state) < doubleChance) {
          if (trait.bleedBonusDamage) {
            target.bleed = { remaining: trait.bleedDuration ?? 3.0, bonusDamage: trait.bleedBonusDamage };
          }
          const extraCount = trait.extraStrikes ?? 1;
          for (let i = 0; i < extraCount; i++) {
            if (!state.enemies[target.id]) break;
            executeAttackGeometry(state, unit, target, hurt, { ...context, isExtraStrike: true });
          }
        }
      }
      break;
    }

    case 'stacking_mark': {
      target.markStacks = target.markStacks ?? {};
      const currentStacks = target.markStacks[unit.id] ?? 0;
      const damageMultiplier = 1 + currentStacks * (trait.markDamagePerStack ?? 0.08);
      damage *= damageMultiplier;

      const newStacks = currentStacks + 1;
      const maxStacks = trait.maxMarkStacks ?? 5;

      if (newStacks >= maxStacks) {
        target.markStacks[unit.id] = 0;
        // Attack-scaled only: detonations never read the target's Máu.
        const detonateDamage = baseDamage * (trait.markDetonatePower ?? 4);
        hurt(target, detonateDamage, 999);
        event(state, {
          kind: 'trait',
          source: unit.id,
          target: target.id,
          x: target.x,
          z: target.z,
          value: detonateDamage,
          text: 'Kích Nổ Ấn',
          skillId: `mark-detonate-${unit.heroId}`,
          traitType: 'stacking_mark',
        });
      } else {
        target.markStacks[unit.id] = newStacks;
      }
      break;
    }

    case 'orbit_aura':
    case 'follow_up':
      break;
  }

  if (trait.type !== 'crit_pierce' && random(state) < (unit.critBlessing?.chance ?? 0)) {
    damage = criticalDamageAgainst(target, damage * 2);
    isCrit = true;
  }

  // Heal on hit (Mộc Tra h00A)
  if (trait.healOnHit) {
    unit.hp = Math.min(unit.maxHp, unit.hp + trait.healOnHit);
  }
  if (unit.heroId === 'h00J' && target.slow > 0) unit.hp = Math.min(unit.maxHp, unit.hp + unit.maxHp * .015);
  if (unit.heroId === 'h03T') unit.shield += unit.maxHp * .02;
  if (unit.heroId === 'h00R' && !isSecondaryTarget && !context.isExtraStrike) {
    unit.haste = { remaining: 4, amount: Math.min(.4, (unit.haste?.amount ?? 0) + .05) };
  }
  if (unit.heroId === 'h03R') {
    const ally = Object.values(state.units).filter(u => isDeployed(u) && u.owner === unit.owner && u.zone === unit.zone)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (ally) ally.hp = Math.min(ally.maxHp, ally.hp + damage * .3);
  }
  if (unit.heroId === 'h00S' && !isSecondaryTarget) {
    const ally = Object.values(state.units).filter(u => isDeployed(u) && u.owner === unit.owner && u.zone === unit.zone
      && u.id !== unit.id && ['warrior', 'ranger'].includes(HERO_BY_ID[u.heroId]?.role) && distance(u, unit) <= 6)
      .sort((a, b) => distance(a, unit) - distance(b, unit))[0];
    if (ally) ally.energy = Math.min(ally.maxEnergy ?? 100, (ally.energy ?? 0) + 4);
  }
  if (unit.heroId === 'h00Y') {
    for (const ally of Object.values(state.units)) {
      if (!isDeployed(ally) || ally.owner !== unit.owner || ally.zone !== unit.zone || distance(ally, unit) > 5) continue;
      ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * .01);
      ally.haste = { remaining: 4, amount: Math.min(.3, (ally.haste?.amount ?? 0) + .03) };
    }
  }
  if (unit.tierBuff?.kind === 'poison') {
    target.poison = { remaining: 3, damagePerSecond: damage * .15 / 3, casterId: unit.id };
    // Presentation only: native poison below replaces this application, so it must not claim peacock provenance.
    if (!trait.poisonDps) event(state, { kind: 'trait', source: unit.id, target: target.id,
      targets: [target.id], x: target.x, z: target.z, zone: target.zone, skillId: 'peacock-poison-hit-h03R' });
  }
  if (unit.tierBuff?.kind === 'fire') target.burn = {
    remaining: 3, damagePerSecond: damage * .3 / 3, casterId: unit.id,
  };
  if (unit.heroId === 'h010') target.fireMark = 3;
  if (trait.poisonDps) target.poison = { remaining: trait.poisonDuration ?? 3, damagePerSecond: trait.poisonDps, casterId: unit.id };
  if (trait.poisonSlow) applyEnemyStatus(target, unit, 0, 'slow', 2.5, trait.poisonSlow);
  if (unit.heroId === 'h00Z' && (target.frozen ?? 0) > 0) damage *= 2;

  // Lifesteal from berserk mode
  if (unit.berserk) {
    unit.hp = Math.min(unit.maxHp, unit.hp + damage * unit.berserk.lifesteal);
  }

  // Quỷ Sai burn DoT
  if (trait.burnDpsRatio) {
    target.burn = { remaining: trait.burnDuration ?? 3.0, damagePerSecond: unit.attack * trait.burnDpsRatio, casterId: unit.id };
  }

  // Hồng Hài Nhi attack speed heat stacks
  if (unit.heroId === 'h00C' && target.burn) {
    unit.heatStacks = Math.min(5, (unit.heatStacks ?? 0) + 1);
  }

  // Energy generation on attack
  if (!context.isFollowUp && !context.isExtraStrike && !isSecondaryTarget) {
    if (unit.energyType === 'rage_on_attack') {
      const tierGain: Readonly<Record<string, number>> = { h00L: 16, h00M: 15, h00O: 15, h00P: 14,
        h00R: isCrit ? 25 : 15, h00U: 14, h00V: 14, h00Z: 16, h03V: 16 };
      const gain = tierGain[unit.heroId] ?? (unit.heroId === 'h00A' ? 14 : unit.heroId === 'h00C' ? 15 : unit.heroId === 'h00H' ? (isCrit ? 30 : 15) : (isCrit ? 24 : 12));
      unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + gain);
    } else if (unit.energyType === 'rage_on_hit') {
      const gain = unit.heroId === 'h009' ? 10 : unit.heroId === 'h00E' ? 12 : 10;
      unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + gain);
    }
  }
  if (unit.heroId === 'h00U' && context.isExtraStrike && !isSecondaryTarget) {
    unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + 14);
  }

  // Gây sát thương lên mục tiêu
  if (isCrit) markGearNativeCrit(unit, target, damage);
  hurt(target, damage, penetration);

  event(state, {
    kind: 'attack',
    source: unit.id,
    target: target.id,
    x: target.x,
    z: target.z,
    value: damage,
    geometry: geometry.type,
    traitType: trait.type,
    isCrit,
    skillId: `trait-${unit.heroId}`,
  });

  // Nếu nổ chí mạng, kích hoạt Hiệp Kích (follow_up) cho đồng minh xung quanh
  if (isCrit && !context.isFollowUp) {
    triggerFollowUp(state, unit, target, 'crit', (u, e, d, p) => hurt(e, d, p, u));
  }
}

/** Hiệp Kích (follow_up): Khi đồng minh đứng cạnh tung Kỹ năng hoặc nổ Chí Mạng, tướng này tự động bắn bồi thêm 1 đòn. */
export function triggerFollowUp(
  state: GameState,
  ally: Unit,
  target: Enemy,
  triggerKind: 'skill' | 'crit',
  hurt?: UnitHurt,
): void {
  if (!state.enemies[target.id] || target.hp <= 0) return;

  const defaultHurt: UnitHurt = (u, e, d, p) => {
    e.hp -= Math.max(0.01, d);
  };
  const activeHurt = hurt ?? defaultHurt;

  for (const unit of Object.values(state.units)) {
    if (!isDeployed(unit) || unit.id === ally.id || unit.owner !== ally.owner || unit.zone !== ally.zone) continue;
    if (gearModsOf(state, unit).uniques.has('fate-defiance')) continue;
    const hero = HERO_BY_ID[unit.heroId];
    if (hero?.onHitTrait?.type !== 'follow_up') continue;

    const radius = hero.onHitTrait.followUpRadius ?? 6.0;
    if (distance(unit, ally) > radius) continue;

    // Giới hạn hồi chiêu hiệp kích để không lặp vô hạn
    if ((unit.followUpCooldown ?? 0) > 0) continue;
    unit.followUpCooldown = hero.onHitTrait.followUpCooldown ?? 1.5;

    // Hồi máu cho đồng minh nếu có (Tiên Nữ h006 hồi 20 HP)
    if (hero.onHitTrait.followUpHeal) {
      ally.hp = Math.min(ally.maxHp, ally.hp + hero.onHitTrait.followUpHeal);
      event(state, {
        kind: 'trait',
        source: unit.id,
        target: ally.id,
        x: ally.x,
        z: ally.z,
        value: hero.onHitTrait.followUpHeal,
        ability: 'heal',
        skillId: `follow-up-heal-${unit.heroId}`,
      });
    }

    // Tự động bắn bồi thêm 1 đòn đánh thường miễn phí vào mục tiêu đó
    event(state, {
      kind: 'trait',
      source: unit.id,
      target: target.id,
      x: target.x,
      z: target.z,
      text: 'Hiệp Kích',
      skillId: `follow-up-${unit.heroId}`,
      traitType: 'follow_up',
    });

    executeAttackGeometry(state, unit, target, (e, d, p) => activeHurt(unit, e, d, p), { isFollowUp: true });
    if (unit.heroId === 'h03Q') unit.abilityCooldown = Math.max(0, unit.abilityCooldown - 1);
  }
}

/** Hào Quang Quanh Thân (orbit_aura): Tự động gây sát thương hoặc làm chậm mọi quái áp sát mỗi 0.5s. */
export function stepOrbitAuras(state: GameState, dt: number, hurt: UnitHurt): void {
  for (const unit of Object.values(state.units)) {
    if (!isDeployed(unit)) continue;
    if (gearModsOf(state, unit).uniques.has('fate-defiance')) continue;
    if (unit.heroId === 'h01G' || unit.heroId === 'h01H') continue;
    const hero = HERO_BY_ID[unit.heroId];
    if (hero?.onHitTrait?.type !== 'orbit_aura') continue;

    unit.orbitTimer = (unit.orbitTimer ?? 0) + dt;
    const interval = hero.onHitTrait.orbitInterval ?? 0.5;

    if (unit.orbitTimer >= interval) {
      unit.orbitTimer -= interval;
      const radius = unit.heroId === 'h00V' && unit.tierBuff?.kind === 'nezha'
        ? 5 : hero.onHitTrait.orbitRadius ?? 2.8;
      const auraDamage = hero.onHitTrait.orbitDamage ?? unit.attack * (hero.onHitTrait.orbitDamageRatio ?? .25);
      const element = hero.onHitTrait.orbitElement ?? 'ice';

      const nearbyEnemies = Object.values(state.enemies).filter(
        e => e.zone === unit.zone && e.hp > 0 && distance(e, unit) <= radius,
      );

      for (const enemy of nearbyEnemies) {
        hurt(unit, enemy, auraDamage, element === 'sword' ? 999 : 0);

        if (element === 'ice') {
          const slowStrength = hero.onHitTrait.orbitSlow ?? 0.3;
          const slowDuration = hero.onHitTrait.orbitSlowDuration ?? 2.0;
          applyEnemyStatus(enemy, unit, 0, 'slow', slowDuration, slowStrength);
          if (hero.onHitTrait.orbitAttackSlow) {
            enemy.attackSlow = { remaining: slowDuration, strength: hero.onHitTrait.orbitAttackSlow };
          }
        }

        event(state, {
          kind: 'trait',
          source: unit.id,
          target: enemy.id,
          x: enemy.x,
          z: enemy.z,
          value: auraDamage,
          traitType: 'orbit_aura',
          skillId: `aura-${element}-${unit.heroId}`,
        });
      }
    }
  }
}

/** Quản lý đòn bay khứ hồi (boomerang): Khi quay về, cắt sát thương lần 2 vào tất cả quái trên đường bay ngược lại. */
export function stepBoomerangs(state: GameState, dt: number,
  hurt: (unit: Unit, enemy: Enemy, damage: number, penetration?: number, yin?: boolean, multiplier?: number) => void): void {
  if (!state.boomerangs?.length) return;

  for (const b of state.boomerangs) {
    b.remaining -= dt;
    if (b.remaining <= 0) {
      const caster = state.units[b.casterId];
      const returnTargetPos = caster ? { x: caster.x, z: caster.z } : b.start;
      const returnX = returnTargetPos.x - b.end.x;
      const returnZ = returnTargetPos.z - b.end.z;
      const returnLen = Math.hypot(returnX, returnZ) || 1;
      const dir = { x: returnX / returnLen, z: returnZ / returnLen };

      // Cắt sát thương lượt về vào mọi quái xếp hàng dọc trên đường bay về
      const enemiesInZone = Object.values(state.enemies).filter(e => e.zone === b.zone && e.hp > 0);
      const returnHits = enemiesInZone.filter(e => isPointOnRaySegment(b.end, dir, returnLen, 1.0, e));

      for (const enemy of returnHits) {
        if (caster) hurt(caster, enemy, b.damage, b.penetration, b.gearYin, b.gearMultiplier);
        if (caster && state.enemies[enemy.id] && (caster.heroId === 'h00K' || caster.heroId === 'h03U')) {
          applyEnemyStatus(enemy, caster, 0, 'sunder', 3, caster.heroId === 'h00K' ? 3 : .25);
        }
        event(state, {
          kind: 'attack',
          source: b.casterId,
          target: enemy.id,
          x: enemy.x,
          z: enemy.z,
          value: b.damage,
          geometry: 'boomerang',
          skillId: caster && ['h00K', 'h03U'].includes(caster.heroId)
            ? `boomerang-return-${caster.heroId}` : `boomerang-return-${b.id}`,
        });
      }
    }
  }

  state.boomerangs = state.boomerangs.filter(b => b.remaining > 0);
}
