import { bondRandom, bondStrike, bondTrigger } from '../bond-runtime.js';
import { hurtEnemy } from '../combat.js';
import { tryHardControl } from '../crowd-control.js';
import { effectiveUnitAttack } from '../stats.js';
import { enemiesIn, isMember } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const THUY_MAU = 'h00Q' /* Long Vương, the dragon king of the waters */, CONG_CONG = 'h01G';
const SLOW_BONUS = 1.2, COUNTER_CHANCE = .35, COUNTER_POWER = 1.25, FREEZE_SECONDS = 1.5;

/** Thủy Thần: slowed monsters take more damage, the water gods strike back, Cộng Công's wave freezes the slowed. */
export const thuyThan: BondHandler = {
  damageMultiplier(ctx, attacker, enemy) {
    return isMember(ctx, attacker) && enemy.slow > 0 ? SLOW_BONUS : 1;
  },
  onHeroHit(ctx, unit, attacker) {
    if (ctx.count < 3 || !attacker || (unit.heroId !== THUY_MAU && unit.heroId !== CONG_CONG)) return;
    if (!ctx.state.enemies[attacker.id] || bondRandom(ctx.state) >= COUNTER_CHANCE) return;
    hurtEnemy(ctx.state, unit, attacker, effectiveUnitAttack(unit) * COUNTER_POWER, 0, false, false, true);
    bondStrike(ctx.state, 'slash', unit, [attacker], ctx.bondId, ctx.owner);
    bondTrigger(ctx.state, ctx.bondId, unit, 'Nộ Hải phản kích');
  },
  onCast(ctx, caster) {
    if (ctx.count < 3 || caster.heroId !== CONG_CONG) return;
    for (const enemy of enemiesIn(ctx.state, caster.zone))
      if (enemy.slow > 0) tryHardControl(ctx.state, caster, enemy, 'frozen', FREEZE_SECONDS);
  },
};
