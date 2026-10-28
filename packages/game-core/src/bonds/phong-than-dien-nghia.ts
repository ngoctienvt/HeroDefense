import { HERO_BY_ID } from '../../../../content/catalog.js';
import { BOND_TUNING } from '../../../../content/bond-design.js';
import { bondRandom, bondStrike, bondTrigger, touchBonds } from '../bond-runtime.js';
import { hurtEnemy } from '../combat.js';
import { tryHardControl } from '../crowd-control.js';
import { effectiveUnitAttack } from '../stats.js';
import { castFocus, enemiesIn, isEliteOrChieftain, nearestTo } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const LOI_CHAN_TU = 'h00T', DUONG_TIEN = 'h00U', NA_TRA = 'h00V', KHUONG_TU_NHA = 'h019';
const DOUBLE_CHANCE = .3, BOLT_EXTRA_TARGETS = 3, BOLT_BONUS = 1.2;
const SEAL_SECONDS = 2, STUN_SECONDS = 1.2, MARK_SECONDS = 6;

/** Phong Thần Diễn Nghĩa: double strikes, longer thunder and a sealed elite that pays out Thần Vị. */
export const phongThan: BondHandler = {
  onBasicAttack(ctx, unit, target) {
    if (ctx.count < 2 || (unit.heroId !== DUONG_TIEN && unit.heroId !== NA_TRA) || bondRandom(ctx.state) >= DOUBLE_CHANCE) return;
    hurtEnemy(ctx.state, unit, target, effectiveUnitAttack(unit), 0, false, false, true);
    bondStrike(ctx.state, 'slash', unit, [target], ctx.bondId, ctx.owner);
  },
  onCast(ctx, caster, targetId) {
    const { state } = ctx;
    if (state.phase === 'lobby') return;
    if (ctx.count >= 3 && caster.heroId === LOI_CHAN_TU) {
      const focus = castFocus(state, caster, targetId);
      if (!focus) return;
      const damage = effectiveUnitAttack(caster) * (HERO_BY_ID[LOI_CHAN_TU].ability?.power ?? 2) * BOLT_BONUS;
      const others = enemiesIn(state, caster.zone).filter(e => e !== focus);
      const struck = nearestTo(others, focus, BOLT_EXTRA_TARGETS, 8);
      for (const enemy of struck) hurtEnemy(state, caster, enemy, damage, 0, false, false, true);
      bondStrike(state, 'bolt', focus, struck, ctx.bondId, ctx.owner);
      if (state.enemies[focus.id]) hurtEnemy(state, caster, focus, damage - damage / BOLT_BONUS, 0, false, false, true);
    }
    if (ctx.count >= 4 && caster.heroId === KHUONG_TU_NHA) {
      const prey = enemiesIn(state, caster.zone).filter(isEliteOrChieftain).sort((a, b) => b.hp - a.hp)[0];
      if (!prey) return;
      tryHardControl(state, caster, prey, 'sealed', SEAL_SECONDS);
      tryHardControl(state, caster, prey, 'stun', STUN_SECONDS);
      ctx.player.bondState.thanViMark = { enemyId: prey.id, until: state.elapsed + MARK_SECONDS };
      bondTrigger(state, ctx.bondId, caster, 'Phong Thần Bảng');
    }
  },
  onKill(ctx, killer, enemy) {
    const bond = ctx.player.bondState, mark = bond.thanViMark;
    if (!mark || mark.enemyId !== enemy.id) return;
    bond.thanViMark = undefined;
    if (ctx.state.elapsed > mark.until) return;
    bond.thanVi = Math.min(BOND_TUNING.thanVi.cap, bond.thanVi + 1);
    touchBonds(ctx.player);
    bondTrigger(ctx.state, ctx.bondId, killer, 'Thần Vị', bond.thanVi);
  },
};
