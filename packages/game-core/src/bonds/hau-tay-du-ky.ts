import { bondTrigger } from '../bond-runtime.js';
import { distance } from '../rules.js';
import { deployedHero, isMember, oncePerWave } from './bond-helpers.js';
import { kimThanOnCast, kiepCounting } from './kiep-shared.js';
import type { BondHandler } from './index.js';

const BAT_BO = 'h03V', TINH_DAN = 'h03T', KIM_THIEN = 'h013', DAU_CHIEN = 'h012';
const WARD_BELOW = .3, WARD_SECONDS = 2, BOWL_BONUS = 1.3;

/** Hậu Tây Du Ký: the enlightened inherit the pilgrims' Kiếp Nạn and become hard to fell. */
export const hauTayDuKy: BondHandler = {
  ...kiepCounting,
  onCast(ctx, caster) {
    if (ctx.count >= 5) kimThanOnCast(ctx, caster, DAU_CHIEN);
  },
  onHeroHit(ctx, unit) {
    if (ctx.count < 3 || !isMember(ctx, unit) || unit.hp <= 0 || unit.hp >= unit.maxHp * WARD_BELOW) return;
    if (!oncePerWave(ctx.player, `5:ward:${unit.id}`)) return;
    unit.divineImmortal = Math.max(unit.divineImmortal ?? 0, WARD_SECONDS);
    bondTrigger(ctx.state, ctx.bondId, unit, 'Kim Thân Bất Hoại');
  },
  damageMultiplier(ctx, attacker, enemy) {
    if (ctx.count < 4 || (attacker.heroId !== BAT_BO && attacker.heroId !== TINH_DAN)) return 1;
    const bowlKeeper = deployedHero(ctx.state, ctx.owner, KIM_THIEN);
    if (!bowlKeeper) return 1;
    const inside = (ctx.state.groundEffects ?? []).some(ground => ground.kind === 'golden-bowl' && ground.casterId === bowlKeeper.id
      && ground.zone === enemy.zone && distance(ground, enemy) <= ground.radius);
    return inside ? BOWL_BONUS : 1;
  },
  extraClones: (ctx, caster) => ctx.count >= 5 && caster.heroId === DAU_CHIEN ? 1 : 0,
};
