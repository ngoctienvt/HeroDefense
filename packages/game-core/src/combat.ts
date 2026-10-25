import { HERO_BY_ID } from '../../../content/catalog.js';
import type { AbilityEffect, Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { distance, event, isDeployed, slotPosition } from './rules.js';
import { attackInterval, bonuses, effectiveUnitAttack, skillDamageMultiplier } from './stats.js';
import { applyAbilityStatus, applyEnemyStatus, effectiveEnemyArmor, knockEnemyBack } from './combat-status.js';
import { basicAttack, passiveTraits } from './combat-traits.js';
import { carryDamageTakenMultiplier } from './carry-passive.js';
import { stepBoomerangs, stepOrbitAuras, triggerFollowUp } from './attack-geometry.js';
import { contactDistance, resolveSoftCollisions, resolveUnitCollisions } from './crowd-movement.js';
import { walkUnitWithPathing } from './unit-pathing.js';
import { enemyAttackReach, stepEnemyBehavior, type EnemyTickContext } from './enemy-behavior.js';
import { buildRings } from './enemy-engagement.js';
import { stepEnemySkills } from './enemy-skill-runner.js';
import { recordEnemyDeath, recordHeroDeath } from './combat-ttk-telemetry.js';
import { SpatialGrid } from './spatial-grid.js';
import { PANGU } from '../../../content/pangu-design.js';
import { XINGTIAN } from '../../../content/xingtian-design.js';
import { DOUZHAN } from '../../../content/douzhan-design.js';
import { KIMTHIEN } from '../../../content/kimthien-design.js';
import { HANGNGA } from '../../../content/hangnga-design.js';
import { NUWA } from '../../../content/nuwa-design.js';
import { zoneControlled } from './crowd-control.js';
import { hasteAllyMax, healAlly, supportAmount } from './ally-scaled-support.js';
import { THAIBACH } from '../../../content/thaibach-design.js';
import { thaibachAbility, thaibachHasWork, tryStarGuard } from './thaibach-combat.js';
import { HIENVIEN } from '../../../content/hienvien-design.js';
import { SHENNONG } from '../../../content/shennong-design.js';
import { CHUCLONG } from '../../../content/chuclong-design.js';
import { FUXI } from '../../../content/fuxi-design.js';
import { TUONG_THAN } from '../../../content/tuong-than-design.js';
import { PHUONG_HOANG } from '../../../content/phuong-hoang-design.js';
import { HAUNGHE } from '../../../content/hau-nghe-design.js';
import { KIMSI } from '../../../content/kimsi-design.js';
import { KHUONGTU } from '../../../content/khuongtu-nha-design.js';
import { CHUCDUNG } from '../../../content/chucdung-design.js';
import { CONGCONG } from '../../../content/congcong-design.js';
import { panguAbility, panguDirection, stepPanguRifts } from './pangu-combat.js';
import { xingtianAbility } from './xingtian-combat.js';
import { douzhanAbility, stepDouzhanClone } from './douzhan-combat.js';
import { kimthienAbility, stepKimthienBowls } from './kimthien-combat.js';
import { hangngaAbility } from './hangnga-combat.js';
import { nuwaAbility } from './nuwa-combat.js';
import { hienvienAbility } from './hienvien-combat.js';
import { shennongAbility, stepShennongGrove } from './shennong-combat.js';
import { chuclongAbility, stepChuclongPhases } from './chuclong-combat.js';
import { fuxiAbility, stepFuxiBagua } from './fuxi-combat.js';
import { countBloodDeath, stepBloodSea, stepBloodSoldier, tuongThanAbility } from './tuong-than-combat.js';
import { canPhoenixRebirth, phuongHoangAbility, startPhoenixEgg, stepPhoenixCarpet, stepPhoenixEggs } from './phuong-hoang-combat.js';
import { haungheAbility } from './hau-nghe-combat.js';
import { burstTier3WaterShield, isTier3Hero, resolveTier3Ability } from './tier3-combat.js';
import { startTierBarrage, stepTierBarrages } from './tier-skill-pulses.js';
import { isTier4Hero, resolveTier4Ability, stepMonkeyClone } from './tier4-combat.js';
import { kimsiAbility } from './kimsi-combat.js';
import { khuongtuAbility, stepPhongThan } from './khuongtu-nha-combat.js';
import { chucdungAbility, stepChucdungGround } from './chucdung-combat.js';
import { congcongAbility, stepCongcongAura } from './congcong-combat.js';
import { tayvuongmauAbility } from './tayvuongmau-combat.js';
import { lucnhiAbility, stepLucnhiAssault } from './lucnhi-combat.js';
import { TRUONG_DAO_LANG as BEIDOU } from '../../../content/truong-dao-lang-design.js';
import { stepTruongBolts, triggerTruongBlessing, truongAbility } from './truong-dao-lang-combat.js';
import { NHIEN_DANG, BO_DE, DE_TUAN, NHU_LAI, NGUYEN_THUY } from '../../../content/new-divine-design.js';
import { bodhiAbility, stepLanternAura, lanternAbility } from './divine-support-combat.js';
import { deTuanAbility, nguyenThuyAbility, nhuLaiAbility, stepSolarAura } from './divine-god-combat.js';

export function hurtEnemy(state: GameState, unit: Unit, enemy: Enemy, damage: number, penetration = 0, isSoulLinkShare = false, trueDamage = false): void {
  if (!state.enemies[enemy.id]) return;
  if (enemy.bleed && !isSoulLinkShare && !trueDamage) damage *= (1 + enemy.bleed.bonusDamage);
  if (enemy.pureLand) damage *= 1 + enemy.pureLand.bonusDamage;
  const armor = trueDamage ? 0 : Math.max(0, effectiveEnemyArmor(enemy) - penetration
    - (isSoulLinkShare ? 0 : effectiveEnemyArmor(enemy) * (unit.empower?.armorPierce ?? 0)));
  const marked = !trueDamage && !isSoulLinkShare && enemy.primordialMark?.owner === unit.owner
    && enemy.primordialMark.casterId !== unit.id
    ? damage * enemy.primordialMark.bonus : 0;
  const actual = Math.max(.01, damage * 100 / (100 + armor * 5) + marked);
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
    recordEnemyDeath(state, enemy);
    delete state.enemies[enemy.id]; unit.kills++;
    state.players[unit.owner].kills++;
    event(state, { kind: 'death', target: enemy.id, x: enemy.x, z: enemy.z });
    countBloodDeath(state, enemy.zone, enemy);
    const burnCaster = state.units[enemy.burn?.casterId ?? ''];
    if (burnCaster?.heroId === 'h00N') {
      burnCaster.tierSoulCount = (burnCaster.tierSoulCount ?? 0) + 1;
      if (burnCaster.tierSoulCount >= 8) {
        burnCaster.tierSoulCount = 0;
        const crowd = Object.values(state.enemies).filter(other => other.zone === enemy.zone)
          .sort((a, b) => Object.values(state.enemies).filter(other => other.zone === enemy.zone && distance(other, b) <= 2.2).length
            - Object.values(state.enemies).filter(other => other.zone === enemy.zone && distance(other, a) <= 2.2).length)[0];
        const destination = crowd ?? enemy;
        startTierBarrage(state, burnCaster, 'h00N', destination, 2.2, 1, .5, effectiveUnitAttack(burnCaster) * 1.8);
        event(state, { kind: 'trait', source: burnCaster.id, x: destination.x, z: destination.z,
          zone: enemy.zone, skillId: 'tier3-tier4-summon-h00N' });
      }
    }
    if (burnCaster?.heroId === CHUCDUNG.id) {
      const nearby = Object.values(state.enemies).filter(other => other.zone === enemy.zone
        && distance(other, enemy) <= CHUCDUNG.deathExplosionRadius);
      event(state, { kind: 'trait', source: burnCaster.id, target: enemy.id,
        targets: nearby.map(other => other.id), x: enemy.x, z: enemy.z,
        zone: enemy.zone, skillId: 'burst-h01H', value: effectiveUnitAttack(burnCaster) * CHUCDUNG.deathExplosionPower });
      for (const other of nearby) hurtAbilityEnemy(state, burnCaster, other,
        effectiveUnitAttack(burnCaster) * CHUCDUNG.deathExplosionPower);
    }
    if (burnCaster?.heroId === 'h003') {
      event(state, { kind: 'trait', source: burnCaster.id, x: enemy.x, z: enemy.z,
        ability: 'nova', skillId: 'burst-h003', value: 35 });
      for (const nearby of Object.values(state.enemies)) {
        if (nearby.zone === enemy.zone && distance(nearby, enemy) <= 2) hurtEnemy(state, burnCaster, nearby, 35);
      }
    }
  }
}
function hurtAbilityEnemy(state: GameState, unit: Unit, enemy: Enemy, damage: number,
  penetration = 0, trueDamage = false): void {
  hurtEnemy(state, unit, enemy, damage * skillDamageMultiplier(state, unit), penetration, false, trueDamage);
}
function hasBuddhaAura(state: GameState, owner: string): boolean {
  return Object.values(state.units).some(ally => ally.owner === owner
    && ally.heroId === NHU_LAI.id && isDeployed(ally));
}
export function hurtUnit(state: GameState, unit: Unit, damage: number, attacker?: Enemy): void {
  if (unit.heroId === PANGU.id && unit.pendingAbility) return;
  if (unit.phoenixEgg) return;
  if ((unit.divineImmortal ?? 0) > 0) return;
  if (unit.heroId === PANGU.id) unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + 5);
  if (unit.energyType === 'rage_on_hit') {
    const gain = unit.heroId === 'h009' ? 7 : unit.heroId === CONGCONG.id ? CONGCONG.rageOnHit
      : unit.heroId === 'h03S' || unit.heroId === 'h03T' ? 7 : 6;
    unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + gain);
  }
  if (unit.heroId === 'h00P') unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + 5);
  if (unit.heroId === XINGTIAN.id)
    unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + XINGTIAN.rageOnHit);
  if (unit.heroId === TUONG_THAN.id && !unit.summonKind)
    unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + TUONG_THAN.rageOnHit);
  if (unit.heroId === NHIEN_DANG.id)
    unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + 1);
  const commandingGuardian = (unit.block ?? 0) > 0 && Object.values(state.units).some(ally =>
    ally.owner === unit.owner && ally.zone === unit.zone && ally.heroId === 'h00W'
    && isDeployed(ally) && distance(ally, unit) <= 8);
  const armor = Math.max(0, unit.armor + (unit.bonusArmor?.amount ?? 0) + (commandingGuardian ? 8 : 0));
  const buddhaAura = hasBuddhaAura(state, unit.owner);
  let reduced = Math.max(1, damage * 100 / (100 + armor * 5) * (1 - (unit.ward?.reduction ?? 0))
    * (buddhaAura ? 1 - NHU_LAI.auraReduction : 1)
    * (commandingGuardian && attacker?.kind === 'boss' ? .85 : 1)
    * carryDamageTakenMultiplier(state, unit));
  if (unit.heroId === 'h007') reduced = Math.max(1, reduced - 5);
  const absorbed = Math.min(unit.shield, reduced); unit.shield -= absorbed; unit.hp -= reduced - absorbed;
  let trackedAbsorbed = absorbed;
  if (absorbed > 0 && unit.lanternShield) {
    const spent = Math.min(trackedAbsorbed, unit.lanternShield.amount);
    trackedAbsorbed -= spent;
    unit.lanternShield.amount -= spent;
    const lantern = state.units[unit.lanternShield.casterId];
    if (lantern && attacker && spent > 0) {
      for (const nearby of Object.values(state.enemies)) {
        if (nearby.zone === unit.zone && distance(nearby, attacker) <= 2.5)
          hurtEnemy(state, lantern, nearby, spent * NHIEN_DANG.reflect, 0, false, true);
      }
      event(state, { kind: 'trait', source: lantern.id, target: attacker.id,
        x: attacker.x, z: attacker.z, zone: attacker.zone, skillId: 'reflect-h03W', value: spent * NHIEN_DANG.reflect });
    }
  }
  if (unit.divineShield) {
    const spent = Math.min(trackedAbsorbed, unit.divineShield.amount);
    unit.divineShield.amount -= spent;
    trackedAbsorbed -= spent;
  }
  let tierAbsorbed = trackedAbsorbed;
  if (unit.tierShield) {
    const spent = Math.min(unit.tierShield.amount, tierAbsorbed);
    unit.tierShield.amount -= spent; tierAbsorbed -= spent;
  }
  for (const shield of [...(unit.tierGoldShields ?? [])].reverse()) {
    const spent = Math.min(shield.amount, tierAbsorbed);
    shield.amount -= spent; tierAbsorbed -= spent;
    if (tierAbsorbed <= 0) break;
  }
  for (const shield of [...(unit.nuwaShields ?? [])].reverse()) {
    const spent = Math.min(shield.amount, tierAbsorbed);
    shield.amount -= spent; tierAbsorbed -= spent;
    if (tierAbsorbed <= 0) break;
  }
  if (unit.mistShield) {
    const spent = Math.min(unit.mistShield.amount, tierAbsorbed);
    unit.mistShield.amount -= spent; tierAbsorbed -= spent;
  }
  if (unit.frostShield) {
    const spent = Math.min(unit.frostShield.amount, tierAbsorbed);
    unit.frostShield.amount -= spent; tierAbsorbed -= spent;
  }
  if (unit.tierImmortal && (unit.tierImmortal.remaining > 0 || unit.tierImmortal.activeRemaining > 0) && unit.hp <= 1) {
    unit.hp = 1;
    if (unit.tierImmortal.activeRemaining <= 0) {
      unit.tierImmortal.remaining = 0;
      unit.tierImmortal.activeRemaining = 2;
      event(state, { kind: 'trait', source: unit.id, x: unit.x, z: unit.z,
        zone: unit.zone, skillId: 'immortal-h03U' });
    }
  }
  if (unit.tierShield?.kind === 'water' && unit.tierShield.amount <= 0) {
    burstTier3WaterShield(state, unit, (enemy, amount) => hurtEnemy(state, unit, enemy, amount));
  }
  if (unit.berserk?.immortal) unit.hp = Math.max(XINGTIAN.minimumBerserkHp, unit.hp);
  if (unit.heroId === PHUONG_HOANG.id && unit.hp <= 0 && canPhoenixRebirth(unit)) {
    startPhoenixEgg(state, unit);
    return;
  }
  if (unit.hp <= 0 && tryStarGuard(state, unit)) return;
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
      // Presentation only: the golden bell rings out at Kim Tra (the client draws the 3.0 counter wave).
      event(state, { kind: 'trait', source: unit.id, target: attacker.id, x: unit.x, z: unit.z, zone: unit.zone,
        skillId: 'reflect-h009', value: damage * 0.5 });
    }
    if (unit.frostShield && unit.shield > 0) {
      attacker.attackSlow = { remaining: 2.0, strength: unit.frostShield.attackSlow };
    }
    if (absorbed > 0 && unit.reflect) hurtEnemy(state, unit, attacker, reduced * unit.reflect.amount, 999);
  }
  if (unit.hp <= 0) {
    recordHeroDeath(state, unit);
    unit.hp = 0; unit.deaths++;
    unit.waveDeaths = (unit.waveDeaths ?? 0) + 1;
    unit.respawn = 5 + unit.waveDeaths - 1;
    unit.destination = null; unit.target = null; unit.orderMode = 'auto'; unit.engageAt = null; unit.shield = 0; unit.ward = undefined; unit.haste = undefined; unit.critBlessing = undefined;
    unit.pendingAbility = undefined; unit.empower = undefined; unit.bonusArmor = undefined; unit.reflect = undefined; unit.mistShield = undefined; unit.frostShield = undefined; unit.berserk = undefined;
    unit.tierShield = undefined; unit.tierGoldShields = undefined; unit.nuwaShields = undefined; unit.tierBuff = undefined; unit.tierImmortal = undefined; unit.fuxiBlessing = undefined;
    unit.thunderBlessing = undefined; unit.bodhiBlessing = undefined; unit.lanternShield = undefined;
    unit.divineShield = undefined; unit.divineImmortal = undefined; unit.primordialBlessing = undefined;
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
const WINDUP_HEROES = new Set(['h015', 'h01B', 'h011', 'h012', 'h013', 'h016', 'h017', 'h018', 'h019', 'h01H', 'h01G', 'h01A', 'h01C', 'h01D', 'h01E', 'h01F', 'h01K', 'h03Y', 'h03Z', 'h041', 'h040', 'h03W', 'h03X', 'h01I', 'h01J', 'h014', 'h009', 'h00A', 'h00B', 'h00C', 'h00D', 'h00E', 'h00F', 'h00G', 'h00H', 'h00I', 'h03O', 'h03P']);
const WINDUP_SECONDS = .25;

export function castAbility(state: GameState, unit: Unit, targetId?: string): boolean {
  if (!isDeployed(unit) || unit.pendingAbility || unit.phoenixEgg) return false;
  const hero = HERO_BY_ID[unit.heroId];
  if (!hero.ability) return false;
  const isRage = unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit';
  if (isRage) {
    if ((unit.energy ?? 0) < (unit.maxEnergy ?? 100)) return false;
  } else {
    if (unit.abilityCooldown > 0) return false;
  }
  // Lobby has no simulation clock; keep its practice casts instantaneous.
  if ((!WINDUP_HEROES.has(hero.id) && !isTier3Hero(hero.id) && !isTier4Hero(hero.id)) || state.phase === 'lobby') return resolveAbility(state, unit, targetId);
  const effect = abilityEffect(hero.ability.kind, hero.ability.effect);
  const castReach = hero.id === XINGTIAN.id ? XINGTIAN.blastRadius
    : hero.id === DOUZHAN.id ? DOUZHAN.staffLength
      : hero.id === KIMSI.id ? KIMSI.stormRadius : unit.range + 5;
  const enemies = Object.values(state.enemies).filter(e => e.zone === unit.zone
    && (hero.id === HAUNGHE.id || hero.id === HIENVIEN.id || hero.id === CHUCLONG.id
      || distance(e, unit) <= castReach));
  const target = hero.id === CHUCLONG.id
    ? targetId ? enemies.find(enemy => enemy.id === targetId) : enemies.sort((a, b) => b.hp - a.hp)[0]
    : hero.id === HIENVIEN.id
    ? targetId ? enemies.find(enemy => enemy.id === targetId)
      : enemies.sort((a, b) => Number(b.kind === 'boss') - Number(a.kind === 'boss')
      || b.hp - a.hp || distance(a, unit) - distance(b, unit))[0]
    : hero.id === HAUNGHE.id
    ? enemies.sort((a, b) => b.hp - a.hp || distance(a, unit) - distance(b, unit))[0]
    : targetId ? enemies.find(e => e.id === targetId) : hero.id === 'h00G'
    ? enemies.sort((a, b) => enemies.filter(e => distance(e, b) <= 4.5).length - enemies.filter(e => distance(e, a) <= 4.5).length)[0]
    : hero.id === 'h00H'
      ? enemies.sort((a, b) => a.hp - b.hp)[0]
      : enemies.sort((a, b) => distance(a, unit) - distance(b, unit))[0];
  const allies = Object.values(state.units).filter(u => isDeployed(u) && u.zone === unit.zone
    && (effect.target === 'self' ? u.id === unit.id : distance(u, unit) <= (effect.radius ?? 12)));
  if (targetId && !target && hero.id !== NUWA.id) return false;
  if (hero.id === THAIBACH.id && !thaibachHasWork(state, unit)) return false;
  if (hero.ability.kind === 'heal' && !isTier3Hero(hero.id) && !isTier4Hero(hero.id)
    && hero.id !== BO_DE.id && hero.id !== THAIBACH.id && !allies.some(u => u.hp < u.maxHp) && effect.status !== 'haste' && !effect.overhealShield) return false;
  if (hero.ability.kind === 'shield' && !allies.length) return false;
  if (hero.ability.kind !== 'heal' && hero.ability.kind !== 'shield' && hero.id !== NUWA.id && !target) return false;
  if (isRage) {
    unit.energy = 0;
  } else {
    unit.abilityCooldown = hero.ability.cooldown / (1 + .1 * unit.equipment[2]);
  }
  const windup = hero.id === PANGU.id ? PANGU.windup : hero.id === BEIDOU.id ? BEIDOU.windup
    : hero.id === NHIEN_DANG.id ? NHIEN_DANG.windup : hero.id === BO_DE.id ? BO_DE.windup
    : hero.id === DE_TUAN.id ? DE_TUAN.windup : hero.id === NHU_LAI.id ? NHU_LAI.windup
    : hero.id === NGUYEN_THUY.id ? NGUYEN_THUY.windup
    : hero.id === THAIBACH.id ? THAIBACH.windup
    : hero.id === CONGCONG.id ? CONGCONG.windup : WINDUP_SECONDS;
  const point = { x: target?.x ?? unit.x, z: target?.z ?? unit.z };
  const direction = panguDirection(unit, point);
  unit.pendingAbility = { remaining: windup, targetId: target?.id, zone: unit.zone, point, direction };
  event(state, { kind: 'cast', source: unit.id, target: target?.id,
    x: hero.id === XINGTIAN.id || hero.id === KIMSI.id || hero.id === TUONG_THAN.id
      || hero.id === DE_TUAN.id || hero.id === NGUYEN_THUY.id || hero.id === CONGCONG.id ? unit.x : target?.x ?? unit.x,
    z: hero.id === XINGTIAN.id || hero.id === KIMSI.id || hero.id === TUONG_THAN.id
      || hero.id === DE_TUAN.id || hero.id === NGUYEN_THUY.id || hero.id === CONGCONG.id ? unit.z : target?.z ?? unit.z,
    ability: hero.ability.kind, skillId: hero.ability.id, zone: unit.zone, direction, windup });
  return true;
}

function resolveAbility(state: GameState, unit: Unit, targetId?: string, deferred = false, locked?: Unit['pendingAbility']): boolean {
  if (!isDeployed(unit) || unit.phoenixEgg) return false;
  const hero = HERO_BY_ID[unit.heroId];
  if (!hero.ability) return false;
  if (hero.id === PANGU.id && !locked?.point) {
    const candidate = Object.values(state.enemies).find(e => e.zone === unit.zone && distance(e, unit) <= unit.range + 5 && (!targetId || e.id === targetId));
    if (!candidate) return false;
    locked = { remaining: 0, zone: unit.zone, point: { x: candidate.x, z: candidate.z }, direction: panguDirection(unit, candidate) };
  }
  if (hero.id === XINGTIAN.id && !deferred && !Object.values(state.enemies)
    .some(e => e.zone === unit.zone && distance(e, unit) <= XINGTIAN.blastRadius)) return false;
  if (hero.id === DOUZHAN.id && !deferred && !Object.values(state.enemies)
    .some(e => e.zone === unit.zone && distance(e, unit) <= DOUZHAN.staffLength)) return false;
  if (hero.id === KIMTHIEN.id && !deferred && !Object.values(state.enemies)
    .some(e => e.zone === unit.zone && distance(e, unit) <= unit.range + 5)) return false;
  if (hero.id === KHUONGTU.id && !deferred && !Object.values(state.enemies)
    .some(e => e.zone === unit.zone && distance(e, unit) <= unit.range + 5)) return false;
  if (hero.id === CHUCDUNG.id && !deferred && !Object.values(state.enemies)
    .some(e => e.zone === unit.zone && distance(e, unit) <= unit.range + 5)) return false;
  if (hero.id === 'h01A' && !deferred && !Object.values(state.enemies)
    .some(e => e.zone === unit.zone && distance(e, unit) <= unit.range + 5)) return false;
  if (hero.id === 'h03Y' && !deferred && !Object.values(state.enemies)
    .some(e => e.zone === unit.zone && distance(e, unit) <= unit.range + 5)) return false;
  if (hero.id === TUONG_THAN.id && !deferred && !Object.values(state.enemies)
    .some(e => e.zone === unit.zone && distance(e, unit) <= TUONG_THAN.seaRadius)) return false;
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
      (e, d, p) => hurtAbilityEnemy(state, unit, e, d, p), (e, d) => hurtAbilityEnemy(state, unit, e, d, 0, true));
    const survivor = state.enemies[targetId ?? ''];
    if (survivor) triggerFollowUp(state, unit, survivor, 'skill', (u, e, d, p) => hurtEnemy(state, u, e, d, p));
    return true;
  }
  if (hero.id === XINGTIAN.id) {
    xingtianAbility(state, unit, (enemy, damage, penetration) => hurtAbilityEnemy(state, unit, enemy, damage, penetration));
    return true;
  }
  if (hero.id === DOUZHAN.id) {
    const aimTarget = targetId ? state.enemies[targetId] : undefined;
    const aimed = locked?.direction ?? (aimTarget ? panguDirection(unit, aimTarget) : undefined);
    if (!aimed) return false;
    douzhanAbility(state, unit, aimed, (source, enemy, damage, penetration) =>
      hurtAbilityEnemy(state, source, enemy, damage, penetration));
    return true;
  }
  if (hero.id === KIMTHIEN.id) {
    const aimTarget = targetId ? state.enemies[targetId] : undefined;
    const point = locked?.point ?? aimTarget;
    if (!point) return false;
    kimthienAbility(state, unit, point, (source, enemy, damage, direct) =>
      hurtAbilityEnemy(state, source, enemy, damage, 0, direct));
    return true;
  }
  if (hero.id === HANGNGA.id) {
    hangngaAbility(state, unit);
    return true;
  }
  if (hero.id === NUWA.id) {
    nuwaAbility(state, unit, (enemy, damage) => hurtAbilityEnemy(state, unit, enemy, damage));
    if (!deferred) unit.abilityCooldown = hero.ability.cooldown / (1 + .1 * unit.equipment[2]);
    return true;
  }
  if (hero.id === HIENVIEN.id) {
    const aimed = locked?.point ?? (targetId ? state.enemies[targetId] : undefined)
      ?? Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone)
        .sort((a, b) => Number(b.kind === 'boss') - Number(a.kind === 'boss') || b.hp - a.hp)[0];
    if (!aimed) return false;
    hienvienAbility(state, unit, aimed, (enemy, damage, penetration) =>
      hurtAbilityEnemy(state, unit, enemy, damage, penetration));
    return true;
  }
  if (hero.id === SHENNONG.id) {
    const aimed = locked?.point ?? (targetId ? state.enemies[targetId] : undefined)
      ?? Object.values(state.enemies).find(enemy => enemy.zone === unit.zone && distance(enemy, unit) <= unit.range + 5);
    if (!aimed) return false;
    shennongAbility(state, unit, aimed, (source, enemy, damage, direct) =>
      hurtAbilityEnemy(state, source, enemy, damage, 0, direct));
    return true;
  }
  if (hero.id === CHUCLONG.id) {
    chuclongAbility(state, unit, (enemy, damage, penetration, direct) =>
      hurtAbilityEnemy(state, unit, enemy, damage, penetration, direct));
    return true;
  }
  if (hero.id === FUXI.id) {
    const point = locked?.point ?? (targetId ? state.enemies[targetId] : undefined)
      ?? Object.values(state.enemies).find(enemy => enemy.zone === unit.zone && enemy.hp > 0) ?? unit;
    fuxiAbility(state, unit, point, (enemy, damage) => hurtAbilityEnemy(state, unit, enemy, damage));
    return true;
  }
  if (hero.id === HAUNGHE.id) {
    return haungheAbility(state, unit, (enemy, damage, penetration) =>
      hurtAbilityEnemy(state, unit, enemy, damage, penetration));
  }
  if (isTier3Hero(hero.id)) {
    const aimed = locked?.point ?? (targetId ? state.enemies[targetId] : undefined) ??
      Object.values(state.enemies).find(enemy => enemy.zone === unit.zone && distance(enemy, unit) <= unit.range + 5) ?? unit;
    resolveTier3Ability(state, unit, aimed, (enemy, damage, penetration, trueDamage) =>
      hurtAbilityEnemy(state, unit, enemy, damage, penetration, trueDamage));
    if (!deferred && unit.energyType === 'cooldown') unit.abilityCooldown = hero.ability.cooldown / (1 + .1 * unit.equipment[2]);
    return true;
  }
  if (isTier4Hero(hero.id)) {
    const aimed = locked?.point ?? (targetId ? state.enemies[targetId] : undefined) ??
      Object.values(state.enemies).find(enemy => enemy.zone === unit.zone && distance(enemy, unit) <= unit.range + 5) ?? unit;
    resolveTier4Ability(state, unit, aimed, (source, enemy, damage, penetration, trueDamage) =>
      hurtAbilityEnemy(state, source, enemy, damage, penetration, trueDamage));
    if (!deferred && unit.energyType === 'cooldown') unit.abilityCooldown = hero.ability.cooldown / (1 + .1 * unit.equipment[2]);
    return true;
  }
  if (hero.id === KIMSI.id) {
    kimsiAbility(state, unit, (enemy, damage, penetration) =>
      hurtAbilityEnemy(state, unit, enemy, damage, penetration));
    return true;
  }
  if (hero.id === KHUONGTU.id) {
    const target = targetId ? state.enemies[targetId]
      : Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone)
        .sort((a, b) => distance(a, unit) - distance(b, unit))[0];
    if (!locked?.point && (!target || target.zone !== unit.zone || distance(target, unit) > unit.range + 5)) return false;
    const point = locked?.point ?? target;
    if (!point) return false;
    khuongtuAbility(state, unit, point, (source, enemy, damage) => hurtAbilityEnemy(state, source, enemy, damage));
    return true;
  }
  if (hero.id === BEIDOU.id) {
    const target = targetId ? state.enemies[targetId]
      : Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone)
        .sort((a, b) => distance(a, unit) - distance(b, unit))[0];
    if (!locked?.point && (!target || target.zone !== unit.zone || distance(target, unit) > unit.range + 5)) return false;
    const point = locked?.point ?? target;
    if (!point) return false;
    truongAbility(state, unit, point);
    if (!deferred) unit.abilityCooldown = hero.ability.cooldown / (1 + .1 * unit.equipment[2]);
    return true;
  }
  if (hero.id === NHIEN_DANG.id) {
    lanternAbility(state, unit);
    if (!deferred) unit.energy = 0;
    return true;
  }
  if (hero.id === THAIBACH.id) {
    if (!thaibachHasWork(state, unit)) return false;
    thaibachAbility(state, unit);
    if (!deferred) unit.abilityCooldown = hero.ability.cooldown / (1 + .1 * unit.equipment[2]);
    return true;
  }
  if (hero.id === BO_DE.id) {
    bodhiAbility(state, unit);
    if (!deferred) unit.abilityCooldown = hero.ability.cooldown / (1 + .1 * unit.equipment[2]);
    return true;
  }
  if (hero.id === DE_TUAN.id) {
    deTuanAbility(state, unit, (source, enemy, damage, penetration) =>
      hurtAbilityEnemy(state, source, enemy, damage, penetration));
    if (!deferred) unit.energy = 0;
    return true;
  }
  if (hero.id === NHU_LAI.id) {
    const point = locked?.point ?? (targetId ? state.enemies[targetId] : undefined)
      ?? Object.values(state.enemies).find(enemy => enemy.zone === unit.zone) ?? unit;
    nhuLaiAbility(state, unit, point, (source, enemy, damage) =>
      hurtAbilityEnemy(state, source, enemy, damage));
    if (!deferred) unit.energy = 0;
    return true;
  }
  if (hero.id === NGUYEN_THUY.id) {
    nguyenThuyAbility(state, unit, (source, enemy, damage, penetration, direct) =>
      hurtAbilityEnemy(state, source, enemy, damage, penetration, direct));
    if (!deferred) unit.abilityCooldown = hero.ability.cooldown / (1 + .1 * unit.equipment[2]);
    return true;
  }
  if (hero.id === CHUCDUNG.id) {
    const target = targetId ? state.enemies[targetId]
      : Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone)
        .sort((a, b) => distance(a, unit) - distance(b, unit))[0];
    if (!locked?.point && (!target || target.zone !== unit.zone || distance(target, unit) > unit.range + 5)) return false;
    const point = locked?.point ?? target;
    if (!point) return false;
    chucdungAbility(state, unit, point, (source, enemy, damage, direct) =>
      hurtAbilityEnemy(state, source, enemy, damage, 0, direct));
    return true;
  }
  if (hero.id === CONGCONG.id) {
    congcongAbility(state, unit, (enemy, damage) => hurtAbilityEnemy(state, unit, enemy, damage));
    return true;
  }
  if (hero.id === 'h01A') {
    const target = targetId ? state.enemies[targetId]
      : Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone)
        .sort((a, b) => distance(a, unit) - distance(b, unit))[0];
    if (!locked?.point && (!target || target.zone !== unit.zone || distance(target, unit) > unit.range + 5)) return false;
    const point = locked?.point ?? target;
    if (!point) return false;
    tayvuongmauAbility(state, unit, point, (enemy, damage) =>
      hurtAbilityEnemy(state, unit, enemy, damage));
    return true;
  }
  if (hero.id === 'h03Y') {
    const target = targetId ? state.enemies[targetId]
      : Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone)
        .sort((a, b) => distance(a, unit) - distance(b, unit))[0];
    if (!locked?.point && (!target || target.zone !== unit.zone || distance(target, unit) > unit.range + 5)) return false;
    const point = locked?.point ?? target;
    if (!point) return false;
    lucnhiAbility(state, unit, point);
    return true;
  }
  if (hero.id === TUONG_THAN.id) {
    tuongThanAbility(state, unit, (caster, enemy, damage, direct) =>
      hurtAbilityEnemy(state, caster, enemy, damage, 0, direct));
    return true;
  }
  if (hero.id === PHUONG_HOANG.id) {
    const target = targetId ? state.enemies[targetId]
      : Object.values(state.enemies).find(enemy => enemy.zone === unit.zone);
    const point = locked?.point ?? target ?? unit;
    phuongHoangAbility(state, unit, point, (caster, enemy, damage, direct) =>
      hurtAbilityEnemy(state, caster, enemy, damage, 0, direct));
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
      const overheal = healAlly(ally, supportAmount(power, ally, effect.recipientMaxHpRatio));
      if (effect.overhealShield && overheal > 0) {
        ally.shield = Math.max(ally.shield, overheal);
        if (hero.id === 'h03O') {
          ally.frostShield = { remaining: 5, amount: overheal, attackSlow: 0.40 };
        } else {
          ally.mistShield = { remaining: 5, amount: overheal };
        }
      }
      if (hero.id === 'h00F') {
        hasteAllyMax(ally, 4.5, 0.35, 0.15);
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
      // Kim Tra / Cự Linh Thần scale the HP part with the recipient, not the caster.
      const shieldAmount = effect.recipientMaxHpRatio
        ? supportAmount(effectiveUnitAttack(unit) * hero.ability.power, ally, effect.recipientMaxHpRatio)
        : effect.reflect ? power + unit.maxHp * .1 : hero.tier === 2 ? power : power * .6;
      ally.shield = Math.max(ally.shield, shieldAmount);
      applyFriendlyStatus(ally, effect);
      if (effect.reflect) ally.reflect = { amount: effect.reflect };
      if (effect.bonusArmor) ally.bonusArmor = { remaining: effect.statusSeconds ?? 4.5, amount: effect.bonusArmor };
    }
    if (hero.id === 'h00E') {
      // Not a control specialist: the hammer quake slows instead of stunning.
      const slowed = zoneEnemies.filter(e => distance(e, unit) <= 3.0);
      for (const e of slowed) applyEnemyStatus(e, unit, 0, 'slow', 1.2, .4);
      // Presentation only: lets the client draw the quake and mark who it slowed (radius in `value`).
      event(state, { kind: 'trait', source: unit.id, targets: slowed.map(e => e.id), x: unit.x, z: unit.z,
        zone: unit.zone, skillId: 'quake-h00E', value: 3.0 });
    }
    affectedIds = recipients.map(ally => ally.id);
  } else {
    if (!target) return false;
    if (hero.id === 'h00H') {
      let snipeDmg = effectiveUnitAttack(unit) * 3.8;
      if (target.sunder || target.hp / target.maxHp < 0.35) {
        snipeDmg *= 1.75;
      }
      hurtAbilityEnemy(state, unit, target, snipeDmg);
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
        hurtAbilityEnemy(state, unit, enemy, power);
        if (state.enemies[enemy.id]) {
          if (effect.status) applyAbilityStatus(state, enemy, unit, power, effect.status, effect.statusSeconds ?? 0, effect.statusStrength ?? 0);
          if (effect.secondary) applyAbilityStatus(state, enemy, unit, power, effect.secondary.status, effect.secondary.seconds, effect.secondary.strength);
          if (hero.id === 'h00C') {
            enemy.burn = { remaining: 4.0, damagePerSecond: effectiveUnitAttack(unit) * 1.5 / 4, casterId: unit.id };
            applyEnemyStatus(enemy, unit, 0, 'sunder', 4.0, 4);
          }
          if (hero.id === 'h00I') {
            enemy.soulLink = { remaining: 4.0, group: affectedIds, sharePercent: 0.30 };
            applyEnemyStatus(enemy, unit, 0, 'slow', 4.0, 0.50);
          }
          if (effect.sunder) applyEnemyStatus(enemy, unit, 0, 'sunder', effect.statusSeconds ?? 3, effect.sunder);
          if (effect.knockback) knockEnemyBack(state, enemy, effect.knockback, unit);
          if (effect.pull) {
            const dx = target.x - enemy.x, dz = target.z - enemy.z, length = Math.hypot(dx, dz);
            if (length > .01) { enemy.x += dx / length * Math.min(length, effect.pull); enemy.z += dz / length * Math.min(length, effect.pull); }
          }
        }
      }

      if (hero.id === 'h00B' && burnTriggered) {
        for (const enemy of hits) {
          if (state.enemies[enemy.id]) {
            hurtAbilityEnemy(state, unit, enemy, effectiveUnitAttack(unit) * 1.5);
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
/**
 * Guardians (and anything with a block value) win close ties when enemies pick a hero.
 * How many enemies fight a hero at once is decided by free ring slots, not by this value.
 */
/** Server-only: seconds a hero has been unable to close in on its chase target. */
const heroChaseStall = new WeakMap<Unit, number>();
const HERO_CHASE_STALL = .5;

/** Accumulate blocked chase time; true (and reset) once the hero has been stuck long enough to retarget. */
function heroChaseStalled(unit: Unit, blocked: boolean, dt: number): boolean {
  const stalled = blocked ? (heroChaseStall.get(unit) ?? 0) + dt : 0;
  if (stalled >= HERO_CHASE_STALL) { heroChaseStall.delete(unit); return true; }
  heroChaseStall.set(unit, stalled);
  return false;
}

function debugHeroRetarget(state: GameState, unit: Unit, from: string, to: string): void {
  if (state.tick % 20 === 0) console.debug(JSON.stringify({ event: 'combat.hero-retarget', unitId: unit.id, from, to }));
}

/** Beyond attack reach, how close an enemy must be for an auto hero to fight it away from its guard spot. */
const HERO_ACQUIRE_MARGIN = 3;

function guardianPull(state: GameState, unit: Unit): boolean {
  if ((unit.blockBonus?.amount ?? 0) > 0 || (unit.block ?? 0) > 0) return true;
  const role = HERO_BY_ID[unit.heroId]?.role;
  return state.phase === 'combat' && (role === 'guardian' || role === 'warrior');
}

export function combatStep(state: GameState, dt: number): void {
  stepLucnhiAssault(state, dt, (caster, enemy, damage) =>
    hurtAbilityEnemy(state, caster, enemy, damage, 999));
  stepTierBarrages(state, dt, (caster, enemy, damage, trueDamage) =>
    hurtAbilityEnemy(state, caster, enemy, damage, 0, trueDamage));
  stepPanguRifts(state, dt, (u, e, d) => hurtAbilityEnemy(state, u, e, d, 0, true));
  stepKimthienBowls(state, dt, (u, e, d, direct) => hurtAbilityEnemy(state, u, e, d, 0, direct));
  stepPhongThan(state, dt, (u, e, d) => hurtAbilityEnemy(state, u, e, d));
  stepChucdungGround(state, dt, (u, e, d, direct) => hurtAbilityEnemy(state, u, e, d, 0, direct));
  stepShennongGrove(state, dt, (u, e, d, direct) => hurtAbilityEnemy(state, u, e, d, 0, direct));
  stepChuclongPhases(state, dt, (u, e, d, direct) => hurtAbilityEnemy(state, u, e, d, 0, direct));
  stepFuxiBagua(state, dt);
  stepBloodSea(state, dt, (caster, enemy, damage, direct) =>
    hurtAbilityEnemy(state, caster, enemy, damage, 0, direct));
  stepPhoenixCarpet(state, dt, (caster, enemy, damage, direct) =>
    hurtAbilityEnemy(state, caster, enemy, damage, 0, direct));
  stepPhoenixEggs(state, dt, (caster, enemy, damage) =>
    hurtAbilityEnemy(state, caster, enemy, damage));
  stepCongcongAura(state);
  passiveTraits(state, dt);
  stepOrbitAuras(state, dt, (u, e, d, p) => hurtEnemy(state, u, e, d, p));
  stepBoomerangs(state, dt, (u, e, d, p) => hurtEnemy(state, u, e, d, p));
  for (const unit of Object.values(state.units)) {
    unit.cooldown = Math.max(0, unit.cooldown - dt);
    unit.abilityCooldown = Math.max(0, unit.abilityCooldown - dt / (1 - Math.min(.75, Math.max(0, unit.haste?.cooldownReduction ?? 0))));
    unit.stun = Math.max(0, (unit.stun ?? 0) - dt);
    if (unit.heroId === NHU_LAI.id && isDeployed(unit))
      unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + 10 * dt);
    if (unit.divineImmortal) unit.divineImmortal = Math.max(0, unit.divineImmortal - dt);
    if (unit.starGuardCooldown) unit.starGuardCooldown = Math.max(0, unit.starGuardCooldown - dt);
    if (unit.ward) { unit.ward.remaining -= dt; if (unit.ward.remaining <= 0) unit.ward = undefined; }
    if (unit.haste) { unit.haste.remaining -= dt; if (unit.haste.remaining <= 0) unit.haste = undefined; }
    if (unit.critBlessing) {
      unit.critBlessing.remaining -= dt;
      if (unit.critBlessing.remaining <= 0) unit.critBlessing = undefined;
    }
    if (unit.fuxiBlessing) {
      unit.fuxiBlessing.remaining -= dt;
      if (unit.fuxiBlessing.remaining <= 0) unit.fuxiBlessing = undefined;
    }
    if (unit.thunderBlessing) {
      unit.thunderBlessing.remaining -= dt;
      if (unit.thunderBlessing.remaining <= 0) unit.thunderBlessing = undefined;
    }
    if (unit.bodhiBlessing) {
      unit.bodhiBlessing.remaining -= dt;
      if (unit.bodhiBlessing.remaining <= 0) unit.bodhiBlessing = undefined;
    }
    if (unit.primordialBlessing) {
      unit.primordialBlessing.remaining -= dt;
      if (unit.primordialBlessing.remaining <= 0) unit.primordialBlessing = undefined;
    }
    if (unit.lanternShield) {
      unit.lanternShield.remaining -= dt;
      if (unit.lanternShield.remaining <= 0 || unit.lanternShield.amount <= 0) {
        unit.shield = Math.max(0, unit.shield - unit.lanternShield.amount);
        unit.lanternShield = undefined;
      }
    }
    if (unit.divineShield) {
      unit.divineShield.remaining -= dt;
      if (unit.divineShield.remaining <= 0 || unit.divineShield.amount <= 0) {
        unit.shield = Math.max(0, unit.shield - unit.divineShield.amount);
        unit.divineShield = undefined;
      }
    }
    if (unit.empower) { unit.empower.remaining -= dt; if (unit.empower.remaining <= 0) unit.empower = undefined; }
    if (unit.bonusArmor) { unit.bonusArmor.remaining -= dt; if (unit.bonusArmor.remaining <= 0) unit.bonusArmor = undefined; }
    if (unit.blockBonus) { unit.blockBonus.remaining -= dt; if (unit.blockBonus.remaining <= 0) unit.blockBonus = undefined; }
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
    if (unit.tierShield) {
      unit.tierShield.remaining -= dt;
      if (unit.tierShield.remaining <= 0) {
        unit.shield = Math.max(0, unit.shield - unit.tierShield.amount);
        if (unit.tierShield.kind === 'water') burstTier3WaterShield(state, unit,
          (enemy, amount) => hurtEnemy(state, unit, enemy, amount));
        else unit.tierShield = undefined;
      }
    }
    if (unit.tierGoldShields) {
      for (const shield of unit.tierGoldShields) {
        shield.remaining -= dt;
        if (shield.remaining <= 0) unit.shield = Math.max(0, unit.shield - shield.amount);
      }
      unit.tierGoldShields = unit.tierGoldShields.filter(shield => shield.remaining > 0);
    }
    if (unit.nuwaShields) {
      for (const shield of unit.nuwaShields) {
        shield.remaining -= dt;
        if (shield.remaining <= 0) unit.shield = Math.max(0, unit.shield - shield.amount);
      }
      unit.nuwaShields = unit.nuwaShields.filter(shield => shield.remaining > 0 && shield.amount > 0);
    }
    if (unit.tierBuff) {
      unit.tierBuff.remaining -= dt;
      if (unit.tierBuff.remaining <= 0) unit.tierBuff = undefined;
    }
    if (unit.tierImmortal) {
      unit.tierImmortal.remaining -= dt;
      if (unit.tierImmortal.activeRemaining > 0) unit.tierImmortal.activeRemaining -= dt;
      if (unit.tierImmortal.remaining <= 0 && unit.tierImmortal.activeRemaining <= 0) unit.tierImmortal = undefined;
    }
    if ((unit.heroId === 'h00U' && unit.berserk) || unit.tierBuff?.kind === 'fire') unit.stun = 0;
    if (unit.heroId === 'h00U' && isDeployed(unit)) {
      unit.tierPetTimer = Math.max(0, (unit.tierPetTimer ?? 4) - dt);
      if (unit.tierPetTimer <= 0) {
        const prey = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone && enemy.hp > 0)
          .sort((a, b) => b.hp - a.hp)[0];
        if (prey) {
          unit.tierPetTimer = 4;
          hurtEnemy(state, unit, prey, effectiveUnitAttack(unit) * 1.8);
          if (state.enemies[prey.id]) {
            prey.bleed = { remaining: 3, bonusDamage: .1 };
            applyEnemyStatus(prey, unit, 0, 'sunder', 3, .3);
          }
          event(state, { kind: 'trait', source: unit.id, target: prey.id, x: prey.x, z: prey.z,
            zone: unit.zone, skillId: 'pet-h00U', value: effectiveUnitAttack(unit) * 1.8 });
        }
      }
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
    if (unit.summonKind === 'ancient-tree') continue;
    if (unit.respawn > 0) {
      unit.respawn -= dt;
      if (unit.respawn <= 1e-6) {
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
    if (unit.phoenixEgg) continue;
    if (unit.summonKind === 'buddha-clone') {
      stepDouzhanClone(state, unit, (source, enemy, damage, penetration) =>
        hurtEnemy(state, source, enemy, damage, penetration));
      continue;
    }
    if (unit.summonKind === 'monkey-clone') {
      stepMonkeyClone(state, unit, (source, enemy, damage, penetration) =>
        hurtEnemy(state, source, enemy, damage, penetration));
      continue;
    }
    if (unit.summonKind === 'blood-warrior' || unit.summonKind === 'blood-general') {
      stepBloodSoldier(state, unit, (caster, enemy, damage) =>
        hurtEnemy(state, caster, enemy, damage));
      continue;
    }
    const hero = HERO_BY_ID[unit.heroId], bonus = bonuses(state, unit.owner);
    unit.hp = Math.min(unit.maxHp, unit.hp + bonus.regen * unit.maxHp * dt);
    if ((unit.stun ?? 0) > 0 || unit.shadowAssault) continue;
    const mode = unit.orderMode ?? (unit.stopped ? 'hold' : unit.destination ? 'move' : 'auto');
    if (unit.stopped && !unit.orderMode) continue;
    if (mode === 'move' && unit.destination) {
      if (walkUnitWithPathing(unit, unit.destination, hero.speed * dt, Object.values(state.units), Object.values(state.enemies))) {
        unit.guardPosition = { x: unit.x, z: unit.z }; unit.destination = null; unit.orderMode = 'auto';
      }
      continue;
    }
    if (mode === 'attack-move' && !unit.destination) unit.orderMode = 'auto';
    let target = unit.target ? state.enemies[unit.target] : undefined;
    const guard = unit.guardPosition ?? slotPosition(state, unit.owner, Math.max(0, unit.slot));
    if (target && target.zone !== unit.zone) target = undefined;
    // Warcraft-style leash: a fight already within acquisition range is never abandoned to walk home.
    const acquire = (e: Enemy) => distance(e, unit) <= Math.max(unit.range, contactDistance(unit, e) + .15) + HERO_ACQUIRE_MARGIN;
    if (mode === 'auto' && target && !acquire(target)
      && (distance(target, guard) > 18 || distance(unit, guard) > 18)) target = undefined;
    if (mode === 'attack-move' && target && unit.engageAt && distance(unit, unit.engageAt) > 12) target = undefined;
    if (!target && mode === 'attack') { unit.orderMode = 'auto'; unit.target = null; }
    if (!target && mode !== 'attack') {
      const radius = mode === 'hold' ? unit.range
        : mode === 'attack-move' ? Math.max(10, unit.range + 2) : Math.max(19, unit.range + 3);
      const candidates = Object.values(state.enemies).filter(e => e.zone === unit.zone
        && distance(e, unit) <= (mode === 'hold' ? Math.max(radius, contactDistance(unit, e) + .15) : radius)
        && (mode !== 'auto' || distance(e, guard) <= 18 || acquire(e)));
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
    if (target && (mode === 'auto' || mode === 'attack-move')
      && distance(unit, target) > Math.max(unit.range, contactDistance(unit, target) + .15)) {
      // Warcraft auto-acquire: while the chosen target drifted out of reach (knockback, a crowd
      // in the way), hit whatever already stands in reach instead of pushing through the pack.
      const inReach = Object.values(state.enemies).filter(e => e.zone === unit.zone
        && distance(e, unit) <= Math.max(unit.range, contactDistance(unit, e) + .15))
        .sort((a, b) => distance(a, unit) - distance(b, unit))[0];
      if (inReach) { target = inReach; unit.target = inReach.id; }
    }
    if (!target && mode === 'attack-move' && unit.destination) {
      if (walkUnitWithPathing(unit, unit.destination, hero.speed * dt, Object.values(state.units), Object.values(state.enemies))) {
        unit.guardPosition = { x: unit.x, z: unit.z }; unit.destination = null; unit.orderMode = 'auto';
      }
      continue;
    }
    // The fight is over: hold the spot where it ended instead of walking back to the old position.
    // (No `continue`: support heroes still cast heals/shields without an enemy target.)
    if (!target && mode === 'auto' && distance(unit, guard) > 2) unit.guardPosition = { x: unit.x, z: unit.z };
    // Ranged heroes hold their ground like Warcraft units; they never back away on their own.
    if (target && distance(unit, target) > Math.max(unit.range, contactDistance(unit, target) + .15)) {
      if (mode === 'hold') { unit.target = null; continue; }
      let dash = 1;
      if (unit.heroId === 'h008') {
        if (distance(unit, target) > 3.0 || unit.comboTarget !== target.id) {
          unit.comboCount = 1;
          unit.comboTarget = target.id;
        }
        if (unit.comboCount === 1) dash = 3.0;
      }
      const step = hero.speed * dt * dash, fromX = unit.x, fromZ = unit.z;
      walkUnitWithPathing(unit, target, step, Object.values(state.units), Object.values(state.enemies));
      if ((mode === 'auto' || mode === 'attack-move')
        && heroChaseStalled(unit, Math.hypot(unit.x - fromX, unit.z - fromZ) < step * .2, dt)) {
        // Walled off from the chosen enemy by the crowd: fight the nearest other one instead of standing idle.
        const alternative = Object.values(state.enemies).filter(e => e.zone === unit.zone && e.id !== target!.id
          && distance(e, unit) <= Math.max(19, unit.range + 3))
          .sort((a, b) => distance(a, unit) - distance(b, unit))[0];
        if (alternative) { unit.target = alternative.id; debugHeroRetarget(state, unit, target.id, alternative.id); }
      }
      continue;
    }
    heroChaseStall.delete(unit);
    if (unit.heroId === 'h008' && unit.comboCount === 1) {
      unit.comboCount = 0;
      for (const nearby of Object.values(state.enemies)) {
        if (nearby.zone === unit.zone && distance(nearby, unit) <= 2.5) {
          applyEnemyStatus(nearby, unit, 0, 'slow', 2.5, 0.35);
        }
      }
      unit.ward = { remaining: 2.5, reduction: 0.25 };
      event(state, { kind: 'trait', source: unit.id, target: target?.id, x: unit.x, z: unit.z, skillId: 'burrow-h008', traitType: 'nth_strike' });
    }
    // Manual Q and automatic casting share one authoritative cooldown / rage check.
    const isRage = unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit';
    const canCast = isRage ? (unit.energy ?? 0) >= (unit.maxEnergy ?? 100) : unit.abilityCooldown <= 0;
    if (hero.ability && canCast && (target || hero.ability.kind === 'heal' || hero.ability.kind === 'shield'
      || (hero.id === NUWA.id && Object.keys(state.enemies).length > 0))) {
      castAbility(state, unit, hero.id === 'h00G' ? undefined : target?.id);
    }
    if (unit.pendingAbility) continue;
    if (target && state.enemies[target.id] && unit.cooldown <= 0) {
      basicAttack(state, unit, target, (enemy, damage, penetration, source) => hurtEnemy(state, source ?? unit, enemy, damage, penetration));
      if (unit.bodhiBlessing && state.enemies[target.id])
        basicAttack(state, unit, target, (enemy, damage, penetration, source) =>
          hurtEnemy(state, source ?? unit, enemy, damage, penetration));
      triggerTruongBlessing(state, unit, target, (source, enemy, damage) =>
        hurtEnemy(state, source, enemy, damage));
      unit.cooldown = attackInterval(state, unit);
    }
  }
  const deployedUnits = Object.values(state.units).filter(unit => isDeployed(unit) && !unit.shadowAssault);
  resolveUnitCollisions(deployedUnits);
  const enemyList = Object.values(state.enemies);
  const enemyCtx: EnemyTickContext = {
    state, dt, units: deployedUnits,
    unitGrid: new SpatialGrid(deployedUnits), enemyGrid: new SpatialGrid(enemyList),
    rings: buildRings(state, enemyList, unit => deployedUnits.includes(unit) && isDeployed(unit)),
    anchored: new Set(),
    isGuardian: unit => guardianPull(state, unit),
    strike: (enemy, target) => {
      const damage = enemy.attack * (1 - (enemy.attackWeak?.strength ?? 0));
      hurtUnit(state, target, damage, enemy);
      if (enemy.lifestealOnHit && state.enemies[enemy.id]) enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.lifestealOnHit);
      if (enemy.kind === 'boss') for (const ally of deployedUnits) {
        if (ally === target || ally.zone !== enemy.zone || !isDeployed(ally)
          || distance(ally, enemy) > enemyAttackReach(enemy, ally)) continue;
        hurtUnit(state, ally, damage * .35, enemy);
      }
      event(state, { kind: 'attack', source: enemy.id, target: target.id, x: target.x, z: target.z,
        value: damage, skillId: enemy.monsterId ? `monster-attack-${enemy.monsterId}` : undefined });
    },
  };
  for (const enemy of enemyList) {
    if (!state.enemies[enemy.id]) continue;
    enemy.silence = Math.max(0, (enemy.silence ?? 0) - dt);
    enemy.fireMark = Math.max(0, (enemy.fireMark ?? 0) - dt);
    if (enemy.armorBuff) {
      enemy.armorBuff.remaining -= dt;
      if (enemy.armorBuff.remaining <= 0) enemy.armorBuff = undefined;
    }
    if (enemy.primordialMark) {
      enemy.primordialMark.remaining -= dt;
      if (enemy.primordialMark.remaining <= 0) enemy.primordialMark = undefined;
    }
    stepEnemySkills(
      state,
      enemy,
      dt,
      deployedUnits,
      enemyCtx.anchored,
      hurtUnit,
      (s, u) => !hasBuddhaAura(s, u.owner),
    );
    if (enemy.burn) {
      const caster = state.units[enemy.burn.casterId];
      const inLava = state.groundEffects?.some(ground => ground.kind === 'chucdung-lava'
        && ground.zone === enemy.zone && ground.remaining >= 0 && distance(ground, enemy) <= ground.radius);
      if (caster) hurtEnemy(state, caster, enemy, enemy.burn.damagePerSecond * dt * (inLava ? 2 : 1),
        caster.heroId === 'h00C' ? 999 : 0, false, enemy.burn.trueDamage);
      enemy.burn.remaining -= dt;
      if (enemy.burn.remaining <= 0) enemy.burn = undefined;
      if (!state.enemies[enemy.id]) continue;
    }
    if (enemy.poison) {
      const caster = state.units[enemy.poison.casterId];
      if (caster) hurtEnemy(state, caster, enemy,
        enemy.poison.damagePerSecond * dt,
        999);
      enemy.poison.remaining -= dt;
      if (enemy.poison.remaining <= 0) enemy.poison = undefined;
      if (!state.enemies[enemy.id]) continue;
    }
    if (enemy.bleed) {
      const caster = state.units[enemy.bleed.casterId ?? ''];
      if (caster && enemy.bleed.damagePerSecond) {
        hurtEnemy(state, caster, enemy, enemy.bleed.damagePerSecond * dt);
        if (!state.enemies[enemy.id]) continue;
      }
      enemy.bleed.remaining -= dt;
      if (enemy.bleed.remaining <= 0) enemy.bleed = undefined;
    }
    if (enemy.armorCuts) {
      enemy.armorCuts.remaining -= dt;
      if (enemy.armorCuts.remaining <= 0) enemy.armorCuts = undefined;
    }
    if (enemy.pureLand) {
      enemy.pureLand.remaining -= dt;
      if (enemy.pureLand.remaining <= 0) enemy.pureLand = undefined;
    }
    if (enemy.soulLink) {
      enemy.soulLink.remaining -= dt;
      if (enemy.soulLink.remaining <= 0) enemy.soulLink = undefined;
    }
    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    enemy.stun = Math.max(0, (enemy.stun ?? 0) - dt);
    enemy.frozen = Math.max(0, (enemy.frozen ?? 0) - dt);
    enemy.sealed = Math.max(0, (enemy.sealed ?? 0) - dt);
    enemy.root = Math.max(0, (enemy.root ?? 0) - dt);
    if (enemy.sunder) { enemy.sunder.remaining -= dt; if (enemy.sunder.remaining <= 0) enemy.sunder = undefined; }
    if (enemy.critVulnerability) {
      enemy.critVulnerability.remaining -= dt;
      if (enemy.critVulnerability.remaining <= 0) enemy.critVulnerability = undefined;
    }
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
    stepEnemyBehavior(enemyCtx, enemy);
  }
  if (state.phase === 'combat') {
    resolveSoftCollisions(Object.values(state.enemies), deployedUnits, enemyCtx.anchored);
  }
  if (state.groundEffects?.length) {
    stepTruongBolts(state, dt, (source, enemy, damage) =>
      hurtAbilityEnemy(state, source, enemy, damage));
    for (const ground of state.groundEffects) {
      if (ground.kind === 'pangu-rift' || ground.kind === 'golden-bowl' || ground.kind === 'phong-than'
        || ground.kind === 'chucdung-ember' || ground.kind === 'chucdung-lava'
        || ground.kind === 'shennong-grove' || ground.kind === 'fuxi-bagua' || ground.kind === 'blood-sea'
        || ground.kind === 'phoenix-carpet') continue;
      const caster = state.units[ground.casterId];
      if (caster) for (const enemy of Object.values(state.enemies)) {
        if (enemy.zone !== ground.zone || distance(enemy, ground) > ground.radius) continue;
        if (ground.slowStrength) applyEnemyStatus(enemy, caster, 0, 'slow', .2, ground.slowStrength);
        if (ground.kind === 'beidou' && zoneControlled(state, caster, enemy, ground))
          enemy.frozen = Math.max(enemy.frozen ?? 0, ground.remaining);
        if (ground.kind === 'five-finger') applyEnemyStatus(enemy, caster, 0, 'sunder', .2, NHU_LAI.zoneSunder);
        if (ground.kind === 'lantern-cage'
          && (!enemy.burn || enemy.burn.damagePerSecond < NHIEN_DANG.burnDps))
          enemy.burn = { remaining: .3, damagePerSecond: NHIEN_DANG.burnDps, casterId: caster.id };
        if (ground.kind === 'tier-fire' || ground.kind === 'tier-gold') enemy.pureLand = {
          remaining: .2, bonusDamage: ground.kind === 'tier-fire' ? .2 : .25,
        };
        if (ground.damagePerSecond > 0) hurtAbilityEnemy(state, caster, enemy, ground.damagePerSecond * dt);
      }
      ground.remaining -= dt;
    }
    state.groundEffects = state.groundEffects.filter(ground => ground.remaining > 0);
  }
  stepLanternAura(state, dt, (source, enemy, damage) =>
    hurtAbilityEnemy(state, source, enemy, damage));
  stepSolarAura(state, dt, (source, enemy, damage) =>
    hurtAbilityEnemy(state, source, enemy, damage));
}
