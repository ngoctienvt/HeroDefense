import { hasteAllyMax } from '../ally-scaled-support.js';
import { applyEnemyStatus } from '../combat-status.js';
import { bondTrigger } from '../bond-runtime.js';
import { tryHardControl } from '../crowd-control.js';
import { distance } from '../rules.js';
import { effectiveUnitAttack } from '../stats.js';
import { castFocus, deployedHero, deployedHeroes, enemiesIn, isBossLike, nearestTo, tickTimer } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const HAU_NGHE = 'h017', KHOA_PHU = 'h01I' /* Đế Tuấn, the sun emperor */;
const BURN_SECONDS = 5, TAUNT_INTERVAL = 15, TAUNT_SECONDS = 3, HASTE_SECONDS = 8, HASTE_AMOUNT = .2;

/** Trục Nhật: burn trail from Hậu Nghệ, Đế Tuấn pulls bosses, every elite kill hastens the squad. */
export const trucNhat: BondHandler = {
  onCast(ctx, caster, targetId) {
    if (ctx.state.phase === 'lobby' || caster.heroId !== HAU_NGHE) return;
    const focus = castFocus(ctx.state, caster, targetId);
    if (!focus) return;
    const attack = effectiveUnitAttack(caster);
    // 100% attack per second for 5 seconds: burn damage = power * strength / seconds per second.
    for (const enemy of nearestTo(enemiesIn(ctx.state, caster.zone), focus, 5, 3.5))
      applyEnemyStatus(enemy, caster, attack, 'burn', BURN_SECONDS, BURN_SECONDS);
  },
  onTick(ctx, dt) {
    if (!tickTimer(ctx.player, '19:taunt', dt, TAUNT_INTERVAL)) return;
    const giant = deployedHero(ctx.state, ctx.owner, KHOA_PHU);
    const target = giant && enemiesIn(ctx.state, giant.zone).filter(isBossLike)
      .sort((a, b) => distance(a, giant) - distance(b, giant))[0];
    if (giant && target && tryHardControl(ctx.state, giant, target, 'taunt', TAUNT_SECONDS))
      bondTrigger(ctx.state, ctx.bondId, giant, 'Khiêu khích');
  },
  onKill(ctx, killer, enemy) {
    if (!isBossLike(enemy)) return;
    for (const ally of deployedHeroes(ctx.state, ctx.owner)) hasteAllyMax(ally, HASTE_SECONDS, HASTE_AMOUNT);
    bondTrigger(ctx.state, ctx.bondId, killer, 'Tăng tốc đánh toàn đội');
  },
};
