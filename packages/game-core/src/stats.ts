import { scaledAttackRange } from './rules.js';
import { FORMATIONS, HERO_BY_ID } from '../../../content/catalog.js';
import { refreshBonds } from './bond-runtime.js';
import type { GameState, Unit } from '../../contracts/src/types.js';
import { XINGTIAN } from '../../../content/xingtian-design.js';
import { KHUONGTU } from '../../../content/khuongtu-nha-design.js';
import { carryAttackSpeedBonus } from './carry-passive.js';
import { gearModsOf } from './gear-stats.js';
export { abilityCooldownFor, unitSpeed } from './gear-stats.js';

export function bonuses(state: GameState, owner: string) {
  const player = state.players[owner];
  const result = { attack: 0, health: 0, speed: 0, armor: 0, regen: 0 };
  // Bonds no longer add flat stats; their effects come from bond-design.ts via gearModsOf.
  const formation = FORMATIONS.find(f => f.id === player.formation);
  if (formation) result[formation.bonus] += formation.amount * player.formationLevels[formation.id - 1];
  return result;
}
export function refreshStats(state: GameState, owner: string): void {
  const player = state.players[owner];
  const units = Object.values(state.units).filter(u => u.owner === owner);
  // Active bonds and bondVersion must settle before gearModsOf caches any mods below.
  refreshBonds(state, owner, units);
  const bonus = bonuses(state, owner);
  for (const unit of units) {
    const mods = gearModsOf(state, unit);
    if (unit.summonDuration !== undefined) continue;
    const h = HERO_BY_ID[unit.heroId], multiplier = 2.4 ** (unit.rank - 1);
    const oldMax = unit.maxHp;
    unit.maxHp = Math.round((h.hp * multiplier + mods.absorbedHp) * (1 + mods['health-percent'] + bonus.health));
    const healthAttack = mods.uniques.has('heaven-earth-reversal') ? unit.maxHp * .06 : 0;
    const seatedAttack = mods.uniques.has('seated-oblivion') ? .4 : 0;
    const treasureAttack = mods.uniques.has('treasure-basin') ? -.25 : 0;
    unit.attack = Math.round((h.attack * multiplier + mods.absorbedAttack + healthAttack)
      * (1 + mods['attack-percent'] + bonus.attack + seatedAttack + treasureAttack));
    unit.armor = h.armor + mods['armor-flat'] + bonus.armor;
    unit.range = scaledAttackRange(h.range) * (mods.uniques.has('seated-oblivion') ? 1.6 : 1);
    // Switching a health bonus preserves the fraction; toggling it cannot heal.
    if (unit.hp > 0) unit.hp = Math.min(unit.maxHp, unit.hp / Math.max(1, oldMax) * unit.maxHp);
    // A max-HP rescale is not incoming recovery for Blood Pact.
    if (unit.gearRuntime?.hpSeen && unit.gearRuntime.hpSeen > 0)
      unit.gearRuntime.hpSeen *= unit.maxHp / Math.max(1, oldMax);
  }
}
export function effectiveUnitAttack(unit: Unit): number {
  return unit.attack * (1 + (unit.haste?.attackBonus ?? 0) + (unit.empower?.attackBonus ?? 0)
    + (unit.fuxiBlessing?.attackBonus ?? 0)) * (unit.gearRuntime?.castScale ?? 1);
}

export function skillDamageMultiplier(state: GameState, unit: Unit): number {
  const alliedBonus = Object.values(state.units).some(ally => ally.owner === unit.owner && ally.zone === unit.zone
    && ally.heroId === KHUONGTU.id && ally.slot >= 0 && ally.hp > 0 && ally.respawn <= 0)
    ? (1 + KHUONGTU.alliedSkillBonus) * (1 + (unit.fuxiBlessing?.skillBonus ?? 0))
    : 1 + (unit.fuxiBlessing?.skillBonus ?? 0);
  return alliedBonus * (1 + gearModsOf(state, unit)['skill-damage']);
}

/** Đế Tuấn's field aura increases critical damage for allied Metal and Fire heroes. */
export function solarCritMultiplier(state: GameState, unit: Unit, base: number): number {
  const element = HERO_BY_ID[unit.heroId]?.element;
  return base + ((element === 1 || element === 4)
    && Object.values(state.units).some(ally => ally.owner === unit.owner && ally.heroId === 'h01I'
      && ally.slot >= 0 && ally.hp > 0 && ally.respawn <= 0) ? .35 : 0);
}

export function attackInterval(state: GameState, unit: Unit): number {
  const berserkBonus = unit.berserk ? unit.berserk.attackSpeed : 0;
  const missingHealthTens = unit.heroId === XINGTIAN.id && unit.maxHp > 0
    ? Math.min(9, Math.floor((1 - unit.hp / unit.maxHp) * 10 + 1e-9)) : 0;
  const defiantSpeed = missingHealthTens * XINGTIAN.attackSpeedPerLostTenth;
  const heatBonus = (unit.heatStacks ?? 0) * 0.10;
  const mods = gearModsOf(state, unit);
  const demonSpeed = mods.uniques.has('demon-heart') ? .8 : 0;
  return HERO_BY_ID[unit.heroId].interval / (1 + bonuses(state, unit.owner).speed + mods['attack-speed']
    + (unit.haste?.amount ?? 0) + berserkBonus + heatBonus + defiantSpeed + carryAttackSpeedBonus(unit) + demonSpeed);
}
