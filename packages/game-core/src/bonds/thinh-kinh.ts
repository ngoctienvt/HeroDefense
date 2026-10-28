import { healAlly, empowerAllyMax } from '../ally-scaled-support.js';
import { hurtEnemy, hurtUnit } from '../combat.js';
import { effectiveUnitAttack } from '../stats.js';
import { bondStrike, bondTrigger } from '../bond-runtime.js';
import { castFocus, deployedHero, enemiesIn, nearestTo } from './bond-helpers.js';
import { kimThanOnCast, kiepCounting } from './kiep-shared.js';
import type { BondHandler } from './index.js';

const BAT_GIOI = 'h00J', SA_TANG = 'h00K', NGO_KHONG = 'h00R', DUONG_TANG = 'h00S';
const SHARE = .3, CHANT_POWER = 1.5, VENGEANCE_BONUS = .5, VENGEANCE_SECONDS = 8, HEAL_POWER = 1;

/** Thỉnh Kinh: the pilgrims guard Đường Tăng and grow with every trial survived (Kiếp Nạn). */
export const thinhKinh: BondHandler = {
  ...kiepCounting,
  redirect(ctx, unit, damage, attacker) {
    if (ctx.count < 2 || unit.heroId !== DUONG_TANG) return 0;
    const guardian = deployedHero(ctx.state, ctx.owner, BAT_GIOI);
    if (!guardian) return 0;
    const moved = damage * SHARE;
    hurtUnit(ctx.state, guardian, moved, attacker);
    return moved;
  },
  onCast(ctx, caster, targetId) {
    const { state } = ctx;
    if (ctx.count >= 4) kimThanOnCast(ctx, caster, NGO_KHONG);
    if (ctx.count >= 2 && caster.heroId === SA_TANG) {
      const master = deployedHero(state, ctx.owner, DUONG_TANG);
      if (master && master.hp < master.maxHp) healAlly(master, effectiveUnitAttack(caster) * HEAL_POWER, { state, source: caster });
    }
    if (ctx.count >= 3 && caster.heroId === DUONG_TANG) {
      const focus = castFocus(state, caster, targetId);
      if (!focus) return;
      const struck = nearestTo(enemiesIn(state, caster.zone), focus, 6, 4);
      const damage = effectiveUnitAttack(caster) * CHANT_POWER;
      for (const enemy of struck) hurtEnemy(state, caster, enemy, damage, 0, false, false, true);
      bondStrike(state, 'slash', caster, struck, ctx.bondId, ctx.owner);
      bondTrigger(state, ctx.bondId, caster, 'Khẩn Cô Chú');
    }
  },
  onHeroDeath(ctx, unit) {
    if (ctx.count < 3 || unit.heroId !== DUONG_TANG) return;
    const monkey = deployedHero(ctx.state, ctx.owner, NGO_KHONG);
    if (!monkey) return;
    empowerAllyMax(monkey, VENGEANCE_SECONDS, VENGEANCE_BONUS);
    bondTrigger(ctx.state, ctx.bondId, monkey, 'Ngộ Không nổi giận');
  },
};
