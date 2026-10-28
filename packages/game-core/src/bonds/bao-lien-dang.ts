import { empowerAllyMax } from '../ally-scaled-support.js';
import { hurtEnemy } from '../combat.js';
import { effectiveUnitAttack } from '../stats.js';
import { bondStrike, bondTrigger } from '../bond-runtime.js';
import { castFocus, deployedHero, enemiesIn, nearestTo } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const TRAM_HUONG = 'h03Q', DUONG_TIEN = 'h00U';
const BUFF_SECONDS = 10, BUFF_BONUS = .3, LANTERN_POWER = 1.5;

/** Bảo Liên Đăng: Trầm Hương empowers Dương Tiễn, whose skill then strikes the monsters around the target. */
export const baoLienDang: BondHandler = {
  onCast(ctx, caster, targetId) {
    if (caster.heroId === TRAM_HUONG) {
      const ally = deployedHero(ctx.state, ctx.owner, DUONG_TIEN);
      if (!ally) return;
      empowerAllyMax(ally, BUFF_SECONDS, BUFF_BONUS);
      ally.bonusArmor = { remaining: BUFF_SECONDS, amount: Math.max(ally.bonusArmor?.amount ?? 0, ally.armor * BUFF_BONUS) };
      bondTrigger(ctx.state, ctx.bondId, caster, 'Bảo Liên Đăng soi sáng Dương Tiễn');
    } else if (caster.heroId === DUONG_TIEN) {
      const focus = castFocus(ctx.state, caster, targetId);
      if (!focus) return;
      const struck = nearestTo(enemiesIn(ctx.state, caster.zone), focus, 6, 4);
      for (const enemy of struck) hurtEnemy(ctx.state, caster, enemy, effectiveUnitAttack(caster) * LANTERN_POWER, 0, false, false, true);
      bondStrike(ctx.state, 'slash', caster, struck, ctx.bondId, ctx.owner);
    }
  },
};
