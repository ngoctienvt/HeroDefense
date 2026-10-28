import { bondTrigger } from '../bond-runtime.js';
import { castFocus, deployedMembers, enemiesIn, isMember, nearestTo } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const DAT_KY = 'h00X', KIM_SI = 'h016';
const WEAKEN_SECONDS = 3, WEAKEN_STRENGTH = .25, KILL_HEAL = .02, CRIT_STEP = .05, CRIT_CAP = .25, CRIT_SECONDS = 5;

/** Yêu Linh: Đát Kỷ's arrows weaken monsters; every kill heals the pack and sharpens Kim Sí. */
export const yeuLinh: BondHandler = {
  onCast(ctx, caster, targetId) {
    if (ctx.count < 3 || caster.heroId !== DAT_KY) return;
    const focus = castFocus(ctx.state, caster, targetId);
    if (!focus) return;
    for (const enemy of nearestTo(enemiesIn(ctx.state, caster.zone), focus, 5, 3.5))
      enemy.attackWeak = { remaining: WEAKEN_SECONDS, strength: WEAKEN_STRENGTH };
    bondTrigger(ctx.state, ctx.bondId, caster, 'Hồ Mị');
  },
  onKill(ctx, killer) {
    if (ctx.count < 4 || ctx.state.phase === 'lobby' || !isMember(ctx, killer)) return;
    for (const member of deployedMembers(ctx)) {
      member.hp = Math.min(member.maxHp, member.hp + member.maxHp * KILL_HEAL);
      if (member.heroId === KIM_SI)
        member.critBlessing = { remaining: CRIT_SECONDS, chance: Math.min(CRIT_CAP, (member.critBlessing?.chance ?? 0) + CRIT_STEP) };
    }
  },
};
