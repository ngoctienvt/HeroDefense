import { SYNERGIES } from '../../../content/catalog.js';
import { BOND_TUNING } from '../../../content/bond-design.js';
import type { Enemy, GameState, Player, Unit } from '../../contracts/src/types.js';
import { activeBondCountOf, isBondMember } from './bond-mods.js';
import { BOND_HANDLERS, type BondContext } from './bonds/index.js';
import { event, isDeployed } from './rules.js';

/** Recomputes the owner's active bonds; bumps bondVersion (the gear-mod cache key) only on change. */
export function refreshBonds(state: GameState, owner: string, units: readonly Unit[]): void {
  const player = state.players[owner];
  const roster = new Set(units.filter(u => u.slot >= 0 && isBondMember(u)).map(u => u.heroId));
  const next = SYNERGIES.flatMap(s => {
    const count = s.members.filter(id => roster.has(id)).length;
    const level = s.thresholds.filter(t => count >= t).length;
    return level ? [{ id: s.id, count, level }] : [];
  });
  const changed = JSON.stringify(next) !== JSON.stringify(player.activeSynergies);
  player.activeSynergies = next;
  if (changed) {
    player.bondVersion++;
    console.debug(JSON.stringify({ event: 'bond.refresh', bonds: next.map(b => ({ id: b.id, level: b.level })) }));
  }
}

/** Counters changed outside refreshBonds; invalidates cached mods that read them. */
export function touchBonds(player: Player): void { player.bondVersion++; }

/** Independent xorshift stream so bond rolls never shift control or crit sequences. */
export function bondRandom(state: GameState): number {
  let x = (state.bondSeed ?? ((state.seed ^ 0x2545f491) >>> 0)) | 0 || 1;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.bondSeed = x >>> 0;
  return state.bondSeed / 4294967296;
}

/** Presentation event for a bond firing; the client maps it to a toast and an existing VFX. */
export function bondTrigger(state: GameState, bondId: number, source: Unit, text?: string, value?: number): void {
  event(state, { kind: 'bond-trigger', bondId, source: source.id, owner: source.owner, x: source.x, z: source.z,
    zone: source.zone, ...(text ? { text } : {}), ...(value !== undefined ? { value } : {}) });
  console.debug(JSON.stringify({ event: 'bond.trigger', bondId, value }));
}

/** The handler context of one active bond, for actions the player triggers by hand. */
export function bondContextFor(state: GameState, owner: string, bondId: number): BondContext | undefined {
  return contextsFor(state, owner).find(entry => entry.id === bondId)?.ctx;
}

function contextsFor(state: GameState, owner: string): { id: number; ctx: BondContext }[] {
  const player = state.players[owner];
  if (!player) return [];
  return player.activeSynergies.filter(active => BOND_HANDLERS[active.id])
    .map(active => ({ id: active.id, ctx: { state, owner, player, bondId: active.id, count: active.count, level: active.level } }));
}

/** Unit counts toward `owner`'s bonds; copies and summoned units never trigger handlers. */
const countsForBond = (unit: Unit): boolean => unit.slot >= 0 && isBondMember(unit);

/**
 * Fires after a skill resolves (instant and windup casts alike). A cast forced by a bond is marked
 * `bondTriggered` and does not re-emit, so bond casts can never chain into other bond casts.
 */
export function bondOnCast(state: GameState, caster: Unit, targetId: string | undefined, bondTriggered: boolean): void {
  if (bondTriggered || !countsForBond(caster)) return;
  for (const { id, ctx } of contextsFor(state, caster.owner)) BOND_HANDLERS[id].onCast?.(ctx, caster, targetId);
}
export function bondOnKill(state: GameState, killer: Unit, enemy: Enemy): void {
  for (const { id, ctx } of contextsFor(state, killer.owner)) BOND_HANDLERS[id].onKill?.(ctx, killer, enemy);
}
export function bondOnHeroDeath(state: GameState, unit: Unit): void {
  if (!countsForBond(unit)) return;
  for (const { id, ctx } of contextsFor(state, unit.owner)) BOND_HANDLERS[id].onHeroDeath?.(ctx, unit);
}
export function bondOnHeal(state: GameState, source: Unit, target: Unit, amount: number, overheal: number): void {
  if (!countsForBond(source)) return;
  for (const { id, ctx } of contextsFor(state, source.owner)) BOND_HANDLERS[id].onHeal?.(ctx, source, target, amount, overheal);
}
export function bondOnShield(state: GameState, source: Unit, target: Unit, amount: number): void {
  if (!countsForBond(source)) return;
  for (const { id, ctx } of contextsFor(state, source.owner)) BOND_HANDLERS[id].onShield?.(ctx, source, target, amount);
}

