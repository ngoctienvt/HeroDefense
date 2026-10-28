import { BOND_TUNING } from '../../../../content/bond-design.js';
import { bondStrike, bondTrigger, touchBonds } from '../bond-runtime.js';
import { hurtEnemy } from '../combat.js';
import { effectiveUnitAttack } from '../stats.js';
import { deployedHero, enemiesIn, isEliteOrChieftain, isMember, isMinion, summonBondUnit, tickTimer, UNTIL_WAVE_END } from './bond-helpers.js';
import type { BondContext, BondHandler } from './index.js';

const NGU_DAO = 'h00Y', HEAL_PER_SOUL = .01;
const VO_THUONG = 'h00H', CHUNG_QUY = 'h00N', PHAN_QUAN = 'h00O', QUY_SAI = 'h003';
const SLOW_BONUS = 1.3, JUDGE_SECONDS = 8, JUDGE_POWER = 3, EXECUTE_BELOW = .12;
const REBIRTH_COST = 15, REBIRTH_HEAL = .4;

/**
 * Âm Binh is the player's choice: Hồn are spent only when the player asks, so they can keep them
 * for the attack-speed bonus. Returns an error message, or undefined when a Quỷ Sai was called.
 */
export function callAmBinh(ctx: BondContext): string | undefined {
  const { state } = ctx, bond = ctx.player.bondState;
  if (state.phase !== 'combat') return 'Chỉ gọi Quỷ Sai khi đang giao chiến.';
  if (ctx.count < 4) return 'Cần đủ 4 thành viên U Minh.';
  const captain = deployedHero(state, ctx.owner, CHUNG_QUY);
  if (!captain) return 'Chung Quỳ phải đang ra trận.';
  if (bond.souls < BOND_TUNING.souls.amBinhCost) return `Cần ${BOND_TUNING.souls.amBinhCost} Hồn.`;
  bond.souls -= BOND_TUNING.souls.amBinhCost;
  touchBonds(ctx.player);
  summonBondUnit(state, captain, QUY_SAI, UNTIL_WAVE_END);
  bondTrigger(state, ctx.bondId, captain, 'Âm Binh xuất hiện');
  return undefined;
}

/** U Minh: Hồn from members' kills fuel attack speed, judgement, a Quỷ Sai on demand and rebirth. */
export const uMinh: BondHandler = {
  onKill(ctx, killer) {
    if (ctx.state.phase === 'lobby' || !isMember(ctx, killer)) return;
    const bond = ctx.player.bondState;
    bond.souls = Math.min(BOND_TUNING.souls.cap, bond.souls + 1);
    touchBonds(ctx.player);
  },
  damageMultiplier(_ctx, attacker, enemy) {
    return attacker.heroId === VO_THUONG && enemy.slow > 0 ? SLOW_BONUS : 1;
  },
  // Ngũ Đạo Tướng Quân heals 1% more for every Hồn held.
  healMultiplier: (ctx, source) => ctx.count >= 5 && source.heroId === NGU_DAO ? 1 + ctx.player.bondState.souls * HEAL_PER_SOUL : 1,
  executes(ctx, attacker, enemy) {
    return ctx.count >= 3 && isMember(ctx, attacker) && isMinion(enemy) && enemy.hp < enemy.maxHp * EXECUTE_BELOW;
  },
  // Kết Án: Phán Quan strikes the strongest elite or chieftain for a plain multiple of his attack.
  onTick(ctx, dt) {
    if (ctx.count < 3 || !tickTimer(ctx.player, '3:judge', dt, JUDGE_SECONDS)) return;
    const judge = deployedHero(ctx.state, ctx.owner, PHAN_QUAN);
    const target = judge && enemiesIn(ctx.state, judge.zone).filter(isEliteOrChieftain).sort((a, b) => b.hp - a.hp)[0];
    if (!judge || !target) return;
    hurtEnemy(ctx.state, judge, target, effectiveUnitAttack(judge) * JUDGE_POWER, 0, false, false, true);
    bondStrike(ctx.state, 'slash', judge, [target], ctx.bondId, ctx.owner);
    bondTrigger(ctx.state, ctx.bondId, judge, 'Kết Án');
  },
  rescue(ctx, unit) {
    const bond = ctx.player.bondState;
    if (bond.rebirthOff || ctx.count < 5 || !isMember(ctx, unit) || bond.souls < REBIRTH_COST) return false;
    bond.souls = 0; touchBonds(ctx.player);
    unit.hp = unit.maxHp * REBIRTH_HEAL;
    bondTrigger(ctx.state, ctx.bondId, unit, 'Ngũ Đạo Luân Hồi');
    return true;
  },
};
