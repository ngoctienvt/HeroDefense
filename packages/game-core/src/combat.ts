import { DIFFICULTIES, HERO_BY_ID } from '../../../content/catalog.js';
import type { AbilityEffect, Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { distance, event, isDeployed, nextId, slotPosition, walk } from './rules.js';
import { enemyRoute } from './battlefield-layout.js';
import { attackInterval, bonuses, effectiveUnitAttack } from './stats.js';
import { applyEnemyStatus, effectiveEnemyArmor, knockEnemyBack } from './combat-status.js';
import { basicAttack, passiveTraits } from './combat-traits.js';
import { stepBoomerangs, stepOrbitAuras, triggerFollowUp } from './attack-geometry.js';
import { crowdMovement, resolveSoftCollisions, surroundSlotGoal, walkHeroWithCollision } from './crowd-movement.js';
import { PANGU } from '../../../content/pangu-design.js';
import { panguAbility, panguDirection, stepPanguRifts } from './pangu-combat.js';

export function hurtEnemy(state: GameState, unit: Unit, enemy: Enemy, damage: number, penetration = 0, isSoulLinkShare = false, trueDamage = false): void {
  if (!state.enemies[enemy.id]) return;
  if (enemy.bleed && !isSoulLinkShare && !trueDamage) damage *= (1 + enemy.bleed.bonusDamage);
  const armor = trueDamage ? 0 : Math.max(0, effectiveEnemyArmor(enemy) - penetration
    - (isSoulLinkShare ? 0 : effectiveEnemyArmor(enemy) * (unit.empower?.armorPierce ?? 0)));
  const actual = Math.max(.01, damage * 100 / (100 + armor * 5));
  const absorbed = Math.min(enemy.shield ?? 0, actual);
  if (absorbed) enemy.shield = (enemy.shield ?? 0) - absorbed;
  const hpDamage = Math.min(enemy.hp, actual - absorbed);
  enemy.hp -= hpDamage; state.players[unit.owner].damage += hpDamage + absorbed;

  if (!isSoulLinkShare && enemy.soulLink && enemy.soulLink.remaining > 0) {
    const shared = hpDamage * enemy.soulLink.sharePercent;
    for (const linkedId of enemy.soulLink.group) {
      if (linkedId !== enemy.id && state.enemies[linkedId]) {
        hurtEnemy(state, unit, state.enemies[linkedId], shared, 999, true);
      }
    }
  }

  if (enemy.hp <= 0) {
    delete state.enemies[enemy.id]; unit.kills++;
    state.players[unit.owner].kills++;
    event(state, { kind: 'death', target: enemy.id, x: enemy.x, z: enemy.z });
    const burnCaster = state.units[enemy.burn?.casterId ?? ''];
    if (burnCaster?.heroId === 'h003') {
      event(state, { kind: 'trait', source: burnCaster.id, x: enemy.x, z: enemy.z,
        ability: 'nova', skillId: 'burst-h003', value: 35 });
      for (const nearby of Object.values(state.enemies)) {
        if (nearby.zone === enemy.zone && distance(nearby, enemy) <= 2) hurtEnemy(state, burnCaster, nearby, 35);
      }
    }
  }
}
function hurtUnit(state: GameState, unit: Unit, damage: number, attacker?: Enemy): void {
  if (unit.heroId === PANGU.id && unit.pendingAbility) return;
  if (unit.heroId === PANGU.id) unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + 5);
  if (unit.energyType === 'rage_on_hit') {
    const gain = unit.heroId === 'h009' ? 7 : unit.heroId === 'h00E' ? 6 : 6;
    unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + gain);
  }
  const armor = unit.armor + (unit.bonusArmor?.amount ?? 0);
  let reduced = Math.max(1, damage * 100 / (100 + armor * 5) * (1 - (unit.ward?.reduction ?? 0)));
  if (unit.heroId === 'h007') reduced = Math.max(1, reduced - 5);
  const absorbed = Math.min(unit.shield, reduced); unit.shield -= absorbed; unit.hp -= reduced - absorbed;
  if (unit.mistShield) unit.mistShield.amount = Math.max(0, unit.mistShield.amount - absorbed);
  if (unit.frostShield) unit.frostShield.amount = Math.max(0, unit.frostShield.amount - absorbed);
  if (attacker && distance(unit, attacker) <= 2.2) {
    if (unit.heroId === 'h007') {
      applyEnemyStatus(attacker, unit, 0, 'slow', 2.0, 0.30);
      attacker.attackSlow = { remaining: 2.0, strength: 0.20 };
    }
    if (unit.heroId === 'h009' && unit.shield > 0) {
      attacker.bleed = { remaining: 3.0, bonusDamage: 0.10 };
      for (const nearby of Object.values(state.enemies)) {
        if (nearby.zone === unit.zone && distance(nearby, unit) <= 3.0) {
          hurtEnemy(state, unit, nearby, damage * 0.5);
        }
      }
    }
    if (unit.frostShield && unit.shield > 0) {
      attacker.attackSlow = { remaining: 2.0, strength: unit.frostShield.attackSlow };
    }
    if (absorbed > 0 && unit.reflect) hurtEnemy(state, unit, attacker, reduced * unit.reflect.amount, 999);
  }
  if (unit.hp <= 0) {
    unit.hp = 0; unit.deaths++; unit.respawn = 5 + unit.deaths * .3;
    unit.destination = null; unit.target = null; unit.orderMode = 'auto'; unit.engageAt = null; unit.shield = 0; unit.ward = undefined; unit.haste = undefined;
    unit.pendingAbility = undefined; unit.empower = undefined; unit.bonusArmor = undefined; unit.reflect = undefined; unit.mistShield = undefined; unit.frostShield = undefined; unit.berserk = undefined;
    event(state, { kind: 'death', target: unit.id, x: unit.x, z: unit.z });
    if (unit.summonDuration !== undefined) {
      delete state.units[unit.id];
    }
  }
}
function abilityEffect(kind: string, effect?: AbilityEffect): AbilityEffect {
  if (effect) return effect;
  if (kind === 'heal') return { target: 'allies', shape: 'radius', radius: 12, jumps: 3 };
  if (kind === 'shield') return { target: 'allies', shape: 'radius', radius: 12 };
  if (kind === 'chain') return { target: 'enemy', shape: 'chain', jumps: 3 };
  return { target: 'enemy', shape: 'radius', radius: kind === 'nova' ? 6 : 3.5, ...(kind === 'nova' ? { status: 'slow', statusSeconds: 3, statusStrength: .5 } : {}) };
}
function applyFriendlyStatus(ally: Unit, effect: AbilityEffect): void {
  const duration = effect.statusSeconds ?? 0, strength = Math.min(.75, Math.max(0, effect.statusStrength ?? 0));
  if (effect.status === 'ward' && duration > 0) {
    if (!ally.ward || ally.ward.reduction <= strength) ally.ward = { remaining: duration, reduction: strength };
  }
  if (effect.status === 'haste' && duration > 0) {
    if (!ally.haste || ally.haste.amount <= strength) ally.haste = { remaining: duration, amount: strength };
  }
}
const WINDUP_HEROES = new Set(['h01B', 'h009', 'h00A', 'h00B', 'h00C', 'h00D', 'h00E', 'h00F', 'h00G', 'h00H', 'h00I', 'h03O', 'h03P']);
const WINDUP_SECONDS = .25;

