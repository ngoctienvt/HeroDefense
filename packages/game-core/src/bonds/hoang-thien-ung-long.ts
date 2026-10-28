import { forceCast } from '../bond-cast.js';
import { bondTrigger } from '../bond-runtime.js';
import { chargeSkill, deployedHero } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const HIEN_VIEN = 'h01F', UNG_LONG = 'h00Z', CRIT_RAGE = 10, CRIT_COOLDOWN = 1;

/** Hoàng Thiên Ứng Long: Ứng Long answers Hiên Viên's every ultimate on the same target. */
export const hoangThienUngLong: BondHandler = {
  onCrit(ctx, unit) {
    if (unit.heroId !== HIEN_VIEN) return;
    const dragon = deployedHero(ctx.state, ctx.owner, UNG_LONG);
    if (dragon) chargeSkill(dragon, CRIT_RAGE, CRIT_COOLDOWN);
  },
  onCast(ctx, caster, targetId) {
    if (ctx.state.phase === 'lobby' || caster.heroId !== HIEN_VIEN) return;
    const dragon = deployedHero(ctx.state, ctx.owner, UNG_LONG);
    if (dragon && forceCast(ctx.state, dragon, targetId)) bondTrigger(ctx.state, ctx.bondId, dragon, 'Ứng Long hưởng ứng');
  },
};
