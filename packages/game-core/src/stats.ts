import { scaledAttackRange } from './rules.js';
import { FORMATIONS, HERO_BY_ID, SYNERGIES } from '../../../content/catalog.js';
import type { GameState, Unit } from '../../contracts/src/types.js';
import { XINGTIAN } from '../../../content/xingtian-design.js';
import { KHUONGTU } from '../../../content/khuongtu-nha-design.js';
import { carryAttackSpeedBonus } from './carry-passive.js';

export function bonuses(state: GameState, owner: string) {
  const player = state.players[owner];
  const result = { attack: 0, health: 0, speed: 0, armor: 0, regen: 0 };
  for (const active of player.activeSynergies) {
    const def = SYNERGIES.find(s => s.id === active.id)!;
    result[def.bonus] += def.amount * active.level;
  }
  const formation = FORMATIONS.find(f => f.id === player.formation);
  if (formation) result[formation.bonus] += formation.amount * player.formationLevels[formation.id - 1];
  return result;
}
export function refreshStats(state: GameState, owner: string): void {
  const player = state.players[owner];
  const units = Object.values(state.units).filter(u => u.owner === owner);
  const roster = new Set(units.filter(u => u.slot >= 0).map(u => u.heroId));
  player.activeSynergies = SYNERGIES.flatMap(s => {
    const count = s.members.filter(id => roster.has(id)).length;
    const level = s.thresholds.filter(t => count >= t).length;
    return level ? [{ id: s.id, count, level }] : [];
  });
  const bonus = bonuses(state, owner);
  for (const unit of units) {
    if (unit.summonDuration !== undefined) continue;
    const h = HERO_BY_ID[unit.heroId], multiplier = 2.4 ** (unit.rank - 1);
    const oldMax = unit.maxHp;
    unit.maxHp = Math.round(h.hp * multiplier * (1 + .25 * unit.equipment[1] + bonus.health));
    unit.attack = Math.round(h.attack * multiplier * (1 + .22 * unit.equipment[0] + bonus.attack));
    unit.armor = h.armor + unit.equipment[1] * 4 + bonus.armor;
    unit.range = scaledAttackRange(h.range);
    // Switching a health bonus preserves the fraction; toggling it cannot heal.
    if (unit.hp > 0) unit.hp = Math.min(unit.maxHp, unit.hp / oldMax * unit.maxHp);
  }
}
export function effectiveUnitAttack(unit: Unit): number {
  return unit.attack * (1 + (unit.haste?.attackBonus ?? 0) + (unit.empower?.attackBonus ?? 0)
    + (unit.fuxiBlessing?.attackBonus ?? 0));
}

export function skillDamageMultiplier(state: GameState, unit: Unit): number {
  return Object.values(state.units).some(ally => ally.owner === unit.owner && ally.zone === unit.zone
    && ally.heroId === KHUONGTU.id && ally.slot >= 0 && ally.hp > 0 && ally.respawn <= 0)
    ? (1 + KHUONGTU.alliedSkillBonus) * (1 + (unit.fuxiBlessing?.skillBonus ?? 0))
    : 1 + (unit.fuxiBlessing?.skillBonus ?? 0);
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
  return HERO_BY_ID[unit.heroId].interval / (1 + bonuses(state, unit.owner).speed + .04 * unit.equipment[2] + (unit.haste?.amount ?? 0) + berserkBonus + heatBonus + defiantSpeed + carryAttackSpeedBonus(unit));
}