export function castAbility(state: GameState, unit: Unit, targetId?: string): boolean {
  if (!isDeployed(unit) || unit.pendingAbility) return false;
  const hero = HERO_BY_ID[unit.heroId];
  if (!hero.ability) return false;
  const isRage = unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit';
  if (isRage) {
    if ((unit.energy ?? 0) < (unit.maxEnergy ?? 100)) return false;
  } else {
    if (unit.abilityCooldown > 0) return false;
  }
  // Lobby has no simulation clock; keep its practice casts instantaneous.
  if (!WINDUP_HEROES.has(hero.id) || state.phase === 'lobby') return resolveAbility(state, unit, targetId);
  const effect = abilityEffect(hero.ability.kind, hero.ability.effect);
  const enemies = Object.values(state.enemies).filter(e => e.zone === unit.zone && distance(e, unit) <= unit.range + 5);
  const target = targetId ? enemies.find(e => e.id === targetId) : hero.id === 'h00G'
    ? enemies.sort((a, b) => enemies.filter(e => distance(e, b) <= 4.5).length - enemies.filter(e => distance(e, a) <= 4.5).length)[0]
    : hero.id === 'h00H'
      ? enemies.sort((a, b) => a.hp - b.hp)[0]
      : enemies.sort((a, b) => distance(a, unit) - distance(b, unit))[0];
  const allies = Object.values(state.units).filter(u => isDeployed(u) && u.zone === unit.zone
    && (effect.target === 'self' ? u.id === unit.id : distance(u, unit) <= (effect.radius ?? 12)));
  if (targetId && !target) return false;
  if (hero.ability.kind === 'heal' && !allies.some(u => u.hp < u.maxHp) && effect.status !== 'haste' && !effect.overhealShield) return false;
  if (hero.ability.kind === 'shield' && !allies.length) return false;
  if (hero.ability.kind !== 'heal' && hero.ability.kind !== 'shield' && !target) return false;
  if (isRage) {
    unit.energy = 0;
  } else {
    unit.abilityCooldown = hero.ability.cooldown / (1 + .1 * unit.equipment[2]);
  }
  const windup = hero.id === PANGU.id ? PANGU.windup : WINDUP_SECONDS;
  const point = { x: target?.x ?? unit.x, z: target?.z ?? unit.z };
  const direction = panguDirection(unit, point);
  unit.pendingAbility = { remaining: windup, targetId: target?.id, zone: unit.zone, point, direction };
  event(state, { kind: 'cast', source: unit.id, target: target?.id, x: target?.x ?? unit.x,
    z: target?.z ?? unit.z, ability: hero.ability.kind, skillId: hero.ability.id, zone: unit.zone, direction, windup });
  return true;
}

