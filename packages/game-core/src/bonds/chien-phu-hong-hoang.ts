import { hurtEnemy } from '../combat.js';
import { effectiveUnitAttack } from '../stats.js';
import { bondTrigger } from '../bond-runtime.js';
import { deployedMembers, fillSkill, isMember } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const HINH_THIEN = 'h011';
const AREA_BONUS = 1.25, AXE_POWER = .25;

/** Chiến Phủ Hồng Hoang: Hình Thiên adds true damage and each warrior refills the other's skill on death. */
export const chienPhuHongHoang: BondHandler = {
  // Chiến Ý reaches further.
  areaScale: (_ctx, caster) => caster.heroId === HINH_THIEN ? AREA_BONUS : 1,
  onHit(ctx, attacker, enemy) {
    // Plain extra damage (armor ignored) instead of an armor-break debuff.
    if (attacker.heroId === HINH_THIEN) hurtEnemy(ctx.state, attacker, enemy, effectiveUnitAttack(attacker) * AXE_POWER, 0, false, true, true);
  },
  onHeroDeath(ctx, unit) {
    if (!isMember(ctx, unit)) return;
    for (const other of deployedMembers(ctx)) if (other.id !== unit.id) fillSkill(other);
    bondTrigger(ctx.state, ctx.bondId, unit, 'Chiến hữu trút ý chí');
  },
};
