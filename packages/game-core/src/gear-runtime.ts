import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { applyEnemyStatus } from './combat-status.js';
import { gearModsOf } from './gear-stats.js';
import { gearProc, hasGearUnique, settleGearRecovery, type GearHurt } from './gear-uniques.js';
import { distance, isDeployed } from './rules.js';
import { effectiveUnitAttack } from './stats.js';

const seenDots = new WeakSet<object>();
const seenSummons = new WeakSet<Unit>();

export function prepareGearTick(state: GameState): void {
  for (const unit of Object.values(state.units)) {
    gearModsOf(state, unit);
    if (unit.summonDuration !== undefined && unit.summonerId && !seenSummons.has(unit)) {
      seenSummons.add(unit);
      const caster = state.units[unit.summonerId];
      if (caster) unit.summonDuration *= 1 + gearModsOf(state, caster)['summon-duration'];
    }
    settleGearRecovery(state, unit);
  }
}

export function prepareGearDot(state: GameState, enemy: Enemy): void {
  for (const dot of [enemy.burn, enemy.poison]) {
    if (!dot || seenDots.has(dot)) continue;
    seenDots.add(dot);
    const caster = state.units[dot.casterId];
    if (!caster) continue;
    const mods = gearModsOf(state, caster);
    dot.remaining *= 1 + mods['status-duration'];
    dot.damagePerSecond *= 1 + mods['dot-damage'];
  }
}

export function finishGearTick(state: GameState, dt: number, hurt: GearHurt,
  loseHealth: (unit: Unit, damage: number) => void): void {
  for (const unit of Object.values(state.units)) {
    const runtime = unit.gearRuntime ??= {};
    const mods = gearModsOf(state, unit);
    const energy = unit.energy ?? 0;
    const gain = Math.max(0, energy - (runtime.energySeen ?? energy));
    unit.energy = Math.min(unit.maxEnergy ?? 100, energy + gain * mods['rage-gain']);
    runtime.energySeen = unit.energy;
    if (isDeployed(unit)) {
      if (mods.uniques.has('demon-heart') && state.phase === 'combat' && state.enemies[unit.target ?? ''])
        loseHealth(unit, unit.maxHp * .015 * dt);
      if (isDeployed(unit) && mods.uniques.has('wind-fire-wheels') && state.phase === 'combat') {
        const previous = runtime.lastPosition;
        if (previous?.zone === unit.zone) runtime.travel = (runtime.travel ?? 0) + distance(previous, unit);
        if ((runtime.travel ?? 0) >= 3) {
          runtime.travel = (runtime.travel ?? 0) % 3;
          const grounds = state.groundEffects ??= [];
          const owned = grounds.filter(ground => ground.casterId === unit.id && ground.kind === 'gear-fire-trail');
          if (owned.length >= 8) grounds.splice(grounds.indexOf(owned[0]), 1);
          grounds.push({ x: unit.x, z: unit.z, zone: unit.zone, radius: 1.4, remaining: 4,
            damagePerSecond: effectiveUnitAttack(unit) * .4, casterId: unit.id, kind: 'gear-fire-trail' });
          gearProc(state, unit, 'wind-fire-wheels', undefined, 1.4);
        }
      }
    }
    runtime.lastPosition = { x: unit.x, z: unit.z, zone: unit.zone };
    settleGearRecovery(state, unit);
  }
  for (const trap of state.gearTraps ?? []) {
    trap.remaining -= dt;
    const caster = state.units[trap.ownerUnitId];
    if (!caster || !isDeployed(caster) || caster.zone !== trap.zone
      || !hasGearUnique(state, caster, 'celestial-net')) { trap.remaining = 0; continue; }
    if (trap.remaining <= 0) continue;
    const target = Object.values(state.enemies).find(enemy => enemy.zone === trap.zone && distance(enemy, trap) <= 1.3);
    if (!target) continue;
    trap.remaining = 0;
    applyEnemyStatus(target, caster, 0, 'slow', 2, .5);
    hurt(caster, target, effectiveUnitAttack(caster) * .8);
  }
  state.gearTraps = state.gearTraps?.filter(trap => trap.remaining > 0);
}