/** Wave start: reset per-wave counters, apply Duyên Tụ, then let handlers react. */
export function bondOnWaveStart(state: GameState): void {
  for (const player of Object.values(state.players)) {
    const bond = player.bondState;
    bond.souls = 0; bond.longUy = 0; bond.thanVi = 0; bond.tamTai = 0; bond.dienTich = 0;
    bond.usedThisWave = {}; bond.thanViMark = undefined;
    touchBonds(player);
    for (const unit of Object.values(state.units)) {
      if (unit.owner !== player.id || !isDeployed(unit) || !countsForBond(unit)) continue;
      if (activeBondCountOf(player, unit.heroId) < BOND_TUNING.duyenTu.minBonds) continue;
      // Cooldown heroes start waves with no cooldown, so only Nộ heroes have a head start to gain.
      if (unit.energyType !== 'rage_on_attack' && unit.energyType !== 'rage_on_hit') continue;
      unit.energy = Math.min(unit.maxEnergy ?? 100, (unit.energy ?? 0) + BOND_TUNING.duyenTu.startRage);
      // Keep the gear rage-gain tracker in step so this flat grant is not scaled again.
      (unit.gearRuntime ??= {}).energySeen = unit.energy;
    }
  }
  for (const owner of Object.keys(state.players))
    for (const { id, ctx } of contextsFor(state, owner)) BOND_HANDLERS[id].onWaveStart?.(ctx);
}
export function bondOnWaveClear(state: GameState): void {
  for (const owner of Object.keys(state.players))
    for (const { id, ctx } of contextsFor(state, owner)) BOND_HANDLERS[id].onWaveClear?.(ctx);
}

/** Product of every active bond's damage modifier for this hit. */
export function bondDamageMultiplier(state: GameState, attacker: Unit, enemy: Enemy): number {
  let multiplier = 1;
  for (const { id, ctx } of contextsFor(state, attacker.owner))
    multiplier *= BOND_HANDLERS[id].damageMultiplier?.(ctx, attacker, enemy) ?? 1;
  return multiplier;
}
/** Execute effects skip bosses; handlers only decide for the rest. */
export function bondExecutes(state: GameState, attacker: Unit, enemy: Enemy): boolean {
  if (enemy.kind === 'boss' || enemy.rank === 'boss') return false;
  return contextsFor(state, attacker.owner).some(({ id, ctx }) => BOND_HANDLERS[id].executes?.(ctx, attacker, enemy));
}
export function bondOnHit(state: GameState, attacker: Unit, enemy: Enemy): void {
  for (const { id, ctx } of contextsFor(state, attacker.owner)) BOND_HANDLERS[id].onHit?.(ctx, attacker, enemy);
}
export function bondShieldMultiplier(state: GameState, source: Unit, target: Unit): number {
  let multiplier = 1;
  for (const { id, ctx } of contextsFor(state, source.owner))
    multiplier *= BOND_HANDLERS[id].shieldMultiplier?.(ctx, source, target) ?? 1;
  return multiplier;
}
export function bondOnHeroHit(state: GameState, unit: Unit, attacker: Enemy | undefined): void {
  if (!countsForBond(unit)) return;
  for (const { id, ctx } of contextsFor(state, unit.owner)) BOND_HANDLERS[id].onHeroHit?.(ctx, unit, attacker);
}
/** Called with hp <= 0 before the death state is applied; true means a bond saved the unit. */
export function bondRescue(state: GameState, unit: Unit): boolean {
  if (!countsForBond(unit)) return false;
  for (const { id, ctx } of contextsFor(state, unit.owner)) {
    if (BOND_HANDLERS[id].rescue?.(ctx, unit) && unit.hp > 0) return true;
  }
  return false;
}
export function bondTick(state: GameState, dt: number): void {
  if (state.phase !== 'combat') return;
  for (const owner of Object.keys(state.players))
    for (const { id, ctx } of contextsFor(state, owner)) BOND_HANDLERS[id].onTick?.(ctx, dt);
}
export function bondOnAttack(state: GameState, attacker: Unit, target: Enemy, hitIds: readonly string[], damage: number,
  hurt: (enemy: Enemy, damage: number) => void): void {
  if (!countsForBond(attacker)) return;
  for (const { id, ctx } of contextsFor(state, attacker.owner))
    BOND_HANDLERS[id].onAttack?.(ctx, attacker, target, hitIds, damage, hurt);
}
/** How an extra bond hit is drawn: a flying arrow or bolt, an instant slash line, or an expanding blast at the point. */
export type BondStrikeStyle = 'arrow' | 'bolt' | 'slash' | 'blast';
/** Targets drawn per call, so a burst never floods the 96-event buffer. */
const MAX_STRIKES_PER_CALL = 8;

