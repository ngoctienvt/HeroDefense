import { forceCast } from '../bond-cast.js';
import { bondTrigger } from '../bond-runtime.js';
import { castFocus, deployedHero, enemiesIn, isMember, tickTimer } from './bond-helpers.js';
import type { BondHandler } from './index.js';

const PHUONG_HOANG = 'h041';
const BURN_BONUS = 1.3, ZONE_EXTENSION = 1.5, ECHO_INTERVAL = 35, ECHO_SCALE = .5;
const EXTENDED_KINDS = new Set(['chucdung-lava', 'phoenix-carpet']);
const extended = new WeakSet<object>();

/** Thần Hỏa: burning monsters take more, the two fire zones last longer, the phoenix echoes its skill. */
export const thanHoa: BondHandler = {
  damageMultiplier: (ctx, attacker, enemy) => isMember(ctx, attacker) && enemy.burn ? BURN_BONUS : 1,
  onTick(ctx, dt) {
    const { state } = ctx;
    // Zones are made by the kits; stretch each new member-owned one once instead of editing the kits.
    for (const ground of state.groundEffects ?? []) {
      if (!ground.kind || !EXTENDED_KINDS.has(ground.kind) || extended.has(ground)) continue;
      const owner = state.units[ground.casterId];
      if (!owner || owner.owner !== ctx.owner || !isMember(ctx, owner)) continue;
      ground.remaining *= ZONE_EXTENSION;
      extended.add(ground);
    }
    if (!tickTimer(ctx.player, '27:echo', dt, ECHO_INTERVAL)) return;
    const phoenix = deployedHero(state, ctx.owner, PHUONG_HOANG);
    const focus = phoenix && castFocus(state, phoenix);
    if (phoenix && focus && enemiesIn(state, phoenix.zone).length && forceCast(state, phoenix, focus.id, ECHO_SCALE))
      bondTrigger(state, ctx.bondId, phoenix, 'Thiên Hỏa Phượng Vũ');
  },
};
