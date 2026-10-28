import { empowerAllyMax } from '../ally-scaled-support.js';
import { chargeSkill } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const SHIELD_CAP = .2, EMPOWER_SECONDS = 5, EMPOWER_BONUS = .15, HEAL_RAGE = 8;

/** Tiên Tử: surplus healing becomes a shield, shielded allies hit harder, healed allies gain Nộ. */
export const tienTu: BondHandler = {
  onHeal(ctx, _source, target, _amount, overheal) {
    if (ctx.count >= 4) chargeSkill(target, HEAL_RAGE, 0);
    if (overheal <= 0) return;
    const room = Math.max(0, target.maxHp * SHIELD_CAP - target.shield);
    const added = Math.min(overheal, room);
    if (added <= 0) return;
    target.shield += added;
    if (ctx.count >= 3) empowerAllyMax(target, EMPOWER_SECONDS, EMPOWER_BONUS);
  },
};
