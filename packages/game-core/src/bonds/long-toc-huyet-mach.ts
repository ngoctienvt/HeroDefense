import { BOND_TUNING } from '../../../../content/bond-design.js';
import { forceCast } from '../bond-cast.js';
import { bondRandom, bondStrike, bondTrigger, touchBonds } from '../bond-runtime.js';
import { hurtEnemy } from '../combat.js';
import { castFocus, deployedHero, deployedMembers, enemiesIn, isMember, nearestTo } from './bond-helpers.js';
import type { BondContext, BondHandler } from './index.js';

const UNG_LONG = 'h00Z', CHUC_LONG = 'h01K';
const EXTRA_UNG_LONG_CASTS = 2, DROWN_CHANCE = .15, DROWN_PERCENT = .08, CHIEFTAIN_CAP = .03;

/**
 * Long Ngâm is the player's choice: a full gauge waits (and keeps its skill-damage bonus) until the
 * player asks for the whole clan to cast at once. Returns an error message, or undefined on success.
 */
export function triggerLongNgam(ctx: BondContext): string | undefined {
  const { state } = ctx, bond = ctx.player.bondState;
  if (state.phase !== 'combat') return 'Chỉ dùng Long Ngâm khi đang giao chiến.';
  if (ctx.count < 3) return 'Cần đủ 3 thành viên Long Tộc.';
  if (bond.longUy < BOND_TUNING.longUy.cap) return `Cần đủ ${BOND_TUNING.longUy.cap} tầng Long Uy.`;
  const members = deployedMembers(ctx);
  if (!members.length) return 'Chưa có thành viên Long Tộc ra trận.';
  const focus = enemiesIn(state, members[0].zone).sort((a, b) => b.hp - a.hp)[0];
  bond.longUy = 0; touchBonds(ctx.player);
  for (const member of members) forceCast(state, member, focus?.id);
  const dragon = deployedHero(state, ctx.owner, UNG_LONG);
  if (ctx.count >= 4 && dragon)
    for (let i = 0; i < EXTRA_UNG_LONG_CASTS; i++) forceCast(state, dragon, focus?.id);
  bondTrigger(state, ctx.bondId, members[0], 'Long Ngâm');
  return undefined;
}

/** Long Tộc Huyết Mạch: every cast builds Long Uy (up to 10) and its skill damage; Long Ngâm is triggered by hand. */
export const longToc: BondHandler = {
  onCast(ctx, caster, targetId) {
    const { state } = ctx;
    if (state.phase === 'lobby' || !isMember(ctx, caster)) return;
    const bond = ctx.player.bondState;
    bond.longUy = Math.min(BOND_TUNING.longUy.cap, bond.longUy + 1);
    touchBonds(ctx.player);
    const focus = castFocus(state, caster, targetId);
    if (ctx.count >= 4 && caster.heroId === CHUC_LONG && focus) {
      for (const enemy of nearestTo(enemiesIn(state, caster.zone), focus, 6, 4)) {
        if (enemy.kind === 'boss' || enemy.rank === 'boss' || bondRandom(state) >= DROWN_CHANCE) continue;
        const percent = enemy.rank === 'chieftain' ? CHIEFTAIN_CAP : DROWN_PERCENT;
        hurtEnemy(state, caster, enemy, enemy.maxHp * percent, 999, false, true, true);
        bondStrike(state, 'blast', caster, [{ x: enemy.x, z: enemy.z, zone: enemy.zone }], ctx.bondId, ctx.owner);
      }
    }
  },
};