function resolveAbility(state: GameState, unit: Unit, targetId?: string, deferred = false, locked?: Unit['pendingAbility']): boolean {
  if (!isDeployed(unit)) return false;
  const hero = HERO_BY_ID[unit.heroId];
  if (!hero.ability) return false;
  if (hero.id === PANGU.id && !locked?.point) {
    const candidate = Object.values(state.enemies).find(e => e.zone === unit.zone && distance(e, unit) <= unit.range + 5 && (!targetId || e.id === targetId));
    if (!candidate) return false;
    locked = { remaining: 0, zone: unit.zone, point: { x: candidate.x, z: candidate.z }, direction: panguDirection(unit, candidate) };
  }
  const isRage = unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit';
  if (!deferred) {
    if (isRage) {
      if ((unit.energy ?? 0) < (unit.maxEnergy ?? 100)) return false;
      unit.energy = 0;
    } else {
      if (unit.abilityCooldown > 0) return false;
    }
  }

  if (hero.id === PANGU.id && locked?.point && locked.direction) {
    panguAbility(state, unit, locked.point, locked.direction,
      (e, d, p) => hurtEnemy(state, unit, e, d, p), (e, d) => hurtEnemy(state, unit, e, d, 0, false, true));
    const survivor = state.enemies[targetId ?? ''];
    if (survivor) triggerFollowUp(state, unit, survivor, 'skill', (u, e, d, p) => hurtEnemy(state, u, e, d, p));
    return true;
  }
  const kind = hero.ability.kind, effect = abilityEffect(kind, hero.ability.effect);
  const zoneEnemies = Object.values(state.enemies).filter(e => e.zone === unit.zone);
  const enemies = zoneEnemies.filter(e => distance(e, unit) <= unit.range + 5);
  const requested = targetId ? enemies.find(e => e.id === targetId) : undefined;
  if (targetId && !requested) return false;
  enemies.sort((a, b) => distance(a, unit) - distance(b, unit));
  const target = requested ?? (hero.id === 'h00G'
    ? enemies.sort((a, b) => zoneEnemies.filter(e => distance(e, b) <= 4.5).length - zoneEnemies.filter(e => distance(e, a) <= 4.5).length)[0]
    : hero.id === 'h00H'
      ? enemies.sort((a, b) => a.hp - b.hp)[0]
      : enemies[0]);
  const allies = Object.values(state.units).filter(u => isDeployed(u) && u.zone === unit.zone
    && (effect.target === 'self' ? u.id === unit.id : distance(u, unit) <= (effect.radius ?? 12)));
  const power = effectiveUnitAttack(unit) * hero.ability.power * (1 + unit.equipment[2] * .25);
  let affectedIds: string[] = [];

  // Hero-specific active abilities
  if (hero.id === 'h00A') {
    // Mộc Tra: Ngô Câu Mộc Ảnh Vũ (berserk)
    unit.berserk = { remaining: 5.0, attackSpeed: 0.75, lifesteal: 0.20 };
    affectedIds = [unit.id];
  } else if (kind === 'heal') {
    const injured = allies.filter(u => u.hp < u.maxHp);
    if (!injured.length && effect.status !== 'haste' && !effect.overhealShield) return false;
    injured.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    const recipients = effect.shape === 'radius' ? (effect.maxTargets ? (injured.length ? injured : allies).slice(0, effect.maxTargets) : allies) : (injured.length ? injured : allies).slice(0,
      effect.shape === 'single' ? 1 : effect.jumps ?? 3);
    for (const ally of recipients) {
      const missing = ally.maxHp - ally.hp;
      ally.hp = Math.min(ally.maxHp, ally.hp + power);
      if (effect.overhealShield && power > missing) {
        const overheal = power - missing;
        ally.shield = Math.max(ally.shield, overheal);
        if (hero.id === 'h03O') {
          ally.frostShield = { remaining: 5, amount: overheal, attackSlow: 0.40 };
        } else {
          ally.mistShield = { remaining: 5, amount: overheal };
        }
      }
      if (hero.id === 'h00F') {
        ally.haste = { remaining: 4.5, amount: 0.35, attackBonus: 0.15 };
      } else {
        applyFriendlyStatus(ally, effect);
      }
    }
    affectedIds = recipients.map(ally => ally.id);
  } else if (kind === 'shield') {
    if (!allies.length) return false;
    allies.sort((a, b) => (a.shield / a.maxHp + a.hp / a.maxHp) - (b.shield / b.maxHp + b.hp / b.maxHp));
    const recipients = effect.maxTargets === 2 && allies.includes(unit)
      ? [unit, ...allies.filter(ally => ally.id !== unit.id).slice(0, 1)]
      : allies.slice(0, effect.shape === 'single' ? 1 : effect.maxTargets ?? effect.jumps ?? allies.length);
    for (const ally of recipients) {
      const shieldAmount = hero.id === 'h009'
        ? effectiveUnitAttack(unit) * 2.2 + unit.maxHp * 0.12
        : hero.id === 'h00E'
          ? effectiveUnitAttack(unit) * 2.0 + unit.maxHp * 0.15
          : effect.reflect ? power + unit.maxHp * .1 : hero.tier === 2 ? power : power * .6;
      ally.shield = Math.max(ally.shield, shieldAmount);
      applyFriendlyStatus(ally, effect);
      if (effect.reflect) ally.reflect = { amount: effect.reflect };
      if (effect.bonusArmor) ally.bonusArmor = { remaining: effect.statusSeconds ?? 4.5, amount: effect.bonusArmor };
    }
    if (hero.id === 'h00E') {
      for (const e of zoneEnemies) {
        if (distance(e, unit) <= 3.0) applyEnemyStatus(e, unit, 0, 'stun', 1.2, 1);
      }
    }
    affectedIds = recipients.map(ally => ally.id);
  } else {
    if (!target) return false;
    if (hero.id === 'h00H') {
      let snipeDmg = effectiveUnitAttack(unit) * 3.8;
      if (target.sunder || target.hp / target.maxHp < 0.35) {
        snipeDmg *= 1.75;
      }
      hurtEnemy(state, unit, target, snipeDmg);
      if (!state.enemies[target.id] || target.hp <= 0) {
        unit.energy = Math.min(100, (unit.energy ?? 0) + 70);
      }
      affectedIds = [target.id];
    } else {
      const hits = effect.shape === 'single' ? [target]
        : effect.shape === 'chain' ? chainTargets(target, zoneEnemies, effect.jumps ?? 4, effect.jumpRange ?? 6)
          : hero.id === 'h00C' ? zoneEnemies.filter(e => distance(e, unit) <= 4.2)
            : kind === 'cleave' && hero.tier === 2 ? zoneEnemies.filter(enemy => {
              if (distance(target, unit) > (effect.radius ?? 4.5)) return distance(enemy, target) <= (effect.radius ?? 4.5);
              const forwardX = target.x - unit.x, forwardZ = target.z - unit.z;
              const hitX = enemy.x - unit.x, hitZ = enemy.z - unit.z;
              const forwardLength = Math.hypot(forwardX, forwardZ) || 1;
              const hitLength = Math.hypot(hitX, hitZ);
              return hitLength <= (effect.radius ?? 4.5) && (hitLength < .1 ||
                (forwardX * hitX + forwardZ * hitZ) / (forwardLength * hitLength) >= .25);
            })
            : zoneEnemies.filter(e => distance(e, target) <= (effect.radius ?? 3.5));
      affectedIds = hits.map(enemy => enemy.id);

      let burnTriggered = false;
      if (hero.id === 'h00B') {
        burnTriggered = hits.some(e => Boolean(e.burn));
      }

      for (const enemy of hits) {
        hurtEnemy(state, unit, enemy, power);
        if (state.enemies[enemy.id]) {
          if (effect.status) applyEnemyStatus(enemy, unit, power, effect.status, effect.statusSeconds ?? 0, effect.statusStrength ?? 0);
          if (effect.secondary) applyEnemyStatus(enemy, unit, power, effect.secondary.status, effect.secondary.seconds, effect.secondary.strength);
          if (hero.id === 'h00C') {
            enemy.burn = { remaining: 4.0, damagePerSecond: effectiveUnitAttack(unit) * 1.5 / 4, casterId: unit.id };
            applyEnemyStatus(enemy, unit, 0, 'sunder', 4.0, 4);
          }
          if (hero.id === 'h00I') {
            enemy.soulLink = { remaining: 4.0, group: affectedIds, sharePercent: 0.30 };
            applyEnemyStatus(enemy, unit, 0, 'slow', 4.0, 0.50);
          }
          if (effect.sunder) applyEnemyStatus(enemy, unit, 0, 'sunder', effect.statusSeconds ?? 3, effect.sunder);
          if (effect.knockback) knockEnemyBack(state, enemy, effect.knockback);
          if (effect.pull) {
            const dx = target.x - enemy.x, dz = target.z - enemy.z, length = Math.hypot(dx, dz);
            if (length > .01) { enemy.x += dx / length * Math.min(length, effect.pull); enemy.z += dz / length * Math.min(length, effect.pull); }
          }
        }
      }

      if (hero.id === 'h00B' && burnTriggered) {
        for (const enemy of hits) {
          if (state.enemies[enemy.id]) {
            hurtEnemy(state, unit, enemy, effectiveUnitAttack(unit) * 1.5);
            enemy.burn = { remaining: 3.0, damagePerSecond: effectiveUnitAttack(unit) * 0.25, casterId: unit.id };
          }
        }
      }

      if (effect.groundBurnSeconds) (state.groundEffects ??= []).push({ x: target.x, z: target.z, zone: unit.zone,
        radius: effect.radius ?? 4.2, remaining: effect.groundBurnSeconds, damagePerSecond: effectiveUnitAttack(unit) * .8, casterId: unit.id });

      if (hero.id === 'h03P') {
        const plantId = `plant-${++state.serial}`;
        state.units[plantId] = {
          id: plantId,
          heroId: 'summon_plant',
          owner: unit.owner,
          rank: 1,
          slot: -99,
          x: target.x,
          z: target.z,
          hp: unit.hp * 1.5,
          maxHp: unit.hp * 1.5,
          attack: 0,
          armor: 8,
          range: 2.0,
          cooldown: 0,
          abilityCooldown: 0,
          target: null,
          destination: null,
          savedPosition: null,
          stopped: true,
          orderMode: 'hold',
          equipment: [0, 0, 0],
          deaths: 0,
          respawn: 0,
          shield: 0,
          zone: unit.zone,
          kills: 0,
          block: 3,
          summonDuration: 6.0,
        };
      }
    }
  }

  if (!deferred && !isRage) unit.abilityCooldown = hero.ability.cooldown / (1 + .1 * unit.equipment[2]);
  event(state, { kind: 'ability', source: unit.id, target: kind === 'heal' || kind === 'shield' ? affectedIds[0] : target?.id,
    targets: affectedIds, x: kind === 'heal' || kind === 'shield' ? unit.x : target?.x ?? unit.x,
    z: kind === 'heal' || kind === 'shield' ? unit.z : target?.z ?? unit.z,
    ability: kind, skillId: hero.ability.id, value: power });
  if (target && state.enemies[target.id]) {
    triggerFollowUp(state, unit, target, 'skill', (u, e, d, p) => hurtEnemy(state, u, e, d, p));
  }
  return true;
}
function chainTargets(first: Enemy, candidates: Enemy[], limit: number, jumpRange: number): Enemy[] {
  const hits = [first];
  while (hits.length < limit) {
    const previous = hits[hits.length - 1];
    const next = candidates.filter(enemy => !hits.includes(enemy) && distance(enemy, previous) <= jumpRange)
      .sort((a, b) => distance(a, previous) - distance(b, previous))[0];
    if (!next) break;
    hits.push(next);
  }
  return hits;
}
function moveHordeEnemy(enemy: Enemy, goal: { x: number; z: number }, amount: number,
  steer: (enemy: Enemy, goal: { x: number; z: number }) => { x: number; z: number }): boolean {
  const gap = distance(enemy, goal);
  if (gap <= amount || gap < .001) { enemy.x = goal.x; enemy.z = goal.z; return true; }
  const heading = steer(enemy, goal);
  enemy.x += heading.x * amount;
  enemy.z += heading.z * amount;
  return distance(enemy, goal) < .15;
}

