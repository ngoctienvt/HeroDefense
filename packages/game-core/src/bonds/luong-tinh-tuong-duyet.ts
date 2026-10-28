import { HAUNGHE } from '../../../../content/hau-nghe-design.js';
import { bondStrike } from '../bond-runtime.js';
import { enemiesIn, nearestTo } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const HAU_NGHE = 'h017', HANG_NGA = 'h018';
const EXTRA_ARROWS = 4, EXTRA_RATIO = .4, SHIELD_BONUS = 1.5;

/** Lưỡng Tình Tương Duyệt: Hậu Nghệ shoots extra arrows, finishes frozen prey and gets a stronger moon shield. */
export const luongTinh: BondHandler = {
  onAttack(ctx, attacker, target, hitIds, damage, hurt) {
    if (attacker.heroId !== HAU_NGHE) return;
    const others = enemiesIn(ctx.state, attacker.zone).filter(e => !hitIds.includes(e.id));
    const struck = nearestTo(others, target, EXTRA_ARROWS, 12);
    for (const enemy of struck) hurt(enemy, damage * EXTRA_RATIO);
    bondStrike(ctx.state, 'arrow', attacker, struck, ctx.bondId, ctx.owner);
  },
  // Frozen prey always takes a critical hit; approximated as Hậu Nghệ's own critical multiplier.
  damageMultiplier(_ctx, attacker, enemy) {
    return attacker.heroId === HAU_NGHE && (enemy.frozen ?? 0) > 0 ? HAUNGHE.critMultiplier : 1;
  },
  shieldMultiplier(_ctx, source, target) {
    return source.heroId === HANG_NGA && target.heroId === HAU_NGHE ? SHIELD_BONUS : 1;
  },
};
