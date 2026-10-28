import type { Enemy, GameState, GearUniqueId, Unit } from '../../contracts/src/types.js';
import { gearRandom } from './gear-items.js';
import { gearModsOf } from './gear-stats.js';
import { distance, event, isDeployed } from './rules.js';
import { effectiveUnitAttack, refreshStats } from './stats.js';

export type GearHurt = (unit: Unit, enemy: Enemy, damage: number) => void;
const deaths = new WeakMap<GameState, { processing: boolean; queue: { unit: Unit; enemy: Enemy; hurt: GearHurt }[] }>();
export { settleGearRecovery } from './gear-recovery.js';
export const hasGearUnique = (state: GameState, unit: Unit, id: GearUniqueId): boolean => gearModsOf(state, unit).uniques.has(id);

export function gearProc(state: GameState, unit: Unit, id: GearUniqueId, target?: Enemy, radius?: number,
  origin?: { x: number; z: number }): void {
  const stats = state.gearStats ??= { drops: {}, sources: {}, uniques: {}, commands: {} };
  stats.uniques[id] = (stats.uniques[id] ?? 0) + 1;
  event(state, { kind: 'trait', source: unit.id, target: target?.id, x: target?.x ?? unit.x,
    z: target?.z ?? unit.z, zone: unit.zone, skillId: `gear-${id}`, radius, origin });
}

/** Drain deaths iteratively; a gourd explosion can count kills without recursive bursts. */
export function onGearUniqueKill(state: GameState, unit: Unit, enemy: Enemy, hurt: GearHurt): void {
  let pending = deaths.get(state);
  if (!pending) { pending = { processing: false, queue: [] }; deaths.set(state, pending); }
  pending.queue.push({ unit, enemy, hurt });
  if (pending.processing) return;
  pending.processing = true;
  try {
    for (let i = 0; i < pending.queue.length; i++) {
      const entry = pending.queue[i];
      accountGearKill(state, entry.unit, entry.enemy, entry.hurt);
    }
  } finally { pending.queue = []; pending.processing = false; }
}

function accountGearKill(state: GameState, unit: Unit, enemy: Enemy, hurt: GearHurt): void {
  const mods = gearModsOf(state, unit);
  if (mods.uniques.has('star-absorption')) {
    const item = state.players[unit.owner].gear.find(item => item.unitId === unit.id && item.unique === 'star-absorption');
    if (item) {
      const before = item.stacks ?? 0;
      item.stacks = Math.min(240, before + (enemy.kind === 'boss' ? 20 : 1));
      if (item.stacks !== before) {
        state.players[unit.owner].gearVersion++;
        refreshStats(state, unit.owner);
      }
    }
  }
  if (mods.uniques.has('treasure-basin') && gearRandom(state) < .04) {
    state.players[unit.owner].gold += 15;
    gearProc(state, unit, 'treasure-basin', enemy);
  }
  if (mods.uniques.has('celestial-net')) {
    const traps = state.gearTraps ??= [];
    const owned = traps.filter(trap => trap.ownerUnitId === unit.id);
    if (owned.length >= 6) traps.splice(traps.indexOf(owned[0]), 1);
    traps.push({ ownerUnitId: unit.id, zone: enemy.zone, x: enemy.x, z: enemy.z, remaining: 20 });
    gearProc(state, unit, 'celestial-net', enemy, 1.3);
  }
  for (const wearer of Object.values(state.units)) {
    if (!isDeployed(wearer) || wearer.zone !== enemy.zone || distance(wearer, enemy) > 6
      || !hasGearUnique(state, wearer, 'heaven-devouring-gourd')) continue;
    const runtime = wearer.gearRuntime ??= {};
    runtime.souls = Math.min(25, (runtime.souls ?? 0) + 1);
    if (runtime.souls < 25) continue;
    runtime.souls = 0;
    gearProc(state, wearer, 'heaven-devouring-gourd', undefined, 5);
    for (const target of Object.values(state.enemies)) {
      if (target.zone === wearer.zone && distance(target, wearer) <= 5)
        hurt(wearer, target, effectiveUnitAttack(wearer) * .6 * 25);
    }
  }
}

