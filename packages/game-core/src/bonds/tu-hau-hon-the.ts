import { forceCast } from '../bond-cast.js';
import { bondTrigger } from '../bond-runtime.js';
import { deployedHero, summonBondUnit, UNTIL_WAVE_END } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const NGO_KHONG = 'h00R', DAU_CHIEN = 'h012', LUC_NHI = 'h03Y';

/** Tứ Hầu Hỗn Thế: Ngộ Không's casts call full-strength golden monkeys; the false monkey echoes the real ones. */
export const tuHauHonThe: BondHandler = {
  onCast(ctx, caster, targetId) {
    const { state } = ctx;
    if (state.phase === 'lobby') return;
    if (caster.heroId === NGO_KHONG) {
      // Full strength: the monkey inherits 100% of its summoner's attack and health.
      summonBondUnit(state, caster, DAU_CHIEN, UNTIL_WAVE_END, 1, 1);
      bondTrigger(state, ctx.bondId, caster, 'Kim Thân Hầu Vương');
    }
    if (ctx.count >= 3 && (caster.heroId === NGO_KHONG || caster.heroId === DAU_CHIEN)) {
      const imitator = deployedHero(state, ctx.owner, LUC_NHI);
      if (imitator && forceCast(state, imitator, targetId)) bondTrigger(state, ctx.bondId, imitator, 'Chân Giả Mỹ Hầu Vương');
    }
  },
};
