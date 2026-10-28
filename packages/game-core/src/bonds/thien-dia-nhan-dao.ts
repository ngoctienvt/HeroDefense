import { forceCast } from '../bond-cast.js';
import { bondTrigger, touchBonds } from '../bond-runtime.js';
import { castFocus, deployedHero, isMember, membersOf } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const TRUONG_DAO_LANG = 'h040';
const BONUS_CAST_SCALE = 1.5;

/** Thiên Địa Nhân Đạo: once all three have cast, Trương Đạo Lăng casts again, stronger. */
export const thienDiaNhanDao: BondHandler = {
  // Thần Lôi Phù spreads 20% wider.
  areaScale: (ctx, caster) => ctx.count >= 2 && caster.heroId === TRUONG_DAO_LANG ? 1.2 : 1,
  onCast(ctx, caster, targetId) {
    const { state } = ctx;
    if (ctx.count < 3 || state.phase === 'lobby' || !isMember(ctx, caster)) return;
    const bond = ctx.player.bondState;
    const used = bond.usedThisWave as Record<string, true>;
    const key = `24:tam:${caster.heroId}`;
    if (used[key]) return;
    used[key] = true;
    bond.tamTai++;
    touchBonds(ctx.player);
    if (bond.tamTai < 3) return;
    for (const heroId of membersOf(ctx.bondId)) delete used[`24:tam:${heroId}`];
    bond.tamTai = 0; touchBonds(ctx.player);
    const sage = deployedHero(state, ctx.owner, TRUONG_DAO_LANG);
    if (sage && forceCast(state, sage, castFocus(state, caster, targetId)?.id, BONUS_CAST_SCALE))
      bondTrigger(state, ctx.bondId, sage, 'Tam Tài Quy Nhất');
  },
};
