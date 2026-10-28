import { bondStrike, bondTrigger } from '../bond-runtime.js';
import { applyEnemyStatus } from '../combat-status.js';
import { hurtEnemy } from '../combat.js';
import { effectiveUnitAttack } from '../stats.js';
import { castFocus, deployedHero } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const LA_DONG_TAN = 'h00D', KHUONG_TU_NHA = 'h019', PHUC_HY = 'h01D';
const SWORDS = 3, SWORD_POWER = .7, BURN_SECONDS = 3, LINK_BONUS = 1.5, HEAL_PERCENT = .3;

/** Đạo Vô Nhai: the sages' spells call Lã Động Tân's fire swords and feed Phục Hy. */
export const daoVoNhai: BondHandler = {
  onCast(ctx, caster, targetId) {
    const { state } = ctx;
    if (state.phase === 'lobby' || (caster.heroId !== KHUONG_TU_NHA && caster.heroId !== PHUC_HY)) return;
    const swordsman = deployedHero(state, ctx.owner, LA_DONG_TAN);
    const focus = castFocus(state, caster, targetId);
    if (swordsman && focus) {
      const power = effectiveUnitAttack(swordsman) * SWORD_POWER;
      for (let i = 0; i < SWORDS && state.enemies[focus.id]; i++) hurtEnemy(state, swordsman, focus, power, 0, false, false, true);
      bondStrike(state, 'slash', swordsman, [focus, focus, focus], ctx.bondId, ctx.owner);
      if (state.enemies[focus.id]) applyEnemyStatus(focus, swordsman, effectiveUnitAttack(swordsman), 'burn', BURN_SECONDS, SWORD_POWER);
      bondTrigger(state, ctx.bondId, swordsman, 'Kiếm Tùy Pháp');
    }
    const sage = deployedHero(state, ctx.owner, PHUC_HY);
    if (ctx.count >= 3 && caster.heroId === KHUONG_TU_NHA && sage) sage.hp = Math.min(sage.maxHp, sage.hp + sage.maxHp * HEAL_PERCENT);
  },
  damageMultiplier(ctx, attacker, enemy) {
    if (ctx.count < 3 || attacker.heroId !== KHUONG_TU_NHA || !enemy.soulLink) return 1;
    const linker = enemy.soulLink.casterId ? ctx.state.units[enemy.soulLink.casterId] : undefined;
    return linker?.heroId === PHUC_HY ? LINK_BONUS : 1;
  },
};
