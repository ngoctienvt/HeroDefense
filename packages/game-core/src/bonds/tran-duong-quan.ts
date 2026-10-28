import { bondTrigger } from '../bond-runtime.js';
import { chargeSkill, deployedMembers, isMember, oncePerWave } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const KIM_TRA = 'h009', NA_TRA = 'h00V';
const SHARE_RAGE = 15, SHARE_COOLDOWN = 1.5, SHIELD_BONUS = 1.4, ROOT_BONUS = 1.25;
const TOWER_HEAL = .5, TOWER_SECONDS = 2.5, NEZHA_HEAL = .5, NEZHA_SECONDS = 1.5;

/** Trần Đường Quan: the Lý family shares momentum, shields and a once-per-wave rescue. */
export const tranDuongQuan: BondHandler = {
  onCast(ctx, caster) {
    if (ctx.state.phase === 'lobby' || !isMember(ctx, caster)) return;
    for (const other of deployedMembers(ctx)) if (other.id !== caster.id) chargeSkill(other, SHARE_RAGE, SHARE_COOLDOWN);
    bondTrigger(ctx.state, ctx.bondId, caster, 'Huynh đệ đồng tâm');
  },
  shieldMultiplier(ctx, source, target) {
    return ctx.count >= 3 && source.heroId === KIM_TRA && isMember(ctx, target) ? SHIELD_BONUS : 1;
  },
  damageMultiplier(ctx, attacker, enemy) {
    return ctx.count >= 3 && isMember(ctx, attacker) && (enemy.root ?? 0) > 0 ? ROOT_BONUS : 1;
  },
  rescue(ctx, unit) {
    if (ctx.count < 4 || !isMember(ctx, unit)) return false;
    if (oncePerWave(ctx.player, '2:tower')) {
      unit.hp = unit.maxHp * TOWER_HEAL; unit.divineImmortal = Math.max(unit.divineImmortal ?? 0, TOWER_SECONDS);
      bondTrigger(ctx.state, ctx.bondId, unit, 'Linh Lung Bảo Tháp');
      return true;
    }
    if (unit.heroId === NA_TRA && oncePerWave(ctx.player, `2:nezha:${unit.id}`)) {
      unit.hp = unit.maxHp * NEZHA_HEAL; unit.divineImmortal = Math.max(unit.divineImmortal ?? 0, NEZHA_SECONDS);
      bondTrigger(ctx.state, ctx.bondId, unit, 'Na Tra hồi sinh tại chỗ');
      return true;
    }
    return false;
  },
};
