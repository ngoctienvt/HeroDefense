import { BOND_TUNING } from '../../../../content/bond-design.js';
import { bondTrigger, touchBonds } from '../bond-runtime.js';
import type { Unit } from '../../../contracts/src/types.js';
import { summonBondUnit, UNTIL_WAVE_END } from './bond-helpers.js';
import type { BondContext, BondHandler } from './index.js';

const KIM_THAN_HERO = 'h012';

/** Thỉnh Kinh and Hậu Tây Du share one Kiếp Nạn counter; when both are active only Thỉnh Kinh counts. */
export function gainKiep(ctx: BondContext, amount: number): void {
  if (ctx.bondId === 5 && ctx.player.activeSynergies.some(active => active.id === 4)) return;
  ctx.player.bondState.kiep += amount;
  touchBonds(ctx.player);
  console.debug(JSON.stringify({ event: 'bond.kiep', kiep: ctx.player.bondState.kiep }));
}

/** Counting rules common to both bonds; the bond-specific handlers spread this in. */
export const kiepCounting: Pick<BondHandler, 'onWaveClear' | 'onKill'> = {
  onWaveClear(ctx) { gainKiep(ctx, BOND_TUNING.kiep.perWave); },
  onKill(ctx, _killer, enemy) {
    if (enemy.kind === 'boss' || enemy.rank === 'boss') gainKiep(ctx, BOND_TUNING.kiep.perBoss);
    else if (enemy.rank === 'chieftain') gainKiep(ctx, BOND_TUNING.kiep.perChieftain);
  },
};

/** 9 Kiếp milestone: a golden monkey joins every cast of the monkey hero. */
export function kimThanOnCast(ctx: BondContext, caster: Unit, monkeyHeroId: string): void {
  if (ctx.state.phase === 'lobby' || caster.heroId !== monkeyHeroId || ctx.player.bondState.kiep < BOND_TUNING.kiep.milestones[0]) return;
  summonBondUnit(ctx.state, caster, KIM_THAN_HERO, UNTIL_WAVE_END);
  bondTrigger(ctx.state, ctx.bondId, caster, 'Kim Thân Hầu Vương');
}