export function combatStep(state: GameState, dt: number): void {
  stepPanguRifts(state, dt, (u, e, d) => hurtEnemy(state, u, e, d, 0, false, true));
  passiveTraits(state, dt);
  stepOrbitAuras(state, dt, (u, e, d, p) => hurtEnemy(state, u, e, d, p));
  stepBoomerangs(state, dt, (u, e, d, p) => hurtEnemy(state, u, e, d, p));
  for (const unit of Object.values(state.units)) {
    unit.cooldown = Math.max(0, unit.cooldown - dt); unit.abilityCooldown = Math.max(0, unit.abilityCooldown - dt);
    unit.stun = Math.max(0, (unit.stun ?? 0) - dt);
    if (unit.ward) { unit.ward.remaining -= dt; if (unit.ward.remaining <= 0) unit.ward = undefined; }
    if (unit.haste) { unit.haste.remaining -= dt; if (unit.haste.remaining <= 0) unit.haste = undefined; }
    if (unit.empower) { unit.empower.remaining -= dt; if (unit.empower.remaining <= 0) unit.empower = undefined; }
    if (unit.bonusArmor) { unit.bonusArmor.remaining -= dt; if (unit.bonusArmor.remaining <= 0) unit.bonusArmor = undefined; }
    if (unit.reflect && unit.shield <= 0) unit.reflect = undefined;
    if (unit.mistShield) {
      unit.mistShield.remaining -= dt;
      if (unit.mistShield.remaining <= 0) { unit.shield = Math.max(0, unit.shield - unit.mistShield.amount); unit.mistShield = undefined; }
    }
    if (unit.frostShield) {
      unit.frostShield.remaining -= dt;
      if (unit.frostShield.remaining <= 0) { unit.shield = Math.max(0, unit.shield - unit.frostShield.amount); unit.frostShield = undefined; }
    }
    if (unit.berserk) {
      unit.berserk.remaining -= dt;
      if (unit.berserk.remaining <= 0) unit.berserk = undefined;
    }
    if (unit.summonDuration !== undefined) {
      unit.summonDuration -= dt;
      if (unit.summonDuration <= 0) {
        delete state.units[unit.id];
        continue;
      }
    }
    if (unit.heroId === 'summon_plant') {
      for (const e of Object.values(state.enemies)) {
        if (e.zone === unit.zone && distance(e, unit) <= 3.0) {
          applyEnemyStatus(e, unit, 0, 'sunder', 1.0, 2);
        }
      }
      continue;
    }
    if (unit.respawn > 0) {
      unit.respawn -= dt;
      if (unit.respawn <= 0) {
        unit.respawn = 0; unit.hp = unit.maxHp; unit.zone = 0;
        Object.assign(unit, unit.savedPosition ?? slotPosition(state, unit.owner, Math.max(0, unit.slot)));
        unit.guardPosition = { x: unit.x, z: unit.z };
      }
    }
    if (unit.pendingAbility) {
      const pending = unit.pendingAbility;
      pending.remaining -= dt;
      if (pending.remaining <= 1e-6) {
        unit.pendingAbility = undefined;
        if (isDeployed(unit) && unit.zone === pending.zone) resolveAbility(state, unit, pending.targetId, true, pending);
      }
      continue;
    }
    if (!isDeployed(unit)) continue;
    const hero = HERO_BY_ID[unit.heroId], bonus = bonuses(state, unit.owner);
    unit.hp = Math.min(unit.maxHp, unit.hp + bonus.regen * unit.maxHp * dt);
    if ((unit.stun ?? 0) > 0) continue;
    const mode = unit.orderMode ?? (unit.stopped ? 'hold' : unit.destination ? 'move' : 'auto');
    if (unit.stopped && !unit.orderMode) continue;
    if (mode === 'move' && unit.destination) {
      if (walkHeroWithCollision(unit, unit.destination, hero.speed * dt, Object.values(state.enemies))) { unit.guardPosition = unit.destination; unit.destination = null; unit.orderMode = 'auto'; }
      continue;
    }
    if (mode === 'attack-move' && !unit.destination) unit.orderMode = 'auto';
    let target = unit.target ? state.enemies[unit.target] : undefined;
    const guard = unit.guardPosition ?? slotPosition(state, unit.owner, Math.max(0, unit.slot));
    if (target && target.zone !== unit.zone) target = undefined;
    if (mode === 'auto' && target && (distance(target, guard) > 18 || distance(unit, guard) > 18)) target = undefined;
    if (mode === 'attack-move' && target && unit.engageAt && distance(unit, unit.engageAt) > 12) target = undefined;
    if (!target && mode === 'attack') { unit.orderMode = 'auto'; unit.target = null; }
    if (!target && mode !== 'attack') {
      const radius = mode === 'hold' ? unit.range : mode === 'attack-move' ? 10 : 19;
      const candidates = Object.values(state.enemies).filter(e => e.zone === unit.zone && distance(e, unit) <= radius && (mode !== 'auto' || distance(e, guard) <= 18));
      if (unit.heroId === 'h001') {
        candidates.sort((a, b) => b.hp - a.hp || distance(a, unit) - distance(b, unit));
      } else {
        candidates.sort((a, b) => distance(a, unit) - distance(b, unit));
      }
      target = candidates[0];
      unit.target = target?.id ?? null;
      if (target && mode === 'attack-move') unit.engageAt = { x: unit.x, z: unit.z };
      if (!target) unit.engageAt = null;
    }
    if (unit.heroId === 'h001' && mode === 'auto' && target) {
      const inRangeEnemies = Object.values(state.enemies).filter(e => e.zone === unit.zone && distance(e, unit) <= unit.range);
      if (inRangeEnemies.length > 1) {
        inRangeEnemies.sort((a, b) => b.hp - a.hp);
        if (inRangeEnemies[0].id !== target.id && inRangeEnemies[0].hp > target.hp) {
          target = inRangeEnemies[0];
          unit.target = target.id;
        }
      }
    }
    if (!target && mode === 'attack-move' && unit.destination) {
      if (walkHeroWithCollision(unit, unit.destination, hero.speed * dt, Object.values(state.enemies))) { unit.guardPosition = unit.destination; unit.destination = null; unit.orderMode = 'auto'; }
      continue;
    }
    if (!target && mode === 'auto' && distance(unit, guard) > 2) { walk(unit, guard, hero.speed * dt); continue; }
    if (target && distance(unit, target) > unit.range) {
      if (mode === 'hold') { unit.target = null; continue; }
      let dash = 1;
      if (unit.heroId === 'h008') {
        if (distance(unit, target) > 3.0 || unit.comboTarget !== target.id) {
          unit.comboCount = 1;
          unit.comboTarget = target.id;
        }
        if (unit.comboCount === 1) dash = 3.0;
      }
      walk(unit, target, hero.speed * dt * dash);
      continue;
    }
    if (unit.heroId === 'h008' && unit.comboCount === 1) {
      unit.comboCount = 0;
      for (const nearby of Object.values(state.enemies)) {
        if (nearby.zone === unit.zone && distance(nearby, unit) <= 2.5) {
          applyEnemyStatus(nearby, unit, 0, 'slow', 2.5, 0.35);
        }
      }
      unit.ward = { remaining: 2.5, reduction: 0.25 };
      event(state, { kind: 'trait', source: unit.id, target: target?.id, x: unit.x, z: unit.z, skillId: 'burrow-earthquake', traitType: 'nth_strike' });
    }
    // Manual Q and automatic casting share one authoritative cooldown / rage check.
    const isRage = unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit';
    const canCast = isRage ? (unit.energy ?? 0) >= (unit.maxEnergy ?? 100) : unit.abilityCooldown <= 0;
    if (hero.ability && canCast && (target || hero.ability.kind === 'heal' || hero.ability.kind === 'shield')) {
      castAbility(state, unit, hero.id === 'h00G' ? undefined : target?.id);
    }
    if (unit.pendingAbility) continue;
    if (target && state.enemies[target.id] && unit.cooldown <= 0) {
      basicAttack(state, unit, target, (enemy, damage, penetration, source) => hurtEnemy(state, source ?? unit, enemy, damage, penetration));
      unit.cooldown = attackInterval(state, unit);
    }
  }
  const guardianBlocks = new Map<string, number>();
  const meleeTargetMap = new Map<string, string[]>();
  const steerCrowd = crowdMovement(Object.values(state.enemies));
  const deployedUnits = Object.values(state.units).filter(isDeployed);
  for (const enemy of Object.values(state.enemies)) {
    if (!state.enemies[enemy.id]) continue;
    if (enemy.armorBuff) {
      enemy.armorBuff.remaining -= dt;
      if (enemy.armorBuff.remaining <= 0) enemy.armorBuff = undefined;
    }
    if (enemy.monsterId === 'b001' && enemy.zone === 0) {
      const difficulty = DIFFICULTIES.find(entry => entry.id === state.difficulty)!;
      const engaged = enemy.z >= -6 || deployedUnits.some(unit => unit.zone === 0 && distance(unit, enemy) <= 12);
      if (engaged) {
        enemy.skillCooldown = (enemy.skillCooldown ?? 10) - dt;
        enemy.quakeCooldown = (enemy.quakeCooldown ?? 12) - dt;
      }
      if (engaged && (enemy.skillCooldown ?? 10) <= .8 && !enemy.shieldWarning) {
        enemy.shieldWarning = true;
        event(state, { kind: 'cast', source: enemy.id, x: enemy.x, z: enemy.z,
          skillId: 'boss-stone-shield-windup', windup: .8 });
      }
      if (engaged && (enemy.quakeCooldown ?? 12) <= 1 && !enemy.quakeWarning) {
        enemy.quakeWarning = true;
        event(state, { kind: 'cast', source: enemy.id, x: enemy.x, z: enemy.z,
          skillId: 'boss-earthquake-windup', windup: 1 });
      }
      if (engaged && (enemy.skillCooldown ?? 10) <= 0) {
        enemy.skillCooldown = 10;
        enemy.shieldWarning = false;
        enemy.shield = 2000;
        const allies = Object.values(state.enemies).filter(ally => ally.owner === enemy.owner && ally.zone === 0
          && ally.id !== enemy.id && ally.monsterId !== 'b001');
        for (const ally of allies) ally.armorBuff = { remaining: 5, amount: 4 };
        event(state, { kind: 'ability', source: enemy.id, x: enemy.x, z: enemy.z,
          skillId: 'boss-stone-shield', value: 2000 });
      }
      if (engaged && (enemy.quakeCooldown ?? 12) <= 0) {
        enemy.quakeCooldown = 12;
        enemy.quakeWarning = false;
        const hits = Object.values(state.units).filter(unit => isDeployed(unit) && unit.zone === 0 && distance(unit, enemy) <= 4);
        for (const unit of hits) {
          hurtUnit(state, unit, 45 * difficulty.attack, enemy);
          if (unit.hp > 0) {
            unit.stun = Math.max(unit.stun ?? 0, 1);
            const dx = unit.x - enemy.x, dz = unit.z - enemy.z, length = Math.hypot(dx, dz) || 1;
            unit.x += dx / length * .6; unit.z += dz / length * .6;
          }
        }
        event(state, { kind: 'ability', source: enemy.id, x: enemy.x, z: enemy.z,
          targets: hits.map(unit => unit.id), skillId: 'boss-earthquake', value: 45 });
        const players = Object.keys(state.players);
        const route = enemyRoute(players.length, Math.max(0, players.indexOf(enemy.owner)));
        for (let i = 0; i < 8; i++) {
          const id = nextId(state, 'e'), hp = 480 * difficulty.health;
          state.enemies[id] = { id, owner: enemy.owner, name: 'Thanh Lang Tiểu Yêu', monsterId: 'm001', kind: 'melee',
            zone: 0, x: route[0].x + (i % 4 - 1.5) * 1.4, z: route[0].z + Math.floor(i / 4) * 1.3,
            hp, maxHp: hp, attack: 6 * difficulty.attack, armor: 2, speed: 1.5, cooldown: 0, attackRange: 1.5,
            attackInterval: 1.4, target: null, leak: 1, slow: 0, pathIndex: 1 };
        }
      }
    }
    if (enemy.burn) {
      const caster = state.units[enemy.burn.casterId];
      if (caster) hurtEnemy(state, caster, enemy, enemy.burn.damagePerSecond * dt, caster.heroId === 'h00C' ? 999 : 0);
      enemy.burn.remaining -= dt;
      if (enemy.burn.remaining <= 0) enemy.burn = undefined;
      if (!state.enemies[enemy.id]) continue;
    }
    if (enemy.poison) {
      const caster = state.units[enemy.poison.casterId];
      if (caster) hurtEnemy(state, caster, enemy, enemy.poison.damagePerSecond * dt, 999);
      enemy.poison.remaining -= dt;
      if (enemy.poison.remaining <= 0) enemy.poison = undefined;
      if (!state.enemies[enemy.id]) continue;
    }
    if (enemy.bleed) {
      enemy.bleed.remaining -= dt;
      if (enemy.bleed.remaining <= 0) enemy.bleed = undefined;
    }
    if (enemy.soulLink) {
      enemy.soulLink.remaining -= dt;
      if (enemy.soulLink.remaining <= 0) enemy.soulLink = undefined;
    }
    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    enemy.stun = Math.max(0, (enemy.stun ?? 0) - dt);
    enemy.root = Math.max(0, (enemy.root ?? 0) - dt);
    if (enemy.sunder) { enemy.sunder.remaining -= dt; if (enemy.sunder.remaining <= 0) enemy.sunder = undefined; }
    if (enemy.attackSlow) { enemy.attackSlow.remaining -= dt; if (enemy.attackSlow.remaining <= 0) enemy.attackSlow = undefined; }
    if (enemy.attackWeak) { enemy.attackWeak.remaining -= dt; if (enemy.attackWeak.remaining <= 0) enemy.attackWeak = undefined; }
    if (enemy.slows) {
      enemy.slows = enemy.slows.filter(slow => (slow.remaining -= dt) > 0);
      enemy.slow = Math.max(0, ...enemy.slows.map(slow => slow.remaining));
      enemy.slowStrength = enemy.slows.length ? Math.max(...enemy.slows.map(slow => slow.strength)) : undefined;
      if (!enemy.slows.length) enemy.slows = undefined;
    } else {
      enemy.slow = Math.max(0, enemy.slow - dt);
      if (!enemy.slow) enemy.slowStrength = undefined;
    }
    const horde = state.phase === 'combat' && enemy.zone === 0;
    const range = enemy.attackRange ?? (enemy.kind === 'melee' ? 1.8 : 5);
    const nearby = deployedUnits.filter(u => u.zone === enemy.zone && distance(u, enemy) <= Math.max(range, (u.block ?? 0) > 0 ? 2.2 : range));
    nearby.sort((a, b) => distance(a, enemy) - distance(b, enemy));
    const blockCap = (unit: Unit) => state.phase === 'combat'
      ? HERO_BY_ID[unit.heroId]?.role === 'guardian' ? Math.max(12, unit.block ?? 0)
        : HERO_BY_ID[unit.heroId]?.role === 'warrior' ? Math.max(8, unit.block ?? 0) : 0
      : unit.block ?? 0;
    const guardian = nearby.find(u => {
      const cap = blockCap(u);
      return cap > 0 && (guardianBlocks.get(u.id) ?? 0) < cap;
    });
    const target = guardian ?? nearby.find(u => blockCap(u) === 0) ?? (horde ? nearby[0] : undefined);
    if (guardian) guardianBlocks.set(guardian.id, (guardianBlocks.get(guardian.id) ?? 0) + 1);
    const previousTarget = state.units[enemy.target ?? ''];
    enemy.target = target?.id ?? null;
    if (target && (!horde || distance(enemy, target) <= range)) {
      if (enemy.cooldown <= 0) {
        if ((enemy.stun ?? 0) > 0) continue;
        const damage = enemy.attack * (1 - (enemy.attackWeak?.strength ?? 0));
        hurtUnit(state, target, damage, enemy); enemy.cooldown = (enemy.attackInterval ?? (enemy.kind === 'boss' ? 1.4 : 1.2)) / (1 - (enemy.attackSlow?.strength ?? 0));
        if (enemy.lifestealOnHit && state.enemies[enemy.id]) enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.lifestealOnHit);
        if (enemy.kind === 'boss') for (const ally of nearby.filter(u => u !== target)) hurtUnit(state, ally, damage * .35, enemy);
        event(state, { kind: 'attack', source: enemy.id, target: target.id, x: target.x, z: target.z,
          value: damage, skillId: enemy.monsterId ? `monster-attack-${enemy.monsterId}` : undefined });
      }
    } else if ((enemy.stun ?? 0) > 0 || (enemy.root ?? 0) > 0) continue;
    else if (horde) {
      const aggro = enemy.kind === 'ranged' ? 10 : 8;
      const remembered = previousTarget && isDeployed(previousTarget) && previousTarget.zone === 0
        && distance(previousTarget, enemy) <= aggro + 2 ? previousTarget : undefined;
      const prey = target ?? remembered ?? deployedUnits.filter(unit => unit.zone === 0 && distance(unit, enemy) <= aggro)
        .sort((a, b) => distance(a, enemy) - distance(b, enemy))[0];
      const pace = enemy.speed * dt * (1 - (enemy.slow ? enemy.slowStrength ?? .5 : 0));
      if (prey) {
        enemy.target = prey.id;
        let goal: { x: number; z: number } = prey;
        let approach = Math.max(0, distance(enemy, prey) - range * .9);
        if (enemy.kind === 'melee') {
          let list = meleeTargetMap.get(prey.id);
          if (!list) {
            list = [enemy.id];
            meleeTargetMap.set(prey.id, list);
          } else if (!list.includes(enemy.id)) {
            list.push(enemy.id);
          }
          const slotIdx = list.indexOf(enemy.id);
          goal = surroundSlotGoal(enemy, prey, slotIdx >= 0 ? slotIdx : 0, list.length, range);
          approach = Math.max(0, distance(enemy, goal));
        }
        if (approach > .05) moveHordeEnemy(enemy, goal, Math.min(pace, approach), steerCrowd);
      } else {
        const players = Object.keys(state.players);
        const route = enemyRoute(players.length, Math.max(0, players.indexOf(enemy.owner)));
        let remaining = pace, waypoint = enemy.pathIndex ?? 1;
        while (remaining > .0001 && waypoint < route.length) {
          const gap = distance(enemy, route[waypoint]);
          if (gap < .15) { waypoint++; continue; }
          const step = Math.min(remaining, gap);
          const arrived = moveHordeEnemy(enemy, route[waypoint], step, steerCrowd);
          remaining -= step;
          if (arrived) waypoint++;
          else break;
        }
        enemy.pathIndex = waypoint;
        if (waypoint >= route.length) { state.baseHp = Math.max(0, state.baseHp - enemy.leak); delete state.enemies[enemy.id]; }
      }
    }
    else if (enemy.zone) {
      const prey = Object.values(state.units).filter(u => isDeployed(u) && u.zone === enemy.zone).sort((a, b) => distance(a, enemy) - distance(b, enemy))[0];
      if (prey) walk(enemy, prey, enemy.speed * dt * (1 - (enemy.slow ? enemy.slowStrength ?? .5 : 0)));
    } else {
      const players = Object.keys(state.players);
      const route = enemyRoute(players.length, Math.max(0, players.indexOf(enemy.owner)));
      let remaining = enemy.speed * dt * (1 - (enemy.slow ? enemy.slowStrength ?? .5 : 0));
      let waypoint = enemy.pathIndex ?? 1;
      while (remaining > 0 && waypoint < route.length) {
        const length = distance(enemy, route[waypoint]);
        if (length < .001) { waypoint++; continue; }
        const step = Math.min(remaining, length);
        if (step < .0001) break;
        if (walk(enemy, route[waypoint], step)) waypoint++;
        remaining -= step;
      }
      enemy.pathIndex = waypoint;
      if (waypoint >= route.length) { state.baseHp = Math.max(0, state.baseHp - enemy.leak); delete state.enemies[enemy.id]; }
    }
  }
  if (state.phase === 'combat') {
    resolveSoftCollisions(Object.values(state.enemies));
  }
  if (state.groundEffects?.length) {
    for (const ground of state.groundEffects) {
      if (ground.kind === 'pangu-rift') continue;
      const caster = state.units[ground.casterId];
      if (caster) for (const enemy of Object.values(state.enemies)) {
        if (enemy.zone === ground.zone && distance(enemy, ground) <= ground.radius) hurtEnemy(state, caster, enemy, ground.damagePerSecond * dt);
      }
      ground.remaining -= dt;
    }
    state.groundEffects = state.groundEffects.filter(ground => ground.remaining > 0);
  }
}
