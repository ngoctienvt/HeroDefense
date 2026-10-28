import { hurtEnemy } from '../combat.js';
import { effectiveUnitAttack } from '../stats.js';
import { bondStrike, bondTrigger } from '../bond-runtime.js';
import { castFocus, deployedHeroes, enemiesIn, isMember, nearestTo } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const TEAM_HEAL = .04, LIGHT_POWER = 1;

/** Phật Quang Phổ Chiếu: every cast of a member mends the squad and strikes the monsters around the target. */
export const phatQuang: BondHandler = {
  onCast(ctx, caster, targetId) {
    const { state } = ctx;
    if (ctx.count < 3 || state.phase === 'lobby' || !isMember(ctx, caster)) return;
    for (const ally of deployedHeroes(state, ctx.owner)) ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * TEAM_HEAL);
    const focus = castFocus(state, caster, targetId);
    if (focus) {
      const struck = nearestTo(enemiesIn(state, caster.zone), focus, 6, 4);
      for (const enemy of struck) hurtEnemy(state, caster, enemy, effectiveUnitAttack(caster) * LIGHT_POWER, 0, false, false, true);
      bondStrike(state, 'slash', caster, struck, ctx.bondId, ctx.owner);
    }
    bondTrigger(state, ctx.bondId, caster, 'Phổ Độ');
  },
};
