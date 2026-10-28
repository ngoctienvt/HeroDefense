import { TUONG_THAN } from '../../../../content/tuong-than-design.js';
import { summon as summonBloodCorpse } from '../tuong-than-combat.js';
import { UNTIL_WAVE_END, castFocus, deployedHero, deployedMembers, enemiesIn, isMember, nearestTo } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const CHUC_LONG = 'h01K', TUONG_THAN_ID = TUONG_THAN.id;
const HEAL_RECEIVED = 1.5, CORPSE_STRENGTH = 1.5;
const DRAIN_PER_SECOND = .01, BURN_PERCENT = .06, BURN_SECONDS = 5;

/** Âm Khí Trùng Thiên: members bleed health for power while fighting; Chúc Long's skill scorches by percentage. */
export const amKhiTrungThien: BondHandler = {
  healMultiplier: (ctx, _source, target) => ctx.count >= 2 && isMember(ctx, target) ? HEAL_RECEIVED : 1,
  summonScale: (ctx, caster) => ctx.count >= 3 && caster.heroId === TUONG_THAN_ID ? CORPSE_STRENGTH : 1,
  onHeroDeath(ctx, unit) {
    if (ctx.count < 3 || !isMember(ctx, unit)) return;
    const summoner = deployedHero(ctx.state, ctx.owner, TUONG_THAN_ID);
    if (!summoner) return;
    // A fallen member leaves a Huyết Thi behind for ten seconds.
    summonBloodCorpse(ctx.state, summoner, unit, 'blood-warrior', 0).summonDuration = UNTIL_WAVE_END;
  },
  onTick(ctx, dt) {
    const { state } = ctx;
    for (const member of deployedMembers(ctx)) {
      if (!enemiesIn(state, member.zone).length) continue;
      // The pact can wound but never kill its own bearers.
      member.hp = Math.max(1, member.hp - member.maxHp * DRAIN_PER_SECOND * dt);
    }
  },
  onCast(ctx, caster, targetId) {
    if (ctx.count < 3 || caster.heroId !== CHUC_LONG) return;
    const focus = castFocus(ctx.state, caster, targetId);
    if (!focus) return;
    for (const enemy of nearestTo(enemiesIn(ctx.state, caster.zone), focus, 6, 4)) {
      if (enemy.kind === 'boss' || enemy.rank === 'boss') continue;
      const damagePerSecond = enemy.maxHp * BURN_PERCENT / BURN_SECONDS;
      if (!enemy.burn || enemy.burn.damagePerSecond < damagePerSecond)
        enemy.burn = { remaining: BURN_SECONDS, damagePerSecond, casterId: caster.id, trueDamage: true };
    }
  },
};