export function beginGearWave(state: GameState): void {
  state.gearTraps = [];
  for (const unit of Object.values(state.units)) {
    if (unit.summonDuration !== undefined) continue;
    const mods = gearModsOf(state, unit);
    if (mods.uniques.has('blood-pact') && unit.hp > 0) unit.hp = unit.maxHp;
    if (isDeployed(unit)) unit.shield += unit.maxHp * mods['wave-shield'] * (mods.uniques.has('blood-pact') ? .4 : 1);
    unit.gearRuntime = { waveHp: unit.hp, hpSeen: unit.hp, shieldSeen: unit.shield,
      energySeen: unit.energy ?? 0, lastPosition: { x: unit.x, z: unit.z, zone: unit.zone } };
  }
}

/** Runs before death prevention, so rewind can save an otherwise lethal hit. */
export function tryGearRewind(state: GameState, unit: Unit): boolean {
  const runtime = unit.gearRuntime ??= {};
  if (unit.hp >= unit.maxHp * .2 || runtime.timeUsed || !hasGearUnique(state, unit, 'time-reversal')) return false;
  runtime.timeUsed = true;
  unit.hp = Math.max(1, Math.min(unit.maxHp, runtime.waveHp ?? unit.maxHp));
  unit.abilityCooldown = 0;
  unit.energy = unit.maxEnergy ?? 100;
  runtime.hpSeen = unit.hp; runtime.energySeen = unit.energy;
  gearProc(state, unit, 'time-reversal');
  return true;
}

export function tryGearMirror(state: GameState, unit: Unit, attacker: Enemy | undefined, hurt: GearHurt): boolean {
  if (!attacker || !['ranged', 'boss'].includes(attacker.kind)
    || !hasGearUnique(state, unit, 'eight-trigram-mirror') || gearRandom(state) >= .25) return false;
  gearProc(state, unit, 'eight-trigram-mirror', attacker);
  hurt(unit, attacker, effectiveUnitAttack(unit) * 1.5);
  return true;
}

export function resolveGearLightning(state: GameState, unit: Unit, hurt: GearHurt): void {
  const queue = unit.gearRuntime?.lightning?.splice(0, 12) ?? [];
  if (!hasGearUnique(state, unit, 'lightning-talisman')) return;
  for (const strike of queue) {
    const first = state.enemies[strike.targetId];
    let point = first ?? strike.point ?? unit;
    const seen = new Set<string>([strike.targetId]);
    for (let hop = 0; hop < 3; hop++) {
      const target = Object.values(state.enemies).filter(enemy => enemy.zone === unit.zone
        && !seen.has(enemy.id) && distance(enemy, point) <= 5)
        .sort((a, b) => distance(a, point) - distance(b, point))[0];
      if (!target) break;
      seen.add(target.id);
      gearProc(state, unit, 'lightning-talisman', target, undefined, { x: point.x, z: point.z });
      point = target;
      hurt(unit, target, strike.damage * .5);
    }
  }
}

export function gearBasicHit(state: GameState, unit: Unit, enemy: Enemy, damage: number,
  hurt: (damage: number) => void, healOnYin: boolean): number {
  const mods = gearModsOf(state, unit);
  if (mods.uniques.has('yin-yang') && !healOnYin) damage *= 1.5;
  const before = enemy.hp;
  hurt(damage);
  const dealt = Math.max(0, before - Math.max(0, enemy.hp));
  if (unit.hp > 0) unit.hp = Math.min(unit.maxHp, unit.hp + dealt * mods.lifesteal);
  if (mods.uniques.has('yin-yang') && healOnYin) {
    const recipient = Object.values(state.units).filter(ally => isDeployed(ally) && ally.zone === unit.zone
      && distance(ally, unit) <= 8).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (recipient) recipient.hp = Math.min(recipient.maxHp, recipient.hp + dealt * .3);
  }
  return damage;
}

