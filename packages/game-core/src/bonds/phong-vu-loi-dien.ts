import { applyEnemyStatus } from '../combat-status.js';
import { castFocus, enemiesIn, nearestTo } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const LONG_VUONG = 'h00Q', LOI_CHAN_TU = 'h00T', DIEN_MAU = 'h040' /* Trương Đạo Lăng, thunder talismans */, PHONG_BA = 'h016' /* Kim Sí Đại Bằng, master of the gale */;
const MAX_CHARGES = 10, CHARGE_BONUS = .05, CHARGE_CAP = .5;
const SLOW_SECONDS = 3, SLOW_STRENGTH = .3, SLOW_BONUS = 1.3;

/** Phong Vũ Lôi Điện: rain and wind slow the field, thunder punishes the slowed. */
export const phongVuLoiDien: BondHandler = {
  onCast(ctx, caster, targetId) {
    if (ctx.count >= 4 && caster.heroId === PHONG_BA) ctx.player.bondState.dienTich = 0;
    if (ctx.count < 3 || (caster.heroId !== LONG_VUONG && caster.heroId !== PHONG_BA)) return;
    const focus = castFocus(ctx.state, caster, targetId);
    if (!focus) return;
    for (const enemy of nearestTo(enemiesIn(ctx.state, caster.zone), focus, 8, 4))
      applyEnemyStatus(enemy, caster, 0, 'slow', SLOW_SECONDS, SLOW_STRENGTH);
  },
  damageMultiplier(ctx, attacker, enemy) {
    if (ctx.count >= 4 && attacker.heroId === PHONG_BA)
      return 1 + Math.min(CHARGE_CAP, ctx.player.bondState.dienTich * CHARGE_BONUS);
    return ctx.count >= 3 && (attacker.heroId === LOI_CHAN_TU || attacker.heroId === DIEN_MAU) && enemy.slow > 0 ? SLOW_BONUS : 1;
  },
  // Trương Đạo Lăng stores a charge with every attack; Kim Sí spends them all when his gale is cast.
  onBasicAttack(ctx, unit) {
    if (ctx.count < 4 || unit.heroId !== DIEN_MAU) return;
    ctx.player.bondState.dienTich = Math.min(MAX_CHARGES, ctx.player.bondState.dienTich + 1);
  },
};
