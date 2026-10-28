import { SYNERGIES } from '../../../content/catalog.js';
import { BOND_DESIGN, BOND_TUNING, type BondStat, type BondStatMods } from '../../../content/bond-design.js';
import type { Player, Unit } from '../../contracts/src/types.js';

/** Real heroes only: copies on the bench and summoned units never count toward or receive bonds. */
export const isBondMember = (unit: Pick<Unit, 'summonDuration' | 'summonerId' | 'heroId'>): boolean =>
  unit.summonDuration === undefined && unit.summonerId === undefined && unit.heroId !== 'summon_plant';

/** Number of active bonds whose roster lists this hero (drives Duyên Tụ). */
export function activeBondCountOf(player: Pick<Player, 'activeSynergies'>, heroId: string): number {
  let count = 0;
  for (const active of player.activeSynergies) {
    if (SYNERGIES.find(s => s.id === active.id)?.members.includes(heroId)) count++;
  }
  return count;
}

const isRageUnit = (unit: Pick<Unit, 'energyType'>): boolean =>
  unit.energyType === 'rage_on_attack' || unit.energyType === 'rage_on_hit';

function add(into: BondStatMods, stats: BondStatMods): void {
  for (const [stat, value] of Object.entries(stats) as [BondStat, number][]) into[stat] = (into[stat] ?? 0) + value;
}

/**
 * Stat mods a unit receives from the owner's active bonds. Pure in `player` and `unit`, so the client
 * recomputes the same result from a snapshot. Returns undefined when nothing applies.
 */
export function bondStatsOf(player: Player, unit: Unit): BondStatMods | undefined {
  if (unit.slot < 0 || !isBondMember(unit) || !player.activeSynergies.length) return undefined;
  const result: BondStatMods = {};
  for (const active of player.activeSynergies) {
    const synergy = SYNERGIES.find(s => s.id === active.id);
    if (!synergy) continue;
    const isMember = synergy.members.includes(unit.heroId);
    for (const tier of BOND_DESIGN[active.id]?.tiers ?? []) {
      if (tier.at > active.count) continue;
      for (const effect of tier.effects) {
        if (effect.kind === 'team-stats') add(result, effect.stats);
        else if (effect.kind === 'member-stats' && (effect.who ? effect.who.includes(unit.heroId) : isMember))
          add(result, effect.stats);
        else if (effect.kind === 'counter-stats' && (effect.who ? effect.who.includes(unit.heroId) : isMember)) {
          const stacks = Math.max(0, player.bondState?.[effect.counter] ?? 0);
          if (stacks) { const grown: BondStatMods = {}; grown[effect.stat] = stacks * effect.perStack; add(result, grown); }
        } else if (effect.kind === 'counter-threshold' && (effect.who ? effect.who.includes(unit.heroId) : isMember)
          && (player.bondState?.[effect.counter] ?? 0) >= effect.atLeast) add(result, effect.stats);
      }
    }
  }
  if (activeBondCountOf(player, unit.heroId) >= BOND_TUNING.duyenTu.minBonds)
    add(result, isRageUnit(unit) ? { 'rage-gain': BOND_TUNING.duyenTu.rageGain }
      : { 'cooldown-reduction': BOND_TUNING.duyenTu.cooldownReduction });
  return Object.keys(result).length ? result : undefined;
}