/**
 * Presentation event for an extra hit a bond dealt (the damage is already applied by the server).
 * `from` is where it starts; the client flies or draws it to each target so the player sees what hit what.
 */
export function bondStrike(state: GameState, style: BondStrikeStyle, from: { x: number; z: number; id?: string },
  targets: readonly { x: number; z: number; zone: number; id?: string }[], bondId: number, owner: string): void {
  for (const to of targets.slice(0, MAX_STRIKES_PER_CALL)) {
    event(state, { kind: 'trait', skillId: `bond-strike-${style}`, bondId, owner, source: from.id, target: to.id,
      origin: { x: from.x, z: from.z }, x: to.x, z: to.z, zone: to.zone });
  }
}

export function bondHealMultiplier(state: GameState, source: Unit, target: Unit): number {
  let multiplier = 1;
  for (const { id, ctx } of contextsFor(state, source.owner))
    multiplier *= BOND_HANDLERS[id].healMultiplier?.(ctx, source, target) ?? 1;
  return multiplier;
}
export function bondOnBasicAttack(state: GameState, unit: Unit, target: Enemy): void {
  if (!countsForBond(unit)) return;
  for (const { id, ctx } of contextsFor(state, unit.owner)) BOND_HANDLERS[id].onBasicAttack?.(ctx, unit, target);
}
/** Total damage moved off `unit` by bonds; the handlers apply it to the other hero themselves. */
export function bondRedirect(state: GameState, unit: Unit, damage: number, attacker: Enemy | undefined): number {
  if (!countsForBond(unit)) return 0;
  let moved = 0;
  for (const { id, ctx } of contextsFor(state, unit.owner)) moved += BOND_HANDLERS[id].redirect?.(ctx, unit, damage - moved, attacker) ?? 0;
  return moved;
}
export function bondExtraClones(state: GameState, caster: Unit): number {
  if (!countsForBond(caster)) return 0;
  let extra = 0;
  for (const { id, ctx } of contextsFor(state, caster.owner)) extra += BOND_HANDLERS[id].extraClones?.(ctx, caster) ?? 0;
  return extra;
}
export function bondOnCrit(state: GameState, unit: Unit, enemy: Enemy): void {
  if (!countsForBond(unit)) return;
  for (const { id, ctx } of contextsFor(state, unit.owner)) BOND_HANDLERS[id].onCrit?.(ctx, unit, enemy);
}
export function bondAreaScale(state: GameState, caster: Unit): number {
  if (!countsForBond(caster)) return 1;
  let scale = 1;
  for (const { id, ctx } of contextsFor(state, caster.owner)) scale *= BOND_HANDLERS[id].areaScale?.(ctx, caster) ?? 1;
  return scale;
}
export function bondSummonScale(state: GameState, caster: Unit): number {
  if (!countsForBond(caster)) return 1;
  let scale = 1;
  for (const { id, ctx } of contextsFor(state, caster.owner)) scale *= BOND_HANDLERS[id].summonScale?.(ctx, caster) ?? 1;
  return scale;
}
export function bondOnSummonEnd(state: GameState, summon: Unit): void {
  if (!summon.summonerId) return;
  const owner = state.units[summon.summonerId]?.owner;
  if (!owner) return;
  for (const { id, ctx } of contextsFor(state, owner)) BOND_HANDLERS[id].onSummonEnd?.(ctx, summon);
}
