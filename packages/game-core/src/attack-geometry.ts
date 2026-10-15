import { HERO_BY_ID } from '../../../content/catalog.js';
import type { AttackGeometryConfig, Enemy, GameState, OnHitTraitConfig, Unit, Vec } from '../../contracts/src/types.js';
import { applyEnemyStatus, knockEnemyBack } from './combat-status.js';
import { panguAttack } from './pangu-combat.js';
import { distance, event, isDeployed, random } from './rules.js';
import { effectiveUnitAttack } from './stats.js';

export type Hurt = (enemy: Enemy, damage: number, penetration?: number, source?: Unit) => void;
export type UnitHurt = (unit: Unit, enemy: Enemy, damage: number, penetration?: number) => void;

interface AttackContext {
  isExtraStrike?: boolean;
  isFollowUp?: boolean;
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
  if (unit.heroId === 'h01B') {
    if (panguAttack(state, unit, target, hurt) && !context.isFollowUp)
      triggerFollowUp(state, unit, target, 'crit', (u, e, d, p) => hurt(e, d, p, u));
    return;
  }
  const geometry: AttackGeometryConfig = hero.attackGeometry ?? { type: 'single' };
  const trait: OnHitTraitConfig = hero.onHitTrait ?? { type: 'crit_pierce' };

  unit.attackCount = (unit.attackCount ?? 0) + 1;
  unit.comboCount = unit.comboTarget === target.id ? (unit.comboCount ?? 0) + 1 : 1;
  unit.comboTarget = target.id;

  const baseAttack = effectiveUnitAttack(unit);
  const enemiesInZone = Object.values(state.enemies).filter(e => e.zone === unit.zone && e.hp > 0);

  switch (geometry.type) {
    case 'single': {
      processSingleHit(state, unit, target, baseAttack, trait, geometry, hurt, context);
      if (trait.drainToGuardianRatio) {
        const guardian = Object.values(state.units).find(u => isDeployed(u) && u.zone === unit.zone && u.owner === unit.owner && u.heroId !== unit.heroId && HERO_BY_ID[u.heroId].role === 'guardian')
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
      const radius = geometry.radius ?? 2.2;
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
        processSingleHit(state, unit, enemy, dmg, trait, geometry, hurt, context, isSec);
      }
      break;
    }

    case 'linear_pierce': {
      const length = geometry.length ?? unit.range;
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

      if (unit.heroId === 'h00D' && hits.length >= 2) {
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
      for (const enemy of allTargets) {
        if (geometry.knockback) knockEnemyBack(state, enemy, geometry.knockback);
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
        if (unit.heroId === 'h00G' && state.enemies[splashEnemy.id]) {
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
      processSingleHit(state, unit, target, baseAttack, trait, geometry, hurt, context);

      const maxBounces = Math.max(1, Math.min(3, geometry.bounces ?? 2));
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
        const bounceDamage = baseAttack * ratio;

        hurt(next, bounceDamage, 0);
        event(state, {
          kind: 'attack',
          source: unit.id,
          target: next.id,
          x: next.x,
          z: next.z,
          value: bounceDamage,
          geometry: 'bounce',
          skillId: `bounce-${unit.heroId}`,
        });

        if (unit.heroId === 'h002' && state.enemies[next.id]) {
          next.poison = { remaining: 2.5, damagePerSecond: 15, casterId: unit.id };
          applyEnemyStatus(next, unit, 0, 'slow', 2.5, 0.10);
        }
        if (unit.heroId === 'h00I' && state.enemies[next.id]) {
          next.attackWeak = { remaining: 2.0, strength: 0.15 };
        }

        currentEnemy = next;
      }
      break;
    }

    case 'boomerang': {
      const length = Math.max(6.0, Math.min(12.0, geometry.length ?? unit.range));
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
      });
      break;
    }
  }

  // Berserk vine beams
  if (unit.berserk && !context.isExtraStrike && !context.isFollowUp) {
    const vineTargets = enemiesInZone.filter(e => e.id !== target.id && distance(e, unit) <= 4.5).slice(0, 2);
    for (const vineTarget of vineTargets) {
      hurt(vineTarget, baseAttack * 0.5, 0);
      applyEnemyStatus(vineTarget, unit, 0, 'root', 1.5, 1);
      vineTarget.poison = { remaining: 2.0, damagePerSecond: 20, casterId: unit.id };
      event(state, { kind: 'attack', source: unit.id, target: vineTarget.id, x: vineTarget.x, z: vineTarget.z, value: baseAttack * 0.5, skillId: 'vine-beam' });
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
      const critChance = trait.critChance ?? 0.25;
      const critMultiplier = trait.critMultiplier ?? 1.75;

      if (random(state) < critChance) {
        damage *= critMultiplier;
        isCrit = true;
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
          case 'true_damage':
            penetration = 999;
            damage *= (trait.nthBonusMultiplier ?? 1.4);
            break;
          case 'stun':
            damage *= (trait.nthBonusMultiplier ?? 1.6);
            applyEnemyStatus(target, unit, 0, 'stun', trait.nthStunDuration ?? 0.6, 1);
            knockEnemyBack(state, target, trait.nthKnockback ?? 0.6);
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
        const percentHp = trait.markDetonatePercentHp ?? 0.08;
        const detonateDamage = Math.min(target.maxHp * percentHp, baseDamage * 5);
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

  // Heal on hit (Mộc Tra h00A)
  if (trait.healOnHit) {
    unit.hp = Math.min(unit.maxHp, unit.hp + trait.healOnHit);
  }

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
      const gain = unit.heroId === 'h00A' ? 14 : unit.heroId === 'h00C' ? 15 : unit.heroId === 'h00H' ? (isCrit ? 30 : 15) : (isCrit ? 24 : 12);
      unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + gain);
    } else if (unit.energyType === 'rage_on_hit') {
      const gain = unit.heroId === 'h009' ? 10 : unit.heroId === 'h00E' ? 12 : 10;
      unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + gain);
    }
  }

  // Gây sát thương lên mục tiêu
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
    const hero = HERO_BY_ID[unit.heroId];
    if (hero.onHitTrait?.type !== 'follow_up') continue;

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
  }
}

/** Hào Quang Quanh Thân (orbit_aura): Tự động gây sát thương hoặc làm chậm mọi quái áp sát mỗi 0.5s. */
export function stepOrbitAuras(state: GameState, dt: number, hurt: UnitHurt): void {
  for (const unit of Object.values(state.units)) {
    if (!isDeployed(unit)) continue;
    const hero = HERO_BY_ID[unit.heroId];
    if (hero.onHitTrait?.type !== 'orbit_aura') continue;

    unit.orbitTimer = (unit.orbitTimer ?? 0) + dt;
    const interval = hero.onHitTrait.orbitInterval ?? 0.5;

    if (unit.orbitTimer >= interval) {
      unit.orbitTimer -= interval;
      const radius = hero.onHitTrait.orbitRadius ?? 2.8;
      const auraDamage = hero.onHitTrait.orbitDamage ?? unit.attack * 0.25;
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
export function stepBoomerangs(state: GameState, dt: number, hurt: UnitHurt): void {
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
        if (caster) hurt(caster, enemy, b.damage, b.penetration);
        event(state, {
          kind: 'attack',
          source: b.casterId,
          target: enemy.id,
          x: enemy.x,
          z: enemy.z,
          value: b.damage,
          geometry: 'boomerang',
          skillId: `boomerang-return-${b.id}`,
        });
      }
    }
  }

  state.boomerangs = state.boomerangs.filter(b => b.remaining > 0);
}
